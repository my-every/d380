import { NextRequest, NextResponse } from "next/server";

import {
  createDefaultProjectSheetStateRecord,
  type BrandingRowEdit,
  type ColumnOrder,
  type ColumnVisibility,
  type ProjectSheetStateRecord,
  type ProjectSheetStateSection,
  type SheetBrandingEdits,
  type SheetRevisionSelection,
  type SheetWorkflowState,
} from "@/lib/persistence/project-sheet-state";
import type { AssignmentSwsConfig } from "@/types/d380-assignment-sws";
import type { PatchHistory, PatchOperation, RowPatch } from "@/lib/row-patches";
import {
  clearProjectSheetStateSection,
  deleteProjectSheetState,
  readProjectSheetState,
  writeProjectSheetState,
} from "@/lib/project-state/share-sheet-state-handlers";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRowPatch(value: unknown): value is RowPatch {
  if (!isRecord(value) || typeof value.rowId !== "string") {
    return false;
  }

  return (
    (value.lengthOverride === undefined || value.lengthOverride === null || typeof value.lengthOverride === "number") &&
    (value.lengthAdjustment === undefined || typeof value.lengthAdjustment === "number") &&
    (value.comment === undefined || typeof value.comment === "string") &&
    (value.ipvChecked === undefined || typeof value.ipvChecked === "boolean") &&
    (value.fromChecked === undefined || typeof value.fromChecked === "boolean") &&
    (value.toChecked === undefined || typeof value.toChecked === "boolean") &&
    (value.gaugeOverride === undefined || typeof value.gaugeOverride === "string") &&
    (value.wireIdOverride === undefined || typeof value.wireIdOverride === "string") &&
    (value.updatedAt === undefined || typeof value.updatedAt === "number") &&
    (value.source === undefined || value.source === "manual" || value.source === "bulk" || value.source === "import")
  );
}

function isWorkflowState(value: unknown): value is SheetWorkflowState {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(entry =>
    isRecord(entry) &&
    (entry.fromChecked === undefined || typeof entry.fromChecked === "boolean") &&
    (entry.toChecked === undefined || typeof entry.toChecked === "boolean") &&
    (entry.ipvChecked === undefined || typeof entry.ipvChecked === "boolean") &&
    (entry.comment === undefined || typeof entry.comment === "string"),
  );
}

function isBooleanRecord(value: unknown): value is ColumnVisibility {
  return isRecord(value) && Object.values(value).every(entry => typeof entry === "boolean");
}

function isNumberRecord(value: unknown): value is ColumnOrder {
  return isRecord(value) && Object.values(value).every(entry => typeof entry === "number");
}

function isBrandingRowEdit(value: unknown): value is BrandingRowEdit {
  return (
    isRecord(value) &&
    typeof value.wireNo === "string" &&
    (value.length === undefined || typeof value.length === "number") &&
    (value.lengthAdjustment === undefined || typeof value.lengthAdjustment === "number") &&
    (value.excluded === undefined || typeof value.excluded === "boolean") &&
    (value.notes === undefined || typeof value.notes === "string")
  );
}

function isBrandingEdits(value: unknown): value is SheetBrandingEdits {
  return isRecord(value) && Object.values(value).every(isBrandingRowEdit);
}

function isRevisionSelection(value: unknown): value is SheetRevisionSelection {
  return (
    isRecord(value) &&
    (value.wireListFilename === null || value.wireListFilename === undefined || typeof value.wireListFilename === "string") &&
    (value.layoutFilename === null || value.layoutFilename === undefined || typeof value.layoutFilename === "string")
  );
}

function isPatchOperation(value: unknown): value is PatchOperation {
  return (
    isRecord(value) &&
    (value.type === "set" || value.type === "update" || value.type === "delete" || value.type === "bulk") &&
    Array.isArray(value.rowIds) && value.rowIds.every(entry => typeof entry === "string") &&
    typeof value.sheetSlug === "string" &&
    Array.isArray(value.previousPatches) && value.previousPatches.every(isRowPatch) &&
    Array.isArray(value.newPatches) && value.newPatches.every(isRowPatch) &&
    typeof value.timestamp === "number" &&
    typeof value.description === "string"
  );
}

function isPatchHistory(value: unknown): value is PatchHistory {
  return (
    isRecord(value) &&
    Array.isArray(value.past) && value.past.every(isPatchOperation) &&
    Array.isArray(value.future) && value.future.every(isPatchOperation) &&
    typeof value.maxSize === "number"
  );
}

function isSwsConfig(value: unknown): value is AssignmentSwsConfig {
  if (!isRecord(value)) return false;
  if (typeof value.templateId !== "string") return false;
  if (typeof value.isManualOverride !== "boolean") return false;
  if (!isRecord(value.sectionOverrides)) return false;
  if (!Array.isArray(value.components)) return false;
  if (typeof value.reviewStatus !== "string") return false;
  if (!Array.isArray(value.exportReviews)) return false;
  return true;
}

function parseSheetStateUpdate(
  body: unknown,
): Partial<Omit<ProjectSheetStateRecord, "projectId" | "sheetSlug" | "updatedAt">> | null {
  if (!isRecord(body)) {
    return null;
  }

  const update: Partial<Omit<ProjectSheetStateRecord, "projectId" | "sheetSlug" | "updatedAt">> = {};

  if (body.rowPatches !== undefined) {
    if (!Array.isArray(body.rowPatches) || !body.rowPatches.every(isRowPatch)) {
      return null;
    }
    update.rowPatches = body.rowPatches;
  }

  if (body.workflow !== undefined) {
    if (!isWorkflowState(body.workflow)) {
      return null;
    }
    update.workflow = body.workflow;
  }

  if (body.columnVisibility !== undefined) {
    if (!isBooleanRecord(body.columnVisibility)) {
      return null;
    }
    update.columnVisibility = body.columnVisibility;
  }

  if (body.columnOrder !== undefined) {
    if (!isNumberRecord(body.columnOrder)) {
      return null;
    }
    update.columnOrder = body.columnOrder;
  }

  if (body.brandingEdits !== undefined) {
    if (!isBrandingEdits(body.brandingEdits)) {
      return null;
    }
    update.brandingEdits = body.brandingEdits;
  }

  if (body.revisionSelection !== undefined) {
    if (!isRevisionSelection(body.revisionSelection)) {
      return null;
    }
    update.revisionSelection = {
      wireListFilename: body.revisionSelection.wireListFilename ?? null,
      layoutFilename: body.revisionSelection.layoutFilename ?? null,
    };
  }

  if (body.patchHistory !== undefined) {
    if (!isPatchHistory(body.patchHistory)) {
      return null;
    }
    update.patchHistory = body.patchHistory;
  }

  if (body.swsConfig !== undefined) {
    if (!isSwsConfig(body.swsConfig)) {
      return null;
    }
    update.swsConfig = body.swsConfig;
  }

  return update;
}

function parseSection(scope: string | null): ProjectSheetStateSection | null {
  switch (scope) {
    case "rowPatches":
    case "workflow":
    case "columnVisibility":
    case "columnOrder":
    case "brandingEdits":
    case "revisionSelection":
    case "patchHistory":
    case "swsConfig":
      return scope;
    default:
      return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sheetSlug: string }> },
) {
  const { projectId, sheetSlug } = await params;
  const state = await readProjectSheetState(projectId, sheetSlug);

  if (!state) {
    return NextResponse.json(
      { error: "Sheet state not found", state: createDefaultProjectSheetStateRecord(projectId, sheetSlug) },
      { status: 404 },
    );
  }

  return NextResponse.json({ state });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sheetSlug: string }> },
) {
  const { projectId, sheetSlug } = await params;
  const update = parseSheetStateUpdate(await request.json());

  if (!update) {
    return NextResponse.json({ error: "Malformed sheet state payload" }, { status: 400 });
  }

  const state = await writeProjectSheetState(projectId, sheetSlug, update);
  return NextResponse.json({ state });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sheetSlug: string }> },
) {
  const { projectId, sheetSlug } = await params;
  const scope = parseSection(request.nextUrl.searchParams.get("scope"));

  if (scope) {
    const state = await clearProjectSheetStateSection(projectId, sheetSlug, scope);
    return NextResponse.json({ state });
  }

  await deleteProjectSheetState(projectId, sheetSlug);
  return NextResponse.json({ success: true });
}
