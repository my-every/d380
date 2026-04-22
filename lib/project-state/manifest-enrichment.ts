import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { SlimLayoutPage } from '@/lib/layout-matching'
import { summarizeLayoutPagesForManifest } from '@/lib/project-state/layout-pages-manifest-summary'
import { buildManifestAssignmentSummaries } from '@/lib/project-state/manifest-assignment-summaries'
import { resolveProjectRootDirectory } from '@/lib/project-state/share-project-state-handlers'
import type { ManifestAssignmentNode, ProjectManifest } from '@/types/project-manifest'

function sanitizeManifest(manifest: ProjectManifest): ProjectManifest {
  const assignments: Record<string, ManifestAssignmentNode> = {}

  const rawAssignments = manifest.assignments as unknown as
    | Record<string, unknown>
    | Array<Record<string, unknown>>

  const entries: Array<Record<string, unknown>> = Array.isArray(rawAssignments)
    ? rawAssignments
    : Object.values(rawAssignments ?? {})

  for (const a of entries) {
    const sheetSlug = String(a.sheetSlug ?? '').trim()
    const sheetName = String(a.sheetName ?? '').trim()
    if (!sheetSlug || !sheetName) continue

    assignments[sheetSlug] = {
      sheetSlug,
      sheetName,
      kind: 'operational',
      sheetPath:
        typeof a.sheetPath === 'string' && a.sheetPath.trim().length > 0
          ? a.sheetPath.trim()
          : `state/sheets/${sheetSlug}.json`,
      rowCount: Number(a.rowCount ?? 0),
      columnCount: typeof a.columnCount === 'number' ? a.columnCount : undefined,
      sheetIndex: typeof a.sheetIndex === 'number' ? a.sheetIndex : undefined,
      hasData: typeof a.hasData === 'boolean' ? a.hasData : true,
      swsType: String(a.swsType ?? 'UNDECIDED').trim() || 'UNDECIDED',
      stage: String(a.stage ?? 'BUILD_UP') as ManifestAssignmentNode['stage'],
      status: String(a.status ?? 'NOT_STARTED') as ManifestAssignmentNode['status'],
      unitType: typeof a.unitType === 'string' ? a.unitType : undefined,
      panducts: Array.isArray(a.panducts) ? a.panducts as string[] : [],
      rails: Array.isArray(a.rails) ? a.rails as string[] : [],
      whiteLabels: Array.isArray(a.whiteLabels) ? a.whiteLabels as string[] : [],
      blueLabels: Array.isArray(a.blueLabels) ? a.blueLabels as string[] : [],
      partNumbers: Array.isArray(a.partNumbers) ? a.partNumbers as string[] : [],
      files: (typeof a.files === 'object' && a.files !== null ? a.files : {}) as ManifestAssignmentNode['files'],
      buildUpEstTime: typeof a.buildUpEstTime === 'string' ? a.buildUpEstTime : undefined,
      wireListEstTime: typeof a.wireListEstTime === 'string' ? a.wireListEstTime : undefined,
      layout: (a.layout ?? null) as ManifestAssignmentNode['layout'],
      devices: (typeof a.devices === 'object' && a.devices !== null ? a.devices : {}) as ManifestAssignmentNode['devices'],
    }
  }

  return { ...manifest, assignments }
}

export async function enrichManifestFromProjectState(manifest: ProjectManifest): Promise<ProjectManifest> {
  const normalizedManifest = sanitizeManifest(manifest)

  const projectRoot = await resolveProjectRootDirectory(manifest.id, {
    pdNumber: normalizedManifest.pdNumber,
    projectName: normalizedManifest.name,
  })
  if (!projectRoot) {
    return normalizedManifest
  }

  const layoutPagesPath = path.join(projectRoot, 'state', 'layout-pages.json')
  try {
    const raw = await fs.readFile(layoutPagesPath, 'utf-8')
    const parsed = JSON.parse(raw) as { pages?: SlimLayoutPage[] }
    const pages = Array.isArray(parsed.pages) ? parsed.pages : []
    if (pages.length === 0) {
      return normalizedManifest
    }

    const summary = summarizeLayoutPagesForManifest(pages)
    const enrichedAssignments = await buildManifestAssignmentSummaries(projectRoot, normalizedManifest)

    return {
      ...normalizedManifest,
      unitType: summary.unitType,
      unitTypes: summary.unitTypes,
      panducts: summary.panducts,
      rails: summary.rails,
      assignments: enrichedAssignments,
    }
  } catch {
    try {
      const enrichedAssignments = await buildManifestAssignmentSummaries(projectRoot, normalizedManifest)
      return {
        ...normalizedManifest,
        assignments: enrichedAssignments,
      }
    } catch {
      return normalizedManifest
    }
  }
}
