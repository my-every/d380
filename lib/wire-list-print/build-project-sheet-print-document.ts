import "server-only";

import type { WireListPrintDocumentData } from "@/components/wire-list/print-modal";
import { buildCablePartNumberMap, buildPartNumberMap } from "@/lib/part-number-list";
import { deserializeSheetPatches, applyPatchesToRows } from "@/lib/row-patches";
import { readProjectManifest, readAssignmentMappings, readSheetSchema } from "@/lib/project-state/share-project-state-handlers";
import { readDevicePartNumbersMap } from "@/lib/project-state/device-part-numbers-generator";
import { resolveProjectRootDirectory } from "@/lib/project-state/share-project-state-handlers";
import { readProjectSheetState } from "@/lib/project-state/share-sheet-state-handlers";
import {
  createDefaultProjectInfo,
  createDefaultPrintSettings,
  type PrintSettings,
} from "@/lib/wire-list-print/defaults";
import {
  buildBrandingVisibleSections,
  buildDefaultBrandingHiddenSections,
  buildDefaultStandardHiddenSections,
  buildPrintPreviewPageCount,
  buildProcessedPrintLocationGroups,
  resolveActiveHiddenSections,
} from "@/lib/wire-list-print/model";
import { buildWireLengthEstimatesFromSheets, estimateToRowLength } from "@/lib/wire-length";
import { readReferenceSheetData } from "@/lib/project-state/share-project-state-handlers";
import type { ParsedWorkbookSheet } from "@/lib/workbook/types";

/** Minimum branding length in inches — any computed or persisted value below this floor is raised to it. */
const BRANDING_MINIMUM_LENGTH_INCHES = 60;

function applyBrandingMinimumLength(length: number | undefined): number | undefined {
  if (typeof length !== "number") return undefined;
  return Math.max(length, BRANDING_MINIMUM_LENGTH_INCHES);
}

export async function buildProjectSheetPrintDocument(options: {
  projectId: string;
  sheetSlug: string;
  settings?: Partial<PrintSettings>;
}): Promise<WireListPrintDocumentData | null> {
  const manifest = await readProjectManifest(options.projectId);
  if (!manifest) {
    return null;
  }

  const sheetEntry = manifest.sheets.find(s => s.slug === options.sheetSlug);
  if (!sheetEntry || sheetEntry.kind !== "operational") {
    return null;
  }

  const schema = await readSheetSchema(options.projectId, options.sheetSlug);
  if (!schema) {
    return null;
  }

  const settings: PrintSettings = {
    ...createDefaultPrintSettings(),
    ...options.settings,
    // Safely reconstitute Set fields that may arrive as arrays from JSON
    standardHiddenSections: options.settings?.standardHiddenSections instanceof Set
      ? options.settings.standardHiddenSections
      : new Set(Array.isArray(options.settings?.standardHiddenSections) ? options.settings.standardHiddenSections as unknown as string[] : []),
    brandingHiddenSections: options.settings?.brandingHiddenSections instanceof Set
      ? options.settings.brandingHiddenSections
      : new Set(Array.isArray(options.settings?.brandingHiddenSections) ? options.settings.brandingHiddenSections as unknown as string[] : []),
    hiddenRows: options.settings?.hiddenRows instanceof Set
      ? options.settings.hiddenRows
      : new Set(Array.isArray(options.settings?.hiddenRows) ? options.settings.hiddenRows as unknown as string[] : []),
    crossWireSections: options.settings?.crossWireSections instanceof Set
      ? options.settings.crossWireSections
      : new Set(Array.isArray(options.settings?.crossWireSections) ? options.settings.crossWireSections as unknown as string[] : []),
  };
  const projectInfo = createDefaultProjectInfo({
    projectNumber: manifest.pdNumber,
    projectName: manifest.name,
    revision: manifest.revision,
    pdNumber: manifest.pdNumber,
    unitNumber: manifest.unitNumber,
  });
  const sheetState = await readProjectSheetState(options.projectId, options.sheetSlug);

  // Read pre-computed reference data from project state
  const projectRoot = await resolveProjectRootDirectory(options.projectId, {
    pdNumber: manifest.pdNumber,
    projectName: manifest.name,
  });
  const partNumberMap = projectRoot
    ? await readDevicePartNumbersMap(projectRoot).then(map => {
      if (!map) return new Map<string, { partNumber: string; description?: string }>();
      return new Map(Object.entries(map.devices).map(([id, entry]) => [id, { partNumber: entry.partNumber, description: entry.description }]));
    })
    : new Map<string, { partNumber: string; description?: string }>();

  // Blue labels and cable part numbers — read from stored reference sheets if available
  const blueLabels = new Map<string, { locations: string[] }>();
  const cablePartNumberMap = new Map<string, { partNumber: string }>();

  // Load reference sheets for wire length estimation
  const [blueLabelsRef, partListRef] = await Promise.all([
    readReferenceSheetData(options.projectId, "blue-labels"),
    readReferenceSheetData(options.projectId, "part-number-list"),
  ]);

  function toWorkbookSheet(ref: Awaited<ReturnType<typeof readReferenceSheetData>>): ParsedWorkbookSheet | null {
    if (!ref) return null;
    return {
      originalName: ref.sheet.name,
      slug: ref.sheet.slug,
      headers: ref.sheet.headers,
      rows: (ref.data.rows ?? []) as ParsedWorkbookSheet["rows"],
      rowCount: ref.sheet.rowCount,
      columnCount: ref.sheet.columnCount,
      sheetIndex: ref.sheet.sheetIndex ?? 0,
      warnings: ref.sheet.warnings ?? [],
    };
  }

  const blueLabelsSheet = toWorkbookSheet(blueLabelsRef);
  const partListSheet = toWorkbookSheet(partListRef);

  const semanticRows = schema.rows ?? [];
  const computedLengths = new Map<string, number>();
  const rowLengthsById: NonNullable<WireListPrintDocumentData["rowLengthsById"]> = {};

  // Compute wire length estimates from reference sheets
  if (blueLabelsSheet) {
    const estimationResult = buildWireLengthEstimatesFromSheets(
      semanticRows,
      blueLabelsSheet,
      partListSheet,
      schema.name,
    );
    for (const [rowId, estimate] of estimationResult.estimates) {
      const rowLength = estimateToRowLength(estimate);
      if (rowLength) {
        rowLengthsById[rowId] = {
          display: rowLength.display,
          roundedInches: rowLength.roundedInches,
          confidence: rowLength.confidence,
        };
      }
    }
  }

  const patchedRows = applyPatchesToRows(
    semanticRows,
    deserializeSheetPatches(sheetState?.rowPatches ?? []),
    { computedLengths },
  );
  const processedLocationGroups = buildProcessedPrintLocationGroups({
    rows: patchedRows,
    mode: settings.mode,
    enabledSections: settings.enabledSections,
    sectionOrder: settings.sectionOrder,
    currentSheetName: schema.name,
    blueLabels,
    partNumberMap,
    sortMode: settings.mode === "branding" ? settings.brandingSortMode : settings.wireListSortMode,
  });
  const assignmentMappings = await readAssignmentMappings(options.projectId);
  const externalSectionContext = {
    assignmentMappings,
    currentSheetName: schema.name,
    internalRows: patchedRows,
    partNumberMap,
  };
  const defaultBrandingHiddenSections = buildDefaultBrandingHiddenSections(processedLocationGroups, externalSectionContext);
  const defaultStandardHiddenSections = buildDefaultStandardHiddenSections(processedLocationGroups, externalSectionContext);
  const activeHiddenSections = resolveActiveHiddenSections({
    mode: settings.mode,
    standardHiddenSections: settings.standardHiddenSections,
    standardHiddenSectionsCustomized: settings.standardHiddenSectionsCustomized,
    brandingHiddenSections: settings.brandingHiddenSections,
    brandingHiddenSectionsCustomized: settings.brandingHiddenSectionsCustomized,
    defaultBrandingHiddenSections,
    defaultStandardHiddenSections,
  });
  const previewPageCount = buildPrintPreviewPageCount(
    {
      mode: settings.mode,
      processedLocationGroups,
      showFeedbackSection: settings.showFeedbackSection,
      showCoverPage: settings.showCoverPage,
      showTableOfContents: settings.showTableOfContents,
      showIPVCodes: settings.showIPVCodes,
    },
  );
  const comments = Object.fromEntries(
    Object.entries(sheetState?.workflow ?? {})
      .map(([rowId, state]) => [rowId, state.comment ?? ""])
      .filter(([, comment]) => comment.length > 0),
  );
  const brandingPreviewRowMap = new Map(
    patchedRows.map((row) => {
      const baseLength = rowLengthsById[row.__rowId]?.roundedInches;
      const persistedEdit = sheetState?.brandingEdits?.[row.__rowId];
      const persistedLength = typeof persistedEdit?.length === "number"
        ? persistedEdit.length
        : typeof persistedEdit?.lengthAdjustment === "number" && typeof baseLength === "number"
          ? Math.max(0, baseLength + persistedEdit.lengthAdjustment)
          : undefined;
      const location = row.toLocation || row.fromLocation || row.location || "-";

      return [
        row.__rowId,
        {
          row,
          baseLength,
          measurement: applyBrandingMinimumLength(typeof persistedLength === "number" ? persistedLength : baseLength),
          isManual: typeof persistedLength === "number",
          location,
          isExternal: Boolean(schema.name.trim()) && !location.toUpperCase().includes(schema.name.toUpperCase().trim()),
        },
      ] as const;
    }),
  );

  return {
    settings,
    projectInfo,
    sheetTitle: "Wire List",
    currentSheetName: schema.name,
    previewPageCount,
    processedLocationGroups,
    hiddenSectionKeys: Array.from(activeHiddenSections),
    hiddenRowIds: Array.from(settings.hiddenRows),
    crossWireSectionKeys: Array.from(settings.crossWireSections),
    comments,
    partNumberEntries: Array.from(partNumberMap.entries()),
    cablePartNumberEntries: Array.from(cablePartNumberMap.entries()),
    rowLengthsById,
    brandingVisibleSections: buildBrandingVisibleSections({
      processedLocationGroups,
      activeHiddenSections,
      brandingPreviewRowMap,
      currentSheetName: schema.name,
      partNumberMap,
    }),
    includeFeedbackPage: settings.mode !== "branding",
  };
}