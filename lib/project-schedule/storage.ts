import fs from "fs/promises";
import path from "path";

import { resolveShareDirectory } from "@/lib/runtime/share-directory";
import type {
  ProjectScheduleActualsDocument,
  ProjectScheduleDocument,
} from "@/lib/project-schedule/types";

export interface ProjectSchedulePaths {
  shareProjectsDir: string;
  shareScheduleDir: string;
  shareProjectsScheduleFile: string;
  shareScheduleFile: string;
  shareProjectsScheduleTsFile: string;
  shareScheduleTsFile: string;
  actualsFile: string;
}

export const EMPTY_PROJECT_SCHEDULE_DOCUMENT: ProjectScheduleDocument = {
  columns: [],
  groups: [],
  importedAt: "",
};

export const EMPTY_PROJECT_SCHEDULE_ACTUALS_DOCUMENT: ProjectScheduleActualsDocument = {
  records: {},
  updatedAt: "",
  sourceFile: "project-schedule-actuals.json",
};

export async function resolveProjectSchedulePaths(): Promise<ProjectSchedulePaths> {
  const shareRoot = await resolveShareDirectory();
  const shareProjectsDir = path.join(shareRoot, "Projects");
  const shareScheduleDir = path.join(shareRoot, "Schedule");

  return {
    shareProjectsDir,
    shareScheduleDir,
    shareProjectsScheduleFile: path.join(shareProjectsDir, "schedule.json"),
    shareScheduleFile: path.join(shareScheduleDir, "project-schedule.json"),
    shareProjectsScheduleTsFile: path.join(shareProjectsDir, "schedule.ts"),
    shareScheduleTsFile: path.join(shareScheduleDir, "project-schedule.ts"),
    actualsFile: path.join(shareScheduleDir, "project-schedule-actuals.json"),
  };
}

export async function ensureProjectScheduleDirs(paths: ProjectSchedulePaths) {
  await fs.mkdir(paths.shareProjectsDir, { recursive: true });
  await fs.mkdir(paths.shareScheduleDir, { recursive: true });
}

export async function readProjectScheduleDocument(
  paths: ProjectSchedulePaths,
): Promise<ProjectScheduleDocument> {
  const candidates = [paths.shareProjectsScheduleFile, paths.shareScheduleFile];
  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw) as ProjectScheduleDocument;
      if (parsed && Array.isArray(parsed.groups) && Array.isArray(parsed.columns)) {
        return parsed;
      }
    } catch {
      // Continue to fallback candidate.
    }
  }

  return EMPTY_PROJECT_SCHEDULE_DOCUMENT;
}

export async function readProjectScheduleActualsDocument(
  filePath: string,
): Promise<ProjectScheduleActualsDocument> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as ProjectScheduleActualsDocument;
    if (!parsed || typeof parsed !== "object" || typeof parsed.records !== "object" || parsed.records == null) {
      return EMPTY_PROJECT_SCHEDULE_ACTUALS_DOCUMENT;
    }

    return {
      records: parsed.records,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
      sourceFile: typeof parsed.sourceFile === "string" ? parsed.sourceFile : "project-schedule-actuals.json",
    };
  } catch {
    return EMPTY_PROJECT_SCHEDULE_ACTUALS_DOCUMENT;
  }
}

