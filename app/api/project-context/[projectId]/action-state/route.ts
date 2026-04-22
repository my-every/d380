import { NextResponse } from "next/server";

import { readBrandingCsvExports } from "@/lib/project-exports/branding-csv-exports";
import { readWireListPdfExports } from "@/lib/project-exports/wire-list-pdf-exports";
import { readProjectManifest } from "@/lib/project-state/share-project-state-handlers";
import { readMultiSheetPrintSession } from "@/lib/project-state/share-multi-sheet-print-session-handlers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const manifest = await readProjectManifest(projectId);

  if (!manifest) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const operationalSheets = manifest.sheets.filter((sheet) => sheet.kind === "operational");
  const hasOperationalSheets = operationalSheets.length > 0;

  const [brandingExports, wireListExports, multiSheetSession] = await Promise.all([
    readBrandingCsvExports(projectId),
    readWireListPdfExports(projectId),
    readMultiSheetPrintSession(projectId),
  ]);

  const multiSheetBrandingWorkbook = multiSheetSession?.lastCombinedExportResult?.brandingWorkbook ?? null;
  const brandingCombinedRelativePath =
    multiSheetBrandingWorkbook?.relativePath
    ?? brandingExports?.combinedRelativePath
    ?? null;

  const hasBrandingExports = Boolean(brandingExports?.sheetExports.length || multiSheetBrandingWorkbook);
  const hasWireListExports = Boolean(wireListExports?.sheetExports.length);

  return NextResponse.json({
    projectId,
    actions: {
      wireList: {
        enabled: hasOperationalSheets,
        reason: hasOperationalSheets ? null : "No operational sheets are available yet.",
      },
      print: {
        enabled: hasOperationalSheets,
        reason: hasOperationalSheets ? null : "No operational sheets are available yet.",
      },
      details: {
        enabled: true,
        reason: null,
      },
      exports: {
        enabled: hasBrandingExports || hasWireListExports || hasOperationalSheets,
        reason: hasBrandingExports || hasWireListExports || hasOperationalSheets
          ? null
          : "Exports are not available for this project yet.",
      },
    },
    summary: {
      hasOperationalSheets,
      hasBrandingExports,
      hasWireListExports,
      operationalSheetCount: operationalSheets.length,
      brandListReady: Boolean(brandingCombinedRelativePath),
      brandingCombinedRelativePath,
      brandingCombinedFileName: multiSheetBrandingWorkbook?.fileName ?? brandingExports?.combinedFileName ?? null,
    },
  });
}
