# Assignment Stages Data

## Overview
Defines the workflow stages through which assignments progress. Stages are ordered and grouped by manufacturing phase.

## Files

### stages.csv
Stage definitions with display properties and flow configuration.

| Column | Type | Description |
|--------|------|-------------|
| stage_id | AssignmentStage | Unique stage identifier |
| label | string | Human-readable display label |
| description | string | Stage description |
| color | string | Tailwind color name |
| icon | string | Lucide icon name |
| is_terminal | boolean | Whether this is a final stage |
| sequence_order | number | Order in workflow (0-13) |
| flow_group | string | Phase group: setup, build, wire, box, test, complete |

## Workflow Flow Groups

### Setup Phase
- UNASSIGNED: Initial state before assignment

### Build Phase
- READY_TO_LAY: Kitted and ready
- BUILD_UP: Active panel/rail build
- READY_TO_WIRE: Build-up complete, awaiting wiring

### Wire Phase
- WIRING: Active wiring work
- READY_FOR_VISUAL: Visual inspection stage
- READY_TO_HANG: Ready to install in enclosure

### Box Phase
- BOX_BUILD: Box/enclosure assembly
- CROSS_WIRE: Inter-panel wiring

### Test Phase
- READY_TO_TEST: Awaiting test
- TEST_1ST_PASS: First electrical test
- PWR_CHECK: Power verification
- READY_FOR_BIQ: Pre-BIQ queue

### Complete Phase
- FINISHED_BIQ: Lifecycle complete

## Stage Transitions
```
UNASSIGNED → READY_TO_LAY → BUILD_UP → READY_TO_WIRE → 
WIRING → READY_FOR_VISUAL → READY_TO_HANG → 
[BOX_BUILD →] CROSS_WIRE → READY_TO_TEST → 
TEST_1ST_PASS → PWR_CHECK → READY_FOR_BIQ → FINISHED_BIQ
```

## Usage

### Import (App Load)
```typescript
import { loadStagesFromCSV } from '@/lib/data-loader/share-loader';

const stages = await loadStagesFromCSV('/Share/stages/stages.csv');
```

## Related Types
- `AssignmentStage` in `types/d380-assignment.ts`
- `StageColumnDefinition` in `types/d380-assignment.ts`
- `STAGE_COLUMNS` constant

## Notes
- Stages are static configuration
- Not all assignments go through all stages (e.g., build-only skips wiring)
- Cross-wire stage only available for assignments with external locations
- Terminal stage (FINISHED_BIQ) cannot transition further
