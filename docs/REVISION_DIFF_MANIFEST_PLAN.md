# Revision Diff Manifest — Implementation Plan

## Current State Analysis

### Handlers & Process for Revision Changes

The revision system has **5 layers** today:

#### 1. Discovery Layer (`lib/revision/revision-discovery.ts`)
- Scans `Share/Legal Drawings/<PD#>/` for wire-list XLSX files (`*-UCPWiringList_*.xlsx`) and layout PDFs (`*_LAY_*.pdf`)
- Parses revision info from filenames (e.g., `_B.1.xlsx` → `{ revision: "B.1", sortScore: 2010 }`)
- Identifies `currentWireList` (highest sort score) and `previousWireList` (second highest)
- **No diffing happens at this layer** — purely file enumeration

#### 2. API Layer (`app/api/revisions/[projectId]/route.ts`)
- `GET /api/revisions/{projectId}?pdNumber=...` → returns `ProjectRevisionHistory`
- `POST /api/revisions/{projectId}/upload` → writes new revision files to Legal Drawings
- `POST /api/revisions/{projectId}/layout-upload` → writes new layout PDF
- `DELETE /api/revisions/{projectId}/{filename}` → removes a revision file
- **No diff computation at this layer** — just CRUD on files

#### 3. Hook Layer (`hooks/use-project-revisions.ts`)
- Fetches `ProjectRevisionHistory` via SWR; caches for 60s
- Manages comparison selection state (source/target `FileRevision`)
- Exposes `openComparison(source, target)` to trigger the diff modal
- **No diff computation** — just state management

#### 4. Panel Layer (`components/revision/use-revision-panel.tsx`)
- Orchestrates the full revision workflow: sidebar, overlays, wire-list parsing
- When a user selects a different revision, it **downloads the XLSX, parses it with `parseWorkbook()` + `buildProjectModel()`**, and extracts `SemanticWireListRow[]`
- Passes `sourceRows` and `targetRows` to the comparison modal
- **Row extraction happens here but no persistent diff**

#### 5. Comparison Layer (`components/revision/revision-comparison-modal.tsx`)
- `computeRowDiffs(sourceRows, targetRows)` creates a diff keyed by `fromDeviceId|wireNo|toDeviceId`
- Identifies `added` and `removed` rows (modified detection is minimal — only exact match vs missing)
- **100% ephemeral** — diff computed on every modal open, never persisted

### What's Missing

| Capability | Status |
|---|---|
| Discovering which revisions exist | ✅ Working |
| Parsing revision files on-the-fly | ✅ Working |
| Ephemeral row-level diff in modal | ✅ Working (basic add/remove) |
| Field-level change detection | ❌ Missing (only full-row add/remove) |
| Persistent diff manifest | ❌ Missing |
| Sheet-level summary (which sheets changed) | ❌ Missing |
| Device-level impact (which devices affected) | ❌ Missing |
| Layout change tracking | ❌ Missing |
| Historical diff archive | ❌ Missing |

---

## Proposed Solution: `revision-diff-manifest.json`

### Overview

When a new revision is uploaded or detected, compute a comprehensive diff between the **previous** and **current** revision, then persist it as `revision-diff-manifest.json` in the project's state directory alongside the existing `project-manifest.json`.

```
Share/Projects/<PROJECT_ID>/state/
  ├── project-manifest.json          ← existing
  ├── revision-diff-manifest.json    ← NEW
  ├── sheets/                        ← existing per-sheet data
  └── ...
```

### Manifest Schema

```ts
interface RevisionDiffManifest {
  /** Manifest version for future migration */
  version: 1

  /** Project identifier */
  projectId: string

  /** PD number */
  pdNumber: string

  /** When this diff was computed */
  generatedAt: string

  /** The two revisions being compared */
  source: {
    /** Previous/baseline revision */
    displayVersion: string
    revision: string
    wireListFilename: string | null
    layoutFilename: string | null
    sortScore: number
  }

  target: {
    /** Current/latest revision */
    displayVersion: string
    revision: string
    wireListFilename: string | null
    layoutFilename: string | null
    sortScore: number
  }

  /** High-level summary across all sheets */
  summary: {
    totalSheetsChanged: number
    totalSheetsUnchanged: number
    totalRowsAdded: number
    totalRowsRemoved: number
    totalRowsModified: number
    totalRowsUnchanged: number
    totalDevicesAffected: number
  }

  /** Per-sheet diff summaries */
  sheets: SheetDiffSummary[]
}

interface SheetDiffSummary {
  /** Sheet slug (e.g., "console", "back-panel") */
  slug: string
  /** Sheet display name */
  name: string
  /** Whether this sheet has any changes */
  hasChanges: boolean

  /** Row counts */
  rowCounts: {
    source: number
    target: number
    added: number
    removed: number
    modified: number
    unchanged: number
  }

  /** Devices impacted by changes */
  devicesAffected: string[]

  /** Detailed row-level diffs */
  diffs: RowDiff[]
}

interface RowDiff {
  /** Composite key: fromDeviceId|wireNo|toDeviceId */
  key: string

  /** Change type */
  changeType: 'added' | 'removed' | 'modified'

  /** Which fields changed (for 'modified' rows) */
  changedFields?: FieldChange[]

  /** The source row data (for removed/modified) */
  sourceRow?: Record<string, string | number | null>

  /** The target row data (for added/modified) */
  targetRow?: Record<string, string | number | null>
}

interface FieldChange {
  field: string
  from: string | number | null
  to: string | number | null
}
```

---

## Implementation Plan

### Phase 1: Core Diff Engine (`lib/revision/revision-diff.ts`)

**New file** that contains pure functions for computing diffs.

1. **`computeSheetDiff(sourceRows, targetRows)`** → `SheetDiffSummary`
   - Key rows by `fromDeviceId|wireNo|toDeviceId` (same as current modal logic)
   - For rows present in both: compare field-by-field (`wireType`, `gaugeSize`, `wireId`, `fromLocation`, `toLocation`, `fromPageZone`, `toPageZone`) to detect `modified` rows and produce `FieldChange[]`
   - For rows in source only: `removed`
   - For rows in target only: `added`
   - Collect unique `devicesAffected` from all changed rows' `fromDeviceId` and `toDeviceId`

2. **`buildRevisionDiffManifest(projectId, pdNumber, sourceHistory, targetHistory, sourceModel, targetModel)`** → `RevisionDiffManifest`
   - Iterate all operational sheets in the target model
   - For each sheet, find the matching sheet in the source model (by slug)
   - Call `computeSheetDiff()` per sheet
   - Aggregate summary stats
   - Return the complete manifest

3. **`generateRowKey(row)`** → `string`
   - Extracted shared utility for consistent row keying

### Phase 2: Persistence API (`app/api/revisions/[projectId]/diff-manifest/route.ts`)

1. **`GET /api/revisions/{projectId}/diff-manifest`**
   - Read `Share/Projects/<ID>/state/revision-diff-manifest.json` if it exists
   - Return the manifest or 404

2. **`PUT /api/revisions/{projectId}/diff-manifest`**
   - Accept a `RevisionDiffManifest` body
   - Validate version and projectId
   - Write to `Share/Projects/<ID>/state/revision-diff-manifest.json`

3. **`POST /api/revisions/{projectId}/diff-manifest/compute`**
   - Server-side computation endpoint
   - Reads both revision XLSX files from Legal Drawings
   - Parses them with `parseWorkbook()` + `buildProjectModel()`
   - Calls `buildRevisionDiffManifest()`
   - Persists the result and returns it

### Phase 3: Hook & UI Integration

1. **`useRevisionDiffManifest(projectId)`** hook
   - SWR fetch from `GET /api/revisions/{projectId}/diff-manifest`
   - Exposes `manifest`, `isLoading`, `refresh`, `recompute()`
   - `recompute()` calls the `POST .../compute` endpoint

2. **Update `use-revision-panel.tsx`**
   - After a revision upload completes, auto-trigger manifest recomputation
   - When the manifest exists, show a badge/indicator on sheets with changes

3. **Update `revision-comparison-modal.tsx`**
   - Use the persisted `RowDiff[]` from the manifest instead of recomputing
   - Add field-level highlighting for `modified` rows (show which fields changed)

4. **Dashboard integration** (future)
   - Show a "Revision Changes" card on the project dashboard
   - Summarize: "B.1 → B.1 M.2: 3 sheets changed, 47 rows added, 12 removed, 8 modified"

### Phase 4: Manifest Lifecycle

When the diff manifest should be (re)generated:

| Trigger | Action |
|---|---|
| New revision uploaded via `/upload` | Auto-compute diff against previous |
| Manual "Recompute" button | Re-parse both revisions and overwrite manifest |
| Revision file deleted | Clear manifest (no longer valid) |
| Project re-imported with new workbook | Re-compute if 2+ revisions exist |

---

## Data Flow Diagram

```
Legal Drawings/4M368/
  ├── 4M368-UCPWiringList_B.1.xlsx     ← source (previous)
  └── 4M368-UCPWiringList_B.1M2.xlsx   ← target (current)
              │
              ▼
    POST /api/revisions/{id}/diff-manifest/compute
              │
              ├── parseWorkbook(source.xlsx) → sourceModel
              ├── parseWorkbook(target.xlsx) → targetModel
              ├── for each sheet:
              │     computeSheetDiff(sourceRows, targetRows)
              │       → { added, removed, modified, changedFields }
              ├── buildRevisionDiffManifest()
              │
              ▼
    Share/Projects/4M368_DEMO/state/
      └── revision-diff-manifest.json
              │
              ▼
    GET /api/revisions/{id}/diff-manifest
              │
              ▼
    useRevisionDiffManifest(projectId)
              │
              ▼
    UI: Dashboard card, sidebar badges, comparison modal
```

---

## Example Manifest Output

```json
{
  "version": 1,
  "projectId": "4m368-ucpwiringlist-b-1m2-mnzfidj6",
  "pdNumber": "4M368",
  "generatedAt": "2026-04-14T10:30:00.000Z",
  "source": {
    "displayVersion": "B.1",
    "revision": "B.1",
    "wireListFilename": "4M368-UCPWiringList_B.1.xlsx",
    "layoutFilename": null,
    "sortScore": 2010
  },
  "target": {
    "displayVersion": "B.1 M.2",
    "revision": "B.1",
    "wireListFilename": "4M368-UCPWiringList_B.1M2.xlsx",
    "layoutFilename": "4M368_LAY_B.1_M2.pdf",
    "sortScore": 2012
  },
  "summary": {
    "totalSheetsChanged": 3,
    "totalSheetsUnchanged": 5,
    "totalRowsAdded": 47,
    "totalRowsRemoved": 12,
    "totalRowsModified": 8,
    "totalRowsUnchanged": 625,
    "totalDevicesAffected": 15
  },
  "sheets": [
    {
      "slug": "console",
      "name": "CONSOLE",
      "hasChanges": false,
      "rowCounts": {
        "source": 15,
        "target": 15,
        "added": 0,
        "removed": 0,
        "modified": 0,
        "unchanged": 15
      },
      "devicesAffected": [],
      "diffs": []
    },
    {
      "slug": "back-panel",
      "name": "BACK PANEL",
      "hasChanges": true,
      "rowCounts": {
        "source": 100,
        "target": 105,
        "added": 7,
        "removed": 2,
        "modified": 3,
        "unchanged": 93
      },
      "devicesAffected": ["AF0012", "AF0015", "KA0003", "TB0044"],
      "diffs": [
        {
          "key": "AF0012|W1234|TB0044",
          "changeType": "added",
          "targetRow": {
            "fromDeviceId": "AF0012",
            "wireNo": "W1234",
            "wireId": "BLU",
            "gaugeSize": "14",
            "toDeviceId": "TB0044",
            "fromLocation": "SHT 5",
            "toLocation": "SHT 5"
          }
        },
        {
          "key": "AF0015|W0987|KA0003",
          "changeType": "modified",
          "changedFields": [
            { "field": "gaugeSize", "from": "16", "to": "14" },
            { "field": "wireId", "from": "RED", "to": "BLK" }
          ],
          "sourceRow": {
            "fromDeviceId": "AF0015",
            "wireNo": "W0987",
            "gaugeSize": "16",
            "wireId": "RED",
            "toDeviceId": "KA0003"
          },
          "targetRow": {
            "fromDeviceId": "AF0015",
            "wireNo": "W0987",
            "gaugeSize": "14",
            "wireId": "BLK",
            "toDeviceId": "KA0003"
          }
        }
      ]
    }
  ]
}
```

---

## File Inventory (New & Modified)

### New Files
| File | Purpose |
|---|---|
| `lib/revision/revision-diff.ts` | Pure diff engine: `computeSheetDiff`, `buildRevisionDiffManifest` |
| `lib/revision/revision-diff-types.ts` | Types: `RevisionDiffManifest`, `SheetDiffSummary`, `RowDiff`, `FieldChange` |
| `app/api/revisions/[projectId]/diff-manifest/route.ts` | GET/PUT for persisted manifest |
| `app/api/revisions/[projectId]/diff-manifest/compute/route.ts` | POST to trigger server-side diff computation |
| `hooks/use-revision-diff-manifest.ts` | SWR hook for consuming the manifest |

### Modified Files
| File | Change |
|---|---|
| `components/revision/revision-comparison-modal.tsx` | Use persisted diffs + field-level highlighting |
| `components/revision/use-revision-panel.tsx` | Auto-trigger manifest recompute after upload |
| `app/api/revisions/[projectId]/upload/route.ts` | Optionally trigger diff computation after upload |
| `lib/revision/index.ts` | Re-export new types and functions |
| `docs/REVISION_INTERFACES.md` | Document new manifest interfaces |

---

## Implementation Order

1. **`revision-diff-types.ts`** — Define all new interfaces (no dependencies)
2. **`revision-diff.ts`** — Implement `computeSheetDiff()` and `buildRevisionDiffManifest()` (depends on types + `lib/workbook`)
3. **`diff-manifest/route.ts`** (GET/PUT) — Simple file read/write persistence
4. **`diff-manifest/compute/route.ts`** — Server-side parsing and computation
5. **`use-revision-diff-manifest.ts`** — Hook for consuming the manifest
6. **Update `revision-comparison-modal.tsx`** — Use manifest diffs, add field-level highlighting
7. **Update `use-revision-panel.tsx`** — Auto-trigger and display change indicators
