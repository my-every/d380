# Catalog & Parts — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces, types, and constants related to the D380 parts catalog, reference sheets, catalog indexing, and assignment component normalization.

---

## Table of Contents

1. [Part Categories & Mount Types](#1-part-categories--mount-types) — `types/d380-catalog.ts`
2. [Catalog Images](#2-catalog-images)
3. [Catalog Records](#3-catalog-records)
4. [Lookup Results](#4-lookup-results)
5. [Catalog Index](#5-catalog-index)
6. [Reference Sheets](#6-reference-sheets)
7. [Project Reference Data](#7-project-reference-data)
8. [Assignment Components](#8-assignment-components)

---

## 1. Part Categories & Mount Types

**File:** `types/d380-catalog.ts`

```ts
type PartCategory =
  | 'Grounding & Busbars'         | 'Wire Ferrules'
  | 'Terminal Blocks & Accessories'| 'Ring Terminals'        | 'Fork Terminals'
  | 'DIN Rail & Mounting'         | 'Passive Components'    | 'Diodes & Suppression'
  | 'Measurement & Shunts'        | 'Control Relays'        | 'Relay Sockets'
  | 'Timing Relays'               | 'Protection Relays'     | 'Circuit Protection'
  | 'Control Power'               | 'Power Conversion'      | 'Operator Controls'
  | 'Pilot Lights & Indicators'   | 'Panel Lighting'        | 'Alarm Devices'
  | 'Panel Hardware'              | 'Cable Management'      | 'Wire Management'
  | 'Wire Duct & Panduit'         | 'HMI & Operator Interface'
  | 'Industrial Computing'        | 'Industrial Networking'
  | 'Gateway & Protocol Conversion'| 'Time Synchronization'
  | 'Counters & Timers'           | 'PLC Control Platform'   | 'PLC Rack Hardware'
  | 'PLC Communication Modules'   | 'Safety Control System'  | 'Control Modules'
  | 'Signal Conditioning'         | 'Distributed I/O'
  | 'Condition Monitoring I/O'    | 'Unknown'

type MountType =
  | 'DIN_RAIL' | 'PANEL_MOUNT' | 'SURFACE_MOUNT'
  | 'BUSBAR_MOUNT' | 'RACK_MOUNT' | 'TERMINAL_BLOCK' | 'UNKNOWN'

type ImageViewType =
  | 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right'
  | 'installed' | 'wiring_diagram' | 'schematic' | 'icon'
```

---

## 2. Catalog Images

**File:** `types/d380-catalog.ts`

```ts
interface CatalogImage {
  src: string
  viewType: ImageViewType
  label?: string
  alt?: string
  width?: number
  height?: number
}

interface CatalogImageSet {
  primary?: CatalogImage
  icon?: CatalogImage
  images: CatalogImage[]
  diagrams: CatalogImage[]
}
```

---

## 3. Catalog Records

**File:** `types/d380-catalog.ts`

```ts
interface CatalogInstructionNote {
  type: 'DO' | 'DONT' | 'WARNING' | 'CAUTION' | 'INFO' | 'TIP'
  text: string
  stages?: string[]
  priority?: number
}

interface CatalogAssociatedPart {
  partNumber: string
  relationship: 'REQUIRES' | 'RECOMMENDED' | 'ALTERNATIVE' | 'ACCESSORY' | 'MOUNTING'
  quantity?: number
  description?: string
}

interface CatalogToolReference {
  name: string
  type: 'CRIMP' | 'TORQUE' | 'STRIP' | 'CUT' | 'DRIVER' | 'OTHER'
  specification?: string
  required: boolean
}

interface PartCatalogRecord {
  partNumber: string
  description: string
  category: PartCategory
  subcategory?: string
  alternatePartNumbers?: string[]
  devicePrefixes?: string[]
  mountType?: MountType
  wireGauges?: string[]
  voltageRating?: string
  currentRating?: string
  images: CatalogImageSet
  associatedParts?: CatalogAssociatedPart[]
  tools?: CatalogToolReference[]
  notes?: CatalogInstructionNote[]
  manufacturer?: string
  manufacturerPartNumber?: string
  source: 'LIBRARY_CSV' | 'PROJECT_REFERENCE' | 'MANUAL_ENTRY' | 'INFERRED'
}
```

---

## 4. Lookup Results

**File:** `types/d380-catalog.ts`

```ts
type MatchConfidence = 'EXACT' | 'ALTERNATE' | 'PREFIX' | 'FUZZY' | 'NONE'

interface CatalogLookupResult {
  found: boolean
  record?: PartCatalogRecord
  confidence: MatchConfidence
  confidenceScore: number          // 0-100
  matchedBy: 'EXACT_PART_NUMBER' | 'ALTERNATE_PART_NUMBER' | 'DEVICE_PREFIX' | 'FUZZY_MATCH' | 'NOT_FOUND'
  query: string
  reasons: string[]
}

interface CatalogBatchLookupResult {
  totalQueried: number
  exactMatches: number
  alternateMatches: number
  prefixMatches: number
  notFound: number
  results: CatalogLookupResult[]
}
```

---

## 5. Catalog Index

**File:** `types/d380-catalog.ts`

```ts
interface CatalogIndexEntry {
  partNumber: string
  indexType: 'PRIMARY' | 'ALTERNATE' | 'PREFIX'
}

interface PartCatalog {
  records: Map<string, PartCatalogRecord>
  byPartNumber: Map<string, CatalogIndexEntry>
  byAlternate: Map<string, CatalogIndexEntry>
  byDevicePrefix: Map<string, CatalogIndexEntry[]>
  byCategory: Map<PartCategory, PartCatalogRecord[]>
  metadata: {
    recordCount: number
    builtAt: string
    sources: string[]
  }
}
```

---

## 6. Reference Sheets

**File:** `types/d380-catalog.ts`

```ts
type ReferenceSheetType =
  | 'PART_NUMBER_LIST' | 'CABLE_PART_NUMBERS' | 'BLUE_LABELS'
  | 'WHITE_LABELS' | 'HEAT_SHRINK_LABELS' | 'PANEL_ERRORS' | 'UNKNOWN'

interface NormalizedReference {
  type: ReferenceSheetType
  partNumber?: string
  deviceId?: string
  wireId?: string
  labelText?: string
  quantity?: number
  description?: string
  errorMessage?: string
  sourceRow: number
  sourceSheet: string
}
```

---

## 7. Project Reference Data

**File:** `types/d380-catalog.ts`

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

---

## 8. Assignment Components

**File:** `types/d380-catalog.ts`

```ts
type ComponentSource =
  | 'WIRE_LIST' | 'PART_NUMBER_LIST' | 'LAYOUT_EXTRACTION'
  | 'REFERENCE_SHEET' | 'CATALOG_MATCH' | 'MANUAL_ENTRY'

interface NormalizedAssignmentComponent {
  componentId: string
  deviceId: string
  terminal?: string
  fullDeviceId: string
  partNumbers: string[]
  primaryPartNumber?: string
  description?: string
  category?: PartCategory
  catalogMatch?: CatalogLookupResult
  referenceImage?: CatalogImage
  icon?: CatalogImage
  // ... (additional sourcing and display fields)
}
```

---

## Cross-Domain References

| Type | Source | Consumed By |
|---|---|---|
| `ProjectReferenceData` | Local | `hooks/use-assignment-catalog.ts`, `lib/catalog/reference-sheet-normalizer.ts`, `lib/catalog/index.ts` |
| `PartCategory` | Local | `NormalizedAssignmentComponent.category`, device property records |
| `MatchConfidence` | Local | Also defined in `lib/layout-matching/types.ts` — different domain (layout matching vs catalog matching) |
