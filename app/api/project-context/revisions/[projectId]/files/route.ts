import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getProjectRevisionHistory } from "@/lib/revision/revision-discovery";
import { parseRevisionFromFilename, type FileRevision } from "@/lib/revision/types";
import { resolveShareDirectory } from "@/lib/runtime/share-directory";

export const dynamic = "force-dynamic";

function buildRevision(
  fileName: string,
  category: FileRevision["category"],
  fullPath: string,
  stats: { size: number; mtime: Date },
): FileRevision {
  return {
    filename: fileName,
    filePath: fullPath,
    category,
    revisionInfo: parseRevisionFromFilename(fileName),
    fileSize: stats.size,
    lastModified: stats.mtime.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

function sanitizeRevisionSegment(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toUpperCase().replace(/[^A-Z0-9.]+/g, "");
  return normalized || "UPLOADED";
}

function sanitizeProjectSegment(value: string | null | undefined): string {
  const normalized = (value ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]+/g, "");
  return normalized || "PROJECT";
}

function buildNextLayoutFilename(
  projectNumber: string,
  baseRevision: string,
  existingFiles: string[],
): string {
  const safeProject = sanitizeProjectSegment(projectNumber);
  const safeRevision = sanitizeRevisionSegment(baseRevision);
  const baseName = `${safeProject}_LAY_${safeRevision}`;

  if (!existingFiles.includes(`${baseName}.pdf`)) {
    return `${baseName}.pdf`;
  }

  let modification = 1;
  while (existingFiles.includes(`${baseName}_M.${modification}.pdf`)) {
    modification += 1;
  }

  return `${baseName}_M.${modification}.pdf`;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId: rawProjectId } = await context.params;
    const projectId = rawProjectId.trim().toLowerCase();
    const formData = await request.formData();

    const workbook = formData.get("workbook");
    const layout = formData.get("layout");
    const layoutFile = formData.get("file");

    const hasWorkbook = workbook instanceof File;
    const hasExplicitLayout = layout instanceof File;
    const hasSingleLayout = !hasExplicitLayout && layoutFile instanceof File;
    const resolvedLayout = hasExplicitLayout ? layout : hasSingleLayout ? layoutFile : null;

    if (!hasWorkbook && !resolvedLayout) {
      return NextResponse.json(
        { error: "At least one file (workbook or layout) is required." },
        { status: 400 },
      );
    }

    let workbookName: string | undefined;
    if (hasWorkbook) {
      workbookName = path.basename(workbook.name);
      if (!/\.(xlsx|xls|xlsm|xlsb)$/i.test(workbookName)) {
        return NextResponse.json({ error: "Workbook must be an Excel file." }, { status: 400 });
      }
    }

    let layoutName: string | undefined;
    if (resolvedLayout) {
      layoutName = path.basename(resolvedLayout.name);
      if (!/\.pdf$/i.test(layoutName)) {
        return NextResponse.json({ error: "Layout must be a PDF file." }, { status: 400 });
      }
      if (resolvedLayout.type && resolvedLayout.type !== "application/pdf") {
        return NextResponse.json({ error: "Only PDF layout uploads are supported." }, { status: 400 });
      }
    }

    const baseRevision = (formData.get("baseRevision") as string | null) || "";
    const pdNumber = (formData.get("pdNumber") as string | null) || "";

    const history = await getProjectRevisionHistory(projectId, pdNumber || null);
    const shareRoot = await resolveShareDirectory();
    const legalDrawingsRoot = path.join(shareRoot, "Legal Drawings");

    let revisionsDirectory: string;
    if (history) {
      revisionsDirectory = path.dirname(
        history.currentWireList?.filePath
          ?? history.currentLayout?.filePath
          ?? path.join(legalDrawingsRoot, history.folderName, workbookName || layoutName || "unknown"),
      );
    } else {
      const folderPd = pdNumber
        || projectId.replace(/^pd-/i, "").toUpperCase()
        || (workbookName || layoutName || "")?.match(/^([A-Z0-9]+?)[-_]/i)?.[1]
        || projectId;
      const folderName = folderPd.toUpperCase();
      revisionsDirectory = path.join(legalDrawingsRoot, folderName);
    }

    await fs.mkdir(revisionsDirectory, { recursive: true });

    const existingFiles = new Set(await fs.readdir(revisionsDirectory).catch(() => []));

    if (resolvedLayout && hasSingleLayout) {
      const inferredProjectNumber = (history?.pdNumber || pdNumber || projectId).toUpperCase();
      layoutName = buildNextLayoutFilename(inferredProjectNumber, baseRevision, Array.from(existingFiles));
    }

    const writePromises: Promise<void>[] = [];

    if (hasWorkbook && workbookName) {
      const workbookPath = path.join(revisionsDirectory, workbookName);
      writePromises.push(fs.writeFile(workbookPath, Buffer.from(await workbook.arrayBuffer())));
    }

    if (resolvedLayout && layoutName) {
      const layoutPath = path.join(revisionsDirectory, layoutName);
      writePromises.push(fs.writeFile(layoutPath, Buffer.from(await resolvedLayout.arrayBuffer())));
    }

    await Promise.all(writePromises);

    let wireListRevision: FileRevision | undefined;
    let layoutRevision: FileRevision | undefined;

    if (hasWorkbook && workbookName) {
      const workbookPath = path.join(revisionsDirectory, workbookName);
      const workbookStats = await fs.stat(workbookPath);
      wireListRevision = buildRevision(workbookName, "WIRE_LIST", workbookPath, workbookStats);
    }

    if (resolvedLayout && layoutName) {
      const layoutPath = path.join(revisionsDirectory, layoutName);
      const layoutStats = await fs.stat(layoutPath);
      layoutRevision = buildRevision(layoutName, "LAYOUT", layoutPath, layoutStats);
    }

    const folderForSource = history?.folderName ?? path.basename(revisionsDirectory);

    return NextResponse.json({
      wireListRevision: wireListRevision ?? null,
      layoutRevision: layoutRevision ?? null,
      revision: layoutRevision ?? null,
      sourcePath: layoutRevision
        ? `/api/project-context/projects/files?project=${encodeURIComponent(folderForSource)}&file=${encodeURIComponent(layoutRevision.filename)}`
        : null,
    });
  } catch (error) {
    console.error("Failed to upload revision files", error);
    return NextResponse.json({ error: "Failed to upload revision files." }, { status: 500 });
  }
}
