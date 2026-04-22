import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import {
  createDefaultProjectSheetStateRecord,
  type ProjectSheetStateRecord,
  type ProjectSheetStateSection,
} from "@/lib/persistence/project-sheet-state";
import { resolveProjectStateDirectory } from "@/lib/project-state/share-project-state-handlers";

const SHEET_STATE_DIRECTORY = "sheet-state";

interface SheetStatePaths {
  sheetStateDirectory: string;
  filePath: string;
}

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

function makeSheetFileName(sheetSlug: string) {
  return `${encodeURIComponent(sheetSlug)}.json`;
}

async function resolveSheetStatePaths(projectId: string, sheetSlug: string): Promise<SheetStatePaths | null> {
  const stateDirectory = await resolveProjectStateDirectory(projectId);
  if (!stateDirectory) {
    return null;
  }

  const sheetStateDirectory = path.join(stateDirectory, SHEET_STATE_DIRECTORY);
  await fs.mkdir(sheetStateDirectory, { recursive: true });

  return {
    sheetStateDirectory,
    filePath: path.join(sheetStateDirectory, makeSheetFileName(sheetSlug)),
  };
}

export async function listProjectSheetSlugs(projectId: string): Promise<string[]> {
  const stateDirectory = await resolveProjectStateDirectory(projectId);
  if (!stateDirectory) {
    return [];
  }

  const sheetStateDirectory = path.join(stateDirectory, SHEET_STATE_DIRECTORY);

  try {
    const entries = await fs.readdir(sheetStateDirectory, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
      .map(entry => decodeURIComponent(entry.name.slice(0, -5)));
  } catch {
    return [];
  }
}

export async function readProjectSheetState(projectId: string, sheetSlug: string): Promise<ProjectSheetStateRecord | null> {
  const paths = await resolveSheetStatePaths(projectId, sheetSlug);
  if (!paths) {
    return null;
  }

  return readJsonFile<ProjectSheetStateRecord>(paths.filePath);
}

export async function writeProjectSheetState(
  projectId: string,
  sheetSlug: string,
  updates: Partial<Omit<ProjectSheetStateRecord, "projectId" | "sheetSlug" | "updatedAt">>,
): Promise<ProjectSheetStateRecord> {
  const paths = await resolveSheetStatePaths(projectId, sheetSlug);
  if (!paths) {
    throw new Error("Project state directory not found");
  }

  const existing = await readProjectSheetState(projectId, sheetSlug);
  const nextState: ProjectSheetStateRecord = {
    ...(existing ?? createDefaultProjectSheetStateRecord(projectId, sheetSlug)),
    ...updates,
    projectId,
    sheetSlug,
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(paths.filePath, nextState);
  return nextState;
}

export async function clearProjectSheetStateSection(
  projectId: string,
  sheetSlug: string,
  section: ProjectSheetStateSection,
) {
  const existing = await readProjectSheetState(projectId, sheetSlug);
  if (!existing) {
    return null;
  }

  const defaults = createDefaultProjectSheetStateRecord(projectId, sheetSlug);
  return writeProjectSheetState(projectId, sheetSlug, {
    [section]: defaults[section],
  });
}

export async function deleteProjectSheetState(projectId: string, sheetSlug: string) {
  const paths = await resolveSheetStatePaths(projectId, sheetSlug);
  if (!paths) {
    return;
  }

  await fs.rm(paths.filePath, { force: true });
}

export async function deleteProjectSheetStates(projectId: string) {
  const stateDirectory = await resolveProjectStateDirectory(projectId);
  if (!stateDirectory) {
    return;
  }

  await fs.rm(path.join(stateDirectory, SHEET_STATE_DIRECTORY), { force: true, recursive: true });
}