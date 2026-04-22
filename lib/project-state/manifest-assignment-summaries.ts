import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { SlimLayoutPage } from '@/lib/layout-matching'
import type {
  ManifestAssignmentNode,
  ProjectManifest,
} from '@/types/project-manifest'

function normalize(value: string | undefined | null): string {
  return (value ?? '').trim()
}

function normalizeUpper(value: string | undefined | null): string {
  return normalize(value).toUpperCase()
}

function extractUnitType(input: string | undefined): string | undefined {
  const match = normalizeUpper(input).match(/\b(JB\d+)\b/)
  return match?.[1]
}

function normalizePartToken(rawToken: string): string {
  return normalize(rawToken)
    .replace(/^\[\d+\]\s*/, '')
    .replace(/\s+/g, ' ')
}

function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes))
  const hours = Math.floor(safe / 60)
  const remainder = safe % 60
  if (hours === 0) return `${remainder}m`
  if (remainder === 0) return `${hours}h`
  return `${hours}h ${remainder}m`
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function collectLabelsFromRows(rows: Record<string, unknown>[], sheetName: string, unitType?: string): string[] {
  const sheetToken = normalizeUpper(sheetName)
  const unitToken = normalizeUpper(unitType)
  const labels = new Set<string>()

  for (const row of rows) {
    const values = Object.values(row).map(value => normalize(String(value ?? '')))
    const haystack = values.join(' ').toUpperCase()
    if (!haystack) continue

    if (sheetToken && !haystack.includes(sheetToken) && (!unitToken || !haystack.includes(unitToken))) {
      continue
    }

    const preferred = values.find(value => value && /label|device|tag/i.test(value))
      ?? values.find(Boolean)

    if (preferred) {
      labels.add(preferred)
    }

    if (labels.size >= 50) {
      break
    }
  }

  return Array.from(labels)
}

function deriveEstimateMinutes(entry: ManifestAssignmentNode): { buildUp: number; wireList: number } {
  const rowCount = Math.max(0, entry.rowCount || 0)
  const swsType = normalizeUpper(entry.swsType)

  const buildUpFactor = swsType.includes('PANEL') ? 1.7 : swsType.includes('BOX') ? 1.3 : 1.1
  const wireListFactor = swsType.includes('PANEL') ? 1.1 : swsType.includes('BOX') ? 0.85 : 0.75

  return {
    buildUp: rowCount * buildUpFactor,
    wireList: rowCount * wireListFactor,
  }
}

export async function buildManifestAssignmentSummaries(
  projectRoot: string,
  manifest: ProjectManifest,
): Promise<Record<string, ManifestAssignmentNode>> {
  const stateRoot = path.join(projectRoot, 'state')

  const layoutPagesDoc = await readJson<{ pages?: SlimLayoutPage[] }>(path.join(stateRoot, 'layout-pages.json'))
  const layoutPages = Array.isArray(layoutPagesDoc?.pages) ? layoutPagesDoc.pages : []

  const devicePartsDoc = await readJson<{
    devices?: Record<string, { partNumber?: string; sheet?: string }>
  }>(path.join(stateRoot, 'device-part-numbers.json'))
  const devices = devicePartsDoc?.devices ?? {}

  const whiteSheet = await readJson<{ data?: { rows?: Record<string, unknown>[] } }>(
    path.join(stateRoot, 'reference-sheets', 'white-labels', 'white-labels.json'),
  )
  const blueSheet = await readJson<{ data?: { rows?: Record<string, unknown>[] } }>(
    path.join(stateRoot, 'reference-sheets', 'blue-labels', 'blue-labels.json'),
  )

  const brandingExports = await readJson<{
    combinedRelativePath?: string
  }>(path.join(projectRoot, 'exports', 'branding', 'manifest.json'))
  const wireExports = await readJson<{
    sheetExports?: Array<{ sheetName?: string; relativePath?: string }>
  }>(path.join(projectRoot, 'exports', 'wire-lists', 'manifest.json'))

  const brandListSchemaPath = path.join(stateRoot, 'reference-sheets', 'cable-part-numbers', 'cable-part-numbers.json')
  const hasBrandListSchema = await fs.stat(brandListSchemaPath).then(() => true).catch(() => false)

  const updatedNodes: Record<string, ManifestAssignmentNode> = { ...manifest.assignments }

  for (const assignment of Object.values(manifest.assignments)) {
    const primaryPage = assignment.layout?.primaryPage
    const mappedPage = primaryPage
      ? layoutPages.find(page => page.pageNumber === primaryPage.pageNumber)
      : undefined

    const unitType = normalize(mappedPage?.unitType)
      || extractUnitType(primaryPage?.title)
      || extractUnitType(assignment.sheetName)

    const legacyRailGroups =
      (mappedPage as unknown as { railGroups?: Array<{ railLabel?: string }> } | undefined)?.railGroups ?? []

    const rails = Array.from(
      new Set(
        [
          ...(mappedPage?.rails ?? []),
          ...legacyRailGroups.map(group => ({ railLabel: group.railLabel ?? '' })),
        ]
          .map(rail => normalize(rail.railLabel))
          .filter(Boolean),
      ),
    )
    const panducts = Array.from(new Set((mappedPage?.panducts ?? []).map(panduct => normalize(panduct.label)).filter(Boolean)))

    const whiteRows = Array.isArray(whiteSheet?.data?.rows) ? whiteSheet.data.rows : []
    const blueRows = Array.isArray(blueSheet?.data?.rows) ? blueSheet.data.rows : []
    const whiteLabels = collectLabelsFromRows(whiteRows, assignment.sheetName, unitType)
    const blueLabels = collectLabelsFromRows(blueRows, assignment.sheetName, unitType)

    const devicePartNumbers = new Set<string>()
    const assignmentSheetUpper = normalizeUpper(assignment.sheetName)
    for (const device of Object.values(devices)) {
      if (normalizeUpper(device.sheet) !== assignmentSheetUpper) continue
      for (const token of normalize(device.partNumber).split(/[\n,;]+/)) {
        const part = normalizePartToken(token)
        if (part) devicePartNumbers.add(part)
      }
    }

    const wireListPDFPath = wireExports?.sheetExports
      ?.find(entry => normalizeUpper(entry.sheetName) === assignmentSheetUpper)
      ?.relativePath

    const estimates = deriveEstimateMinutes(assignment)

    updatedNodes[assignment.sheetSlug] = {
      ...assignment,
      unitType: unitType || undefined,
      panducts,
      rails,
      whiteLabels,
      blueLabels,
      partNumbers: Array.from(devicePartNumbers).sort((a, b) => a.localeCompare(b)),
      files: {
        wireListPDFPath,
        wireListSchemaPath: `state/sheets/${assignment.sheetSlug}.json`,
        brandListSchemaPath: hasBrandListSchema,
        brandListExcelPath: brandingExports?.combinedRelativePath,
        buildUpSWSSchemaPath: `state/sheets/${assignment.sheetSlug}.json`,
      },
      buildUpEstTime: formatMinutes(estimates.buildUp),
      wireListEstTime: formatMinutes(estimates.wireList),
    }
  }

  return updatedNodes
}
