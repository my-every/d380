import 'server-only'

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { resolveShareDirectorySync } from '@/lib/runtime/share-directory'

import type { StoredLayoutStateRecord } from '@/lib/project-state/share-project-state-handlers'
import type { StoredProject } from '@/types/d380-shared'
import type { D380ProjectWorkspaceDataSet, D380ProjectWorkspaceProjectRecord, ProjectWorkspaceFileRecord } from '@/types/d380-project-workspace'
import type { D380ProjectsBoardDataSet, D380ProjectsBoardProjectRecord, ProjectsBoardAssignmentSnapshot, ProjectsBoardMilestones } from '@/types/d380-projects-board'
import type { ShiftOptionId, StartupProjectPreview, StartupWorkspaceSummary } from '@/types/d380-startup'

const DEFAULT_SHIFT: ShiftOptionId = '1st'
const DEFAULT_OWNER = 'Imported from Share'
const DEFAULT_LWC = 'NEW/FLEX' as const
const operatingDate = new Date().toISOString().slice(0, 10)

const PROJECT_CONTEXT_FILE = 'project-context.json'
const LAYOUT_STATE_FILE = 'layout-pdf.json'

interface ShareProjectFileDescriptor {
  filePath: string
  fileName: string
  revision: string
  lastUpdatedLabel: string
  category: ProjectWorkspaceFileRecord['category']
  label: string
  note: string
}

export interface ShareImportedProject {
  id: string
  pdNumber: string
  name: string
  sourceFolderName: string
  electricalDirectory: string
  matchedBySchedule: boolean
  scheduleOrder: number
  wireListFile: ShareProjectFileDescriptor | null
  layoutFile: ShareProjectFileDescriptor | null
  classifiedFiles: ShareProjectFileDescriptor[]
  assignments: string[]
}

interface ShareStartupWorkspaceSeed {
  operatingDate: string
  prioritizedProjects: StartupProjectPreview[]
  startupNotes: string[]
}

function toProjectId(pdNumber: string) {
  return `pd-${pdNumber.toLowerCase()}`
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getFutureTargetDate(daysAhead: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toISOString().slice(0, 10)
}

function getFileRevision(fileName: string) {
  const alphaNumericRevision = fileName.match(/[_-]([A-Z]\.\d+|\d+\.\d+|[A-Z]\d+)(?=\.[^.]+$)/i)
  return alphaNumericRevision?.[1]?.toUpperCase() ?? 'Imported'
}

function isPreferredWireList(fileName: string) {
  return /(?:^|[_-])UCPWiringList(?=[_.-]|$)/i.test(fileName)
}

function isWireListCandidate(fileName: string) {
  return isPreferredWireList(fileName)
}

function isLayoutCandidate(fileName: string) {
  return /(?:^|[_-])LAY(?:[_-]|\.)/i.test(fileName)
}

function getWorkspaceFileCategory(fileName: string): ProjectWorkspaceFileRecord['category'] {
  if (isLayoutCandidate(fileName) || /(ga|general\s*arrangement|outline|enclosure|assembly\s*drawing|panel\s*layout)/i.test(fileName)) {
    return 'LAYOUT'
  }

  if (/(UCPWiringList|PackageWiringList|FWL|wire\s*list|terminal\s*strip|test\s*cell\s*connection|interconnect|cable\s*schedule)/i.test(fileName)) {
    return 'WIRE_LIST'
  }

  if (/(export|release|archive|customer\s*copy|submittal|issue\s*package|released?\b|package\b)/i.test(fileName)) {
    return 'EXPORT'
  }

  if (/(state|compare|delta|diff|status|review|markup|mark[- ]?up|redline|tracking|progress|snapshot|history)/i.test(fileName)) {
    return 'STATE'
  }

  return 'REFERENCE'
}

function getWorkspaceFileLabel(fileName: string, category: ProjectWorkspaceFileRecord['category']) {
  switch (category) {
    case 'LAYOUT':
      return isLayoutCandidate(fileName) ? 'Layout drawing' : 'Layout support file'
    case 'WIRE_LIST':
      if (/UCPWiringList/i.test(fileName)) {
        return 'UCP wiring list'
      }
      if (/PackageWiringList/i.test(fileName)) {
        return 'Package wiring list'
      }
      if (/terminal\s*strip/i.test(fileName)) {
        return 'Terminal strip report'
      }
      return 'Wire list support file'
    case 'EXPORT':
      return 'Export package file'
    case 'STATE':
      return 'Workflow state file'
    default:
      return 'Reference file'
  }
}

function getWorkspaceFileNote(category: ProjectWorkspaceFileRecord['category']) {
  switch (category) {
    case 'LAYOUT':
      return 'Layout-side document discovered in the Share project state.'
    case 'WIRE_LIST':
      return 'Wire-list workbook discovered in the Share project state.'
    case 'EXPORT':
      return 'Likely outbound or release-ready package artifact discovered in the project folder.'
    case 'STATE':
      return 'Workflow-state or review artifact discovered in the project folder.'
    default:
      return 'Additional project reference file staged for later workflow expansion.'
  }
}

function buildFileDescriptor(filePath: string, fileName: string, lastUpdatedAt?: string | null): ShareProjectFileDescriptor {
  const category = getWorkspaceFileCategory(fileName)
  return {
    filePath,
    fileName,
    revision: getFileRevision(fileName),
    lastUpdatedLabel: lastUpdatedAt ? formatDateLabel(new Date(lastUpdatedAt)) : 'Not available',
    category,
    label: getWorkspaceFileLabel(fileName, category),
    note: getWorkspaceFileNote(category),
  }
}

function deriveProjectName(folderName: string, storedProject: StoredProject | null) {
  return storedProject?.projectModel.name || storedProject?.name || folderName
}

function derivePdNumber(folderName: string, storedProject: StoredProject | null) {
  return (storedProject?.projectModel.pdNumber || folderName.split('_')[0] || folderName).toUpperCase()
}

function getLayoutFileName(layoutState: StoredLayoutStateRecord | null) {
  if (!layoutState?.sourcePath) {
    return null
  }

  const params = new URLSearchParams(layoutState.sourcePath.split('?')[1] ?? '')
  return params.get('file') ?? path.basename(layoutState.sourcePath)
}

function getAssignmentsFromStoredProject(storedProject: StoredProject | null) {
  return storedProject?.projectModel.sheets
    .filter(sheet => sheet.kind === 'operational')
    .map(sheet => sheet.name) ?? []
}

export async function extractScheduleProjectNumbers(shareRoot: string = resolveShareDirectorySync()) {
  const projectsRoot = path.join(shareRoot, 'Projects')
  const entries = await fs.readdir(projectsRoot, { withFileTypes: true }).catch(() => [])
  return entries.filter(entry => entry.isDirectory()).map(entry => entry.name.split('_')[0]?.toUpperCase() ?? entry.name.toUpperCase())
}

export async function importProjectsFromShare(shareRoot: string = resolveShareDirectorySync()): Promise<ShareImportedProject[]> {
  const projectsRoot = path.join(shareRoot, 'Projects')
  const importedProjects: ShareImportedProject[] = []

  const entries = await fs.readdir(projectsRoot, { withFileTypes: true }).catch(() => [])
  const projectFolders = entries.filter(entry => entry.isDirectory()).sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }))

  for (let index = 0; index < projectFolders.length; index += 1) {
    const folderName = projectFolders[index].name
    const projectDirectory = path.join(projectsRoot, folderName)
    const stateDirectory = path.join(projectDirectory, 'state')
    const storedProject = await readJsonFile<StoredProject>(path.join(stateDirectory, PROJECT_CONTEXT_FILE))
    const layoutState = await readJsonFile<StoredLayoutStateRecord>(path.join(stateDirectory, LAYOUT_STATE_FILE))

    if (!storedProject) {
      continue
    }

    const pdNumber = derivePdNumber(folderName, storedProject)
    const name = deriveProjectName(folderName, storedProject)
    const wireListFileName = storedProject.projectModel.filename || storedProject.filename || null
    const layoutFileName = getLayoutFileName(layoutState)
    const wireListFile = wireListFileName && isWireListCandidate(wireListFileName)
      ? buildFileDescriptor(path.join(projectDirectory, wireListFileName), wireListFileName, storedProject.createdAt ?? null)
      : null
    const layoutFile = layoutFileName && isLayoutCandidate(layoutFileName)
      ? buildFileDescriptor(path.join(projectDirectory, layoutFileName), layoutFileName, layoutState?.updatedAt ?? storedProject.createdAt ?? null)
      : null
    const assignments = getAssignmentsFromStoredProject(storedProject)

    importedProjects.push({
      id: storedProject.id || toProjectId(pdNumber),
      pdNumber,
      name,
      sourceFolderName: folderName,
      electricalDirectory: projectDirectory,
      matchedBySchedule: false,
      scheduleOrder: index,
      wireListFile,
      layoutFile,
      classifiedFiles: [],
      assignments,
    })
  }

  return importedProjects.sort((left, right) => {
    if (left.scheduleOrder !== right.scheduleOrder) {
      return left.scheduleOrder - right.scheduleOrder
    }

    return left.pdNumber.localeCompare(right.pdNumber, undefined, { numeric: true, sensitivity: 'base' })
  })
}

function getCoverTone(pdNumber: string): D380ProjectsBoardProjectRecord['coverTone'] {
  const tones: Array<D380ProjectsBoardProjectRecord['coverTone']> = ['cream', 'amber', 'obsidian']
  const hash = Array.from(pdNumber).reduce((accumulator, character) => accumulator + character.charCodeAt(0), 0)
  return tones[hash % tones.length] ?? 'cream'
}

function buildBoardAssignments(project: ShareImportedProject): ProjectsBoardAssignmentSnapshot[] {
  const sheetNames = project.assignments.length > 0 ? project.assignments : ['Imported workspace']
  const status: ProjectsBoardAssignmentSnapshot['status'] = project.layoutFile && project.wireListFile ? 'complete' : 'queued'

  return sheetNames.map((sheetName, index) => ({
    id: `${project.id}-assignment-${index + 1}`,
    sheetName,
    assignee: DEFAULT_OWNER,
    station: 'Queue',
    stage: 'KIT',
    status,
  }))
}

function buildBoardMilestones(project: ShareImportedProject): ProjectsBoardMilestones {
  const kitReady = Boolean(project.layoutFile && project.wireListFile)

  return {
    kitReady,
    buildUpCompletionPercent: 0,
    ipv1CompletionPercent: 0,
    crossWiringComplete: false,
    testReady: false,
    testPassed: false,
    powerCheckPassed: false,
    biqComplete: false,
    completedAt: null,
  }
}

function toBoardProjectRecord(project: ShareImportedProject): D380ProjectsBoardProjectRecord {
  const referenceCount = project.classifiedFiles.length
  const assignments = buildBoardAssignments(project)

  return {
    id: project.id,
    pdNumber: project.pdNumber,
    name: project.name,
    owner: DEFAULT_OWNER,
    shift: DEFAULT_SHIFT,
    units: Math.max(project.assignments.length, 1),
    targetDate: getFutureTargetDate(7),
    layoutCoverLabel: project.layoutFile?.revision ? `LAY ${project.layoutFile.revision}` : undefined,
    coverTone: getCoverTone(project.pdNumber),
    statusNote: project.layoutFile && project.wireListFile
      ? `Imported from ${project.sourceFolderName}. Loaded ${assignments.length} assignment sheet${assignments.length === 1 ? '' : 's'} and ${referenceCount} reference file${referenceCount === 1 ? '' : 's'}.`
      : `Imported from ${project.sourceFolderName}, but ${project.layoutFile ? 'wire list' : 'layout'} file discovery is incomplete.`,
    assignments,
    milestones: buildBoardMilestones(project),
  }
}

function buildWorkspaceFiles(project: ShareImportedProject): ProjectWorkspaceFileRecord[] {
  const files: ProjectWorkspaceFileRecord[] = []

  files.push({
    id: `${project.id}-layout`,
    category: 'LAYOUT',
    label: 'Primary layout',
    fileName: project.layoutFile?.fileName ?? 'Layout file not found',
    revision: project.layoutFile?.revision ?? 'Missing',
    status: project.layoutFile ? 'ready' : 'missing',
    sourceLabel: 'Share/Legal Drawings',
    lastUpdatedLabel: project.layoutFile?.lastUpdatedLabel ?? 'Not available',
    note: project.layoutFile ? 'Primary layout candidate resolved from the Legal Drawings project folder.' : 'No LAY PDF matched the expected import pattern.',
  })

  files.push({
    id: `${project.id}-wire-list`,
    category: 'WIRE_LIST',
    label: 'Primary wire list',
    fileName: project.wireListFile?.fileName ?? 'Wire list file not found',
    revision: project.wireListFile?.revision ?? 'Missing',
    status: project.wireListFile ? 'ready' : 'missing',
    sourceLabel: 'Share/Legal Drawings',
    lastUpdatedLabel: project.wireListFile?.lastUpdatedLabel ?? 'Not available',
    note: project.wireListFile ? 'Primary UCP wiring list candidate resolved from the Legal Drawings project folder.' : 'No UCP wiring list workbook matched the expected import pattern.',
  })

  project.classifiedFiles.forEach((referenceFile, index) => {
    files.push({
      id: `${project.id}-${referenceFile.category.toLowerCase()}-${index + 1}`,
      category: referenceFile.category,
      label: referenceFile.label,
      fileName: referenceFile.fileName,
      revision: referenceFile.revision,
      status: referenceFile.category === 'STATE' ? 'staged' : referenceFile.category === 'EXPORT' ? 'watch' : 'ready',
      sourceLabel: 'Share/Legal Drawings',
      lastUpdatedLabel: referenceFile.lastUpdatedLabel,
      note: referenceFile.note,
    })
  })

  return files
}

function toWorkspaceProjectRecord(project: ShareImportedProject): D380ProjectWorkspaceProjectRecord {
  const assignments = project.assignments.length > 0 ? project.assignments : ['Imported workspace']
  const missingRequirements = [project.layoutFile ? null : 'Layout PDF missing', project.wireListFile ? null : 'Wire list workbook missing'].filter(Boolean) as string[]
  const status: D380ProjectWorkspaceProjectRecord['assignments'][number]['status'] = missingRequirements.length > 0 ? 'blocked' : 'queued'
  const fileStatusNote = missingRequirements.length > 0 ? missingRequirements.join(' • ') : 'Files staged from Share import and ready for route-level rendering.'
  const fileRecords = buildWorkspaceFiles(project)

  return {
    id: project.id,
    pdNumber: project.pdNumber,
    name: project.name,
    revision: project.wireListFile?.revision ?? project.layoutFile?.revision ?? 'Imported',
    owner: DEFAULT_OWNER,
    shift: DEFAULT_SHIFT,
    targetDate: getFutureTargetDate(7),
    lifecycle: missingRequirements.length === 0 ? 'KITTED' : 'UPCOMING',
    risk: missingRequirements.length === 0 ? 'healthy' : 'watch',
    lwc: DEFAULT_LWC,
    units: Math.max(assignments.length, 1),
    leadSummary: `Source folder ${project.sourceFolderName} imported from Share/Legal Drawings.`,
    statusNote: fileStatusNote,
    assignmentCounts: {
      total: assignments.length,
      complete: 0,
      active: 0,
      blocked: missingRequirements.length > 0 ? assignments.length : 0,
    },
    stageSummary: [
      {
        stage: 'BUILD_UP',
        count: assignments.length,
      },
    ],
    blockers: missingRequirements,
    assignments: assignments.map((sheetName, index) => ({
      id: `${project.id}-workspace-assignment-${index + 1}`,
      sheetName,
      stage: 'BUILD_UP',
      status,
      assignedMemberIds: [],
      traineeMemberIds: [],
      workstationLabel: 'Import queue',
      lwc: DEFAULT_LWC,
      estimatedHours: 1.5,
      averageHours: 1.5,
      progressPercent: 0,
      statusNote: `Imported from ${project.wireListFile?.fileName ?? project.sourceFolderName}.`,
      blockedReason: missingRequirements[0],
    })),
    files: fileRecords,
    members: [],
    traineePairings: [],
    exports: [
      {
        id: `${project.id}-export-archive`,
        label: 'Archive package',
        description: 'Complete project archive bundle.',
        status: missingRequirements.length === 0 ? 'watch' : 'not-ready',
        note: missingRequirements.length === 0 ? 'Import succeeded; export waits on live workflow state.' : 'Resolve missing import files before export staging.',
      },
      {
        id: `${project.id}-export-wirelist-summary`,
        label: 'Wire list summary',
        description: 'Sheet-level summary export.',
        status: project.wireListFile ? 'watch' : 'not-ready',
        note: project.wireListFile ? 'Wire list file is staged and can later feed summary exports.' : 'Wire list workbook is missing.',
      },
    ],
  }
}

export async function buildShareProjectsBoardDataSet(shareRoot: string = resolveShareDirectorySync()): Promise<D380ProjectsBoardDataSet | undefined> {
  const projects = await importProjectsFromShare(shareRoot)
  if (projects.length === 0) {
    return undefined
  }

  return {
    operatingDate,
    projects: projects.map(toBoardProjectRecord),
  }
}

export async function buildShareProjectWorkspaceDataSet(shareRoot: string = resolveShareDirectorySync()): Promise<D380ProjectWorkspaceDataSet | undefined> {
  const projects = await importProjectsFromShare(shareRoot)
  if (projects.length === 0) {
    return undefined
  }

  return {
    operatingDate,
    projects: projects.map(toWorkspaceProjectRecord),
  }
}

export async function buildShareStartupWorkspaceSummary(shareRoot: string = resolveShareDirectorySync()): Promise<StartupWorkspaceSummary | undefined> {
  const seed = await buildShareStartupWorkspaceSeed(shareRoot)
  if (!seed) {
    return undefined
  }

  return {
    operatingDate: seed.operatingDate,
    prioritizedProjects: seed.prioritizedProjects,
    roster: [],
    restoredAssignments: seed.prioritizedProjects.reduce((sum, project) => sum + project.units, 0),
    startupNotes: seed.startupNotes,
    importSourceLabel: 'Share workspace preview',
  }
}

export async function buildShareStartupWorkspaceSeed(shareRoot: string = resolveShareDirectorySync()): Promise<ShareStartupWorkspaceSeed | undefined> {
  const projects = await importProjectsFromShare(shareRoot)
  if (projects.length === 0) {
    return undefined
  }

  const prioritizedProjects: StartupProjectPreview[] = projects.map((project, index) => ({
    id: project.id,
    pdNumber: project.pdNumber,
    name: project.name,
    priority: index + 1,
    units: Math.max(project.assignments.length, 1),
    targetDate: getFutureTargetDate(7),
    risk: project.layoutFile && project.wireListFile ? 'healthy' : 'watch',
    preferredShift: index % 3 === 2 ? 'SECOND' : 'FIRST',
  }))

  const missingLayoutCount = projects.filter(project => !project.layoutFile).length
  const missingWireListCount = projects.filter(project => !project.wireListFile).length

  return {
    operatingDate,
    prioritizedProjects,
    startupNotes: [
      `Resolved ${prioritizedProjects.length} project folder${prioritizedProjects.length === 1 ? '' : 's'} under Share/Projects.`,
      missingLayoutCount > 0 || missingWireListCount > 0
        ? `${missingLayoutCount} layout candidate${missingLayoutCount === 1 ? '' : 's'} and ${missingWireListCount} wire-list candidate${missingWireListCount === 1 ? '' : 's'} still need manual review.`
        : 'Layout and wire-list discovery resolved for every Share project.',
      'This workspace now discovers projects directly from Share/Projects state files.',
    ],
  }
}