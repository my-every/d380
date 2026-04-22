# Wiring & Cross Wire — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces, types, constants, and utility functions related to the D380 wiring workflow, cross-wire classification, and execution planning.

---

## Table of Contents

1. [Wiring Section & Status Types](#1-wiring-section--status-types) — `types/d380-wiring.ts`
2. [Wire Connection Types](#2-wire-connection-types)
3. [Wiring Devices & Plans](#3-wiring-devices--plans)
4. [Wiring Data Records](#4-wiring-data-records)
5. [Wiring Workflow State & Controller](#5-wiring-workflow-state--controller)
6. [Wiring View Models](#6-wiring-view-models)
7. [Cross Wire — Structural Zones](#7-cross-wire--structural-zones) — `types/d380-cross-wire.ts`
8. [Cross Wire — Classification](#8-cross-wire--classification)
9. [Cross Wire — Rules & Review](#9-cross-wire--rules--review)
10. [Cross Wire — Execution Plan](#10-cross-wire--execution-plan)
11. [Cross Wire — Utility Functions](#11-cross-wire--utility-functions)

---

## 1. Wiring Section & Status Types

**File:** `types/d380-wiring.ts`

```ts
type WiringSectionId =
  | 'WIRING_PREP'      | 'GROUNDING_INITIAL' | 'RELAY_TIMER'
  | 'SMALL_GAUGE'      | 'DIODES_AC'         | 'CABLES_COMM'
  | 'FINAL_COMPLETION' | 'IPV_FINAL'

type WiringSectionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETE'
type WiringSectionDisplayState = 'current' | 'available' | 'blocked' | 'future' | 'complete'
```

---

## 2. Wire Connection Types

**File:** `types/d380-wiring.ts`

```ts
type WireConnectionKind = 'SC' | 'W' | 'JC'

type WireColorId =
  | 'WHT' | 'RED' | 'BLU' | 'GRN' | 'GRN_YEL'
  | 'BLK' | 'VIO' | 'SH'  | 'CLIP' | 'OTHER'

type WiringGauge = 20 | 16 | 14 | 12 | 10 | 'CABLE' | null
type WiringRouteHint = 'UNDER_RAIL' | 'OVER_RAIL' | 'PANDUCT' | 'DOOR' | 'BOX' | 'CONSOLE' | 'UNKNOWN'
type WiringConnectionExecutionStatus = 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETE'

type WireConnection = {
  id: string
  fromDeviceId: string
  toDeviceId: string
  fromLocation?: string | null
  toLocation?: string | null
  wireNumber: string
  wireId: WireColorId
  gauge: WiringGauge
  connectionKind: WireConnectionKind
  bundleId?: string | null
  harnessId?: string | null
  routeHint?: WiringRouteHint
  isGround?: boolean
  isJumper?: boolean
  isCable?: boolean
  requiresPullTest?: boolean
  requiresPolarityValidation?: boolean
  requiresLabel?: boolean
}

interface WiringConnectionRecord extends WireConnection {
  status: WiringConnectionExecutionStatus
  blockedReason?: string | null
  terminationNote?: string | null
  validationNote?: string | null
}
```

---

## 3. Wiring Devices & Plans

**File:** `types/d380-wiring.ts`

```ts
type WiringDeviceRef = {
  deviceId: string
  partNumber?: string | null
  location: string
  mountType: 'PANEL' | 'RAIL' | 'DOOR' | 'BOX' | 'UNKNOWN'
  hasBlueLabel?: boolean
  images?: string[]
}

type WiringConnectionPlan = {
  byDevice: Record<string, string[]>
  byBundle: Record<string, string[]>
  byHarness: Record<string, string[]>
  totalConnections: number
}

type RoutingPlan = {
  panductPaths: string[]
  consoleRoutes: string[]
  underRailConnections: string[]
  overRailConnections: string[]
}

type TerminationPlan = {
  relayConnections: string[]
  moduleConnections: string[]
  terminalConnections: string[]
  busBarConnections: string[]
  ferruleWarnings: string[]
}

type ValidationPlan = {
  pullTestConnectionIds: string[]
  polarityValidationIds: string[]
  birdCageInspectionIds: string[]
  stripLengthInspectionIds: string[]
  discrepancyChecks: string[]
}
```

---

## 4. Wiring Data Records

**File:** `types/d380-wiring.ts`

```ts
interface D380WiringRecord {
  id: string
  projectId: string
  pdNumber: string
  projectName: string
  sheetName: string
  revision: string
  shift: ShiftOptionId
  statusNote: string
  leadSummary: string
  assignedMemberIds: string[]
  members: WiringWorkflowMemberRecord[]
  devices: WiringDeviceRef[]
  connections: WiringConnectionRecord[]
  sections: WiringSectionRecord[]
}

interface D380WiringDataSet {
  operatingDate: string
  projects: D380WiringRecord[]
}

type WiringExportReadiness = {
  ready: boolean
  ipvReady: boolean
  missingRequirements: string[]
}

type WiringStageSnapshot = {
  projectId: string
  sheetName: string
  revision?: string | null
  totalConnections: number
  completedConnections: number
  blockedConnections: number
  sectionStates: WiringSectionState[]
  exportReadiness: WiringExportReadiness
}
```

---

## 5. Wiring Workflow State & Controller

**File:** `types/d380-wiring.ts`

```ts
interface WiringWorkflowSectionSnapshot {
  status: WiringSectionStatus
  comments: string[]
  checklist: Record<string, boolean>
  startedAt?: string
  completedAt?: string
  blockedReason?: string | null
  previousStatus?: Exclude<WiringSectionStatus, 'BLOCKED'>
}

interface WiringWorkflowState {
  sections: Record<WiringSectionId, WiringWorkflowSectionSnapshot>
  activeSectionId?: WiringSectionId
  currentActionableSectionId?: WiringSectionId | null
}

interface WiringWorkflowController {
  wiring?: D380WiringRecord
  workflowState: WiringWorkflowState
  startSection: (sectionId: WiringSectionId) => void
  resumeSection: (sectionId: WiringSectionId) => void
  completeSection: (sectionId: WiringSectionId) => void
  blockSection: (sectionId: WiringSectionId, reason: string) => void
  setSectionComment: (sectionId: WiringSectionId, value: string) => void
  toggleChecklistItem: (sectionId: WiringSectionId, itemId: string) => void
  getCompletionProgress: () => WiringProgressSummaryViewModel | null
}
```

---

## 6. Wiring View Models

**File:** `types/d380-wiring.ts`

```ts
interface WiringHeaderViewModel {
  projectId: string
  pdNumber: string
  projectName: string
  sheetName: string
  revisionLabel: string
  shiftLabel: string
  currentSectionLabel: string
  currentStatusLabel: string
  statusNote: string
  leadSummary: string
}

interface WiringProgressSummaryViewModel {
  totalSections: number
  completedSections: number
  blockedSections: number
  completionPercent: number
  currentActionableSectionLabel: string
  totalConnections: number
  completedConnections: number
  blockedConnections: number
  exportReady: boolean
  ipvReady: boolean
  exportReadinessLabel: string
  ipvReadinessLabel: string
  exportReadiness: WiringExportReadiness
}

type WiringViewModel = {
  projectId: string
  sheetName: string
  title: string
  sections: WiringSectionState[]
  connectionPlan: WiringConnectionPlan
  routingPlan: RoutingPlan
  terminationPlan: TerminationPlan
  validationPlan: ValidationPlan
  exportReadiness: WiringExportReadiness
  currentActionableSectionId: WiringSectionId | null
}
```

---

## 7. Cross Wire — Structural Zones

**File:** `types/d380-cross-wire.ts`

```ts
type StructuralZoneId =
  | 'PANEL'      | 'LEFT_DOOR'      | 'RIGHT_DOOR'     | 'DOOR'
  | 'LEFT_SIDE_RAIL' | 'RIGHT_SIDE_RAIL' | 'SIDE_RAIL'
  | 'BOX'        | 'CONSOLE'        | 'HARNESS'         | 'UNKNOWN'

type EnclosureType = 'BOX' | 'CONSOLE' | 'SKID' | 'UNKNOWN'

interface StructuralZonePattern {
  zoneId: StructuralZoneId
  patterns: RegExp[]
  keywords: string[]
  priority: number
}

const STRUCTURAL_ZONE_PATTERNS: StructuralZonePattern[]  // 10 entries
```

---

## 8. Cross Wire — Classification

**File:** `types/d380-cross-wire.ts`

```ts
type WiringBoundaryType =
  | 'INTERNAL_PANEL'    | 'PANEL_TO_PANEL'     | 'PANEL_TO_DOOR'
  | 'PANEL_TO_SIDE_RAIL'| 'PANEL_TO_BOX'       | 'PANEL_TO_CONSOLE'
  | 'DOOR_TO_DOOR'      | 'DOOR_TO_CONSOLE'    | 'HARNESS_INTERNAL'
  | 'UNKNOWN_EXTERNAL'

type ClassificationConfidence = 'LOW' | 'MEDIUM' | 'HIGH'
type WireConnectionExecutionBucket = 'WIRING' | 'CROSS_WIRING' | 'REVIEW_REQUIRED'

interface CrossWireClassification {
  connectionId: string
  isExternal: boolean
  isCrossWire: boolean
  confidence: ClassificationConfidence
  boundaryType: WiringBoundaryType
  executionBucket: WireConnectionExecutionBucket
  fromZone: StructuralZoneId
  toZone: StructuralZoneId
  reasons: string[]
  requiresReview: boolean
  override?: CrossWireOverride
}

interface CrossWireOverride {
  overriddenBy: string
  overriddenAt: string
  originalBucket: WireConnectionExecutionBucket
  overrideBucket: WireConnectionExecutionBucket
  reason: string
}
```

---

## 9. Cross Wire — Rules & Review

**File:** `types/d380-cross-wire.ts`

```ts
interface ClassificationContext {
  currentPanel: string
  enclosureType: EnclosureType
  fromZone: StructuralZoneId
  toZone: StructuralZoneId
  knownPanels: string[]
  isCable: boolean
  isGround: boolean
  requiresHarness: boolean
}

interface CrossWireClassificationRule {
  id: string
  name: string
  description: string
  priority: number
  matches: (connection: WireConnection, context: ClassificationContext) => boolean
  result: {
    isCrossWire: boolean
    boundaryType: WiringBoundaryType
    confidence: ClassificationConfidence
    executionBucket: WireConnectionExecutionBucket
  }
}

interface CrossWireReviewItem {
  connection: WireConnection
  classification: CrossWireClassification
  suggestedBucket: WireConnectionExecutionBucket
  suggestedReason: string
  reviewedBy?: string
  reviewedAt?: string
  finalBucket?: WireConnectionExecutionBucket
  reviewNotes?: string
}

interface CrossWireClassificationSummary {
  projectId: string
  sheetName: string
  totalConnections: number
  wiringConnections: number
  crossWiringConnections: number
  reviewRequiredConnections: number
  classifications: CrossWireClassification[]
  reviewQueue: CrossWireReviewItem[]
  lastClassifiedAt: string
  overrideCount: number
}
```

---

## 10. Cross Wire — Execution Plan

**File:** `types/d380-cross-wire.ts`

```ts
interface CrossWireExecutionPlan {
  panelToPanelConnections: WireConnection[]
  leftDoorConnections: WireConnection[]
  rightDoorConnections: WireConnection[]
  sideRailConnections: WireConnection[]
  groundConnections: WireConnection[]
  communicationCables: WireConnection[]
  otherConnections: WireConnection[]
  pendingReview: CrossWireReviewItem[]
}
```

---

## 11. Cross Wire — Utility Functions

**File:** `types/d380-cross-wire.ts`

```ts
function isCrossWireBoundary(boundaryType: WiringBoundaryType): boolean
function isDoorZone(zone: StructuralZoneId): boolean
function isSideRailZone(zone: StructuralZoneId): boolean
function isEnclosureZone(zone: StructuralZoneId): boolean
function getEnclosureTypeFromZone(zone: StructuralZoneId): EnclosureType
```

---

## Cross-Domain References

| Type | Source | Consumed By |
|---|---|---|
| `ShiftOptionId` | `types/d380-startup.ts` | `D380WiringRecord.shift`, `WiringWorkflowMemberRecord.shift` |
| `WireConnection` | `types/d380-wiring.ts` | Cross wire classification, execution plan, review items |
| `WiringGauge`, `WireColorId` | `types/d380-wiring.ts` | Cross wire (imported for connection context) |
| `WiringBoundaryType` | `types/d380-cross-wire.ts` | Classification results, rule matching |
