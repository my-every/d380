import { NextRequest, NextResponse } from "next/server";

import { generateMultiSheetPrintExport } from "@/lib/project-exports/multi-sheet-print-exports";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  try {
    const body = await request.json() as { approvedSheetSlugs?: string[] };
    const approvedSheetSlugs = Array.isArray(body.approvedSheetSlugs)
      ? body.approvedSheetSlugs.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];

    if (!approvedSheetSlugs.length) {
      return NextResponse.json(
        { error: "Missing or invalid 'approvedSheetSlugs' field — expected string[]" },
        { status: 400 },
      );
    }

    const result = await generateMultiSheetPrintExport(projectId, approvedSheetSlugs);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate multi-sheet print export" },
      { status: 500 },
    );
  }
}
