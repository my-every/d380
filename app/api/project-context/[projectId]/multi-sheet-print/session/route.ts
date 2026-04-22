import { NextRequest, NextResponse } from "next/server";

import {
  readMultiSheetPrintSession,
  writeMultiSheetPrintSession,
} from "@/lib/project-state/share-multi-sheet-print-session-handlers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  try {
    const session = await readMultiSheetPrintSession(projectId);
    return NextResponse.json({ session });
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
