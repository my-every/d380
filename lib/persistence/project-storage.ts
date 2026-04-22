import type { AssignmentSwsConfig } from "@/types/d380-assignment-sws";
import type { RowPatch, SheetPatches, PatchHistory } from "@/lib/row-patches";
import { serializeSheetPatches, deserializeSheetPatches, createPatchHistory } from "@/lib/row-patches";
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
  type WorkflowRowState,
} from "@/lib/persistence/project-sheet-state";

// ============================================================================
// Storage Key Generation
// ============================================================================

const STORAGE_PREFIX = "d380-wirelist";

function makeKey(type: string, projectId: string, sheetSlug?: string): string {
  if (sheetSlug) {
    return `${STORAGE_PREFIX}-${type}:${projectId}:${sheetSlug}`;
  }
  return `${STORAGE_PREFIX}-${type}:${projectId}`;
}

const STORAGE_API_BASE = "/api/project-context";

function safeGetItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function hasValues(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

function hasRevisionSelection(value: SheetRevisionSelection): boolean {
  return Boolean(value.wireListFilename || value.layoutFilename);
}

function getSheetStateUrl(projectId: string, sheetSlug: string): string {
  return `${STORAGE_API_BASE}/${encodeURIComponent(projectId)}/sheet-states/${encodeURIComponent(sheetSlug)}`;
}

async function fetchProjectSheetState(
  projectId: string,
  sheetSlug: string,
): Promise<ProjectSheetStateRecord | null> {
  try {
    const response = await fetch(getSheetStateUrl(projectId, sheetSlug), {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as { state?: ProjectSheetStateRecord };
    return payload.state ?? null;
  } catch {
    return null;
  }
}

async function persistProjectSheetState(
  projectId: string,
  sheetSlug: string,
  update: Partial<Omit<ProjectSheetStateRecord, "projectId" | "sheetSlug" | "updatedAt">>,
): Promise<boolean> {
  try {
    const response = await fetch(getSheetStateUrl(projectId, sheetSlug), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(update),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function clearProjectSheetStateScope(
  projectId: string,
  sheetSlug: string,
  scope?: ProjectSheetStateSection,
): Promise<boolean> {
  try {
    const url = new URL(getSheetStateUrl(projectId, sheetSlug), window.location.origin);
    if (scope) {
      url.searchParams.set("scope", scope);
    }

    const response = await fetch(url.toString(), {
      method: "DELETE",
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function listRemoteProjectSheetSlugs(projectId: string): Promise<string[] | null> {
  try {
    const response = await fetch(`${STORAGE_API_BASE}/${encodeURIComponent(projectId)}/sheet-states`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as { sheetSlugs?: string[] };
    return payload.sheetSlugs ?? [];
  } catch {
    return null;
  }
}

async function clearRemoteProjectData(projectId: string): Promise<boolean> {
  try {
    const response = await fetch(`${STORAGE_API_BASE}/${encodeURIComponent(projectId)}/sheet-states`, {
      method: "DELETE",
    });
    return response.ok;
  } catch {
    return false;
  }
}

function readLegacySheetState(projectId: string, sheetSlug: string): ProjectSheetStateRecord {
  return {
    ...createDefaultProjectSheetStateRecord(projectId, sheetSlug),
    rowPatches: safeGetItem<RowPatch[]>(makeKey("patches", projectId, sheetSlug), []),
    workflow: safeGetItem<SheetWorkflowState>(makeKey("workflow", projectId, sheetSlug), {}),
    columnVisibility: safeGetItem<ColumnVisibility>(makeKey("columns", projectId, sheetSlug), {}),
    columnOrder: safeGetItem<ColumnOrder>(makeKey("column-order", projectId, sheetSlug), {}),
    brandingEdits: safeGetItem<SheetBrandingEdits>(makeKey("branding", projectId, sheetSlug), {}),
    patchHistory: safeGetItem<PatchHistory>(makeKey("history", projectId, sheetSlug), createPatchHistory()),
  };
}

function hasLegacySheetState(state: ProjectSheetStateRecord): boolean {
  return (
    state.rowPatches.length > 0 ||
    hasValues(state.workflow) ||
    hasValues(state.columnVisibility) ||
    hasValues(state.columnOrder) ||
    hasValues(state.brandingEdits) ||
    hasRevisionSelection(state.revisionSelection) ||
    state.patchHistory.past.length > 0 ||
    state.patchHistory.future.length > 0
  );
}

async function migrateLegacySheetState(
  projectId: string,
  sheetSlug: string,
): Promise<ProjectSheetStateRecord | null> {
  const legacyState = readLegacySheetState(projectId, sheetSlug);
  if (!hasLegacySheetState(legacyState)) {
    return null;
  }

  const persisted = await persistProjectSheetState(projectId, sheetSlug, {
    rowPatches: legacyState.rowPatches,
    workflow: legacyState.workflow,
    columnVisibility: legacyState.columnVisibility,
    columnOrder: legacyState.columnOrder,
    brandingEdits: legacyState.brandingEdits,
    patchHistory: legacyState.patchHistory,
  });

  if (!persisted) {
    return legacyState;
  }

  safeRemoveItem(makeKey("patches", projectId, sheetSlug));
  safeRemoveItem(makeKey("workflow", projectId, sheetSlug));
  safeRemoveItem(makeKey("columns", projectId, sheetSlug));
  safeRemoveItem(makeKey("column-order", projectId, sheetSlug));
  safeRemoveItem(makeKey("branding", projectId, sheetSlug));
  safeRemoveItem(makeKey("history", projectId, sheetSlug));

  return legacyState;
}

function safeSetItem<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    console.warn(`[ProjectStorage] Failed to save to ${key}`);
    return false;
  }
}

function safeRemoveItem(key: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Workflow State
// ============================================================================

/**
 * Save workflow state for a sheet.
 */
export async function saveWorkflowState(
  projectId: string,
  sheetSlug: string,
  state: SheetWorkflowState
): Promise<boolean> {
  const persisted = await persistProjectSheetState(projectId, sheetSlug, { workflow: state });
  if (persisted) {
    safeRemoveItem(makeKey("workflow", projectId, sheetSlug));
    return true;
  }

  return safeSetItem(makeKey("workflow", projectId, sheetSlug), state);
}

/**
 * Load workflow state for a sheet.
 */
export async function loadWorkflowState(
  projectId: string,
  sheetSlug: string
): Promise<SheetWorkflowState> {
  const remote = await fetchProjectSheetState(projectId, sheetSlug);
  if (remote) {
    return remote.workflow;
  }

  return (await migrateLegacySheetState(projectId, sheetSlug))?.workflow ?? {};
}

/**
 * Clear workflow state for a sheet.
 */
export async function clearWorkflowState(
  projectId: string,
  sheetSlug: string
): Promise<boolean> {
  const cleared = await clearProjectSheetStateScope(projectId, sheetSlug, "workflow");
  safeRemoveItem(makeKey("workflow", projectId, sheetSlug));
  return cleared;
}

// ============================================================================
// Column Visibility
// ============================================================================

/**
 * Save column visibility for a sheet.
 */
export async function saveColumnVisibility(
  projectId: string,
  sheetSlug: string,
  visibility: ColumnVisibility
): Promise<boolean> {
  const persisted = await persistProjectSheetState(projectId, sheetSlug, { columnVisibility: visibility });
  if (persisted) {
    safeRemoveItem(makeKey("columns", projectId, sheetSlug));
    return true;
  }

  return safeSetItem(makeKey("columns", projectId, sheetSlug), visibility);
}

/**
 * Load column visibility for a sheet.
 */
export async function loadColumnVisibility(
  projectId: string,
  sheetSlug: string
): Promise<ColumnVisibility> {
  const remote = await fetchProjectSheetState(projectId, sheetSlug);
  if (remote) {
    return remote.columnVisibility;
  }

  return (await migrateLegacySheetState(projectId, sheetSlug))?.columnVisibility ?? {};
}

// ============================================================================
// Column Order
// ============================================================================

/**
 * Save column order for a sheet.
 */
export async function saveColumnOrder(
  projectId: string,
  sheetSlug: string,
  order: ColumnOrder
): Promise<boolean> {
  const persisted = await persistProjectSheetState(projectId, sheetSlug, { columnOrder: order });
  if (persisted) {
    safeRemoveItem(makeKey("column-order", projectId, sheetSlug));
    return true;
  }

  return safeSetItem(makeKey("column-order", projectId, sheetSlug), order);
}

/**
 * Load column order for a sheet.
 */
export async function loadColumnOrder(
  projectId: string,
  sheetSlug: string
): Promise<ColumnOrder> {
  const remote = await fetchProjectSheetState(projectId, sheetSlug);
  if (remote) {
    return remote.columnOrder;
  }

  return (await migrateLegacySheetState(projectId, sheetSlug))?.columnOrder ?? {};
}

// ============================================================================
// Branding Edits
// ============================================================================

/**
 * Save branding edits for a sheet.
 */
export async function saveBrandingEdits(
  projectId: string,
  sheetSlug: string,
  edits: SheetBrandingEdits
): Promise<boolean> {
  const persisted = await persistProjectSheetState(projectId, sheetSlug, { brandingEdits: edits });
  if (persisted) {
    safeRemoveItem(makeKey("branding", projectId, sheetSlug));
    return true;
  }

  return safeSetItem(makeKey("branding", projectId, sheetSlug), edits);
}

/**
 * Load branding edits for a sheet.
 */
export async function loadBrandingEdits(
  projectId: string,
  sheetSlug: string
): Promise<SheetBrandingEdits> {
  const remote = await fetchProjectSheetState(projectId, sheetSlug);
  if (remote) {
    return remote.brandingEdits;
  }

  return (await migrateLegacySheetState(projectId, sheetSlug))?.brandingEdits ?? {};
}

/**
 * Clear branding edits for a sheet.
 */
export async function clearBrandingEdits(
  projectId: string,
  sheetSlug: string
): Promise<boolean> {
  const cleared = await clearProjectSheetStateScope(projectId, sheetSlug, "brandingEdits");
  safeRemoveItem(makeKey("branding", projectId, sheetSlug));
  return cleared;
}

// ============================================================================
// Revision Pair Selection
// ============================================================================

/**
 * Save the selected wire-list/layout revision pair for a sheet.
 */
export async function saveRevisionSelection(
  projectId: string,
  sheetSlug: string,
  selection: SheetRevisionSelection
): Promise<boolean> {
  return persistProjectSheetState(projectId, sheetSlug, {
    revisionSelection: {
      wireListFilename: selection.wireListFilename ?? null,
      layoutFilename: selection.layoutFilename ?? null,
    },
  });
}

/**
 * Load the selected wire-list/layout revision pair for a sheet.
 */
export async function loadRevisionSelection(
  projectId: string,
  sheetSlug: string
): Promise<SheetRevisionSelection> {
  const remote = await fetchProjectSheetState(projectId, sheetSlug);
  if (remote) {
    return remote.revisionSelection;
  }

  return (await migrateLegacySheetState(projectId, sheetSlug))?.revisionSelection ?? {
    wireListFilename: null,
    layoutFilename: null,
  };
}

/**
 * Clear the selected wire-list/layout revision pair for a sheet.
 */
export async function clearRevisionSelection(
  projectId: string,
  sheetSlug: string
): Promise<boolean> {
  return clearProjectSheetStateScope(projectId, sheetSlug, "revisionSelection");
}

// ============================================================================
// Patch History (Undo/Redo)
// ============================================================================

/**
 * Save patch history for a sheet.
 */
export async function savePatchHistory(
  projectId: string,
  sheetSlug: string,
  history: PatchHistory
): Promise<boolean> {
  const persisted = await persistProjectSheetState(projectId, sheetSlug, { patchHistory: history });
  if (persisted) {
    safeRemoveItem(makeKey("history", projectId, sheetSlug));
    return true;
  }

  return safeSetItem(makeKey("history", projectId, sheetSlug), history);
}

/**
 * Load patch history for a sheet.
 */
export async function loadPatchHistory(
  projectId: string,
  sheetSlug: string
): Promise<PatchHistory> {
  const remote = await fetchProjectSheetState(projectId, sheetSlug);
  if (remote) {
    return remote.patchHistory;
  }

  return (await migrateLegacySheetState(projectId, sheetSlug))?.patchHistory ?? createPatchHistory();
}

/**
 * Clear patch history for a sheet.
 */
export async function clearPatchHistory(
  projectId: string,
  sheetSlug: string
): Promise<boolean> {
  const cleared = await clearProjectSheetStateScope(projectId, sheetSlug, "patchHistory");
  safeRemoveItem(makeKey("history", projectId, sheetSlug));
  return cleared;
}

// ============================================================================
// Project-Level Operations
// ============================================================================

/**
 * Clear all data for a project.
 */
export async function clearProjectData(projectId: string): Promise<void> {
  if (typeof window === "undefined") return;
  await clearRemoteProjectData(projectId);

  const keysToRemove: string[] = [];
  const prefix = `${STORAGE_PREFIX}-`;
  const projectSuffix = `:${projectId}`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix) && key.includes(projectSuffix)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

/**
 * Get all sheet slugs with data for a project.
 */
export async function getProjectSheetSlugs(projectId: string): Promise<string[]> {
  const remote = await listRemoteProjectSheetSlugs(projectId);
  if (remote) {
    return remote;
  }

  if (typeof window === "undefined") return [];

  const slugs = new Set<string>();
  const prefix = `${STORAGE_PREFIX}-`;
  const projectPattern = `:${projectId}:`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix) && key.includes(projectPattern)) {
      // Extract sheet slug from key
      const afterProject = key.split(projectPattern)[1];
      if (afterProject) {
        slugs.add(afterProject);
      }
    }
  }

  return Array.from(slugs);
}

/**
 * Export all project data as JSON.
 */
export async function exportProjectData(projectId: string): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};
  const slugs = await getProjectSheetSlugs(projectId);

  for (const slug of slugs) {
    data[`patches:${slug}`] = serializeSheetPatches(await loadRowPatches(projectId, slug));
    data[`workflow:${slug}`] = await loadWorkflowState(projectId, slug);
    data[`columns:${slug}`] = await loadColumnVisibility(projectId, slug);
    data[`column-order:${slug}`] = await loadColumnOrder(projectId, slug);
    data[`branding:${slug}`] = await loadBrandingEdits(projectId, slug);
    data[`revision-selection:${slug}`] = await loadRevisionSelection(projectId, slug);
    data[`history:${slug}`] = await loadPatchHistory(projectId, slug);
  }

  return data;
}

/**
 * Import project data from JSON.
 */
export async function importProjectData(
  projectId: string,
  data: Record<string, unknown>
): Promise<void> {
  for (const [key, value] of Object.entries(data)) {
    const [type, slug] = key.split(":");
    if (!slug || !value) continue;

    switch (type) {
      case "patches":
        await saveRowPatches(projectId, slug, deserializeSheetPatches(value as RowPatch[]));
        break;
      case "workflow":
        await saveWorkflowState(projectId, slug, value as SheetWorkflowState);
        break;
      case "columns":
        await saveColumnVisibility(projectId, slug, value as ColumnVisibility);
        break;
      case "column-order":
        await saveColumnOrder(projectId, slug, value as ColumnOrder);
        break;
      case "branding":
        await saveBrandingEdits(projectId, slug, value as SheetBrandingEdits);
        break;
      case "revision-selection":
        await saveRevisionSelection(projectId, slug, value as SheetRevisionSelection);
        break;
      case "history":
        await savePatchHistory(projectId, slug, value as PatchHistory);
        break;
    }
  }
}

export async function saveRowPatches(
  projectId: string,
  sheetSlug: string,
  patches: SheetPatches
): Promise<boolean> {
  const serialized = serializeSheetPatches(patches);
  const persisted = await persistProjectSheetState(projectId, sheetSlug, { rowPatches: serialized });
  if (persisted) {
    safeRemoveItem(makeKey("patches", projectId, sheetSlug));
    return true;
  }

  return safeSetItem(makeKey("patches", projectId, sheetSlug), serialized);
}

export async function loadRowPatches(
  projectId: string,
  sheetSlug: string
): Promise<SheetPatches> {
  const remote = await fetchProjectSheetState(projectId, sheetSlug);
  if (remote) {
    return deserializeSheetPatches(remote.rowPatches);
  }

  const legacy = await migrateLegacySheetState(projectId, sheetSlug);
  return deserializeSheetPatches(legacy?.rowPatches ?? []);
}

export async function clearRowPatches(
  projectId: string,
  sheetSlug: string
): Promise<boolean> {
  const cleared = await clearProjectSheetStateScope(projectId, sheetSlug, "rowPatches");
  safeRemoveItem(makeKey("patches", projectId, sheetSlug));
  return cleared;
}

export type {
  BrandingRowEdit,
  ColumnOrder,
  ColumnVisibility,
  SheetBrandingEdits,
  SheetRevisionSelection,
  SheetWorkflowState,
  WorkflowRowState,
};

// ============================================================================
// SWS Config Persistence
// ============================================================================

/** Save AssignmentSwsConfig for a sheet via the remote state API. */
export async function saveSwsConfig(
  projectId: string,
  sheetSlug: string,
  swsConfig: AssignmentSwsConfig,
): Promise<boolean> {
  return persistProjectSheetState(projectId, sheetSlug, { swsConfig });
}

/**
 * Load the AssignmentSwsConfig for a sheet.
 * Returns `null` when no config has been saved yet.
 */
export async function loadSwsConfig(
  projectId: string,
  sheetSlug: string,
): Promise<AssignmentSwsConfig | null> {
  const remote = await fetchProjectSheetState(projectId, sheetSlug);
  return remote?.swsConfig ?? null;
}

/** Clear swsConfig for a sheet. */
export async function clearSwsConfig(
  projectId: string,
  sheetSlug: string,
): Promise<boolean> {
  return clearProjectSheetStateScope(projectId, sheetSlug, "swsConfig");
}
