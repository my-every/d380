import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import XLSX from "xlsx-js-style";

import type { BrandListExportSchema } from "@/lib/wire-brand-list/schema";
import type { WireListPrintSchema } from "@/lib/wire-list-print/schema";
import { readProjectManifest } from "@/lib/project-state/share-project-state-handlers";
import {
  readWireBrandListSchema,
  readWireListPrintSchema,
} from "@/lib/project-state/share-print-schema-handlers";
import {
  EXPORTS_DIRECTORY,
  UNITS_DIRECTORY,
  resolveUnitExportsRoot,
  sanitizeExportFileSegment,
} from "@/lib/project-exports/project-exports-paths";

const MULTI_SHEET_PRINT_EXPORTS_DIRECTORY = "multi-sheet-print";

export interface MultiSheetPrintExportFile {
  fileName: string;
  relativePath: string;
}

export interface MultiSheetPrintExportResult {
  projectId: string;
  generatedAt: string;
  approvedSheets: Array<{
    sheetSlug: string;
    sheetName: string;
    brandingRows: number;
    wireRows: number;
  }>;
  skippedSheets: Array<{
    sheetSlug: string;
    reason: string;
  }>;
  brandingWorkbook?: MultiSheetPrintExportFile;
  wireListSchema?: MultiSheetPrintExportFile;
  manifestFile?: MultiSheetPrintExportFile;
}

interface CombinedWireListExportDocument {
  schemaVersion: 1;
  generatedAt: string;
  projectId: string;
  projectName: string;
  approvedSheetOrder: string[];
  sheets: WireListPrintSchema[];
}

function makeRelativeExportPath(unitNumber: string, fileName: string): string {
  return path.posix.join(
    EXPORTS_DIRECTORY,
    UNITS_DIRECTORY,
    sanitizeExportFileSegment(unitNumber),
    MULTI_SHEET_PRINT_EXPORTS_DIRECTORY,
    fileName,
  );
}

function truncateWorksheetName(value: string): string {
  const sanitized = value.replace(/[\\/*?:[\]]/g, " ").trim() || "Sheet";
  return sanitized.slice(0, 31);
}

function buildBrandingWorkbook(schemas: BrandListExportSchema[]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  for (const schema of schemas) {
    const rows: Array<Array<string | number>> = [
      [schema.projectInfo.projectNumber ?? "", schema.projectInfo.projectName ?? "", schema.projectInfo.revision ?? ""],
      [schema.sheetName],
      [...schema.header.columns],
    ];

    for (const prefixGroup of schema.prefixGroups) {
      rows.push([prefixGroup.prefix]);

      for (const bundle of prefixGroup.bundles) {
        if (bundle.bundleName) {
          rows.push(["", "", "", "", "", "", bundle.toLocation, bundle.bundleName]);
        }

        for (const row of bundle.rows) {
          rows.push([
            row.fromDeviceId,
            row.wireNo,
            row.wireId,
            row.gaugeSize,
            row.length ?? "",
            row.toDeviceId,
            row.toLocation,
            row.bundleDisplay || row.bundleName,
          ]);
        }
      }

      rows.push([]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 16 },
      { wch: 24 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, truncateWorksheetName(schema.sheetName));
  }

  return workbook;
}

export async function generateMultiSheetPrintExport(
  projectId: string,
  approvedSheetSlugs: string[],
): Promise<MultiSheetPrintExportResult> {
  const manifest = await readProjectManifest(projectId);
  if (!manifest) {
    throw new Error("Project not found");
  }

  if (!approvedSheetSlugs.length) {
    throw new Error("No approved sheets provided");
  }

  const unitExportsRoot = await resolveUnitExportsRoot(projectId, manifest.unitNumber ?? "");
  if (!unitExportsRoot) {
    throw new Error("Project exports directory not found");
  }

  const exportDirectory = path.join(unitExportsRoot, MULTI_SHEET_PRINT_EXPORTS_DIRECTORY);
  await fs.mkdir(exportDirectory, { recursive: true });

  const manifestSheets = manifest.sheets.filter((sheet) => sheet.kind === "operational");
  const approvedSet = new Set(approvedSheetSlugs);
  const orderedSheets = manifestSheets.filter((sheet) => approvedSet.has(sheet.slug));

  const brandingSchemas: BrandListExportSchema[] = [];
  const wireSchemas: WireListPrintSchema[] = [];
  const approvedSheets: MultiSheetPrintExportResult["approvedSheets"] = [];
  const skippedSheets: MultiSheetPrintExportResult["skippedSheets"] = [];

  for (const sheet of orderedSheets) {
    const [brandingSchema, wireSchema] = await Promise.all([
      readWireBrandListSchema(projectId, sheet.slug),
      readWireListPrintSchema(projectId, sheet.slug),
    ]);

    if (!brandingSchema || !wireSchema) {
      skippedSheets.push({
        sheetSlug: sheet.slug,
        reason: !brandingSchema && !wireSchema
          ? "Missing branding and wire-list schemas"
          : !brandingSchema
            ? "Missing branding schema"
            : "Missing wire-list schema",
      });
      continue;
    }

    brandingSchemas.push(brandingSchema);
    wireSchemas.push(wireSchema);
    approvedSheets.push({
      sheetSlug: sheet.slug,
      sheetName: sheet.name,
      brandingRows: brandingSchema.totalRows,
      wireRows: wireSchema.totalRows,
    });
  }

  if (!approvedSheets.length) {
    throw new Error("None of the approved sheets had both saved branding and wire-list schemas");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileStem = [
    sanitizeExportFileSegment(manifest.pdNumber ?? manifest.name ?? "project"),
    sanitizeExportFileSegment(manifest.unitNumber ?? "unit"),
    "multi-sheet-print",
    timestamp,
  ].filter(Boolean).join("-");

  const brandingWorkbookFileName = `${fileStem}.xlsx`;
  const wireListSchemaFileName = `${fileStem}.wire-list.json`;
  const manifestFileName = `${fileStem}.manifest.json`;

  const brandingWorkbook = buildBrandingWorkbook(brandingSchemas);
  const brandingBuffer = XLSX.write(brandingWorkbook, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
  await fs.writeFile(path.join(exportDirectory, brandingWorkbookFileName), Buffer.from(brandingBuffer));

  const combinedWireListDocument: CombinedWireListExportDocument = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    projectId,
    projectName: manifest.name,
    approvedSheetOrder: approvedSheets.map((sheet) => sheet.sheetSlug),
    sheets: wireSchemas,
  };
  await fs.writeFile(
    path.join(exportDirectory, wireListSchemaFileName),
    JSON.stringify(combinedWireListDocument, null, 2),
    "utf-8",
  );

  const result: MultiSheetPrintExportResult = {
    projectId,
    generatedAt: new Date().toISOString(),
    approvedSheets,
    skippedSheets,
    brandingWorkbook: {
      fileName: brandingWorkbookFileName,
      relativePath: makeRelativeExportPath(manifest.unitNumber ?? "", brandingWorkbookFileName),
    },
    wireListSchema: {
      fileName: wireListSchemaFileName,
      relativePath: makeRelativeExportPath(manifest.unitNumber ?? "", wireListSchemaFileName),
    },
  };

  await fs.writeFile(
    path.join(exportDirectory, manifestFileName),
    JSON.stringify(result, null, 2),
    "utf-8",
  );

  result.manifestFile = {
    fileName: manifestFileName,
    relativePath: makeRelativeExportPath(manifest.unitNumber ?? "", manifestFileName),
  };

  return result;
}
