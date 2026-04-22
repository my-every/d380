import { promises as fs } from "node:fs";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { ensureWireListPdfSheetExport } from "@/lib/project-exports/wire-list-pdf-exports";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sheetSlug: string }> },
) {
  const { projectId, sheetSlug } = await params;

  try {
    const { absoluteFilePath, record } = await ensureWireListPdfSheetExport(
      projectId,
      sheetSlug,
      request.nextUrl.origin,
    );
    const data = await fs.readFile(absoluteFilePath);
    const download = request.nextUrl.searchParams.get("download") !== "0";

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${path.basename(record.fileName)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate wire list PDF" },
      { status: 500 },
    );
  }
}
