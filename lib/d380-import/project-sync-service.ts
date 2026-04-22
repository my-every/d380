'use server'

import { promises as fs } from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'
import { resolveShareDirectorySync } from '@/lib/runtime/share-directory'

import { importProjectsFromShare, type ShareImportedProject } from './share-project-import'
import type { StageHistoryEntry, AssignmentProgressRecord, ProjectAssignmentProgress } from '@/lib/data-loader/share-utils'

// Types matching the JSON structure in Share/Projects/

interface TeamAssignmentsFile {
  projectId: string
  assignments: Array<{
    assignmentId: string
    sheetName: string
    assignedMembers: string[]
    trainees: string[]
    workstation: string
  }>
  updatedAt: string
  dataMode: 'extracted' | 'live'
}

interface ActiveProjectsFile {
  activeProjects: Array<{
    projectId: string
    pdNumber: string
    projectName: string
    priority: number
    status: string
    progress: number
  }>
  updatedAt: string
  dataMode: 'extracted' | 'live'
}

/**
 * Extract wire count from a workbook sheet
 */
async function extractWireCountFromSheet(
  workbookPath: string,
  sheetName: string
): Promise<number> {
  try {
    const buffer = await fs.readFile(workbookPath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) return 0

    // Count non-empty rows (excluding header)
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
    const rowCount = Math.max(0, range.e.r - range.s.r) // Subtract header row
    return rowCount
  } catch {
    return 0
  }
}

/**
 * Build assignment progress records from imported project data
 */
async function buildAssignmentProgressRecords(
  project: ShareImportedProject
): Promise<AssignmentProgressRecord[]> {
  const records: AssignmentProgressRecord[] = []
  const workbookPath = project.wireListFile?.filePath

  for (let i = 0; i < project.assignments.length; i++) {
    const sheetName = project.assignments[i]
    let wireCount = 0

    if (workbookPath) {
      wireCount = await extractWireCountFromSheet(workbookPath, sheetName)
    }

    records.push({
      assignmentId: `${project.id}-assignment-${i + 1}`,
      sheetName,
      currentStage: 'KITTED', // All new imports start at KITTED
      stageHistory: [], // No history for freshly imported assignments
      progress: 0,
      assignedBadge: '',
      station: 'Import Queue',
      wireCount,
      completedWires: 0,
      defectCount: 0,
    })
  }

  return records
}

/**
 * Build team assignments file from imported project
 */
function buildTeamAssignmentsFile(project: ShareImportedProject): TeamAssignmentsFile {
  return {
    projectId: project.id,
    assignments: project.assignments.map((sheetName, i) => ({
      assignmentId: `${project.id}-assignment-${i + 1}`,
      sheetName,
      assignedMembers: [],
      trainees: [],
      workstation: 'Unassigned',
    })),
    updatedAt: new Date().toISOString(),
    dataMode: 'extracted',
  }
}

/**
 * Ensure directory exists, creating it if necessary
 */
async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (error) {
    // Ignore if already exists
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error
    }
  }
}

/**
 * Write JSON file with pretty printing
 */
async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Sync a single project from Legal Drawings to Share/Projects
 */
async function syncProject(
  project: ShareImportedProject,
  shareRoot: string
): Promise<{ projectId: string; folder: string; success: boolean; error?: string }> {
  const projectFolder = project.pdNumber
  const projectDir = path.join(shareRoot, 'Projects', projectFolder)
  const stateDir = path.join(projectDir, 'state')

  try {
    // Create project directories
    await ensureDirectory(projectDir)
    await ensureDirectory(stateDir)

    // Build and write assignment-progress.json
    const assignmentRecords = await buildAssignmentProgressRecords(project)
    const assignmentProgress: ProjectAssignmentProgress = {
      projectId: project.id,
      currentStage: 'KITTED',
      stageHistory: [],
      assignments: assignmentRecords,
      updatedAt: new Date().toISOString(),
      dataMode: 'extracted',
    }
    await writeJsonFile(path.join(stateDir, 'assignment-progress.json'), assignmentProgress)

    // Build and write team-assignments.json
    const teamAssignments = buildTeamAssignmentsFile(project)
    await writeJsonFile(path.join(stateDir, 'team-assignments.json'), teamAssignments)

    return { projectId: project.id, folder: projectFolder, success: true }
  } catch (error) {
    return {
      projectId: project.id,
      folder: projectFolder,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Build and write the active-projects.json index file to Share/State/
 */
async function writeActiveProjectsIndex(
  projects: ShareImportedProject[],
  shareRoot: string
): Promise<void> {
  const stateDir = path.join(shareRoot, 'State')
  await ensureDirectory(stateDir)

  const activeProjects: ActiveProjectsFile = {
    activeProjects: projects.map(project => ({
      projectId: project.id,
      pdNumber: project.pdNumber,
      projectName: project.name,
      priority: project.scheduleOrder,
      status: project.wireListFile && project.layoutFile ? 'queued' : 'blocked',
      progress: 0,
    })),
    updatedAt: new Date().toISOString(),
    dataMode: 'extracted',
  }

  await writeJsonFile(path.join(stateDir, 'active-projects.json'), activeProjects)
}

export interface ProjectSyncResult {
  totalProjects: number
  syncedProjects: number
  failedProjects: number
  results: Array<{ projectId: string; folder: string; success: boolean; error?: string }>
  syncedAt: string
}

/**
 * Main sync function: scans Legal Drawings and writes to Share/Projects
 */
export async function syncProjectsFromLegalDrawings(
  shareRoot: string = resolveShareDirectorySync()
): Promise<ProjectSyncResult> {
  // Import/scan all projects from Legal Drawings
  const importedProjects = await importProjectsFromShare(shareRoot)

  // Sync each project
  const results = await Promise.all(
    importedProjects.map(project => syncProject(project, shareRoot))
  )

  // Write the active projects index
  await writeActiveProjectsIndex(importedProjects, shareRoot)

  return {
    totalProjects: importedProjects.length,
    syncedProjects: results.filter(r => r.success).length,
    failedProjects: results.filter(r => !r.success).length,
    results,
    syncedAt: new Date().toISOString(),
  }
}

/**
 * Get list of synced project folders in Share/Projects
 */
export async function getProjectFolders(
  shareRoot: string = resolveShareDirectorySync()
): Promise<string[]> {
  const projectsDir = path.join(shareRoot, 'Projects')

  try {
    const entries = await fs.readdir(projectsDir, { withFileTypes: true })
    return entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
      .map(entry => entry.name)
  } catch {
    return []
  }
}

/**
 * Check if a project has been synced (state files exist)
 */
export async function isProjectSynced(
  projectFolder: string,
  shareRoot: string = DEFAULT_SHARE_ROOT
): Promise<boolean> {
  const statePath = path.join(shareRoot, 'Projects', projectFolder, 'state', 'project-context.json')

  try {
    await fs.access(statePath)
    return true
  } catch {
    return false
  }
}
