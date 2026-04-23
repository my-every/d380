import type { PatchHistory, RowPatch } from "@/lib/row-patches";
import { createPatchHistory } from "@/lib/row-patches";
import type { AssignmentSwsConfig } from "@/types/d380-assignment-sws";

export interface WorkflowRowState {
  fromChecked: boolean;
  toChecked: boolean;
  ipvChecked: boolean;
  comment: string;
}

export interface SheetWorkflowState {
  [rowId: string]: Partial<WorkflowRowState>;
}

export interface ColumnVisibility {
  [columnKey: string]: boolean;
}

export interface ColumnOrder {
  [columnKey: string]: number;
}

export interface BrandingRowEdit {
  wireNo: string;
  length?: number;
  lengthAdjustment?: number;
  excluded?: boolean;
  notes?: string;
}

export interface SheetBrandingEdits {
  [rowId: string]: BrandingRowEdit;
}

export interface SheetRevisionSelection {
  wireListFilename: string | null;
  layoutFilename: string | null;
}

export interface ProjectSheetStateRecord {
  projectId: string;
  sheetSlug: string;
  updatedAt: string;
  rowPatches: RowPatch[];
  workflow: SheetWorkflowState;
  columnVisibility: ColumnVisibility;
  columnOrder: ColumnOrder;
  brandingEdits: SheetBrandingEdits;
  revisionSelection: SheetRevisionSelection;
  patchHistory: PatchHistory;
  swsConfig?: AssignmentSwsConfig;
}

export type ProjectSheetStateSection =
  | "rowPatches"
  | "workflow"
  | "columnVisibility"
  | "columnOrder"
  | "brandingEdits"
  | "revisionSelection"
  | "patchHistory"
  | "swsConfig";

export function createDefaultProjectSheetStateRecord(
  projectId: string,
  sheetSlug: string,
): ProjectSheetStateRecord {
  return {
    projectId,
    sheetSlug,
    updatedAt: new Date().toISOString(),
    rowPatches: [],
    workflow: {},
    columnVisibility: {},
    columnOrder: {},
    brandingEdits: {},
    revisionSelection: {
      wireListFilename: null,
      layoutFilename: null,
    },
    patchHistory: createPatchHistory(),
    swsConfig: undefined,
  };
}