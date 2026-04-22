import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { MappedAssignment } from '@/lib/assignment/mapped-assignment'
import type { ProjectModel } from '@/lib/workbook/types'
import type { StoredProject } from '@/types/d380-shared'
import type { ProjectManifest } from '@/types/project-manifest'
import type { SheetSchema } from '@/types/sheet-schema'
import { generateDevicePartNumbersMap, saveDevicePartNumbersMap } from '@/lib/project-state/device-part-numbers-generator'
import { ingestStoredProjectPartNumbers } from '@/lib/project-state/parts-ingest-service'
import { generateReferenceSheetsManifest, saveReferenceSheets } from '@/lib/project-state/reference-sheets-generator'
import { buildManifestAssignmentSummaries } from '@/lib/project-state/manifest-assignment-summaries'
import { buildManifestAssignmentNode } from '@/lib/project-state/schema-generators'
import { generateCleanProjectId } from '@/lib/workbook/normalize-sheet-name'
import { resolveShareDirectory } from '@/lib/runtime/share-directory'

const PROJECT_MANIFEST_FILE = 'project-manifest.json'
const SHEETS_DIR = 'sheets'

async function resolveShareProjectsRoot(): Promise<string> {
  const shareRoot = await resolveShareDirectory()
  return path.join(shareRoot, 'Projects')
}

interface ProjectStatePaths {
  projectDirectory: string
  stateDirectory: string
  manifestPath: string
  sheetsDirectory: string
}

function normalizeManifestForStorage(manifest: ProjectManifest): ProjectManifest {
  const manifestRecord = manifest as unknown as Record<string, unknown>
  const { sheetData: _legacySheetData, ...rest } = manifestRecord

  const sheets = Array.isArray(manifest.sheets)
    ? (manifest.sheets as Array<Record<string, unknown>>).map((sheet) => {
      const slug = String(sheet.slug ?? '').trim()
      const sheetPath =
        typeof sheet.sheetPath === 'string' && sheet.sheetPath.trim().length > 0
          ? sheet.sheetPath.trim()
          : `state/sheets/${slug}.json`

      return {
        slug,
        name: String(sheet.name ?? '').trim(),
        kind: String(sheet.kind ?? 'other') as ProjectManifest['sheets'][number]['kind'],
        sheetPath,
        rowCount: Number(sheet.rowCount ?? 0),
        columnCount: Number(sheet.columnCount ?? 0),
        sheetIndex: Number(sheet.sheetIndex ?? 0),
        hasData: Boolean(sheet.hasData ?? true),
      }
    })
    : []

  return {
    ...(rest as ProjectManifest),
    sheets,
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8')
}

async function listProjectFolders() {
  const shareProjectsRoot = await resolveShareProjectsRoot()

  try {
    const entries = await fs.readdir(shareProjectsRoot, { withFileTypes: true })
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name)
  } catch {
    return []
  }
}

function sanitizeProjectNameSegment(projectName: string | null | undefined, pdNumber: string) {
  const stripped = (projectName ?? '')
    .trim()
    .replace(new RegExp(`^${pdNumber}(?:\\s*[-_]+\\s*|\\s+)`, 'i'), '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!stripped) {
    return ''
  }

  const compact = stripped.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  if (!compact) {
    return ''
  }

  const comparable = compact.replace(/_/g, '').toUpperCase()
  return comparable === pdNumber.replace(/[^A-Za-z0-9]+/g, '').toUpperCase() ? '' : compact
}

export function buildShareProjectFolderName(pdNumber: string, projectName?: string | null) {
  const normalizedPdNumber = pdNumber.trim().toUpperCase()
  const nameSegment = sanitizeProjectNameSegment(projectName, normalizedPdNumber)
  return nameSegment ? `${normalizedPdNumber}_${nameSegment}` : normalizedPdNumber
}

async function resolveExistingProjectRoot(projectId: string): Promise<string | null> {
  const shareProjectsRoot = await resolveShareProjectsRoot()
  const folders = await listProjectFolders()

  // First pass: exact ID match
  for (const folder of folders) {
    const stateDirectory = path.join(shareProjectsRoot, folder, 'state')
    const manifestPath = path.join(stateDirectory, PROJECT_MANIFEST_FILE)
    const manifest = await readJsonFile<ProjectManifest>(manifestPath)
    if (manifest?.id === projectId) {
      return path.join(shareProjectsRoot, folder)
    }
  }

  // Second pass: match by pdNumber-name slug (supports clean URL routing)
  for (const folder of folders) {
    const stateDirectory = path.join(shareProjectsRoot, folder, 'state')
    const manifestPath = path.join(stateDirectory, PROJECT_MANIFEST_FILE)
    const manifest = await readJsonFile<ProjectManifest>(manifestPath)
    if (manifest?.pdNumber && manifest?.name) {
      const slug = generateCleanProjectId(manifest.pdNumber, manifest.name)
      if (slug === projectId) {
        return path.join(shareProjectsRoot, folder)
      }
    }
  }

  return null
}

async function resolveExistingStatePaths(projectId: string): Promise<ProjectStatePaths | null> {
  const projectDirectory = await resolveExistingProjectRoot(projectId)
  if (!projectDirectory) {
    return null
  }

  const stateDirectory = path.join(projectDirectory, 'state')
  return {
    projectDirectory,
    stateDirectory,
    manifestPath: path.join(stateDirectory, PROJECT_MANIFEST_FILE),
    sheetsDirectory: path.join(stateDirectory, SHEETS_DIR),
  }
}

export async function resolveProjectRootDirectory(
  projectId: string,
  options?: { pdNumber?: string | null; projectName?: string | null },
): Promise<string | null> {
  const shareProjectsRoot = await resolveShareProjectsRoot()
  const existing = await resolveExistingStatePaths(projectId)
  if (existing) {
    return existing.projectDirectory
  }

  const normalizedPdNumber = options?.pdNumber?.trim().toUpperCase() || null
  if (!normalizedPdNumber) {
    // Fall back to project name as folder name when PD number is absent
    const nameSegment = (options?.projectName ?? '')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')

    if (!nameSegment) {
      return null
    }

    const projectDirectory = path.join(shareProjectsRoot, nameSegment)
    await fs.mkdir(projectDirectory, { recursive: true })
    return projectDirectory
  }

  const projectDirectory = path.join(
    shareProjectsRoot,
    buildShareProjectFolderName(normalizedPdNumber, options?.projectName),
  )
  await fs.mkdir(projectDirectory, { recursive: true })

  return projectDirectory
}

async function resolveStatePaths(projectId: string, pdNumber?: string | null, projectName?: string | null): Promise<ProjectStatePaths | null> {
  const projectDirectory = await resolveProjectRootDirectory(projectId, { pdNumber, projectName })
  if (!projectDirectory) {
    return null
  }

  const stateDirectory = path.join(projectDirectory, 'state')
  await fs.mkdir(stateDirectory, { recursive: true })

  const sheetsDirectory = path.join(stateDirectory, SHEETS_DIR)
  await fs.mkdir(sheetsDirectory, { recursive: true })

  return {
    projectDirectory,
    stateDirectory,
    manifestPath: path.join(stateDirectory, PROJECT_MANIFEST_FILE),
    sheetsDirectory,
  }
}

export async function resolveProjectStateDirectory(projectId: string, pdNumber?: string | null): Promise<string | null> {
  const paths = await resolveStatePaths(projectId, pdNumber)
  return paths?.stateDirectory ?? null
}

export async function listStoredProjects(): Promise<ProjectManifest[]> {
  const shareProjectsRoot = await resolveShareProjectsRoot()
  const folders = await listProjectFolders()
  const records = await Promise.all(
    folders.map(async folder => {
      const stateDir = path.join(shareProjectsRoot, folder, 'state')
      const manifestPath = path.join(stateDir, PROJECT_MANIFEST_FILE)
      const manifest = await readJsonFile<ProjectManifest>(manifestPath)
      if (!manifest) return null

      // Auto-migrate to clean ID if pdNumber + name are available
      if (manifest.pdNumber && manifest.name) {
        const cleanId = generateCleanProjectId(manifest.pdNumber, manifest.name)
        if (manifest.id !== cleanId) {
          manifest.id = cleanId
          await writeJsonFile(manifestPath, manifest)
        }
      }

      return manifest
    }),
  )

  return records.filter((record): record is ProjectManifest => Boolean(record))
}

export async function readProjectManifest(projectId: string): Promise<ProjectManifest | null> {
  const paths = await resolveExistingStatePaths(projectId)
  if (!paths) {
    return null
  }

  const manifest = await readJsonFile<ProjectManifest>(paths.manifestPath)
  if (!manifest) return null

  // Migrate to clean slug-based ID if the manifest was found via slug lookup
  // but its stored ID is the old filename-timestamp format
  if (manifest.id !== projectId && manifest.pdNumber && manifest.name) {
    const cleanId = generateCleanProjectId(manifest.pdNumber, manifest.name)
    if (cleanId === projectId) {
      manifest.id = cleanId
      await writeJsonFile(paths.manifestPath, manifest)
    }
  }

  return manifest
}

export async function writeProjectManifest(manifest: ProjectManifest): Promise<ProjectManifest> {
  const normalizedManifest = normalizeManifestForStorage(manifest)
  const shareProjectsRoot = await resolveShareProjectsRoot()
  const pdNumber = normalizedManifest.pdNumber || null
  const projectName = normalizedManifest.name

  // Check if the project already exists under a different folder
  const existingRoot = await resolveExistingProjectRoot(normalizedManifest.id)
  const desiredFolderName = pdNumber
    ? buildShareProjectFolderName(pdNumber, projectName)
    : (projectName.trim().replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').replace(/^_+|_+$/g, '') || normalizedManifest.id)
  const desiredDirectory = path.join(shareProjectsRoot, desiredFolderName)

  // If existing folder has a different name (e.g. PD number was added/changed), rename it
  if (existingRoot && path.basename(existingRoot) !== desiredFolderName) {
    try {
      const desiredExists = await fs.stat(desiredDirectory).then(() => true).catch(() => false)
      if (!desiredExists) {
        await fs.rename(existingRoot, desiredDirectory)
      }
    } catch (error) {
      console.error('Failed to rename project folder:', error)
    }
  }

  const paths = await resolveStatePaths(normalizedManifest.id, pdNumber, projectName)
  if (!paths) {
    throw new Error('Project state directory not found')
  }

  await writeJsonFile(paths.manifestPath, normalizedManifest)

  return normalizedManifest
}

/**
 * Write the full project (manifest + sheet schemas + part numbers + reference sheets).
 * Called during project creation from upload flow.
 */
export async function writeFullProject(
  manifest: ProjectManifest,
  sheetSchemas: SheetSchema[],
  model: ProjectModel,
): Promise<void> {
  // Write the manifest
  await writeProjectManifest(manifest)

  const paths = await resolveStatePaths(manifest.id, manifest.pdNumber, manifest.name)
  if (!paths) {
    throw new Error('Project state directory not found')
  }

  // Write each sheet schema
  for (const schema of sheetSchemas) {
    const schemaPath = path.join(paths.sheetsDirectory, `${schema.slug}.json`)
    await writeJsonFile(schemaPath, schema)
  }

  // Generate and save device part numbers
  const storedProject: StoredProject = {
    id: model.id,
    name: model.name,
    filename: model.filename,
    createdAt: model.createdAt instanceof Date ? model.createdAt.toISOString() : String(model.createdAt),
    projectModel: model,
  }

  try {
    const partNumbersMap = await generateDevicePartNumbersMap(storedProject)
    await saveDevicePartNumbersMap(paths.projectDirectory, partNumbersMap)
  } catch (error) {
    console.error('Failed to generate device part numbers for project:', manifest.id, error)
  }

  // Auto-ingest newly discovered part numbers into Share/parts as lifecycle "new" stubs.
  try {
    await ingestStoredProjectPartNumbers(storedProject, {
      projectId: manifest.id,
      reviewRole: 'team_lead',
    })
  } catch (error) {
    console.error('Failed to ingest workbook parts for project:', manifest.id, error)
  }

  // Generate and save reference sheets
  try {
    const referenceManifest = await generateReferenceSheetsManifest(storedProject)
    await saveReferenceSheets(paths.projectDirectory, storedProject, referenceManifest)
  } catch (error) {
    console.error('Failed to generate reference sheet files for project:', manifest.id, error)
  }
}

export async function deleteStoredProject(projectId: string) {
  const paths = await resolveExistingStatePaths(projectId)
  if (!paths) {
    return
  }

  // Delete the entire project folder
  await fs.rm(paths.projectDirectory, { recursive: true, force: true })
}

// ── Sheet Schema I/O ──────────────────────────────────────────────────────

export async function readSheetSchema(projectId: string, sheetSlug: string): Promise<SheetSchema | null> {
  const paths = await resolveExistingStatePaths(projectId)
  if (!paths) return null

  // 1. Try the operational sheets directory first
  const schemaPath = path.join(paths.sheetsDirectory, `${sheetSlug}.json`)
  const schema = await readJsonFile<SheetSchema>(schemaPath)
  if (schema) return schema

  // 2. Fall back to reference-sheets directory
  const refPath = path.join(paths.stateDirectory, 'reference-sheets', sheetSlug, `${sheetSlug}.json`)
  const refData = await readJsonFile<{
    sheet?: { name?: string; slug?: string; kind?: string; sheetIndex?: number; headers?: string[]; rowCount?: number; warnings?: string[] }
    data?: { rows?: Record<string, unknown>[]; semanticRows?: unknown[] }
    generatedAt?: string
  }>(refPath)
  if (!refData?.sheet) return null

  // Convert reference sheet data into SheetSchema shape
  const sheet = refData.sheet
  const rawRows = (refData.data?.rows ?? []).map((row, i) => ({
    ...row,
    __rowId: (row.__rowId as string) ?? `raw-${i}`,
  })) as import('@/lib/workbook/types').ParsedSheetRow[]

  return {
    slug: sheet.slug ?? sheetSlug,
    name: sheet.name ?? sheetSlug,
    kind: (sheet.kind ?? 'reference') as SheetSchema['kind'],
    sheetIndex: sheet.sheetIndex ?? 0,
    headers: sheet.headers ?? [],
    rows: [],
    rawRows,
    rowCount: sheet.rowCount ?? rawRows.length,
    metadata: undefined,
    assignment: {
      swsType: 'UNDECIDED',
      stage: 'READY_TO_LAY',
      status: 'NOT_STARTED',
      isOverride: false,
      overrideReason: '',
      detectedSwsType: 'UNDECIDED',
      detectedConfidence: 0,
      detectedReasons: [],
      requiresWireSws: false,
      requiresCrossWireSws: false,
    },
    warnings: sheet.warnings ?? [],
    generatedAt: refData.generatedAt ?? new Date().toISOString(),
  } satisfies SheetSchema
}

export async function writeSheetSchema(projectId: string, schema: SheetSchema): Promise<void> {
  const paths = await resolveExistingStatePaths(projectId)
  if (!paths) throw new Error('Project state directory not found')

  await fs.mkdir(paths.sheetsDirectory, { recursive: true })
  const schemaPath = path.join(paths.sheetsDirectory, `${schema.slug}.json`)
  await writeJsonFile(schemaPath, schema)
}

export async function listSheetSchemaSlugs(projectId: string): Promise<string[]> {
  const paths = await resolveExistingStatePaths(projectId)
  if (!paths) return []

  try {
    const entries = await fs.readdir(paths.sheetsDirectory)
    return entries
      .filter(e => e.endsWith('.json'))
      .map(e => e.replace(/\.json$/, ''))
  } catch {
    return []
  }
}

export async function readAllSheetSchemas(projectId: string): Promise<SheetSchema[]> {
  const slugs = await listSheetSchemaSlugs(projectId)
  const schemas = await Promise.all(
    slugs.map(slug => readSheetSchema(projectId, slug)),
  )
  return schemas.filter((s): s is SheetSchema => Boolean(s))
}

// ── Project bundle (manifest + all sheet schemas) ─────────────────────────

export interface ProjectBundle {
  manifest: ProjectManifest
  sheetSchemas: SheetSchema[]
}

export async function readProjectBundle(projectId: string): Promise<ProjectBundle | null> {
  const manifest = await readProjectManifest(projectId)
  if (!manifest) return null

  const sheetSchemas = await readAllSheetSchemas(projectId)
  return { manifest, sheetSchemas }
}

// ── Assignment mappings (update sheet schemas + manifest) ──────────────────

export async function readAssignmentMappings(projectId: string): Promise<MappedAssignment[]> {
  // Build MappedAssignment[] from sheet schemas
  const schemas = await readAllSheetSchemas(projectId)
  return schemas.map((s) => ({
    sheetSlug: s.slug,
    sheetName: s.name,
    rowCount: s.rowCount,
    sheetKind: s.kind === 'operational' ? 'assignment' as const : s.kind === 'reference' ? 'reference' as const : 'other' as const,
    detectedSwsType: s.assignment.detectedSwsType as MappedAssignment['detectedSwsType'],
    detectedConfidence: s.assignment.detectedConfidence,
    detectedReasons: s.assignment.detectedReasons,
    selectedSwsType: s.assignment.swsType as MappedAssignment['selectedSwsType'],
    selectedStage: s.assignment.stage,
    selectedStatus: s.assignment.status,
    overrideReason: s.assignment.overrideReason,
    isOverride: s.assignment.isOverride,
    requiresWireSws: s.assignment.requiresWireSws,
    requiresCrossWireSws: s.assignment.requiresCrossWireSws,
    matchedLayoutPage: s.layoutMatch?.pageNumber,
    matchedLayoutTitle: s.layoutMatch?.pageTitle,
  }))
}

export async function writeAssignmentMappings(projectId: string, _pdNumber: string | null | undefined, mappings: MappedAssignment[]) {
  const paths = await resolveExistingStatePaths(projectId)
  if (!paths) throw new Error('Project state directory not found')

  // Update each sheet schema with the new assignment state
  for (const mapping of mappings) {
    const schemaPath = path.join(paths.sheetsDirectory, `${mapping.sheetSlug}.json`)
    const schema = await readJsonFile<SheetSchema>(schemaPath)
    if (!schema) continue

    schema.assignment = {
      swsType: mapping.selectedSwsType,
      stage: mapping.selectedStage,
      status: mapping.selectedStatus,
      isOverride: mapping.isOverride,
      overrideReason: mapping.overrideReason,
      detectedSwsType: mapping.detectedSwsType,
      detectedConfidence: mapping.detectedConfidence,
      detectedReasons: mapping.detectedReasons,
      requiresWireSws: mapping.requiresWireSws,
      requiresCrossWireSws: mapping.requiresCrossWireSws,
    }

    if (mapping.matchedLayoutPage) {
      schema.layoutMatch = {
        pageNumber: mapping.matchedLayoutPage,
        pageTitle: mapping.matchedLayoutTitle ?? '',
        confidence: 'high',
      }
    }

    await writeJsonFile(schemaPath, schema)
  }

  // Update manifest assignment index
  const manifest = await readProjectManifest(projectId)
  if (manifest) {
    for (const a of mappings) {
      const existing = manifest.assignments[a.sheetSlug]
      manifest.assignments[a.sheetSlug] = buildManifestAssignmentNode(a, existing)
    }

    const projectRoot = await resolveProjectRootDirectory(projectId, {
      pdNumber: manifest.pdNumber,
      projectName: manifest.name,
    })
    if (projectRoot) {
      manifest.assignments = await buildManifestAssignmentSummaries(projectRoot, manifest)
    }

    await writeProjectManifest(manifest)
  }

  return mappings
}

// ── Reference sheet readers ────────────────────────────────────────────────

interface StoredReferenceSheet {
  generatedAt: string
  projectId: string
  sheet: {
    id: string
    name: string
    slug: string
    kind: string
    referenceType: string
    rowCount: number
    columnCount: number
    headers: string[]
    sheetIndex?: number
    warnings?: string[]
  }
  data: {
    rows: Record<string, unknown>[]
    semanticRows?: unknown[]
    introRows?: Record<string, unknown>[]
    footerRows?: Record<string, unknown>[]
    metadata?: unknown
    headerDetection?: unknown
    parserDiagnostics?: unknown
  }
}

export async function readReferenceSheetData(
  projectId: string,
  referenceSlug: string,
): Promise<StoredReferenceSheet | null> {
  const paths = await resolveExistingStatePaths(projectId)
  if (!paths) return null

  const refDir = path.join(paths.stateDirectory, 'reference-sheets', referenceSlug)
  const filePath = path.join(refDir, `${referenceSlug}.json`)
  return readJsonFile<StoredReferenceSheet>(filePath)
}

// End of share-project-state-handlers.ts