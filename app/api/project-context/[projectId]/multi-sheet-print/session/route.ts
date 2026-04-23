import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";

import {
  readMultiSheetPrintSession,
  writeMultiSheetPrintSession,
} from "@/lib/project-state/share-multi-sheet-print-session-handlers";
import { resolveProjectExportFile } from "@/lib/project-exports/project-exports-paths";

export const dynamic = "force-dynamic";

async function exportFileExists(projectId: string, relativePath?: string | null): Promise<boolean> {
  if (!relativePath) {
    return false;
  }

  const normalizedRelativePath = relativePath.replace(/^exports\//, "");
  const filePath = await resolveProjectExportFile(
    projectId,
    normalizedRelativePath.split("/").filter(Boolean),
  );
  if (!filePath) {
    return false;
  }

  return fs.stat(filePath).then((stat) => stat.isFile()).catch(() => false);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  try {
    const session = await readMultiSheetPrintSession(projectId);
    const [brandingWorkbookExists, wireListSchemaExists, manifestFileExists] = await Promise.all([
      exportFileExists(projectId, session?.lastCombinedExportResult?.brandingWorkbook?.relativePath),
      exportFileExists(projectId, session?.lastCombinedExportResult?.wireListSchema?.relativePath),
      exportFileExists(projectId, session?.lastCombinedExportResult?.manifestFile?.relativePath),
    ]);

    const exportFiles = {
      brandingWorkbookExists,
      wireListSchemaExists,
      manifestFileExists,
    };

    return NextResponse.json({ session, exportFiles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read multi-sheet print session" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  try {
    const body = await request.json() as {
      activeSheetSlug?: string | null;
      approvedSheetSlugs?: string[];
      sheetReviews?: Record<string, unknown>;
      lastCombinedExportResult?: unknown;
    };

    const session = await writeMultiSheetPrintSession(projectId, {
      activeSheetSlug: body.activeSheetSlug ?? null,
      approvedSheetSlugs: Array.isArray(body.approvedSheetSlugs) ? body.approvedSheetSlugs : [],
      sheetReviews: (body.sheetReviews ?? {}) as never,
      lastCombinedExportResult: (body.lastCombinedExportResult ?? null) as never,
    });

    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to write multi-sheet print session" },
      { status: 500 },
    );
  }
}
