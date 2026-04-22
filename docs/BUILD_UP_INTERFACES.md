# Build-Up Workflow — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces, types, and constants related to the D380 build-up workflow — section definitions, mechanical extraction, component installation, grounding, blue labels, inspection, and export.

---

## Table of Contents

1. [Section & Status Types](#1-section--status-types)
2. [Component & Material Types](#2-component--material-types)
3. [Checklist & Section State](#3-checklist--section-state)
4. [Project Verification](#4-project-verification)
5. [Mechanical Extraction](#5-mechanical-extraction)
6. [Installed Components](#6-installed-components)
7. [Grounding & Blue Labels](#7-grounding--blue-labels)
8. [Final Inspection & Export](#8-final-inspection--export)
9. [Data Set & Workflow Records](#9-data-set--workflow-records)
10. [Workflow State & Controller](#10-workflow-state--controller)
11. [View Models](#11-view-models)

---

## 1. Section & Status Types

**File:** `types/d380-build-up.ts`

```ts
type BuildUpWorkflowSectionId =
  | 'PROJECT_VERIFICATION' | 'MECHANICAL_SUMMARY'  | 'RAIL_CUT_LIST'
  | 'PANDUCT_CUT_LIST'     | 'PANEL_COMPONENTS'    | 'RAIL_COMPONENTS'
  | 'GROUNDING'            | 'BLUE_LABELS'         | 'FINAL_INSPECTION'
  | 'EXPORT_READINESS'

type BuildUpWorkflowSectionRuntimeStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETE'
type BuildUpWorkflowSectionDisplayState = 'current' | 'available' | 'blocked' | 'future' | 'complete'
```

---

## 2. Component & Material Types

**File:** `types/d380-build-up.ts`

```ts
type BuildUpRailType = 'STANDARD' | 'LOW_PROFILE' | 'PROFILE'
type BuildUpRailMountSide = 'LEFT' | 'RIGHT' | 'CENTER' | 'UNKNOWN'
type BuildUpComponentMountType = 'PANEL' | 'RAIL'
type BuildUpGroundingKind = 'FRAME_GROUND' | 'RAIL_GROUND' | 'BONDING'
type BuildUpLabelPlacementFace = 'front' | 'top' | 'side'
type BuildUpLabelPlacementMode = 'center' | 'before' | 'between'
type BuildUpLabelTemplateSize = 'small' | 'medium' | 'large'
```

---

## 3. Checklist & Section State

**File:** `types/d380-build-up.ts`

```ts
interface BuildUpChecklistItemRecord {
  id: string
  label: string
  required: boolean
  completed: boolean
}

interface BuildUpSectionChecklistState {
  id: string
  label: string
  checked: boolean
}

interface BuildUpSectionState {
  id: BuildUpWorkflowSectionId
  title: string
  status: BuildUpWorkflowSectionRuntimeStatus
  completedAt?: string | null
  blockedReason?: string | null
  comments: string[]
  checklist: BuildUpSectionChecklistState[]
}

interface BuildUpExportReadiness {
  ready: boolean
  missingRequirements: string[]
  requiredSectionIds: BuildUpWorkflowSectionId[]
}

interface BuildUpStageSnapshot {
  projectId: string
  revision?: string | null
  panelName?: string | null
  sections: BuildUpSectionState[]
  mechanicalSummaryReady: boolean
  exportReady: boolean
}
```

---

## 4. Project Verification

**File:** `types/d380-build-up.ts`

```ts
interface BuildUpProjectVerificationRecord {
  drawingTitle: string
  workingCopyVerified: boolean
  revisionVerified: boolean
  layoutVerified: boolean
  panelIdApplied: boolean
  missingParts: string[]
  leadNotified: boolean
}
```

---

## 5. Mechanical Extraction

**File:** `types/d380-build-up.ts`

```ts
interface BuildUpRailPlanRecord {
  id: string
  label: string
  rail: LayoutRail                          // from lib/wire-length
  railType: BuildUpRailType
  mountSide: BuildUpRailMountSide
  locationLabel: string
  associatedDeviceIds: string[]
  frameGroundRequired: boolean
  notes: string[]
}

interface BuildUpPanductPlanRecord {
  id: string
  label: string
  node: PanductNode                         // from lib/wire-length
  sizeLabel: string
  cutLength: number
  locationLabel: string
  associatedRailIds: string[]
  notes: string[]
}

interface BuildUpMechanicalExtractionRecord {
  sheetLabel: string
  summary: string
  predrilledPanel: boolean
  noDrillZones: string[]
  mountingHoleChecks: string[]
  railPlans: BuildUpRailPlanRecord[]
  panductPlans: BuildUpPanductPlanRecord[]
  grounds: LayoutGroundPoint[]              // from lib/wire-length
  oversizedPanelComponents: string[]
  oversizedRailComponents: string[]
}
```

---

## 6. Installed Components

**File:** `types/d380-build-up.ts`

```ts
interface BuildUpInstalledComponentRecord {
  id: string
  title: string
  description: string
  partNumber: string
  mountType: BuildUpComponentMountType
  deviceId?: string
  locationLabel: string
  railId?: string
  hardware: string[]
  tools: string[]
  groundCheckRequired: boolean
  installNotes: string[]
  blueLabel?: BuildUpBlueLabelRecord
}
```

---

## 7. Grounding & Blue Labels

**File:** `types/d380-build-up.ts`

```ts
interface BuildUpGroundingRecord {
  id: string
  label: string
  point: LayoutGroundPoint
  locationLabel: string
  kind: BuildUpGroundingKind
  railId?: string
  hardwareStack: string[]
  paintRemovalRequired: boolean
  note?: string
}

interface BuildUpBlueLabelRecord {
  text: string
  placementFace: BuildUpLabelPlacementFace
  placementMode: BuildUpLabelPlacementMode
  templateSize: BuildUpLabelTemplateSize
  visibilityRequired: boolean
  referenceImageLabel?: string
}
```

---

## 8. Final Inspection & Export

**File:** `types/d380-build-up.ts`

```ts
interface BuildUpFinalInspectionItemRecord {
  id: string
  label: string
  description: string
}

interface BuildUpExportRecord {
  id: string
  label: string
  description: string
  destinationLabel: string
  requiredSectionIds: BuildUpWorkflowSectionId[]
  note: string
  lastGeneratedLabel?: string
}
```

---

## 9. Data Set & Workflow Records

**File:** `types/d380-build-up.ts`

### `BuildUpWorkflowSectionRecord`

```ts
interface BuildUpWorkflowSectionRecord {
  id: BuildUpWorkflowSectionId
  title: string
  description: string
  note: string
  dependencySectionIds: BuildUpWorkflowSectionId[]
  checklist: BuildUpChecklistItemRecord[]
  initialStatus: BuildUpWorkflowSectionRuntimeStatus
  blockedReason?: string
  startedAt?: string
  completedAt?: string
  seedComment?: string
  progressUpdates?: string[]
}
```

### `D380ProjectBuildUpRecord`

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

interface D380BuildUpDataSet {
  operatingDate: string
  projects: D380ProjectBuildUpRecord[]
}
```

---

## 10. Workflow State & Controller

**File:** `types/d380-build-up.ts`

```ts
interface BuildUpWorkflowSectionSnapshot {
  status: BuildUpWorkflowSectionRuntimeStatus
  comment: string
  startedAt?: string
  completedAt?: string
  blockedReason?: string
  previousStatus?: Exclude<BuildUpWorkflowSectionRuntimeStatus, 'BLOCKED'>
  progressUpdates: string[]
  checklist: Record<string, boolean>
}

interface BuildUpWorkflowState {
  sections: Record<BuildUpWorkflowSectionId, BuildUpWorkflowSectionSnapshot>
  activeSectionId?: BuildUpWorkflowSectionId
  currentActionableSectionId?: BuildUpWorkflowSectionId
}

interface BuildUpWorkflowController {
  project?: D380ProjectBuildUpRecord
  workflowState: BuildUpWorkflowState
  startSection: (sectionId: BuildUpWorkflowSectionId) => void
  resumeSection: (sectionId: BuildUpWorkflowSectionId) => void
  completeSection: (sectionId: BuildUpWorkflowSectionId) => void
  setSectionComment: (sectionId: BuildUpWorkflowSectionId, comment: string) => void
  setSectionBlockedReason: (sectionId: BuildUpWorkflowSectionId, reason: string) => void
  toggleChecklistItem: (sectionId: BuildUpWorkflowSectionId, checklistItemId: string) => void
  toggleSectionBlocked: (sectionId: BuildUpWorkflowSectionId) => void
  addProgressUpdate: (sectionId: BuildUpWorkflowSectionId, update: string) => void
}
```

---

## 11. View Models

**File:** `types/d380-build-up.ts`

```ts
interface BuildUpHeaderViewModel {
  projectId: string
  pdNumber: string
  projectName: string
  unit: string
  panelName: string
  revisionLabel: string
  drawingTitle: string
  shiftLabel: string
  leadSummary: string
  statusNote: string
  currentSectionLabel: string
  currentStatusLabel: string
}

interface BuildUpProgressSummaryViewModel {
  completionPercent: number
  completedSectionsCount: number
  totalSections: number
  currentSectionLabel: string
  nextSectionLabel?: string
  blockedCount: number
  exportReadinessLabel: string
  exportReadiness: BuildUpExportReadiness
}

interface BuildUpSectionViewModel {
  id: BuildUpWorkflowSectionId
  title: string
  description: string
  note: string
  status: BuildUpWorkflowSectionRuntimeStatus
  statusLabel: string
  displayState: BuildUpWorkflowSectionDisplayState
  isActionable: boolean
  dependencySummary: string
  readinessSummary: string
  blockedReason?: string
  checklist: BuildUpChecklistItemViewModel[]
  stats: BuildUpSectionStatViewModel[]
  items: BuildUpSectionItemViewModel[]
  comment: string
  progressUpdates: string[]
  startedAtLabel?: string
  completedAtLabel?: string
  canStart: boolean
  canComplete: boolean
}

interface D380BuildUpWorkspaceViewModel {
  found: boolean
  operatingDateLabel: string
  header?: BuildUpHeaderViewModel
  progressSummary?: BuildUpProgressSummaryViewModel
  stageSnapshot?: BuildUpStageSnapshot
  metrics: BuildUpMetricCardViewModel[]
  sections: BuildUpSectionViewModel[]
  emptyState: { title: string; description: string }
}
```

---

## Cross-Domain References

| Type | Source | Consumed By |
|---|---|---|
| `ShiftOptionId` | `types/d380-startup.ts` | `D380ProjectBuildUpRecord.shift`, `BuildUpWorkflowMemberRecord.shift` |
| `LayoutRail`, `PanductNode`, `LayoutGroundPoint` | `lib/wire-length` | Mechanical extraction rail/panduct/ground records |
| `D380ProjectBuildUpRecord` | Local | `hooks/use-build-up-workflow.ts`, `lib/view-models/d380-build-up.ts` (15+ functions) |
