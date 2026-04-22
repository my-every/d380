import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'

import { readBrandingCsvExports, generateBrandingCsvExports } from '@/lib/project-exports/branding-csv-exports'
import {
  readAssignmentMappings,
  readProjectManifest,
  writeAssignmentMappings,
} from '@/lib/project-state/share-project-state-handlers'
import type {
  BrandingSheetTask,
  BrandingTaskStatus,
  BrandingWorkspacePatch,
  BrandingWorkspaceState,
} from '@/types/branding-workspace'

const BRANDING_WORKSPACE_FILE = 'branding-workspace.json'

function calculateWorkspaceStatus(tasks: BrandingSheetTask[]): BrandingWorkspaceState['status'] {
  if (tasks.length > 0 && tasks.every(task => task.brandedStatus === 'complete')) {
    return 'complete'
  }

  if (tasks.some(task =>
    task.layoutMatchStatus !== 'pending' ||
    task.wireListReviewStatus !== 'pending' ||
    task.wireLengthAdjustStatus !== 'pending' ||
    task.brandedStatus !== 'pending',
  )) {
    return 'in_progress'
  }

  return 'pending'
}

async function resolveWorkspaceFilePath(projectId: string): Promise<string> {
  const projectRoot = path.join(process.cwd(), 'Share', 'projects', projectId)
  const stateRoot = path.join(projectRoot, 'state')
  await fs.mkdir(stateRoot, { recursive: true })
  return path.join(stateRoot, BRANDING_WORKSPACE_FILE)
}

async function writeWorkspaceState(projectId: string, state: BrandingWorkspaceState): Promise<BrandingWorkspaceState> {
  const filePath = await resolveWorkspaceFilePath(projectId)
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8')
  return state
}

export async function readBrandingWorkspaceState(projectId: string): Promise<BrandingWorkspaceState | null> {
  const filePath = await resolveWorkspaceFilePath(projectId)

  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as BrandingWorkspaceState
  } catch {
    return null
  }
}

export async function ensureBrandingWorkspaceState(projectId: string): Promise<BrandingWorkspaceState> {
  const existing = await readBrandingWorkspaceState(projectId)
  if (existing) {
    return existing
  }

  return createBrandingWorkspaceState(projectId)
}

export async function createBrandingWorkspaceState(projectId: string): Promise<BrandingWorkspaceState> {
  const manifest = await readProjectManifest(projectId)
  if (!manifest) {
    throw new Error('Project not found')
  }

  const mappings = await readAssignmentMappings(projectId)
  const operationalMappings = mappings.filter(mapping => mapping.sheetKind === 'assignment')

  const existingBrandingExports = await readBrandingCsvExports(projectId)
  const brandingExports = existingBrandingExports ?? await generateBrandingCsvExports(projectId)

  const now = new Date().toISOString()
  const tasks: BrandingSheetTask[] = operationalMappings.map(mapping => ({
    sheetSlug: mapping.sheetSlug,
    sheetName: mapping.sheetName,
    matchedLayoutPage: mapping.matchedLayoutPage,
    matchedLayoutTitle: mapping.matchedLayoutTitle,
    layoutMatchStatus: mapping.matchedLayoutPage ? 'complete' : 'pending',
    wireListReviewStatus: 'pending',
    wireLengthAdjustStatus: 'pending',
    brandedStatus: 'pending',
  }))

  const state: BrandingWorkspaceState = {
    projectId,
    projectName: manifest.name,
    pdNumber: manifest.pdNumber,
    generatedAt: now,
    updatedAt: now,
    status: calculateWorkspaceStatus(tasks),
    combinedExportFileName: brandingExports.combinedFileName,
    combinedExportRelativePath: brandingExports.combinedRelativePath,
    tasks,
  }

  return writeWorkspaceState(projectId, state)
}

async function promoteSheetToReadyToWireIfNeeded(projectId: string, sheetSlug: string): Promise<void> {
  const mappings = await readAssignmentMappings(projectId)
  const updatedMappings = mappings.map(mapping => {
    if (mapping.sheetSlug !== sheetSlug) {
      return mapping
    }

    if (mapping.selectedStage === 'READY_TO_LAY') {
      return {
        ...mapping,
        selectedStage: 'READY_TO_WIRE',
      }
    }

    return mapping
  })

  await writeAssignmentMappings(projectId, null, updatedMappings)
}

function normalizeStatus(status: BrandingTaskStatus | undefined, fallback: BrandingTaskStatus): BrandingTaskStatus {
  return status ?? fallback
}

export async function patchBrandingWorkspaceTask(
  projectId: string,
  patch: BrandingWorkspacePatch,
): Promise<BrandingWorkspaceState> {
  const state = await ensureBrandingWorkspaceState(projectId)

  const taskIndex = state.tasks.findIndex(task => task.sheetSlug === patch.sheetSlug)
  if (taskIndex < 0) {
    throw new Error(`Branding task not found for sheet ${patch.sheetSlug}`)
  }

  const previousTask = state.tasks[taskIndex]
  const updatedTask: BrandingSheetTask = {
    ...previousTask,
    layoutMatchStatus: normalizeStatus(patch.layoutMatchStatus, previousTask.layoutMatchStatus),
    wireListReviewStatus: normalizeStatus(patch.wireListReviewStatus, previousTask.wireListReviewStatus),
    wireLengthAdjustStatus: normalizeStatus(patch.wireLengthAdjustStatus, previousTask.wireLengthAdjustStatus),
    brandedStatus: normalizeStatus(patch.brandedStatus, previousTask.brandedStatus),
    notes: patch.notes ?? previousTask.notes,
  }

  state.tasks[taskIndex] = updatedTask

  const shouldPromoteToReadyToWire =
    previousTask.brandedStatus !== 'complete' && updatedTask.brandedStatus === 'complete'

  if (shouldPromoteToReadyToWire) {
    await promoteSheetToReadyToWireIfNeeded(projectId, patch.sheetSlug)
  }

  state.updatedAt = new Date().toISOString()
  state.status = calculateWorkspaceStatus(state.tasks)

  return writeWorkspaceState(projectId, state)
}
