# Project Model — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces, types, and type aliases related to the Project domain model in D380.

---

## Table of Contents

1. [Core Project Model](#1-core-project-model) — `lib/workbook/types.ts`
2. [Project Details](#2-project-details) — `types/d380-project-details.ts`
3. [Projects Board (Multi-Project)](#3-projects-board) — `types/d380-projects-board.ts`
4. [Project Board (Single-Project)](#4-project-board) — `types/d380-project-board.ts`
5. [Project Workspace](#5-project-workspace) — `types/d380-project-workspace.ts`
6. [Project Persistence & State](#6-project-persistence--state)
7. [Project Import & Discovery](#7-project-import--discovery)
8. [Project Context](#8-project-context) — `contexts/project-context.tsx`
9. [Cross-Domain References](#9-cross-domain-references)
10. [Interface Audit](#10-interface-audit--usage-deprecation--merge-candidates) — Usage, Deprecation & Merge Candidates

---

## 1. Core Project Model

**File:** `lib/workbook/types.ts`

The foundational model created when a workbook is parsed/uploaded.

### `ProjectModel`

```ts
interface ProjectModel {
  id: string
  filename: string
  name: string
  pdNumber?: string
  unitNumber?: string
  revision?: string
  lwcType?: LwcType
  dueDate?: Date
  planConlayDate?: Date
  planConassyDate?: Date
  color?: string
  sheets: ProjectSheetSummary[]
  sheetData: Record<string, ParsedWorkbookSheet>
  createdAt: Date
  warnings: string[]
}
```

### `ProjectSheetSummary`

```ts
interface ProjectSheetSummary {
  id: string
  name: string
  slug: string
  kind: ProjectSheetKind
  rowCount: number
  columnCount: number
  headers: string[]
  sheetIndex: number
  hasData: boolean
  warnings: string[]
}
```

### `LwcType` & `LwcTypeConfig`

```ts
type LwcType = "NEW_FLEX" | "ONSKID" | "OFFSKID" | "NTB" | "FLOAT"

type ProjectSheetKind = "operational" | "reference" | "unknown"

interface LwcTypeConfig {
  id: LwcType
  label: string
  shortLabel: string
  color: string
  dotColor: string
  description: string
}
```

### Upload Types

```ts
interface UploadedProjectWorkbook {
  file: File
  name: string
  size: number
  uploadedAt: Date
}

type ParsingState = "idle" | "uploading" | "parsing" | "success" | "error"

interface UploadProgress {
  state: ParsingState
  message?: string
  progress?: number
}
```

---

## 2. Project Details

**File:** `types/d380-project-details.ts`

Detailed per-project record with units, revisions, features, validation, and green-change support.

### `ProjectDetailsRecord`

```ts
interface ProjectDetailsRecord {
  id: string
  pdNumber: string
  name: string
  unitCount: number
  currentUnitId: string
  createdAtLabel: string
  totalSheetCount: number
  totalRowCount: number
  assignmentSheets: ProjectSheetSummary[]
  units: ProjectUnitRecord[]
  revisionSets: ProjectRevisionSetRecord[]
  revisionDeltas: ProjectRevisionDeltaRecord[]
  featureAccess: ProjectFeatureAccessRecord[]
  featureCatalog: ProjectFeatureDefinitionRecord[]
  validationFindings: ProjectValidationFindingRecord[]
  greenChange: ProjectGreenChangeSummaryRecord
  migrationNotes: string[]
}
```

### `ProjectUnitRecord`

```ts
type ProjectUnitStatus = 'PLANNED' | 'ACTIVE' | 'GREEN_CHANGE' | 'REWORK' | 'COMPLETE'

interface ProjectUnitRecord {
  id: string
  projectId: string
  unitNumber: string
  displayName: string
  status: ProjectUnitStatus
  revisionSetId: string
  currentStageLabel: string
  assignmentCount: number
  mappedAssignmentCount: number
  startedWork: boolean
  greenChangeEligible: boolean
  reworkEligible: boolean
  assignmentMappings: MappedAssignment[]
  pdNumber?: string
  lwcType?: string
  revision?: string
  dueDate?: string
  planConlayDate?: string
  planConassyDate?: string
  createdAt: string
  updatedAt: string
  notes: string[]
}
```

### Revision Types

```ts
type ProjectRevisionMismatchState = 'matched' | 'info' | 'warning' | 'blocking' | 'unknown'
type ProjectRevisionChangeCategory = 'GREEN_CHANGE' | 'REWORK' | 'CORRECTION' | 'ENGINEERING_UPDATE'

interface ProjectRevisionSetRecord {
  id: string
  projectId: string
  label: string
  displayRevision: string
  baseRevision?: string
  modificationNumber?: number
  mismatchState: ProjectRevisionMismatchState
  selectedBy: 'import' | 'manual' | 'unknown'
  sources: ProjectRevisionSourceRecord[]
  acknowledged: boolean
}

interface ProjectRevisionSourceRecord {
  category: 'WIRE_LIST' | 'LAYOUT'
  fileName?: string
  displayRevision: string
  baseRevision?: string
  modificationNumber?: number
}

interface ProjectRevisionDeltaRecord {
  id: string
  projectId: string
  unitId: string
  previousRevisionSetId: string
  nextRevisionSetId: string
  category: ProjectRevisionChangeCategory
  reason: string
  createdAt: string
  addedRows: number
  removedRows: number
  changedRows: number
  summary: string
}
```

### Feature Access Types

```ts
type ProjectFeatureAccessSource = 'role' | 'feature-grant' | 'none'

interface ProjectFeatureAccessRecord {
  featureKey: string
  enabled: boolean
  source: ProjectFeatureAccessSource
  note: string
}

interface ProjectFeatureDefinitionRecord {
  featureKey: string
  label: string
  description: string
  defaultRoles: string[]
  assignableBy: string[]
  requiresAuditLog: boolean
  enabled: boolean
  scope: 'global' | 'project' | 'unit' | 'assignment'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  notes?: string
}
```

### Validation & Green Change

```ts
type ProjectValidationSeverity = 'info' | 'warning' | 'blocker'

interface ProjectValidationFindingRecord {
  id: string
  projectId: string
  unitId: string
  ruleId: string
  category: string
  severity: ProjectValidationSeverity
  title: string
  message: string
  stageImpact: string
  requiresAcknowledgement: boolean
  overridable: boolean
  acknowledged: boolean
  suggestedAction: string
}

interface ProjectGreenChangeSummaryRecord {
  enabled: boolean
  hasRevisionDeltaHistory: boolean
  statusNote: string
  plannedCapabilities: string[]
}
```

---

## 3. Projects Board

**File:** `types/d380-projects-board.ts`

Multi-project Kanban board with lifecycle columns and filtering.

### Data Layer

```ts
type ProjectsBoardLifecycleColumnId =
  | 'UPCOMING' | 'KITTED' | 'CONLAY' | 'CONASY'
  | 'TEST' | 'PWR_CHECK' | 'BIQ' | 'COMPLETED'

type ProjectsBoardRiskLevel = 'healthy' | 'watch' | 'late'
type ProjectsBoardAssignmentStage =
  | 'KIT' | 'BUILD_UP' | 'IPV1' | 'WIRING'
  | 'CROSS_WIRING' | 'TEST' | 'PWR_CHECK' | 'BIQ'
type ProjectsBoardAssignmentStatus = 'queued' | 'active' | 'complete' | 'blocked'

interface D380ProjectsBoardProjectRecord {
  id: string
  pdNumber: string
  name: string
  owner: string
  shift: ShiftOptionId
  units: number
  targetDate: string
  layoutCoverLabel?: string
  coverTone: 'obsidian' | 'amber' | 'cream'
  statusNote: string
  assignments: ProjectsBoardAssignmentSnapshot[]
  milestones: ProjectsBoardMilestones
}

interface ProjectsBoardAssignmentSnapshot {
  id: string
  sheetName: string
  assignee: string
  station: string
  stage: ProjectsBoardAssignmentStage
  status: ProjectsBoardAssignmentStatus
}

interface ProjectsBoardMilestones {
  kitReady: boolean
  buildUpCompletionPercent: number
  ipv1CompletionPercent: number
  crossWiringComplete: boolean
  testReady: boolean
  testPassed: boolean
  powerCheckPassed: boolean
  biqComplete: boolean
  completedAt?: string | null
}

interface D380ProjectsBoardDataSet {
  operatingDate: string
  projects: D380ProjectsBoardProjectRecord[]
}
```

### View Model Layer

```ts
interface ProjectsBoardFilterState {
  search: string
  shift: ShiftOptionId | 'ALL'
  risk: ProjectsBoardRiskLevel | 'ALL'
  lifecycle: ProjectsBoardLifecycleColumnId | 'ALL'
  lateOnly: boolean
}

interface ProjectsBoardProjectCardViewModel {
  id: string
  pdNumber: string
  name: string
  owner: string
  shiftLabel: string
  units: number
  lifecycleStage: ProjectsBoardLifecycleColumnId
  lifecycleLabel: string
  risk: ProjectsBoardRiskLevel
  isLate: boolean
  lateReason?: string
  targetDateLabel: string
  statusNote: string
  progressPercent: number
  assignmentCounts: {
    total: number
    complete: number
    active: number
    blocked: number
  }
  layoutCoverLabel?: string
  coverTone: 'obsidian' | 'amber' | 'cream'
}

interface ProjectsBoardColumnViewModel {
  id: ProjectsBoardLifecycleColumnId
  label: string
  description: string
  projects: ProjectsBoardProjectCardViewModel[]
}

interface D380ProjectsBoardViewModel {
  operatingDateLabel: string
  totalProjects: number
  filteredProjectCount: number
  lateProjectCount: number
  completedProjectCount: number
  watchProjectCount: number
  hasActiveFilters: boolean
  shiftOptions: ProjectsBoardOption[]
  riskOptions: ProjectsBoardOption[]
  lifecycleOptions: ProjectsBoardOption[]
  columns: ProjectsBoardColumnViewModel[]
  emptyState: { title: string; description: string }
}
```

---

## 4. Project Board

**File:** `types/d380-project-board.ts`

Single-project operational board with work areas, members, assignments, and placements.

### Data Layer

```ts
type ProjectBoardLwcSectionId = 'ONSKID' | 'OFFSKID' | 'NEW/FLEX' | 'OFFICE'
type ProjectBoardWorkAreaKind =
  | 'BUILDUP_TABLE' | 'WIRING_TABLE' | 'TEST_STATION'
  | 'FLOAT' | 'NTB' | 'OFFICE_AREA'
type ProjectBoardAssignmentStage =
  | 'BUILD_UP' | 'IPV1' | 'BOX_BUILD' | 'WIRING' | 'IPV2'
  | 'CROSS_WIRING' | 'TEST' | 'POWER_CHECK' | 'BIQ'
type ProjectBoardAssignmentStatus = 'UNASSIGNED' | 'BLOCKED' | 'IN_PROGRESS' | 'ASSIGNED' | 'COMPLETE'
type ProjectBoardWorkAreaLoadState = 'idle' | 'balanced' | 'busy' | 'over-capacity'
type ProjectBoardPlacementMode = 'place' | 'reassign' | 'takeover'
type ProjectBoardMemberRole =
  | 'BUILDUP' | 'WIRING' | 'TEST'
  | 'FLOAT_LEAD' | 'NTB_SPECIALIST' | 'OFFICE_COORDINATOR'

interface D380ProjectBoardProjectRecord {
  id: string
  pdNumber: string
  name: string
  lwc: ProjectBoardLwcSectionId
  shift: ShiftOptionId
  owner: string
  targetDate: string
  units: number
}

interface ProjectBoardWorkAreaRecord {
  id: string
  label: string
  stationCode: string
  lwc: ProjectBoardLwcSectionId
  kind: ProjectBoardWorkAreaKind
  capacity: number
  supportedStages: ProjectBoardAssignmentStage[]
  primaryRoles: ProjectBoardMemberRole[]
  notes: string
}

interface ProjectBoardMemberRecord {
  id: string
  name: string
  initials: string
  shift: ShiftOptionId
  primaryRole: ProjectBoardMemberRole
  secondaryRoles: ProjectBoardMemberRole[]
  lwcAffinities: ProjectBoardLwcSectionId[]
  workstationKinds: ProjectBoardWorkAreaKind[]
  experiencedStages: ProjectBoardAssignmentStage[]
  traineeEligibleStages: ProjectBoardAssignmentStage[]
  priorCompletionProjectIds: string[]
  currentWorkAreaId?: string
}

interface ProjectBoardAssignmentRecord {
  id: string
  projectId: string
  pdNumber: string
  projectName: string
  lwc: ProjectBoardLwcSectionId
  shift: ShiftOptionId
  sheetName: string
  stage: ProjectBoardAssignmentStage
  status: ProjectBoardAssignmentStatus
  requiredRole: ProjectBoardMemberRole
  preferredWorkAreaKinds: ProjectBoardWorkAreaKind[]
  traineeAllowed: boolean
  currentWorkAreaId?: string
  currentMemberIds: string[]
  continuityMemberIds: string[]
  dependencyIds: string[]
  blockedReason?: string
  progressPercent: number
  priority: 1 | 2 | 3 | 4 | 5
  carriedFromPriorShift: boolean
  statusNote: string
}

interface D380ProjectBoardDataSet {
  operatingDate: string
  activeShift: ShiftOptionId
  projects: D380ProjectBoardProjectRecord[]
  workAreas: ProjectBoardWorkAreaRecord[]
  members: ProjectBoardMemberRecord[]
  assignments: ProjectBoardAssignmentRecord[]
}
```

### View Model Layer

```ts
interface ProjectBoardAssignmentViewModel {
  id: string
  projectId: string
  pdNumber: string
  projectName: string
  sheetName: string
  lwcLabel: string
  shiftLabel: string
  stage: ProjectBoardAssignmentStage
  stageLabel: string
  status: ProjectBoardAssignmentStatus
  statusLabel: string
  requiredRoleLabel: string
  progressPercent: number
  priorityLabel: string
  statusNote: string
  blockedReason?: string
  currentWorkAreaLabel?: string
  currentMemberNames: string[]
  continuityLabel?: string
  traineeAllowed: boolean
  canPlace: boolean
  recommendationReasons: string[]
}

interface ProjectBoardWorkAreaCardViewModel {
  id: string
  label: string
  stationCode: string
  lwc: ProjectBoardLwcSectionId
  kind: ProjectBoardWorkAreaKind
  kindLabel: string
  capacity: number
  notes: string
  load: ProjectBoardWorkAreaLoadViewModel
  assignedMembers: Array<{ id: string; name: string; initials: string; roleLabel: string }>
  activeAssignments: ProjectBoardAssignmentViewModel[]
  recommendedAssignments: ProjectBoardAssignmentViewModel[]
}

interface ProjectBoardPlacementSelection {
  workAreaId: string
  assignmentId: string
  memberIds: string[]
  traineePairing: boolean
  mode: ProjectBoardPlacementMode
}

interface D380ProjectBoardViewModel {
  operatingDateLabel: string
  activeShiftLabel: string
  summary: {
    backlogCount: number
    carryoverCount: number
    staffedAreasCount: number
    workAreaCount: number
  }
  backlog: {
    unassigned: ProjectBoardAssignmentViewModel[]
    blocked: ProjectBoardAssignmentViewModel[]
    priorShift: ProjectBoardAssignmentViewModel[]
    recommended: ProjectBoardAssignmentViewModel[]
  }
  sections: ProjectBoardLwcSectionViewModel[]
  selectedWorkArea?: ProjectBoardWorkAreaDetailsViewModel
  selectedPlacement?: ProjectBoardPlacementDrawerViewModel
  emptyState: { title: string; description: string }
}
```

---

## 5. Project Workspace

**File:** `types/d380-project-workspace.ts`

Individual project workspace with tabs for overview, assignments, files, progress, team, and exports.

### Data Layer

```ts
type ProjectWorkspaceTabId =
  | 'OVERVIEW' | 'ASSIGNMENTS' | 'FILES'
  | 'PROGRESS' | 'TEAM_ASSIGNMENTS' | 'EXPORTS'
type ProjectWorkspaceAssignmentStage =
  | 'BUILD_UP' | 'IPV1' | 'BOX_BUILD' | 'WIRING' | 'IPV2'
  | 'CROSS_WIRING' | 'TEST' | 'POWER_CHECK' | 'BIQ'
type ProjectWorkspaceAssignmentStatus = 'queued' | 'active' | 'blocked' | 'complete'
type ProjectWorkspaceFileCategory = 'LAYOUT' | 'WIRE_LIST' | 'REFERENCE' | 'STATE' | 'EXPORT'
type ProjectWorkspaceFileStatus = 'ready' | 'watch' | 'missing' | 'staged'
type ProjectWorkspaceExportStatus = 'ready' | 'watch' | 'not-ready'

interface D380ProjectWorkspaceProjectRecord {
  id: string
  pdNumber: string
  name: string
  revision: string
  owner: string
  shift: ShiftOptionId
  targetDate: string
  lifecycle: ProjectsBoardLifecycleColumnId
  risk: ProjectsBoardRiskLevel
  lwc: ProjectBoardLwcSectionId
  units: number
  leadSummary: string
  statusNote: string
  assignmentCounts: { total: number; complete: number; active: number; blocked: number }
  stageSummary: Array<{ stage: ProjectWorkspaceAssignmentStage; count: number }>
  blockers: string[]
  assignments: ProjectWorkspaceAssignmentRecord[]
  files: ProjectWorkspaceFileRecord[]
  members: ProjectWorkspaceMemberRecord[]
  traineePairings: ProjectWorkspaceTraineePairingRecord[]
  exports: ProjectWorkspaceExportRecord[]
}

interface ProjectWorkspaceAssignmentRecord {
  id: string
  sheetName: string
  stage: ProjectWorkspaceAssignmentStage
  status: ProjectWorkspaceAssignmentStatus
  assignedMemberIds: string[]
  traineeMemberIds: string[]
  workstationLabel?: string
  lwc: ProjectBoardLwcSectionId
  estimatedHours: number
  averageHours: number
  progressPercent: number
  statusNote: string
  blockedReason?: string
}

interface ProjectWorkspaceFileRecord {
  id: string
  category: ProjectWorkspaceFileCategory
  label: string
  fileName: string
  revision: string
  status: ProjectWorkspaceFileStatus
  sourceLabel: string
  lastUpdatedLabel: string
  note: string
}

interface ProjectWorkspaceMemberRecord {
  id: string
  name: string
  initials: string
  role: string
  shift: ShiftOptionId
  workstationLabel: string
  lwc: ProjectBoardLwcSectionId
  assignmentIds: string[]
  continuityOwner: boolean
}
```

### View Model Layer

```ts
interface D380ProjectWorkspaceViewModel {
  projectId: string
  found: boolean
  operatingDateLabel: string
  tabs: ProjectWorkspaceTabViewModel[]
  stageReadiness: ProjectWorkspaceStageReadinessCardViewModel[]
  overview?: ProjectWorkspaceOverviewViewModel
  assignments?: ProjectWorkspaceAssignmentsViewModel
  files?: ProjectWorkspaceFilesViewModel
  progress?: ProjectWorkspaceProgressViewModel
  teamAssignments?: ProjectWorkspaceTeamAssignmentsViewModel
  exports?: ProjectWorkspaceExportsViewModel
  emptyState: { title: string; description: string }
}

interface ProjectWorkspaceHeaderViewModel {
  id: string
  pdNumber: string
  name: string
  revisionLabel: string
  targetDateLabel: string
  lifecycleLabel: string
  risk: ProjectsBoardRiskLevel
  shiftLabel: string
  lwcLabel: string
  owner: string
  statusNote: string
  leadSummary: string
}

interface ProjectWorkspaceAssignmentItemViewModel {
  id: string
  projectId: string
  sheetName: string
  stageId: ProjectWorkspaceAssignmentStage
  stageLabel: string
  statusLabel: string
  assignedMemberCount: number
  traineeCount: number
  workstationLabel?: string
  lwcLabel: string
  estimatedHoursLabel: string
  averageHoursLabel: string
  progressPercent: number
  statusNote: string
  blockedReason?: string
  sheetWorkspaceHref: string
  sheetWorkspaceLabel: string
  stageActionLabel?: string
  stageActionHref?: string
}
```

---

## 6. Project Persistence & State

### `StoredProjectRecord` — `lib/project-state/share-project-state-handlers.ts`

```ts
interface StoredProjectRecord {
  id: string
  name: string
  filename: string
  createdAt: string
  projectModel: ProjectModel
}
```

### `ProjectSheetStateRecord` — `lib/persistence/project-sheet-state.ts`

```ts
interface ProjectSheetStateRecord {
  projectId: string
  sheetSlug: string
  updatedAt: string
  rowPatches: RowPatch[]
  workflow: SheetWorkflowState
  columnVisibility: ColumnVisibility
  columnOrder: ColumnOrder
  brandingEdits: SheetBrandingEdits
  revisionSelection: SheetRevisionSelection
  patchHistory: PatchHistory
}

type ProjectSheetStateSection =
  | "rowPatches" | "workflow" | "columnVisibility"
  | "columnOrder" | "brandingEdits" | "revisionSelection" | "patchHistory"
```

### `ProjectState` — `lib/data-loader/share-utils.ts`

```ts
interface ProjectState {
  pdNumber: string
  projectName: string
  projectId: string
  status: string
  priority: number
  createdAt: string
  updatedAt: string
  startedAt: string | null
  estimatedCompletion: string | null
  totalSheets: number
  completedSheets: number
  sourceFolder?: string
  wireListFile?: string | null
  layoutFile?: string | null
  revision?: string
  dataMode: 'extracted' | 'live'
}

interface ProjectAssignmentProgress {
  projectId: string
  stageHistory: StageHistoryEntry[]
  currentStage: string
  assignments: AssignmentProgressRecord[]
  updatedAt: string
  dataMode: 'extracted' | 'live'
}

interface ActiveProjectsState {
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
```

---

## 7. Project Import & Discovery

### `ShareImportedProject` — `lib/d380-import/share-project-import.ts`

```ts
interface ShareImportedProject {
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
```

### `DiscoveredProject` — `lib/data-loader/share-utils.ts`

```ts
interface DiscoveredProject {
  folder: string
  projectId: string
  pdNumber: string
}
```

### `LegalDrawingsProject` — `lib/data-loader/legal-drawings-loader.ts`

```ts
interface LegalDrawingsProject {
  folderName: string
  pdNumber: string
  projectName: string
  folderPath: string
  wireList: {
    filename: string
    fullPath: string
    revision: string
    isModified: boolean
    modificationNumber?: string
  } | null
  layoutPdf: { filename: string; fullPath: string; revision: string } | null
  elsPdf: { filename: string; fullPath: string; revision: string } | null
  allFiles: string[]
}

interface LoadedLegalProject {
  id: string
  pdNumber: string
  projectName: string
  folderName: string
  revision: string
  wireListPath: string | null
  layoutPdfPath: string | null
  projectModel: ProjectModel | null
  error?: string
}
```

### `ProjectMetadata` — `lib/layout-matching/types.ts`

```ts
interface ProjectMetadata {
  projectNumber?: string
  revision?: string
  source: "filename" | "content" | "both"
}
```

---

## 8. Project Context

**File:** `contexts/project-context.tsx`

React context providing project CRUD and current-project state.

```ts
interface StoredProject {
  id: string
  name: string
  filename: string
  createdAt: string
  projectModel: ProjectModel
}

interface StoredProjects {
  [projectId: string]: StoredProject
}

interface ProjectContextValue {
  currentProject: ProjectModel | null
  currentProjectId: string | null
  layoutPdf: ParsedLayoutPdf | null
  partNumberMap: Map<string, PartNumberLookupResult>
  getPartNumber: (deviceId: string | null | undefined) => PartNumberLookupResult | undefined
  blueLabelsMap: BlueLabelMap
  hasBlueLabel: (deviceId: string | null | undefined) => boolean
  getBlueLabels: (deviceId: string | null | undefined) => BlueLabelLookupResult | undefined
  assignmentMappings: MappedAssignment[]
  hasAssignmentMappings: boolean
  saveAssignmentMappings: (mappings: MappedAssignment[]) => void
  allProjects: StoredProject[]
  loadProject: (projectId: string) => void
  saveProject: (project: ProjectModel) => void
  deleteProject: (projectId: string) => void
  setLayoutPdf: (pdf: ParsedLayoutPdf | null) => void
  clearCurrentProject: () => void
  isLoading: boolean
}
```

---

## 9. Cross-Domain References

These interfaces reference project data from other domain contexts.

### Startup — `types/d380-startup.ts`

```ts
interface StartupProjectPreview {
  id: string
  pdNumber: string
  name: string
  priority: number
  units: number
  targetDate: string
  risk: 'healthy' | 'watch' | 'late'
  preferredShift: ShiftOptionId
}
```

### Dashboard — `types/d380-dashboard.ts`

```ts
type DashboardProjectStage = 'Upcoming' | 'Conlay' | 'Conasy' | 'Test' | 'PWR Check' | 'BIQ'

interface DashboardProjectPreview {
  id: string
  pdNumber: string
  name: string
  stage: DashboardProjectStage
  owner: string
  targetDate: string
  progressPercent: number
  units: number
  risk: DashboardRiskLevel
  statusLabel: string
  updatedLabel: string
}
```

### Dependency Graph — `types/d380-dependency-graph.ts`

```ts
interface ProjectLifecycleSnapshot {
  projectId: string
  totalAssignments: number
  countsByStage: Record<AssignmentStage, number>
  blockedAssignments: number
  readyAssignments: number
  lateAssignments: number
  buildUpReadyCount: number
  wiringReadyCount: number
  readyToHangCount: number
  crossWireCandidateCount: number
  crossWireReady: boolean
  testReady: boolean
  powerCheckReady: boolean
  biqReady: boolean
  isComplete: boolean
  overallProgress: number
  nextRecommendedProjectAction?: string
  reasons: string[]
}

interface ProjectMilestoneEvent {
  timestamp: string
  milestone:
    | 'CROSS_WIRE_READY' | 'TEST_READY'
    | 'POWER_CHECK_READY' | 'BIQ_READY' | 'PROJECT_COMPLETE'
  reasons: string[]
}

interface CrossWireProjectReadiness {
  isReady: boolean
  candidateAssignments: string[]
  readyAssignments: string[]
  blockedAssignments: string[]
  readyToHangProgress: number
  boxBuildProgress: number
  reasons: string[]
}
```

### Build-Up — `types/d380-build-up.ts`

```ts
interface D380ProjectBuildUpRecord {
  id: string
  projectId: string
  pdNumber: string
  projectName: string
  unit: string
  panelName: string
  revision: string
  drawingTitle: string
  shift: ShiftOptionId
  statusNote: string
  leadSummary: string
  assignedMemberIds: string[]
  members: BuildUpWorkflowMemberRecord[]
  projectVerification: BuildUpProjectVerificationRecord
  mechanicalExtraction: BuildUpMechanicalExtractionRecord
  panelInstalledComponents: BuildUpInstalledComponentRecord[]
  railInstalledComponents: BuildUpInstalledComponentRecord[]
  groundingPlan: BuildUpGroundingRecord[]
  finalInspection: BuildUpFinalInspectionItemRecord[]
  exportRecord: BuildUpExportRecord
  sections: BuildUpWorkflowSectionRecord[]
}
```

### Catalog — `types/d380-catalog.ts`

```ts
interface ProjectReferenceData {
  projectId: string
  partNumbers: NormalizedReference[]
  cablePartNumbers: NormalizedReference[]
  blueLabels: NormalizedReference[]
  whiteLabels: NormalizedReference[]
  heatShrinkLabels: NormalizedReference[]
  panelErrors: NormalizedReference[]
  builtAt: string
  sourceSheets: string[]
}
```

### Notifications — `types/d380-notifications.ts`

```ts
interface NotificationProjectOption {
  value: string
  label: string
  count: number
}
```

---

## 10. Interface Audit — Usage, Deprecation & Merge Candidates

> Last audited: 2026-04-11
> Scope: All project-domain interfaces across `types/`, `lib/`, `contexts/`

### 10.1 Usage Status Legend

| Status | Meaning |
|---|---|
| **ACTIVE** | Imported and used in runtime code (components, hooks, services, view-models) |
| **TYPE-ONLY** | Used only as a field type within the same definition file; never independently imported |
| **UNUSED** | Exported but never imported or referenced anywhere outside its definition file |

---

### 10.2 Usage Status by Section

#### Section 1 — Core Project Model

| Type | Status | Notes |
|---|---|---|
| `ProjectModel` | ACTIVE | Core of project context, hooks, route pages |
| `ProjectSheetSummary` | ACTIVE | Used across wire-list, hooks, project details |
| `LwcType` | ACTIVE | Project context, route pages, LwcTypeField component |
| `LwcTypeConfig` | ACTIVE | LwcTypeField component |
| `ProjectSheetKind` | ACTIVE | Column visibility, sheet classification |
| `ParsingState` | ACTIVE | use-project-workbook hook |
| `UploadProgress` | ACTIVE | Hook + route page |
| `UploadedProjectWorkbook` | **UNUSED** | Defined in `lib/workbook/types.ts` but never imported anywhere. Safe to remove. |

#### Section 2 — Project Details

| Type | Status | Notes |
|---|---|---|
| `ProjectDetailsRecord` | ACTIVE | Adapters, hooks, services, route page |
| `ProjectUnitRecord` | ACTIVE | Unit switcher, create flow, side panel, revision sidebar |
| `ProjectRevisionSetRecord` | ACTIVE | Share state, adapters, service contracts |
| `ProjectRevisionDeltaRecord` | ACTIVE | State handlers, share state, service contracts |
| `ProjectRevisionMismatchState` | ACTIVE | Share state runtime function |
| `ProjectRevisionChangeCategory` | ACTIVE | Service contract input |
| `ProjectFeatureAccessRecord` | ACTIVE | Adapters, simulated provider |
| `ProjectFeatureDefinitionRecord` | ACTIVE | Share state, service contracts, simulated provider |
| `ProjectValidationFindingRecord` | ACTIVE | Hooks, share state, validation rules, service contracts |
| `ProjectValidationSeverity` | ACTIVE | Validation rules utility |
| `ProjectGreenChangeSummaryRecord` | ACTIVE | Adapter function |
| `ProjectUnitStatus` | **TYPE-ONLY** | Only used as `ProjectUnitRecord.status` field type. Never independently imported. |
| `ProjectRevisionSourceRecord` | **TYPE-ONLY** | Only used as `ProjectRevisionSetRecord.sources` element type. Never independently imported. |
| `ProjectFeatureAccessSource` | **TYPE-ONLY** | Only used as `ProjectFeatureAccessRecord.source` field type. Never independently imported. |

#### Section 3 — Projects Board

| Type | Status | Notes |
|---|---|---|
| `D380ProjectsBoardProjectRecord` | ACTIVE | View-model builder, import service |
| `ProjectsBoardAssignmentSnapshot` | ACTIVE | Import service runtime builder |
| `ProjectsBoardMilestones` | ACTIVE | Import service runtime builder |
| `D380ProjectsBoardDataSet` | ACTIVE | Import service, view-model, route component |
| `ProjectsBoardFilterState` | ACTIVE | Route component, filter bar, view-model |
| `ProjectsBoardProjectCardViewModel` | ACTIVE | Card component, workspace panels, view-model, shell types |
| `ProjectsBoardColumnViewModel` | ACTIVE | Lifecycle column/board components, view-model |
| `D380ProjectsBoardViewModel` | ACTIVE | View-model builder return type |
| `ProjectsBoardOption` | ACTIVE | Filter bar component |
| `ProjectsBoardLifecycleColumnId` | ACTIVE | Workspace types, status badge, view-model |
| `ProjectsBoardRiskLevel` | ACTIVE | Workspace types, risk badge |
| `ProjectsBoardAssignmentStage` | **TYPE-ONLY** | Only used as `ProjectsBoardAssignmentSnapshot.stage`. Never imported standalone. |
| `ProjectsBoardAssignmentStatus` | **TYPE-ONLY** | Only used as `ProjectsBoardAssignmentSnapshot.status`. Never imported standalone. |

#### Section 4 — Project Board

| Type | Status | Notes |
|---|---|---|
| `ProjectBoardWorkAreaRecord` | ACTIVE | View-model functions |
| `ProjectBoardMemberRecord` | ACTIVE | View-model functions |
| `ProjectBoardAssignmentRecord` | ACTIVE | View-model functions |
| `D380ProjectBoardDataSet` | ACTIVE | View-model, route component |
| `ProjectBoardPlacementSelection` | ACTIVE | View-model, route component |
| `ProjectBoardAssignmentViewModel` | ACTIVE | Work area stack, canvas, recommendation panel, modal |
| `ProjectBoardWorkAreaCardViewModel` | ACTIVE | View-model, work area card, canvas |
| `D380ProjectBoardViewModel` | ACTIVE | View-model, backlog panel, workspace |
| `ProjectBoardLwcSectionId` | ACTIVE | Workspace types, assignment workspace types, view-model |
| `ProjectBoardWorkAreaKind` | ACTIVE | Assignment workspace, station badge, station card, modal |
| `D380ProjectBoardProjectRecord` | **TYPE-ONLY** | Only referenced as `D380ProjectBoardDataSet.projects` element. Never externally imported. |
| `ProjectBoardAssignmentStage` | **TYPE-ONLY** | Field type in records only. Never imported standalone. |
| `ProjectBoardAssignmentStatus` | **TYPE-ONLY** | Field type in records only. Never imported standalone. |
| `ProjectBoardWorkAreaLoadState` | **TYPE-ONLY** | Field type in `ProjectBoardWorkAreaLoadViewModel` only. |
| `ProjectBoardPlacementMode` | **TYPE-ONLY** | Field type in `ProjectBoardPlacementSelection.mode` only. |
| `ProjectBoardMemberRole` | **TYPE-ONLY** | Field type across records. Never imported standalone. |

#### Section 5 — Project Workspace

| Type | Status | Notes |
|---|---|---|
| `D380ProjectWorkspaceProjectRecord` | ACTIVE | Import service, share state, view-model |
| `ProjectWorkspaceFileRecord` | ACTIVE | Import service (6+ functions) |
| `D380ProjectWorkspaceDataSet` | ACTIVE | Route, import, leaderboard + workspace view-models |
| `D380ProjectWorkspaceViewModel` | ACTIVE | View-model builder return type |
| `ProjectWorkspaceHeaderViewModel` | ACTIVE | Workspace header component |
| `ProjectWorkspaceAssignmentItemViewModel` | ACTIVE | Workspace panels, list item component, shell types |
| `ProjectWorkspaceTabId` | ACTIVE | Route component, view-model |
| `ProjectWorkspaceAssignmentRecord` | **UNUSED** | Only referenced as inline member type within same file. |
| `ProjectWorkspaceMemberRecord` | **UNUSED** | Only referenced as inline member type within same file. |
| `ProjectWorkspaceTraineePairingRecord` | **UNUSED** | Only referenced as inline member type within same file. |
| `ProjectWorkspaceExportRecord` | **UNUSED** | Only referenced as inline member type within same file. |
| `ProjectWorkspaceAssignmentStage` | **TYPE-ONLY** | Field type only. Never imported standalone. |
| `ProjectWorkspaceAssignmentStatus` | **TYPE-ONLY** | Field type only. Never imported standalone. |
| `ProjectWorkspaceFileCategory` | **TYPE-ONLY** | Field type only. Never imported standalone. |
| `ProjectWorkspaceFileStatus` | **TYPE-ONLY** | Field type only. Never imported standalone. |
| `ProjectWorkspaceExportStatus` | **TYPE-ONLY** | Field type only. Never imported standalone. |

#### Section 6 — Persistence & State

| Type | Status | Notes |
|---|---|---|
| `StoredProjectRecord` | ACTIVE | API route, share-loader, import service |
| `ProjectSheetStateRecord` | ACTIVE | API route, project-storage, sheet state handlers |
| `ProjectSheetStateSection` | ACTIVE | API route, project-storage, sheet state handlers |
| `ActiveProjectsState` | ACTIVE | Re-exported; used in share-loader runtime |
| `DiscoveredProject` | ACTIVE | Share-loader (caching, discovery) |
| `ProjectAssignmentProgress` | ACTIVE ⚠️ | **Has local duplicate** in API route (see §10.4) |
| `StageHistoryEntry` | ACTIVE ⚠️ | **Defined 3× in different files** (see §10.4) |
| `AssignmentProgressRecord` | ACTIVE ⚠️ | **Defined 3× with divergent fields** (see §10.4) |
| `ProjectState` | **TYPE-ONLY** | Re-exported via index/client but never actually imported by any consumer. |

#### Section 7 — Import & Discovery

| Type | Status | Notes |
|---|---|---|
| `ShareImportedProject` | ACTIVE | Project sync service (5+ functions) |
| `LegalDrawingsProject` | ACTIVE | Loader, API route, diagnostics |
| `ProjectMetadata` | ACTIVE | Layout matching comparison + parser |
| `ShareProjectFileDescriptor` | **UNUSED** | Not exported; file-local only. |
| `LoadedLegalProject` | **TYPE-ONLY** | Re-exported but never imported by any consumer. |

#### Section 8 — Project Context

| Type | Status | Notes |
|---|---|---|
| `StoredProject` | ACTIVE ⚠️ | Used in route pages, tools. **Duplicate of `StoredProjectRecord`** (see §10.3). |
| `StoredProjects` | **UNUSED** | Exported but only used internally in `project-context.tsx`. |
| `ProjectContextValue` | **UNUSED** | Not exported. File-internal only. |

#### Section 9 — Cross-Domain

| Type | Status | Notes |
|---|---|---|
| `StartupProjectPreview` | ACTIVE | Import service |
| `DashboardProjectPreview` | ACTIVE | Dashboard view-model, 3 rail components |
| `ProjectLifecycleSnapshot` | ACTIVE | Dependency graph lib, hook, 2 components |
| `CrossWireProjectReadiness` | ACTIVE | Dependency graph lib, hook, 3 components |
| `D380ProjectBuildUpRecord` | ACTIVE | Build-up hook, view-model (15+ functions) |
| `ProjectReferenceData` | ACTIVE | Catalog hook, normalizer, catalog index |
| `NotificationProjectOption` | ACTIVE | Notification filter bar |
| `DashboardProjectStage` | **TYPE-ONLY** | Only used as `DashboardProjectPreview.stage` field type. |
| `ProjectMilestoneEvent` | **UNUSED** | Defined in `d380-dependency-graph.ts` but never imported. Placeholder for future milestone emission logic. |

---

### 10.3 Merge Candidates (No Backward Compatibility Needed)

These interfaces are duplicates or near-duplicates that can be safely consolidated.

#### `StoredProject` ↔ `StoredProjectRecord`

| Field | `StoredProject` (contexts/) | `StoredProjectRecord` (lib/) |
|---|---|---|
| `id` | `string` | `string` |
| `name` | `string` | `string` |
| `filename` | `string` | `string` |
| `createdAt` | `string` | `string` |
| `projectModel` | `ProjectModel` | `ProjectModel` |

**Identical fields.** `StoredProject` is the client-side version in `contexts/project-context.tsx`. `StoredProjectRecord` is the server-side version in `lib/project-state/share-project-state-handlers.ts`.

**Refactor:** Remove `StoredProject`, import `StoredProjectRecord` everywhere. Or rename to a single `StoredProject` in a shared types file.

#### `ProjectsBoardAssignmentStatus` ↔ `ProjectWorkspaceAssignmentStatus`

```
ProjectsBoardAssignmentStatus  = 'queued' | 'active' | 'complete' | 'blocked'
ProjectWorkspaceAssignmentStatus = 'queued' | 'active' | 'blocked' | 'complete'
```

**Identical values** (different ordering). Neither is independently imported. Can be unified into a single `ProjectAssignmentStatus` type.

#### `ProjectBoardAssignmentStage` ↔ `ProjectWorkspaceAssignmentStage`

```
ProjectBoardAssignmentStage     = 'BUILD_UP' | 'IPV1' | 'BOX_BUILD' | 'WIRING' | 'IPV2' | 'CROSS_WIRING' | 'TEST' | 'POWER_CHECK' | 'BIQ'
ProjectWorkspaceAssignmentStage = 'BUILD_UP' | 'IPV1' | 'BOX_BUILD' | 'WIRING' | 'IPV2' | 'CROSS_WIRING' | 'TEST' | 'POWER_CHECK' | 'BIQ'
```

**Identical values.** Neither is independently imported. Can be unified into a single `ProjectAssignmentStage` type.

Note: `ProjectsBoardAssignmentStage` differs — it includes `'KIT'` and omits `'BOX_BUILD'`, `'IPV2'`, `'POWER_CHECK'`. This is intentional (the multi-project board has a different lifecycle view) and should stay separate.

#### `ProjectBoardLwcSectionId` vs `LwcType`

```
ProjectBoardLwcSectionId = 'ONSKID' | 'OFFSKID' | 'NEW/FLEX' | 'OFFICE'
LwcType                  = 'NEW_FLEX' | 'ONSKID' | 'OFFSKID' | 'NTB' | 'FLOAT'
```

**Overlapping but intentionally different.** `LwcType` represents workbook/upload classification. `ProjectBoardLwcSectionId` represents physical floor sections (includes `'OFFICE'`, uses `'NEW/FLEX'` variant). **Do not merge** — different domains with different values.

---

### 10.4 Duplicate Definitions (Require Consolidation)

These are the same interface defined multiple times in different files. The copies should be removed and consolidated to a single source of truth.

#### `StageHistoryEntry` — 3 definitions

| Location | Exported? |
|---|---|
| `lib/data-loader/share-utils.ts` | ✅ (canonical) |
| `app/api/d380/projects/[projectId]/progress/route.ts` | ❌ (local) |
| `lib/d380-import/project-sync-service.ts` | ❌ (local) |

**Refactor:** Delete the 2 local copies. Import from `lib/data-loader/share-utils` (or `lib/data-loader`).

#### `AssignmentProgressRecord` — 3 definitions (divergent)

| Location | Exported? | Fields |
|---|---|---|
| `lib/data-loader/share-utils.ts` | ✅ (canonical) | Full: `sheetName`, `stage`, `status`, `progress`, `assignedBadge`, `station`, `defectCount`, `updatedAt` |
| `app/api/d380/projects/[projectId]/progress/route.ts` | ❌ (local) | **Missing:** `assignedBadge`, `station`, `defectCount` |
| `lib/d380-import/project-sync-service.ts` | ❌ (local) | Full (matches canonical) |

**Refactor:** Delete the 2 local copies. Import from `lib/data-loader/share-utils`. The API route's subset usage works fine with the superset type.

#### `ProjectAssignmentProgress` — 2 definitions (divergent)

| Location | Exported? | Fields |
|---|---|---|
| `lib/data-loader/share-utils.ts` | ✅ (canonical) | Full: includes `dataMode` field |
| `app/api/d380/projects/[projectId]/progress/route.ts` | ❌ (local) | **Missing:** `dataMode` |

**Refactor:** Delete the local copy. Import from `lib/data-loader/share-utils`.

---

### 10.5 Safe Removals (Unused / Dead Code)

These interfaces can be deleted without affecting any runtime behavior.

| Interface | File | Reason |
|---|---|---|
| `UploadedProjectWorkbook` | `lib/workbook/types.ts` | Never imported anywhere. |
| `ProjectMilestoneEvent` | `types/d380-dependency-graph.ts` | Never imported. Only referenced in architecture gap docs as future work. |
| `StoredProjects` | `contexts/project-context.tsx` | Only used internally. Can be inlined as `Record<string, StoredProject>`. |
| `ProjectContextValue` | `contexts/project-context.tsx` | Not exported. Already file-internal. No external dependency; removing export keyword is a no-op. |
| `ProjectState` | `lib/data-loader/share-utils.ts` | Re-exported but never consumed by any module. |
| `LoadedLegalProject` | `lib/data-loader/legal-drawings-loader.ts` | Re-exported but never imported by any consumer. |
| `ShareProjectFileDescriptor` | `lib/d380-import/share-project-import.ts` | Not exported; file-local only. Already invisible externally. |

### 10.6 TYPE-ONLY Candidates for Inlining

These types exist solely as field types in parent interfaces within the same file. They are never independently imported. They can be inlined as literal union types on the parent field if simpler code is preferred.

| Type | File | Parent Usage |
|---|---|---|
| `ProjectUnitStatus` | `types/d380-project-details.ts` | `ProjectUnitRecord.status` |
| `ProjectFeatureAccessSource` | `types/d380-project-details.ts` | `ProjectFeatureAccessRecord.source` |
| `ProjectRevisionSourceRecord` | `types/d380-project-details.ts` | `ProjectRevisionSetRecord.sources[]` |
| `ProjectsBoardAssignmentStage` | `types/d380-projects-board.ts` | `ProjectsBoardAssignmentSnapshot.stage` |
| `ProjectsBoardAssignmentStatus` | `types/d380-projects-board.ts` | `ProjectsBoardAssignmentSnapshot.status` |
| `ProjectBoardAssignmentStage` | `types/d380-project-board.ts` | Multiple record fields |
| `ProjectBoardAssignmentStatus` | `types/d380-project-board.ts` | Multiple record fields |
| `ProjectBoardWorkAreaLoadState` | `types/d380-project-board.ts` | `ProjectBoardWorkAreaLoadViewModel.load` |
| `ProjectBoardPlacementMode` | `types/d380-project-board.ts` | `ProjectBoardPlacementSelection.mode` |
| `ProjectBoardMemberRole` | `types/d380-project-board.ts` | Multiple record fields |
| `ProjectWorkspaceAssignmentStage` | `types/d380-project-workspace.ts` | Multiple record fields |
| `ProjectWorkspaceAssignmentStatus` | `types/d380-project-workspace.ts` | Multiple record fields |
| `ProjectWorkspaceFileCategory` | `types/d380-project-workspace.ts` | `ProjectWorkspaceFileRecord.category` |
| `ProjectWorkspaceFileStatus` | `types/d380-project-workspace.ts` | `ProjectWorkspaceFileRecord.status` |
| `ProjectWorkspaceExportStatus` | `types/d380-project-workspace.ts` | `ProjectWorkspaceExportRecord.status` |
| `DashboardProjectStage` | `types/d380-dashboard.ts` | `DashboardProjectPreview.stage` |

> **Recommendation:** Keep named type aliases for stages, statuses, and roles even if TYPE-ONLY. They improve readability and can be independently imported if a consumer needs them later. Inline only trivial one-off types like `ProjectFeatureAccessSource`.
