import { NextRequest, NextResponse } from "next/server";

import {
  deleteProjectSheetStates,
  listProjectSheetSlugs,
} from "@/lib/project-state/share-sheet-state-handlers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const sheetSlugs = await listProjectSheetSlugs(projectId);
  return NextResponse.json({ sheetSlugs });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  await deleteProjectSheetStates(projectId);
  return NextResponse.json({ success: true });
}
