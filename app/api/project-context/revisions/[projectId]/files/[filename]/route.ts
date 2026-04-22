import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveLegalProjectFilesDirectory } from "@/lib/legal-drawings/discovery";
import { getProjectRevisionHistory } from "@/lib/revision/revision-discovery";
import { isLayoutFile, isWireListFile, getLatestRevision } from "@/lib/revision/types";
import { resolveShareDirectory } from "@/lib/runtime/share-directory";

export const dynamic = "force-dynamic";

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

async function findProjectFolder(shareProjectsRoot: string, pdNumber: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(shareProjectsRoot, { withFileTypes: true });
    const upperPd = pdNumber.toUpperCase();
    const match = entries.find(
      (entry) => entry.isDirectory() && entry.name.toUpperCase().startsWith(upperPd),
    );
    return match ? match.name : null;
  } catch {
    return null;
  }
}

interface SheetStateFile {
  revisionSelection?: {
    wireListFilename: string | null;
    layoutFilename: string | null;
  };
  [key: string]: unknown;
}

async function clearSheetStateReferences(shareProjectsRoot: string, projectFolder: string, deletedFilename: string) {
  const sheetStateDir = path.join(shareProjectsRoot, projectFolder, "state", "sheet-state");

  try {
    const files = await fs.readdir(sheetStateDir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = path.join(sheetStateDir, file);
      const state = await readJsonFile<SheetStateFile>(filePath);
      if (!state?.revisionSelection) continue;

      let changed = false;
      if (state.revisionSelection.wireListFilename === deletedFilename) {
        state.revisionSelection.wireListFilename = null;
        changed = true;
      }
      if (state.revisionSelection.layoutFilename === deletedFilename) {
        state.revisionSelection.layoutFilename = null;
        changed = true;
      }
      if (changed) {
        await writeJsonFile(filePath, state);
      }
    }
  } catch {
    // Sheet-state directory may not exist.
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; filename: string }> },
) {
  const { projectId, filename } = await params;

  if (!projectId || !filename) {
    return NextResponse.json({ error: "Project ID and filename are required" }, { status: 400 });
  }

  const sanitized = path.basename(filename);
  if (sanitized !== filename || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const pdNumber = request.nextUrl.searchParams.get("pdNumber") || null;
  const history = await getProjectRevisionHistory(projectId, pdNumber);
  if (!history) {
    return NextResponse.json({ error: "Project revision history not found" }, { status: 404 });
  }

  const shareRoot = await resolveShareDirectory();
  const shareProjectsRoot = path.join(shareRoot, "Projects");
  const legalDrawingsRoot = path.join(shareRoot, "Legal Drawings");
  const projectFilesDir = await resolveLegalProjectFilesDirectory(legalDrawingsRoot, history.folderName);
  const targetPath = path.join(projectFilesDir, sanitized);

  const normalizedTarget = path.normalize(targetPath);
  if (!normalizedTarget.startsWith(path.normalize(projectFilesDir))) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  try {
    await fs.stat(normalizedTarget);
  } catch {
    return NextResponse.json({ error: "Revision file not found" }, { status: 404 });
  }

  await fs.unlink(normalizedTarget);

  const updatedHistory = await getProjectRevisionHistory(projectId);
  const newCurrentWireList = updatedHistory
    ? getLatestRevision(updatedHistory.wireListRevisions)
    : null;
  const newCurrentLayout = updatedHistory
    ? getLatestRevision(updatedHistory.layoutRevisions)
    : null;

  const projectFolder = await findProjectFolder(shareProjectsRoot, history.pdNumber);
  if (projectFolder) {
    await clearSheetStateReferences(shareProjectsRoot, projectFolder, sanitized);
  }

  return NextResponse.json({
    deleted: sanitized,
    category: isWireListFile(sanitized) ? "WIRE_LIST" : isLayoutFile(sanitized) ? "LAYOUT" : "OTHER",
    updatedCurrent: {
      wireListFile: newCurrentWireList?.filename ?? null,
      layoutFile: newCurrentLayout?.filename ?? null,
    },
  });
}
