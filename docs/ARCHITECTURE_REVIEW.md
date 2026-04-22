# Architecture Review: Wire List Application

**Date:** March 2026  
**Purpose:** Evaluate current architecture before integrating layout PDF matching, branding lists, and workflow features.

---

## 1. Current Architecture Summary

### Module Structure

```
/lib
├── workbook/           # Workbook parsing & project model (STABLE)
├── wiring-identification/  # Pattern extraction & filters (STABLE)
├── wiring-ordering/    # Device family sorting (STABLE)
├── wire-length/        # Length estimation (EXTENSIBLE)
├── layout-matching/    # PDF-to-sheet matching (EXTENSIBLE)
├── storage/            # Layout storage utilities (MINIMAL)
└── demo/               # Mock data

/hooks
├── use-project-workbook.ts       # Project state management
├── use-identification-filter.ts  # Filter application
├── use-wire-length-estimates.ts  # Length computation
├── use-wire-list-row-workflow-state.ts  # Checkbox/comment state
├── use-layout-page-matching.ts   # PDF matching
└── use-wire-list-*.ts            # Table utilities

/components
├── projects/           # Upload, cards, headers
├── wire-list/          # Table, toolbar, cells
└── ui/                 # shadcn components

/contexts
└── layout-context.tsx  # Layout PDF state (global)
```

### Data Flow

```
File Upload → parseWorkbook() → buildProjectModel() → ProjectModel
     ↓
Sheet Selection → getSemanticRows() → SemanticWireListRow[]
     ↓
Filters/Views → applyIdentificationFilter() → FilteredRows
     ↓
Table Render → SemanticWireList (TanStack Table)
```

---

## 2. Stable Foundations to Preserve

### A. Data Ingestion Layer ✅

| Component | Status | Notes |
|-----------|--------|-------|
| `parseWorkbook()` | Stable | Clean separation of raw → semantic |
| `buildProjectModel()` | Stable | ProjectModel is well-defined |
| `semantic-wire-list-parser.ts` | Stable | SemanticWireListRow is canonical |
| Sheet classification | Stable | `operational` / `reference` / `unknown` |

**Verdict:** Safe to extend. No refactors needed.

### B. Domain Utility Layer ✅

| Utility | Location | Status |
|---------|----------|--------|
| Device parsing | `wiring-identification/device-parser.ts` | Centralized |
| Blue Labels | `wiring-identification/blue-label-sequence.ts` | Centralized |
| Filter registry | `wiring-identification/filter-registry.ts` | Registry pattern |
| Prefix/gauge filters | `wiring-identification/` | Modular |

**Verdict:** Well-organized. Filter registry is extensible.

### C. Core Types ✅

```typescript
// Canonical - DO NOT CHANGE SHAPE
SemanticWireListRow      // lib/workbook/types.ts
ProjectModel             // lib/workbook/types.ts
BlueLabelSequenceMap     // lib/wiring-identification/types.ts
ParsedWorkbookSheet      // lib/workbook/types.ts
```

---

## 3. Fragile Areas / Technical Debt

### A. Location Field Inconsistency ⚠️

**Problem:** `SemanticWireListRow` has three location fields:
- `fromLocation`
- `toLocation`  
- `location` (deprecated)

**Impact:** Grouping logic uses fallback: `toLocation || fromLocation || location`

**Status:** Fixed in `group-wire-list-rows.ts` with `getRowLocation()` helper.

**Recommendation:** Migrate all code to use `fromLocation`/`toLocation` explicitly.

### B. Table State Coupling ⚠️

**Problem:** `SemanticWireList` component is 1000+ lines with:
- Filter state
- Search state
- Column visibility
- Workflow state
- Length estimates

**Impact:** Hard to reuse for BrandingList.

**Recommendation:** Extract shared table state into `useWireListTableState` hook.

### C. localStorage Coupling ⚠️

**Problem:** Multiple components access localStorage directly:
- `use-project-workbook.ts` - Project + PDF
- `use-wire-list-row-workflow-state.ts` - Checkboxes
- `use-wire-list-column-visibility.ts` - Columns

**Impact:** No unified persistence strategy.

**Recommendation:** Create `lib/storage/project-storage.ts` facade.

---

## 4. Utilities to Canonicalize

### Already Canonical ✅

| Utility | Location |
|---------|----------|
| `parseDeviceId()` | `wiring-identification/device-parser.ts` |
| `buildBlueLabelSequenceMap()` | `wire-length/build-blue-label-sequence-map.ts` |
| `normalizeSheetName()` | Multiple (needs consolidation) |

### Needs Consolidation 🔧

| Utility | Current Locations | Target |
|---------|-------------------|--------|
| `normalizeSheetName()` | `wiring-identification/`, `wire-length/`, `layout-matching/` | `lib/workbook/normalize-sheet-name.ts` |
| Location fallback | `group-wire-list-rows.ts`, `semantic-wire-list.tsx` | `lib/workbook/get-row-location.ts` |

---

## 5. Proposed Module Boundaries

### Current (Good)
```
/lib/workbook              # Parsing, project model
/lib/wiring-identification # Filters, patterns
/lib/wiring-ordering       # Device family sorting
/lib/wire-length           # Length estimation
/lib/layout-matching       # PDF matching
```

### Additions Needed
```
/lib/branding/             # NEW: Branding list logic
  ├── brand-list-filter.ts     # Exclusion rules
  ├── brand-list-aggregator.ts # Cross-sheet aggregation
  ├── brand-list-edit-state.ts # Edit patches
  └── types.ts

/lib/storage/              # EXPAND: Unified persistence
  ├── project-storage.ts       # Project + PDF
  ├── workflow-storage.ts      # Checkbox state
  └── edit-storage.ts          # Edit patches

/lib/project-assets/       # NEW: Combined asset metadata
  ├── compatibility.ts         # Workbook ↔ PDF matching
  ├── sheet-mapping.ts         # Sheet → Layout page
  └── types.ts
```

---

## 6. Shared Table State Strategy

### Problem
`SemanticWireList` and future `BrandingList` share:
- Column definitions
- Row selection
- Workflow checkboxes
- Length display

### Solution: Extract Shared Hooks

```typescript
// hooks/use-wire-table-core.ts
interface UseWireTableCoreOptions {
  rows: SemanticWireListRow[];
  projectId?: string;
  sheetSlug?: string;
  enableWorkflow?: boolean;
  enableLengthEstimates?: boolean;
}

interface UseWireTableCoreReturn {
  // From existing hooks
  workflowState: UseWireListRowWorkflowStateReturn;
  lengthEstimates: UseWireLengthEstimatesReturn;
  
  // Selection (NEW)
  selectedRowIds: Set<string>;
  toggleRowSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
}
```

### BrandingList Extension

```typescript
// hooks/use-brand-list-edits.ts
interface UseBrandListEditsReturn {
  // Editable lengths
  getEditedLength: (rowId: string) => number | null;
  setEditedLength: (rowId: string, value: number) => void;
  
  // Bulk operations
  adjustSelectedLengths: (delta: number) => void;
  resetAllEdits: () => void;
  
  // Undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}
```

---

## 7. Integration Risk Analysis

### 1. Layout PDF Page Matching ✅ Low Risk

**Where:** `lib/layout-matching/`  
**Collision:** None - isolated module  
**Refactor first:** No

### 2. PDF Page Preview Images ✅ Low Risk

**Where:** `components/projects/sheet-layout-cover-image.tsx`  
**Collision:** None  
**Refactor first:** No

### 3. Layout Preview Modal ✅ Low Risk

**Where:** `components/projects/layout-preview-modal.tsx`  
**Collision:** None  
**Refactor first:** No

### 4. Hidden Estimated Length Column ⚠️ Medium Risk

**Where:** `components/wire-list/semantic-wire-list.tsx`  
**Collision:** Column definition is inline in 500+ line useMemo  
**Refactor first:** Extract column definitions to factory

### 5. Wire Length Estimation ✅ Low Risk

**Where:** `lib/wire-length/`, `hooks/use-wire-length-estimates.ts`  
**Collision:** None - already well-isolated  
**Refactor first:** No

### 6. BrandingList Page ⚠️ Medium Risk

**Where:** New route + components  
**Collision:** Needs to reuse SemanticWireListRow but with edits  
**Refactor first:** Yes - extract shared table state

### 7. Bulk Row Updates ⚠️ Medium Risk

**Where:** BrandingList edits  
**Collision:** No existing bulk edit system  
**Refactor first:** Create row patch architecture

### 8. Floating Bottom Toolbar 🔴 Higher Risk

**Where:** New component  
**Collision:** Page layout assumptions  
**Refactor first:** Consider wrapper component

### 9. Undo/Redo ⚠️ Medium Risk

**Where:** BrandingList  
**Collision:** No existing history system  
**Refactor first:** Build edit history abstraction

### 10. Future Workflow/Task Mode 🔴 Higher Risk

**Where:** Throughout  
**Collision:** Current workflow state is checkbox-only  
**Refactor first:** Yes - extend workflow state model

---

## 8. Recommended Implementation Order

### Phase 1: Minimal Refactors (Do Now)

1. **Consolidate `normalizeSheetName()`** - One canonical location
2. **Create `getRowLocation()` helper** - Already done in `group-wire-list-rows.ts`
3. **Extract column definition factory** - From `semantic-wire-list.tsx`

### Phase 2: Safe Extensions (Low Risk)

4. Add PDF page previews to project cards
5. Add layout preview modal
6. Add sheet-to-layout page mapping UI
7. Add hidden Length column toggle

### Phase 3: BrandingList Foundation

8. Create `/lib/branding/` module
9. Create branding list exclusion filters
10. Create `/app/projects/[projectId]/brand-list/` route
11. Implement basic BrandingList table (read-only)

### Phase 4: Edit Capabilities

12. Create row patch architecture (`lib/branding/edit-state.ts`)
13. Add editable length cells
14. Add bulk selection
15. Add bulk edit operations

### Phase 5: Advanced Features

16. Add undo/redo system
17. Add floating toolbar
18. Add export capabilities

---

## 9. Canonical Data Models

### Existing (Preserve)

| Model | Location | Status |
|-------|----------|--------|
| `SemanticWireListRow` | `lib/workbook/types.ts` | Canonical |
| `ProjectModel` | `lib/workbook/types.ts` | Canonical |
| `ParsedWorkbookSheet` | `lib/workbook/types.ts` | Canonical |
| `BlueLabelSequenceMap` | `lib/wiring-identification/types.ts` | Canonical |
| `SheetLayoutMatch` | `lib/layout-matching/types.ts` | Canonical |
| `WireLengthEstimate` | `lib/wire-length/types.ts` | Canonical |

### New (To Create)

| Model | Location | Purpose |
|-------|----------|---------|
| `BrandListRow` | `lib/branding/types.ts` | Extended row with edit state |
| `RowEditPatch` | `lib/branding/types.ts` | Edit delta for a single row |
| `EditHistory` | `lib/branding/types.ts` | Undo/redo stack |
| `ProjectAssets` | `lib/project-assets/types.ts` | Combined workbook + PDF metadata |

---

## 10. Refactor Prioritization

| Refactor | Priority | Reason |
|----------|----------|--------|
| Consolidate `normalizeSheetName()` | **Now** | Duplicated in 3 places |
| Extract column definition factory | **Now** | Needed for BrandingList |
| Create `useWireTableCore` hook | **Later** | Can build incrementally |
| Create unified storage facade | **Later** | Current system works |
| Extract page layout wrapper | **Defer** | Only needed for toolbar |

---

## 11. File Structure Recommendation

```
/lib
├── workbook/                    # KEEP AS-IS
├── wiring-identification/       # KEEP AS-IS
├── wiring-ordering/             # KEEP AS-IS
├── wire-length/                 # KEEP AS-IS
├── layout-matching/             # KEEP AS-IS
├── branding/                    # NEW
│   ├── types.ts
│   ├── brand-list-filter.ts
│   ├── brand-list-aggregator.ts
│   └── index.ts
├── project-assets/              # NEW (optional)
│   ├── types.ts
│   └── compatibility.ts
└── storage/                     # EXPAND
    └── layout-storage.ts        # EXISTS

/hooks
├── use-project-workbook.ts      # KEEP
├── use-brand-list-edits.ts      # NEW
└── use-wire-table-core.ts       # NEW (later)

/components
├── wire-list/                   # KEEP
├── brand-list/                  # NEW
│   ├── brand-list.tsx
│   ├── brand-list-toolbar.tsx
│   └── editable-length-cell.tsx
└── projects/                    # KEEP

/app/projects/[projectId]
├── [sheetName]/page.tsx         # EXISTS
├── brand-list/page.tsx          # NEW
└── layout.tsx                   # Consider shared layout
```

---

## 12. Summary

### What's Working Well

1. **Workbook parsing** - Clean, modular, well-typed
2. **Filter registry** - Extensible pattern for identification
3. **Wire length estimation** - Isolated, comprehensive
4. **Layout matching** - Well-separated from core parsing
5. **Type system** - Strong canonical types

### What Needs Work

1. **Table component size** - `semantic-wire-list.tsx` is too large
2. **Location field usage** - Inconsistent, needs helper
3. **Shared table state** - Not extracted for reuse
4. **Edit/patch system** - Doesn't exist yet

### Next Steps

1. Create `/lib/branding/` module with exclusion filter
2. Create BrandingList route with basic read-only table
3. Add row edit patch system
4. Build editable length cells
5. Add bulk operations and undo/redo

The architecture is **sound and extensible**. The main risk is component size in `semantic-wire-list.tsx`, but this can be addressed incrementally as BrandingList is built.
