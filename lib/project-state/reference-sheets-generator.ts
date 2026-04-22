import 'server-only'

import fs from 'node:fs/promises'
import path from 'node:path'

import { detectReferenceSheetType } from '@/lib/catalog/reference-sheet-normalizer'
import type { ParsedSheetRow, SemanticWireListRow } from '@/lib/workbook/types'
import type { StoredProject } from '@/types/d380-shared'

export interface ReferenceSheetExportRecord {
  sheetId: string
  sheetName: string
  sheetSlug: string
  referenceType: string
  rowCount: number
  fileName: string
  relativePath: string
}

export interface ReferenceSheetsManifest {
  generatedAt: string
  version: string
  sheetCount: number
  sheets: ReferenceSheetExportRecord[]
}

const REFERENCE_SHEETS_DIR = 'reference-sheets'

function normalizeValue(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeDeviceId(value: unknown): string {
  return normalizeValue(value).toUpperCase().replace(/\s+/g, '')
}

function splitDeviceId(deviceId: string): { baseDeviceId: string; prefix: string; terminal: string } {
  const [base, terminal = ''] = deviceId.split(':')
  const baseDeviceId = normalizeDeviceId(base)
  const prefixMatch = baseDeviceId.match(/^([A-Z]+)/)
  return {
    baseDeviceId,
    prefix: prefixMatch ? prefixMatch[1] : '',
    terminal: normalizeValue(terminal).toUpperCase(),
  }
}

function splitPartNumbers(value: unknown): string[] {
  return normalizeValue(value)
    .split(/[\n,;]+/)
    .map(token => token.trim())
    .filter(Boolean)
}

function normalizePartNumberToken(value: string): string {
  return value.toUpperCase().replace(/\s+/g, '')
}

function findColumnKey(headers: string[] | undefined, fallbackRow: ParsedSheetRow | undefined, aliases: string[]): string | null {
  const headerCandidates = (headers ?? []).map(value => normalizeValue(value))
  const rowKeys = Object.keys(fallbackRow ?? {})
  const allCandidates = [...headerCandidates, ...rowKeys]

  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase()
    const exact = allCandidates.find(candidate => candidate.toLowerCase() === aliasLower)
    if (exact) return exact
  }

  for (const alias of aliases) {
    const aliasLower = alias.toLowerCase()
    const partial = allCandidates.find(candidate => candidate.toLowerCase().includes(aliasLower))
    if (partial) return partial
  }

  return null
}

function parseSheetLocationLabel(label: string): {
  raw: string
  sheetNumber?: string
  location?: string
  isLink: boolean
  from?: { sheetNumber?: string; location?: string }
  to?: { sheetNumber?: string; location?: string }
} {
  const raw = normalizeValue(label)
  const parseSingle = (value: string): { sheetNumber?: string; location?: string } => {
    const match = value.match(/^\(\s*SHT\s*([^\)]+)\)\s*(.+)$/i)
    if (!match) {
      return { location: normalizeValue(value) || undefined }
    }

    return {
      sheetNumber: normalizeValue(match[1]) || undefined,
      location: normalizeValue(match[2]) || undefined,
    }
  }

  const parts = raw.split(/\s+-\s+/)
  if (parts.length >= 2) {
    const from = parseSingle(parts[0])
    const to = parseSingle(parts.slice(1).join(' - '))
    return {
      raw,
      isLink: true,
      from,
      to,
      sheetNumber: from.sheetNumber,
      location: from.location,
    }
  }

  const single = parseSingle(raw)
  return {
    raw,
    isLink: false,
    sheetNumber: single.sheetNumber,
    location: single.location,
  }
}

function buildMatrixEntries(headers: string[] | undefined, rows: ParsedSheetRow[] | undefined) {
  const sheetHeaders = (headers ?? []).map(value => normalizeValue(value))
  const sourceRows = rows ?? []
  const entries: Array<Record<string, unknown>> = []

  sourceRows.forEach((row, rowIndex) => {
    sheetHeaders.forEach((header, columnIndex) => {
      if (!header) return

      const cellValue = normalizeValue(row[header])
      if (!cellValue) return

      const headerMeta = parseSheetLocationLabel(header)
      const normalizedDeviceId = normalizeDeviceId(cellValue)
      const split = splitDeviceId(normalizedDeviceId)

      entries.push({
        rowId: String(row.__rowId ?? `raw-${rowIndex}`),
        rowIndex,
        columnIndex,
        columnHeader: header,
        headerMeta,
        value: cellValue,
        normalizedDeviceId,
        baseDeviceId: split.baseDeviceId,
        prefix: split.prefix,
        terminal: split.terminal,
      })
    })
  })

  return entries
}

function buildPartNumberLookup(headers: string[] | undefined, rows: ParsedSheetRow[] | undefined) {
  const sourceRows = rows ?? []
  const deviceKey = findColumnKey(headers, sourceRows[0], ['Device ID', 'Device'])
  const partNumberKey = findColumnKey(headers, sourceRows[0], ['Part Number', 'Part'])
  const descriptionKey = findColumnKey(headers, sourceRows[0], ['Description'])
  const locationKey = findColumnKey(headers, sourceRows[0], ['Location'])

  if (!deviceKey || !partNumberKey) {
    return {
      byDeviceId: {},
      keys: {
        deviceKey,
        partNumberKey,
        descriptionKey,
        locationKey,
      },
    }
  }

  const byDeviceId: Record<string, Record<string, unknown>> = {}
  for (const row of sourceRows) {
    const rawDeviceId = normalizeValue(row[deviceKey])
    const normalizedDeviceId = normalizeDeviceId(rawDeviceId)
    if (!normalizedDeviceId) continue

    const split = splitDeviceId(normalizedDeviceId)
    const rawPartNumber = normalizeValue(row[partNumberKey])
    const partNumbers = splitPartNumbers(rawPartNumber)

    byDeviceId[normalizedDeviceId] = {
      deviceId: rawDeviceId,
      normalizedDeviceId,
      baseDeviceId: split.baseDeviceId,
      prefix: split.prefix,
      terminal: split.terminal,
      partNumber: rawPartNumber,
      partNumbers,
      partNumbersNormalized: partNumbers.map(token => normalizePartNumberToken(token)),
      description: descriptionKey ? normalizeValue(row[descriptionKey]) : '',
      location: locationKey ? normalizeValue(row[locationKey]) : '',
      rowId: String(row.__rowId ?? ''),
    }
  }

  return {
    byDeviceId,
    keys: {
      deviceKey,
      partNumberKey,
      descriptionKey,
      locationKey,
    },
  }
}

function buildSemanticSortKeys(semanticRows: SemanticWireListRow[] | undefined) {
  return (semanticRows ?? []).map((row, index) => {
    const fromDevice = splitDeviceId(normalizeDeviceId(row.fromDeviceId))
    const toDevice = splitDeviceId(normalizeDeviceId(row.toDeviceId))
    return {
      rowId: row.__rowId,
      rowIndex: row.__rowIndex ?? index,
      fromDeviceId: row.fromDeviceId,
      fromBaseDeviceId: fromDevice.baseDeviceId,
      fromPrefix: fromDevice.prefix,
      fromTerminal: fromDevice.terminal,
      toDeviceId: row.toDeviceId,
      toBaseDeviceId: toDevice.baseDeviceId,
      toPrefix: toDevice.prefix,
      toTerminal: toDevice.terminal,
      wireType: normalizeValue(row.wireType),
      wireNo: normalizeValue(row.wireNo),
      gaugeSize: normalizeValue(row.gaugeSize),
      fromLocation: normalizeValue(row.fromLocation),
      toLocation: normalizeValue(row.toLocation),
      location: normalizeValue(row.location),
    }
  })
}

function buildDerivedReferenceData(
  referenceType: string,
  headers: string[] | undefined,
  rows: ParsedSheetRow[] | undefined,
  semanticRows: SemanticWireListRow[] | undefined,
): Record<string, unknown> {
  const derived: Record<string, unknown> = {
    schemaVersion: '2.0',
  }

  if (referenceType === 'PART_NUMBER_LIST' || referenceType === 'CABLE_PART_NUMBERS') {
    derived.lookup = buildPartNumberLookup(headers, rows)
  }

  if (
    referenceType === 'BLUE_LABELS' ||
    referenceType === 'WHITE_LABELS' ||
    referenceType === 'HEAT_SHRINK_LABELS'
  ) {
    derived.matrixEntries = buildMatrixEntries(headers, rows)
  }

  if ((semanticRows ?? []).length > 0) {
    derived.semanticSortKeys = buildSemanticSortKeys(semanticRows)
  }

  return derived
}

function normalizeSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getReferenceSheetFileName(sheetSlug: string): string {
  return `${normalizeSegment(sheetSlug || 'reference-sheet') || 'reference-sheet'}.json`
}

export async function generateReferenceSheetsManifest(project: StoredProject): Promise<ReferenceSheetsManifest> {
  const generatedAt = new Date().toISOString()

  const sheets = project.projectModel.sheets
    .filter(sheet => sheet.kind === 'reference')
    .map(sheet => {
      const fileName = getReferenceSheetFileName(sheet.slug || sheet.id)
      const relativePath = `${REFERENCE_SHEETS_DIR}/${sheet.slug}/${fileName}`

      return {
        sheetId: sheet.id,
        sheetName: sheet.name,
        sheetSlug: sheet.slug,
        referenceType: detectReferenceSheetType(sheet.name),
        rowCount: sheet.rowCount,
        fileName,
        relativePath,
      }
    })

  return {
    generatedAt,
    version: '1.0',
    sheetCount: sheets.length,
    sheets,
  }
}

export async function saveReferenceSheets(
  projectDirectory: string,
  project: StoredProject,
  manifest: ReferenceSheetsManifest,
): Promise<void> {
  const stateDir = path.join(projectDirectory, 'state')
  const referenceRoot = path.join(stateDir, REFERENCE_SHEETS_DIR)

  await fs.mkdir(referenceRoot, { recursive: true })

  for (const sheetRecord of manifest.sheets) {
    const summary = project.projectModel.sheets.find(sheet => sheet.id === sheetRecord.sheetId)
    const sheetData = project.projectModel.sheetData[sheetRecord.sheetId]
    if (!summary || !sheetData) {
      continue
    }

    const sheetDirectory = path.join(referenceRoot, sheetRecord.sheetSlug)
    const sheetFilePath = path.join(sheetDirectory, sheetRecord.fileName)

    await fs.mkdir(sheetDirectory, { recursive: true })
    await fs.writeFile(
      sheetFilePath,
      JSON.stringify(
        {
          generatedAt: manifest.generatedAt,
          projectId: project.id,
          sheet: {
            id: summary.id,
            name: summary.name,
            slug: summary.slug,
            kind: summary.kind,
            referenceType: sheetRecord.referenceType,
            rowCount: summary.rowCount,
            columnCount: summary.columnCount,
            headers: summary.headers,
            sheetIndex: summary.sheetIndex,
            warnings: summary.warnings,
          },
          data: {
            rows: sheetData.rows,
            semanticRows: sheetData.semanticRows,
            introRows: sheetData.introRows,
            footerRows: sheetData.footerRows,
            metadata: sheetData.metadata,
            headerDetection: sheetData.headerDetection,
            parserDiagnostics: sheetData.parserDiagnostics,
          },
          derived: buildDerivedReferenceData(
            sheetRecord.referenceType,
            summary.headers,
            sheetData.rows,
            sheetData.semanticRows,
          ),
        },
        null,
        2,
      ),
      'utf-8',
    )
  }

  const manifestPath = path.join(referenceRoot, 'manifest.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
}
