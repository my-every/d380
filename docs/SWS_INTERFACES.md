# SWS (Standard Work Sheet) — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces, types, constants, and type guards related to the D380 SWS template system — template definitions, sections, execution modes, tablet mode, discrepancy codes, and auto-detection.

---

## Table of Contents

1. [SWS Template Types](#1-sws-template-types)
2. [Execution & Display Modes](#2-execution--display-modes)
3. [Template Definition](#3-template-definition)
4. [Section & Process Steps](#4-section--process-steps)
5. [Field Definitions](#5-field-definitions)
6. [Worksheet Data](#6-worksheet-data)
7. [Tablet Mode Types](#7-tablet-mode-types)
8. [Discrepancy Codes](#8-discrepancy-codes)
9. [Auto-Detection & Selection](#9-auto-detection--selection)
10. [Type Guards](#10-type-guards)

---

## 1. SWS Template Types

**File:** `types/d380-sws.ts`

```ts
type SwsTemplateId =
  | 'PANEL_BUILD_WIRE'              // SWS-IPV_D380_ASY_PNL BUILD-WIRE_0.1
  | 'DIGITAL_PANEL_BUILD_WIRE'      // SWS-IPV_D380_ASY_PNL BUILD-WIRE_1.2
  | 'BASIC_BLANK_PANEL'             // SWS-IPV_D380_ASSY_SMALL-BLANK PANEL_PILOT
  | 'BOX_BUILD_UP'                  // SWS-IPV_D380_ASSY_Box Build Up_0.3
  | 'BOX_CROSS_WIRE'               // SWS-IPV_D380_ASSY_Box Cross Wire_0.1
  | 'CONSOLE_BUILD_UP_PANEL_HANG'  // SWS-IPV_D380_ASSY_CON BUILD UP-Pnl Hang_B.2
  | 'CONSOLE_CROSS_WIRE'           // SWS-IPV_D380_ASSY_CON CROSS WIRE_B.1

type SwsCategory = 'PANEL' | 'BOX' | 'CONSOLE' | 'CROSS_WIRE'
type SwsStageScope = 'BUILD_UP' | 'WIRING' | 'BOX_BUILD' | 'CROSS_WIRING' | 'PANEL_HANG'
```

> **Note:** `SwsTemplateId` is distinct from `SwsType` in `d380-assignment.ts` (6-category classification: BLANK/RAIL/BOX/PANEL/COMPONENT/UNDECIDED). `SwsTemplateId` maps to specific SWS-IPV document variants.

---

## 2. Execution & Display Modes

**File:** `types/d380-sws.ts`

```ts
type SwsExecutionMode = 'PRINT_MANUAL' | 'TABLET_INTERACTIVE'

type SwsDisplayFormat =
  | 'FULL_WORKSHEET'   | 'SECTION_VIEW'
  | 'SUMMARY_VIEW'     | 'PRINT_READY'
```

---

## 3. Template Definition

**File:** `types/d380-sws.ts`

```ts
interface SwsTemplateDefinition {
  id: SwsTemplateId
  swsIpvId: string
  name: string
  shortLabel: string
  description: string
  category: SwsCategory
  stageScopes: SwsStageScope[]
  revisionLevel: string
  revisionDate: string
  processDescription: string
  detectionPatterns: SwsDetectionPattern[]
  sections: SwsSectionDefinition[]
  headerFields: SwsHeaderFieldDefinition[]
  references: string[]
  originator?: string
  footerText: string
  pageCount: number
  supportsTabletMode: boolean
  computedFields: SwsComputedFieldMapping[]
  overridePolicy: SwsOverridePolicy
}

interface SwsDetectionPattern {
  type: 'DRAWING_TITLE' | 'PANEL_NAME' | 'ENCLOSURE_TYPE' | 'KEYWORD'
  pattern: RegExp
  keywords?: string[]
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  priority: number
}
```

---

## 4. Section & Process Steps

**File:** `types/d380-sws.ts`

```ts
interface SwsSectionDefinition {
  id: string
  workElementNumber: number
  description: string
  symbol?: string
  cycleTime?: string
  references: string[]
  requiresAuditor: boolean
  auditorReference?: string
  processSteps: SwsProcessStep[]
  verificationCheckpoints?: SwsVerificationCheckpoint[]
  notes?: string[]
  hasTimeTracking: boolean
  supportsMultiBadge: boolean
}

interface SwsProcessStep {
  id: string
  text: string
  subSteps?: string[]
  isKeyPoint: boolean
  requiresCheckOff: boolean
  verificationType?: 'PULL_TEST' | 'VISUAL' | 'NUTCERT' | '1444' | 'AENTR' | 'ISOLATION'
  requiresVerification?: '1444' | 'nutcert'
  notApplicable?: boolean
  notes?: string[]
}

interface SwsVerificationCheckpoint {
  id: string
  label: string
  description: string
  requiresAuditorStamp: boolean
  columnLabel?: string
}
```

---

## 5. Field Definitions

**File:** `types/d380-sws.ts`

```ts
interface SwsHeaderFieldDefinition {
  id: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT'
  required: boolean
  canAutoCompute: boolean
  widthPercent: number
  placeholder?: string
  options?: string[]
}

interface SwsComputedFieldMapping {
  fieldId: string
  sourcePath: string
  transform?: 'FORMAT_DATE' | 'FORMAT_NUMBER' | 'UPPERCASE' | 'TRUNCATE'
  allowOverride: boolean
}

interface SwsOverridePolicy {
  overridableFields: string[]
  requiresOverrideReason: boolean
  logOverrides: boolean
  warnAfterOverrideCount: number
}
```

---

## 6. Worksheet Data

**File:** `types/d380-sws.ts`

```ts
interface SwsWorksheetData {
  templateId: SwsTemplateId
  executionMode: SwsExecutionMode
  metadata: SwsWorksheetMetadata
  sections: SwsSectionState[]
  overrides: SwsWorksheetOverrideState
  discrepancies: SwsDiscrepancyEntry[]
  comments: string[]
  createdAt: string
  lastModifiedAt: string
  completedAt?: string
}

interface SwsWorksheetMetadata {
  pdNumber: string
  projectName: string
  unit: string
  panel?: string
  box?: string
  bays?: string
  date: string
  revision: string
  swsIpvId: string
  revLevel: string
  revDate: string
}

interface SwsSectionState {
  sectionId: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'BLOCKED'
  completedBy?: string
  startTime?: string
  endTime?: string
  auditorStamp?: string
  checklistState: Record<string, boolean>
  comments: string[]
  discrepancyCounts: Record<string, number>
}

interface SwsWorksheetOverrideState {
  fields: Record<string, string>
  reasons: Record<string, string>
  overriddenBy?: string
  overriddenAt?: string
  originalValues: Record<string, string>
}
```

---

## 7. Tablet Mode Types

**File:** `types/d380-sws.ts`

```ts
interface SwsSectionStamp {
  badgeNumber: string
  employeeName: string
  timestamp: string
  type: 'START' | 'COMPLETE' | 'AUDITOR' | 'VERIFICATION'
  sectionId: string
  pinVerified: boolean
}

interface SwsTabletSectionActivity {
  sectionId: string
  badgeStamps: SwsSectionStamp[]
  startTimestamp?: string
  endTimestamp?: string
  durationMinutes?: number
  completionState: 'NOT_STARTED' | 'IN_PROGRESS' | 'AWAITING_AUDIT' | 'COMPLETE'
  auditorBadge?: string
  autoTimeStamped: boolean
}
```

---

## 8. Discrepancy Codes

**File:** `types/d380-sws.ts`

```ts
interface SwsIpvCodeMapping {
  code: string
  description: string
  category: 'COMPONENT' | 'WIRE' | 'LABEL' | 'PROCESS' | 'OTHER'
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL'
  requiresRework: boolean
}

interface SwsDiscrepancyEntry {
  id: string
  code: string
  description: string
  count: number
  sectionId: string
  reportedBy: string
  reportedAt: string
  resolvedBy?: string
  resolvedAt?: string
  mrcaNumber?: string
  notes?: string
}

const SWS_DISCREPANCY_CODES: SwsIpvCodeMapping[]
// Component: CD, CH, CW, CM
// Label: LA, LD, LI, LM, LV
// Process: PC, PH, PP, PS, PT, PTW
// Wire: WB, WC, WE, WF, WG, WI, WJ, WL, WM, WP, WR, WT
```

---

## 9. Auto-Detection & Selection

**File:** `types/d380-sws.ts`

```ts
interface SwsAutoDetectResult {
  detectedType: SwsTemplateId
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  reasons: string[]
  alternativeTypes: SwsTemplateId[]
}

interface SwsSelectionRecord {
  projectId: string
  assignmentId: string
  detectedType: SwsTemplateId
  selectedType: SwsTemplateId
  isOverride: boolean
  overrideReason?: string
  detectionConfidence: 'LOW' | 'MEDIUM' | 'HIGH'
  detectionReasons: string[]
  selectedAt: string
  selectedBy: string
}
```

---

## 10. Type Guards

**File:** `types/d380-sws.ts`

```ts
function isSwsTemplateId(value: string): value is SwsTemplateId
function isSwsCategory(value: string): value is SwsCategory
function isSwsExecutionMode(value: string): value is SwsExecutionMode
```

---

## Cross-Domain References

| Type | Source | Consumed By |
|---|---|---|
| `SwsTemplateId` | Local | SWS auto-detection, selection records, worksheet data |
| `SwsType` (6-category) | `types/d380-assignment.ts` | Assignment classification — distinct from `SwsTemplateId` |
| `SwsExecutionMode` | Local | `ExecutionMode` in `d380-user-session.ts` covers the same concept at session level |
