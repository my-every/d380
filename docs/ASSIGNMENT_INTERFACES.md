# Assignment — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces, types, and constants related to assignment records, stages, workspace, dependency graph, and mapped assignment schemas in D380.

---

## Table of Contents

1. [Sheet Classification](#1-sheet-classification) — `types/d380-assignment.ts`
2. [SWS Types & Assignment Status](#2-sws-types--assignment-status)
3. [Assignment Stages](#3-assignment-stages) — `types/d380-assignment.ts`
4. [Assignment Detection](#4-assignment-detection)
5. [Mapped Assignments](#5-mapped-assignments) — `lib/assignment/mapped-assignment.ts`
6. [Assignment Stage Lifecycle](#6-assignment-stage-lifecycle) — `types/d380-assignment-stages.ts`
7. [Assignment Workspace](#7-assignment-workspace) — `types/d380-assignment-workspace.ts`
8. [Assignment Dependency Graph](#8-assignment-dependency-graph) — `types/d380-dependency-graph.ts`

---

## 1. Sheet Classification

**File:** `types/d380-assignment.ts`

### `WorkbookSheetKind`

```ts
type WorkbookSheetKind = 'assignment' | 'reference' | 'other'
```

### Constants

```ts
const REFERENCE_SHEET_NAMES: readonly string[]
// ['Panel Errors', 'Blue Labels', 'White Labels', 'Heat Shrink Labels',
//  'Cable Part Numbers', 'Part Number List']

const REFERENCE_SHEET_PATTERNS: string[]
// Lowercased/trimmed versions of REFERENCE_SHEET_NAMES
```

---

## 2. SWS Types & Assignment Status

**File:** `types/d380-assignment.ts`

### `SwsType`

```ts
type SwsType = 'BLANK' | 'RAIL' | 'BOX' | 'PANEL' | 'COMPONENT' | 'UNDECIDED'
```

### `AssignmentStatus`

```ts
type AssignmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'INCOMPLETE' | 'COMPLETE'
```

### `ASSIGNMENT_STATUS_CONFIG`

```ts
const ASSIGNMENT_STATUS_CONFIG: Record<AssignmentStatus, {
  label: string
  description: string
  color: string
  actionLabel: string
}>
```

---

## 3. Assignment Stages

**File:** `types/d380-assignment.ts`

### `AssignmentStage`

Full lifecycle including executable stages, milestones, and legacy aliases.

```ts
type AssignmentStage =
  // Setup
  | 'UNASSIGNED'
  // Build Up Flow
  | 'READY_TO_LAY'       // LEGACY
  | 'BUILD_UP'           // EXECUTABLE
  | 'BUILD_UP_IPV'       // IPV verification
  | 'READY_TO_WIRE'      // LEGACY alias for BUILD_UP_IPV
  // Wiring Flow
  | 'WIRING'             // EXECUTABLE
  | 'READY_FOR_VISUAL'   // LEGACY
  | 'READY_TO_HANG'      // LEGACY
  // Box Build + Cross Wire
  | 'BOX_BUILD'          // EXECUTABLE
  | 'CROSS_WIRE'         // EXECUTABLE
  | 'CROSS_WIRING'       // LEGACY alias
  // Test Flow
  | 'READY_TO_TEST'      // MILESTONE
  | 'TEST'               // LEGACY alias
  | 'TEST_READY'         // LEGACY alias
  | 'TEST_1ST_PASS'      // EXECUTABLE
  | 'PWR_CHECK'          // EXECUTABLE
  | 'POWER_CHECK'        // LEGACY alias
  | 'BIQ'                // LEGACY alias
  | 'COMPLETED'          // LEGACY alias
  | 'READY_FOR_BIQ'      // MILESTONE
  | 'FINISHED_BIQ'       // TERMINAL
```

### `AssignmentReadinessState`

```ts
type AssignmentReadinessState = 'NOT_READY' | 'READY' | 'BLOCKED'
```

---

## 4. Assignment Detection

**File:** `types/d380-assignment.ts`

### `AssignmentDetectionSummary`

```ts
interface AssignmentDetectionSummary {
  sheetKind: WorkbookSheetKind
  hasPanelNumber: boolean
  hasWireRows: boolean
  hasExternalLocations: boolean
  layoutTitle?: string
  inferredStructureType: 'PANEL' | 'RAIL' | 'COMPONENT' | 'BOX' | 'UNKNOWN'
  suggestedSwsType: string
  confidence: number                 // 0-100
  reasons: string[]
  requiresWireSws: boolean
  requiresCrossWireSws: boolean
}
```

---

## 5. Mapped Assignments

**File:** `lib/assignment/mapped-assignment.ts`

Zod-validated schema for persisted assignment mapping records.

### `MappedAssignment`

```ts
type MappedAssignment = z.infer<typeof mappedAssignmentSchema>
// Resulting shape:
interface MappedAssignment {
  sheetSlug: string
  sheetName: string
  rowCount: number
  sheetKind: 'assignment' | 'reference' | 'other'
  detectedSwsType: SwsType
  detectedConfidence: number
  detectedReasons: string[]
  selectedSwsType: SwsType
  selectedStage: AssignmentStage
  selectedStatus: AssignmentStatus
  overrideReason: string
  isOverride: boolean
  requiresWireSws: boolean
  requiresCrossWireSws: boolean
  matchedLayoutPage?: number
  matchedLayoutTitle?: string
}
```

---

## 6. Assignment Stage Lifecycle

**File:** `types/d380-assignment-stages.ts`

### `AssignmentStageId`

```ts
type AssignmentStageId =
  | 'KITTED'    | 'BUILD_UP'  | 'IPV1'        | 'WIRING'     | 'IPV2'
  | 'BOX_BUILD' | 'IPV3'      | 'CROSS_WIRING' | 'IPV4'
  | 'TEST_READY'| 'TEST'      | 'POWER_CHECK'  | 'BIQ'
```

### `AssignmentStageDefinition`

```ts
type AssignmentStageCategory = 'setup' | 'build' | 'verify' | 'test' | 'final'
type AssignmentStageStatus = 'pending' | 'active' | 'completed' | 'skipped' | 'blocked'

interface AssignmentStageDefinition {
  id: AssignmentStageId
  label: string
  shortLabel: string
  description: string
  category: AssignmentStageCategory
  order: number
  isVerification: boolean
  requiredForExport: boolean
}
```

### `AssignmentStageState` & `AssignmentStageProgress`

```ts
interface AssignmentStageState {
  stageId: AssignmentStageId
  status: AssignmentStageStatus
  completedAt?: string
  completedBy?: string
  duration?: number             // minutes
  notes?: string
  blockedReason?: string
}

interface AssignmentStageProgress {
  currentStage: AssignmentStageId
  completedStages: AssignmentStageId[]
  stages: AssignmentStageState[]
  overallProgress: number       // 0-100
  estimatedCompletion?: string
}
```

### Constants & Utilities

```ts
const ASSIGNMENT_STAGES: readonly AssignmentStageDefinition[]  // 13 entries, KITTED → BIQ

function getStageDefinition(stageId: AssignmentStageId): AssignmentStageDefinition | undefined
function getStagesByCategory(category: AssignmentStageCategory): AssignmentStageDefinition[]
function getVerificationStages(): AssignmentStageDefinition[]
```

---

## 7. Assignment Workspace

**File:** `types/d380-assignment-workspace.ts`

### Data Layer

```ts
type AssignmentWorkspaceTabId = 'OVERVIEW' | 'STAGES'
type AssignmentWorkspaceStageId =
  | 'BUILDUP' | 'IPV1' | 'WIRING' | 'IPV2' | 'BOX_BUILD'
  | 'CROSS_WIRING' | 'TEST_READY' | 'TEST' | 'PWR_CHECK' | 'BIQ'

type AssignmentWorkspaceStageRuntimeStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETE'
type AssignmentWorkspaceStageDisplayState = 'current' | 'available' | 'blocked' | 'future' | 'complete'

interface D380AssignmentWorkspaceRecord {
  id: string
  projectId: string
  pdNumber: string
  projectName: string
  sheetName: string
  revision: string
  shift: ShiftOptionId
  lwc: ProjectBoardLwcSectionId
  workstationType: ProjectBoardWorkAreaKind
  workstationLabel: string
  targetDate: string
  estimatedHours: number
  averageHours: number
  statusNote: string
  layoutMatchSummary: string
  blockers: string[]
  assignedMemberIds: string[]
  traineeMemberIds: string[]
  members: AssignmentWorkspaceMemberRecord[]
  stages: AssignmentWorkspaceStageRecord[]
}

interface D380AssignmentWorkspaceDataSet {
  operatingDate: string
  assignments: D380AssignmentWorkspaceRecord[]
}
```

### Workflow State

```ts
interface AssignmentStageWorkflowState {
  stages: Record<AssignmentWorkspaceStageId, AssignmentWorkspaceStageWorkflowSnapshot>
  activeStageId?: AssignmentWorkspaceStageId
  currentActionableStageId?: AssignmentWorkspaceStageId
  handoffCount: number
  lastHandoffAt?: string
  lastHandoffShift?: ShiftOptionId
}

interface AssignmentStageWorkflowController {
  assignment?: D380AssignmentWorkspaceRecord
  workflowState: AssignmentStageWorkflowState
  startStage: (stageId: AssignmentWorkspaceStageId) => void
  resumeStage: (stageId: AssignmentWorkspaceStageId) => void
  completeStage: (stageId: AssignmentWorkspaceStageId) => void
  setStageComment: (stageId: AssignmentWorkspaceStageId, comment: string) => void
  toggleChecklistItem: (stageId: AssignmentWorkspaceStageId, checklistItemId: string) => void
  toggleStageBlocked: (stageId: AssignmentWorkspaceStageId) => void
  simulateShiftHandoff: () => void
}
```

### View Model Layer

```ts
interface D380AssignmentWorkspaceViewModel {
  found: boolean
  operatingDateLabel: string
  tabs: AssignmentWorkspaceTabViewModel[]
  overview?: AssignmentWorkspaceOverviewViewModel
  stages?: AssignmentWorkspaceStagesViewModel
  railWidgets: AssignmentWorkspaceRailWidgetViewModel[]
  placeholders: AssignmentWorkspacePlaceholderPanelViewModel[]
  emptyState: { title: string; description: string }
}
```

---

## 8. Assignment Dependency Graph

**File:** `types/d380-dependency-graph.ts`

### Dependency Model

```ts
type AssignmentDependencyKind =
  | 'SELF_STAGE'          | 'PROJECT_STAGE_GATE' | 'CROSS_ASSIGNMENT'
  | 'BOX_BUILD_GATE'      | 'CROSS_WIRE_GATE'    | 'TEST_GATE'
  | 'POWER_GATE'          | 'BIQ_GATE'

interface AssignmentDependency {
  dependencyId: string
  assignmentId: string
  kind: AssignmentDependencyKind
  requiredAssignmentId?: string
  requiredStage?: AssignmentStage
  threshold?: number              // 0-100 for gate dependencies
  description: string
  satisfied: boolean
  reason?: string
}
```

### Graph Structure

```ts
interface AssignmentDependencyNode {
  assignmentId: string
  sheetSlug: string
  name: string
  stage: AssignmentStage
  hasWireRows: boolean
  requiresCrossWireSws: boolean
  swsType: string
  dependencies: AssignmentDependency[]
  blockedBy: string[]
  unlocks: string[]
  isBlocked: boolean
  isReady: boolean
  isLate: boolean
  dueDate?: string
  lateWarningLevel?: 'NONE' | 'APPROACHING' | 'IMMINENT' | 'OVERDUE' | 'CRITICAL'
  nextSuggestedStage?: AssignmentStage
  readinessReasons: string[]
}

interface AssignmentDependencyGraph {
  projectId: string
  builtAt: string
  nodes: AssignmentDependencyNode[]
  nodeIndex: Map<string, AssignmentDependencyNode>
  blockedAssignments: string[]
  readyAssignments: string[]
  justUnlockedAssignments: string[]
  crossWireAvailable: boolean
  crossWireReadiness: CrossWireProjectReadiness
  projectSnapshot: ProjectLifecycleSnapshot
}
```

### Derived Types

```ts
interface AssignmentReadinessResult {
  assignmentId: string
  stage: AssignmentStage
  isBlocked: boolean
  blockedReasons: string[]
  isReady: boolean
  readyReasons: string[]
  nextSuggestedStage?: AssignmentStage
  unlocks: string[]
}

interface AutoProgressionResult {
  assignmentId: string
  currentStage: AssignmentStage
  shouldProgress: boolean
  nextStage?: AssignmentStage
  reasons: string[]
  requiresConfirmation: boolean
}
```

### Event Types

```ts
interface AssignmentUnlockedEvent {
  timestamp: string
  unlockedAssignmentIds: string[]
  trigger?: {
    assignmentId: string
    previousStage: AssignmentStage
    newStage: AssignmentStage
  }
}

interface ProjectMilestoneEvent {       // ⚠️ UNUSED — see audit
  timestamp: string
  milestone: 'CROSS_WIRE_READY' | 'TEST_READY' | 'POWER_CHECK_READY' | 'BIQ_READY' | 'PROJECT_COMPLETE'
  reasons: string[]
}
```

---

## Cross-Domain References

| Type | Source | Consumed By |
|---|---|---|
| `AssignmentStage` | `d380-assignment.ts` | Dependency graph, mapped assignments, project lifecycle snapshot |
| `SwsType` | `d380-assignment.ts` | Mapped assignments, SWS auto-detection |
| `MappedAssignment` | `lib/assignment/mapped-assignment.ts` | Project context, assignment mapping modal, project details |
| `ShiftOptionId` | `d380-startup.ts` | Assignment workspace records, member records, handoff state |
| `ProjectBoardLwcSectionId` | `d380-project-board.ts` | `D380AssignmentWorkspaceRecord.lwc` |
| `ProjectBoardWorkAreaKind` | `d380-project-board.ts` | `D380AssignmentWorkspaceRecord.workstationType` |
| `CrossWireProjectReadiness` | `d380-dependency-graph.ts` | Dependency graph, cross-wire readiness panel |
| `ProjectLifecycleSnapshot` | `d380-dependency-graph.ts` | Dependency graph, project lifecycle summary component |
