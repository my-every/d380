import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveProjectStateDirectory } from "@/lib/project-state/share-project-state-handlers";
import type { MultiSheetPrintExportResult } from "@/lib/project-exports/multi-sheet-print-exports";

const MULTI_SHEET_PRINT_SESSION_FILE = "multi-sheet-print-session.json";

export interface MultiSheetPrintSessionDocument {
  projectId: string;
  updatedAt: string;
  activeSheetSlug: string | null;
  approvedSheetSlugs: string[];
  sheetReviews: Record<string, MultiSheetPrintSheetReview>;
  lastCombinedExportResult: MultiSheetPrintExportResult | null;
}

export interface MultiSheetPrintSheetReview {
  sheetSlug: string;
  reviewedAt: string;
  reviewedByBadge: string | null;
  reviewedByName: string | null;
}

async function resolveSessionFilePath(projectId: string): Promise<string | null> {
  const stateDirectory = await resolveProjectStateDirectory(projectId);
  if (!stateDirectory) {
    return null;
  }

  await fs.mkdir(stateDirectory, { recursive: true });
  return path.join(stateDirectory, MULTI_SHEET_PRINT_SESSION_FILE);
}

export async function readMultiSheetPrintSession(
  projectId: string,
): Promise<MultiSheetPrintSessionDocument | null> {
  const filePath = await resolveSessionFilePath(projectId);
  if (!filePath) {
    return null;
  }

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as MultiSheetPrintSessionDocument;
  } catch {
    return null;
  }
}

export async function writeMultiSheetPrintSession(
  projectId: string,
  session: Omit<MultiSheetPrintSessionDocument, "projectId" | "updatedAt">,
): Promise<MultiSheetPrintSessionDocument> {
  const filePath = await resolveSessionFilePath(projectId);
  if (!filePath) {
    throw new Error("Project state directory not found");
  }

  const nextDocument: MultiSheetPrintSessionDocument = {
    projectId,
    updatedAt: new Date().toISOString(),
    activeSheetSlug: session.activeSheetSlug ?? null,
    approvedSheetSlugs: Array.from(new Set(session.approvedSheetSlugs ?? [])),
    sheetReviews: sanitizeSheetReviews(session.sheetReviews),
    lastCombinedExportResult: session.lastCombinedExportResult ?? null,
  };

  await fs.writeFile(filePath, JSON.stringify(nextDocument, null, 2), "utf-8");
  return nextDocument;
}

function sanitizeSheetReviews(
  value: MultiSheetPrintSessionDocument["sheetReviews"] | undefined,
): Record<string, MultiSheetPrintSheetReview> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value).flatMap(([key, review]) => {
    if (!review || typeof review !== "object" || typeof review.sheetSlug !== "string") {
      return [];
    }

    const sheetSlug = review.sheetSlug.trim() || key.trim();
    if (!sheetSlug) {
      return [];
    }

    return [[
      sheetSlug,
      {
        sheetSlug,
        reviewedAt: typeof review.reviewedAt === "string" ? review.reviewedAt : new Date().toISOString(),
        reviewedByBadge: typeof review.reviewedByBadge === "string" ? review.reviewedByBadge : null,
        reviewedByName: typeof review.reviewedByName === "string" ? review.reviewedByName : null,
      },
    ] as const];
  });

  return Object.fromEntries(entries);
}
