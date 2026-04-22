# Wire List Sections & Branding — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces and types related to wire list section compilation, branding list filtering, and row patches in D380.

---

## Table of Contents

1. [Wire List Section Types](#1-wire-list-section-types) — `lib/wire-list-sections/types.ts`
2. [Compiled Sections](#2-compiled-sections)
3. [Location Sections](#3-location-sections)
4. [Branding Exclusions](#4-branding-exclusions) — `lib/branding-list/types.ts`
5. [Branding Rows](#5-branding-rows)
6. [Branding Aggregation](#6-branding-aggregation)
7. [Row Patches — Core](#7-row-patches--core) — `lib/row-patches/types.ts`
8. [Derived Rows](#8-derived-rows)
9. [Patch History & Bulk Operations](#9-patch-history--bulk-operations)

---

## 1. Wire List Section Types

**File:** `lib/wire-list-sections/types.ts`

```ts
type WireListSectionSurface = 'live' | 'print' | 'branding'

type WireListCompiledSectionKind = IdentificationFilterKind | 'au_jumpers'

type WireListSubgroupKind = 'location' | 'run' | 'pair' | 'device_family'
type WireListSubgroupTone = 'default' | 'muted' | 'warning'

interface WireListSectionCompilerInput {
  rows: SemanticWireListRow[]
  blueLabels?: BlueLabelSequenceMap | null
  currentSheetName: string
  partNumberMap?: Map<string, PartNumberLookupResult> | null
  enabledKinds?: WireListCompiledSectionKind[]
  surface?: WireListSectionSurface
}
```

---

## 2. Compiled Sections

**File:** `lib/wire-list-sections/types.ts`

```ts
interface WireListCompiledSubgroup {
  id: string
  kind: WireListSubgroupKind
  label: string
  tone: WireListSubgroupTone
  description?: string
  rowIds: string[]
  startRowId: string
  order: number
}

interface WireListCompiledLocationGroup {
  key: string
  label: string
  isExternal: boolean
  rowIds: string[]
  rows: SemanticWireListRow[]
  order: number
}

interface WireListCompiledSection {
  kind: WireListCompiledSectionKind
  baseKind: IdentificationFilterKind
  label: string
  description: string
  sortOrder: number
  rows: SemanticWireListRow[]
  rowIds: string[]
  matchMetadata: Record<string, PatternMatchMetadata>
  locationGroups: WireListCompiledLocationGroup[]
  subgroups: WireListCompiledSubgroup[]
  totalRows: number
}

interface WireListCompiledSectionSet {
  surface: WireListSectionSurface
  currentSheetName: string
  sections: WireListCompiledSection[]
  includedKinds: WireListCompiledSectionKind[]
  usedRowIds: string[]
  unassignedRows: SemanticWireListRow[]
}
```

---

## 3. Location Sections

**File:** `lib/wire-list-sections/types.ts`

```ts
interface WireListCompiledLocationSection {
  kind: WireListCompiledSectionKind
  baseKind: IdentificationFilterKind
  label: string
  description: string
  sortOrder: number
  rows: SemanticWireListRow[]
  rowIds: string[]
  matchMetadata: Record<string, PatternMatchMetadata>
  subgroups: WireListCompiledSubgroup[]
  totalRows: number
}

interface WireListCompiledLocationSectionGroup {
  key: string
  label: string
  isExternal: boolean
  sections: WireListCompiledLocationSection[]
  totalRows: number
  order: number
}
```

---

## 4. Branding Exclusions

**File:** `lib/branding-list/types.ts`

```ts
interface BrandingExclusionConfig {
  excludeClips: boolean
  excludeFuJumpers: boolean
  excludeKtJumpers: boolean
  excludeAfIdentityJumpers: boolean
  excludeSequentialJumpers: boolean
  excludeCables: boolean
  excludeVioWires: boolean
  excludeGrounds: boolean
  excludeShields: boolean
  excludeMechanicalRelayJumpers: boolean
  excludeKaJumpers: boolean
  excludeResistors: boolean
  customExclusionPatterns: string[]
}

const DEFAULT_BRANDING_EXCLUSIONS: BrandingExclusionConfig
// All boolean flags default to true

type ExclusionReason =
  | 'clip'        | 'fu_jumper'      | 'kt_jumper'
  | 'af_identity_jumper' | 'sequential_jumper' | 'cable'
  | 'vio_wire'   | 'ground'          | 'shield'
  | 'mechanical_relay_jumper' | 'ka_jumper' | 'resistor'
  | 'custom_pattern'         | 'none'
```

---

## 5. Branding Rows

**File:** `lib/branding-list/types.ts`

```ts
interface BrandingRow extends DerivedRow {
  __sourceSheet: string
  __sourceSheetName: string
  __originalRowId?: string
  __includedInBranding: boolean
  __exclusionReason: ExclusionReason
  __effectiveLocation: string
  brandingLength?: number
  finalLength?: number
  brandingLengthManual: boolean
  brandingNotes?: string
}
```

---

## 6. Branding Aggregation

**File:** `lib/branding-list/types.ts`

```ts
interface BrandingFilterStats {
  totalRows: number
  includedRows: number
  excludedRows: number
  exclusionBreakdown: Record<ExclusionReason, number>
  rowsWithLength: number
  rowsWithoutLength: number
  totalLength: number
}

interface BrandingSheet {
  slug: string
  name: string
  rows: BrandingRow[]
  stats: BrandingFilterStats
}

interface AggregatedBrandingList {
  sheets: BrandingSheet[]
  allRows: BrandingRow[]
  overallStats: BrandingFilterStats
  locations: string[]
  gauges: string[]
}
```

---

## 7. Row Patches — Core

**File:** `lib/row-patches/types.ts`

Non-destructive modification layer over immutable `SemanticWireListRow` data.

```ts
interface RowPatch {
  rowId: string
  lengthOverride?: number | null
  lengthAdjustment?: number
  comment?: string
  ipvChecked?: boolean
  fromChecked?: boolean
  toChecked?: boolean
  gaugeOverride?: string
  wireIdOverride?: string
  updatedAt?: number
  source?: 'manual' | 'bulk' | 'import'
}

type SheetPatches = Map<string, RowPatch>
type ProjectPatches = Map<string, SheetPatches>
```

---

## 8. Derived Rows

**File:** `lib/row-patches/types.ts`

```ts
interface DerivedRowMeta {
  hasPatches: boolean
  isLengthOverridden: boolean
  isLengthAdjusted: boolean
  originalLength?: number
  patchSource?: 'manual' | 'bulk' | 'import'
  patchedAt?: number
}

interface DerivedRow extends SemanticWireListRow {
  __patchMeta: DerivedRowMeta
  finalLength?: number
  patchComment?: string
  patchIpvChecked?: boolean
  patchFromChecked?: boolean
  patchToChecked?: boolean
}
```

---

## 9. Patch History & Bulk Operations

**File:** `lib/row-patches/types.ts`

```ts
interface PatchOperation {
  type: 'set' | 'update' | 'delete' | 'bulk'
  rowIds: string[]
  sheetSlug: string
  previousPatches: RowPatch[]
  newPatches: RowPatch[]
  timestamp: number
  description: string
}

interface PatchHistory {
  past: PatchOperation[]
  future: PatchOperation[]
  maxSize: number
}

interface ApplyPatchOptions {
  includeComputedLength?: boolean
  computedLengths?: Map<string, number>
  defaultLength?: number
  globalAdjustment?: number
}

interface BulkPatchOperation {
  type: 'setLength' | 'adjustLength' | 'setComment' | 'toggleIpv' | 'clearPatches'
  rowIds: string[]
  value?: number | string | boolean
  description?: string
}
```

---

## Cross-Domain References

| Type | Source | Consumed By |
|---|---|---|
| `SemanticWireListRow` | `lib/workbook/types.ts` | Base type for compiled sections and derived rows |
| `IdentificationFilterKind` | `lib/wiring-identification/types.ts` | Re-used as `WireListCompiledSectionKind` base |
| `BlueLabelSequenceMap` | `lib/wiring-identification/types.ts` | Compiler input for label-aware grouping |
| `PatternMatchMetadata` | `lib/wiring-identification/types.ts` | Per-row metadata in compiled sections |
| `PartNumberLookupResult` | `lib/part-number-list` | Compiler input for part-aware filtering |
| `DerivedRow` | `lib/row-patches/types.ts` | Extended by `BrandingRow` |
