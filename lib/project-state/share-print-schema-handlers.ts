import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { resolveProjectStateDirectory } from "@/lib/project-state/share-project-state-handlers";
import type { WireListPrintSchema } from "@/lib/wire-list-print/schema";
import type { BrandListExportSchema } from "@/lib/wire-brand-list/schema";
import type { BuildUpSwsSectionSchema } from "@/types/d380-build-up";

const PRINT_SCHEMA_DIRECTORY = "wire-list-print-schema";
const BRAND_LIST_DIRECTORY = "wire-brand-list";
const BUILD_UP_SWS_SCHEMA_DIRECTORY = "build-up-sws-schema";

function makeSchemaFileName(sheetSlug: string) {
  return `${encodeURIComponent(sheetSlug)}.json`;
}

async function resolveSchemaDirectory(projectId: string): Promise<string | null> {
  const stateDirectory = await resolveProjectStateDirectory(projectId);
  if (!stateDirectory) {
    return null;
  }

  const schemaDir = path.join(stateDirectory, PRINT_SCHEMA_DIRECTORY);
  await fs.mkdir(schemaDir, { recursive: true });
  return schemaDir;
}

async function resolveBrandListDirectory(projectId: string): Promise<string | null> {
  const stateDirectory = await resolveProjectStateDirectory(projectId);
  if (!stateDirectory) {
    return null;
  }

  const brandDir = path.join(stateDirectory, BRAND_LIST_DIRECTORY);
  await fs.mkdir(brandDir, { recursive: true });
  return brandDir;
}

async function resolveBuildUpSwsSchemaDirectory(projectId: string): Promise<string | null> {
  const stateDirectory = await resolveProjectStateDirectory(projectId);
  if (!stateDirectory) {
    return null;
  }

  const buildUpDir = path.join(stateDirectory, BUILD_UP_SWS_SCHEMA_DIRECTORY);
  await fs.mkdir(buildUpDir, { recursive: true });
  return buildUpDir;
}

/**
 * Save a wire list print schema to the project's state directory.
 * Stored at: {projectDir}/state/wire-list-print-schema/{sheetSlug}.json
 */
export async function saveWireListPrintSchema(
  projectId: string,
  sheetSlug: string,
  schema: WireListPrintSchema,
): Promise<string> {
  const schemaDir = await resolveSchemaDirectory(projectId);
  if (!schemaDir) {
    throw new Error(`Project state directory not found for project: ${projectId}`);
  }

  const filePath = path.join(schemaDir, makeSchemaFileName(sheetSlug));
  await fs.writeFile(filePath, JSON.stringify(schema, null, 2), "utf-8");
  return filePath;
}

/**
 * Read a previously saved wire list print schema from the project's state directory.
 */
export async function readWireListPrintSchema(
  projectId: string,
  sheetSlug: string,
): Promise<WireListPrintSchema | null> {
  const schemaDir = await resolveSchemaDirectory(projectId);
  if (!schemaDir) {
    return null;
  }

  const filePath = path.join(schemaDir, makeSchemaFileName(sheetSlug));

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as WireListPrintSchema;
  } catch {
    return null;
  }
}

/**
 * List all saved print schema sheet slugs for a project.
 */
export async function listWireListPrintSchemas(
  projectId: string,
): Promise<string[]> {
  const schemaDir = await resolveSchemaDirectory(projectId);
  if (!schemaDir) {
    return [];
  }

  try {
    const entries = await fs.readdir(schemaDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => decodeURIComponent(entry.name.slice(0, -5)));
  } catch {
    return [];
  }
}

/**
 * Delete a saved wire list print schema for a specific sheet.
 */
export async function deleteWireListPrintSchema(
  projectId: string,
  sheetSlug: string,
): Promise<boolean> {
  const schemaDir = await resolveSchemaDirectory(projectId);
  if (!schemaDir) {
    return false;
  }

  const filePath = path.join(schemaDir, makeSchemaFileName(sheetSlug));

  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Wire Brand List Schema Handlers
// ============================================================================

/**
 * Save a wire brand list schema to the project's state directory.
 * Stored at: {projectDir}/state/wire-brand-list/{sheetSlug}.json
 */
export async function saveWireBrandListSchema(
  projectId: string,
  sheetSlug: string,
  schema: BrandListExportSchema,
): Promise<string> {
  const brandDir = await resolveBrandListDirectory(projectId);
  if (!brandDir) {
    throw new Error(`Project state directory not found for project: ${projectId}`);
  }

  const filePath = path.join(brandDir, makeSchemaFileName(sheetSlug));
  await fs.writeFile(filePath, JSON.stringify(schema, null, 2), "utf-8");
  return filePath;
}

/**
 * Read a previously saved wire brand list schema from the project's state directory.
 */
export async function readWireBrandListSchema(
  projectId: string,
  sheetSlug: string,
): Promise<BrandListExportSchema | null> {
  const brandDir = await resolveBrandListDirectory(projectId);
  if (!brandDir) {
    return null;
  }

  const filePath = path.join(brandDir, makeSchemaFileName(sheetSlug));

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as BrandListExportSchema;
  } catch {
    return null;
  }
}

/**
 * List all saved brand list schema sheet slugs for a project.
 */
export async function listWireBrandListSchemas(
  projectId: string,
): Promise<string[]> {
  const brandDir = await resolveBrandListDirectory(projectId);
  if (!brandDir) {
    return [];
  }

  try {
    const entries = await fs.readdir(brandDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => decodeURIComponent(entry.name.slice(0, -5)));
  } catch {
    return [];
  }
}

// ============================================================================
// Build Up SWS Schema Handlers
// ============================================================================

/**
 * Save Build Up SWS section schemas for a sheet.
 * Stored at: {projectDir}/state/build-up-sws-schema/{sheetSlug}.json
 */
export async function saveBuildUpSwsSchema(
  projectId: string,
  sheetSlug: string,
  schemas: BuildUpSwsSectionSchema[],
): Promise<string> {
  const buildUpDir = await resolveBuildUpSwsSchemaDirectory(projectId);
  if (!buildUpDir) {
    throw new Error(`Project state directory not found for project: ${projectId}`);
  }

  const filePath = path.join(buildUpDir, makeSchemaFileName(sheetSlug));
  await fs.writeFile(filePath, JSON.stringify(schemas, null, 2), "utf-8");
  return filePath;
}

/**
 * Read Build Up SWS section schemas for a sheet.
 */
export async function readBuildUpSwsSchema(
  projectId: string,
  sheetSlug: string,
): Promise<BuildUpSwsSectionSchema[] | null> {
  const buildUpDir = await resolveBuildUpSwsSchemaDirectory(projectId);
  if (!buildUpDir) {
    return null;
  }

  const filePath = path.join(buildUpDir, makeSchemaFileName(sheetSlug));

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as BuildUpSwsSectionSchema[];
  } catch {
    return null;
  }
}

/**
 * List all saved Build Up SWS schema sheet slugs for a project.
 */
export async function listBuildUpSwsSchemas(
  projectId: string,
): Promise<string[]> {
  const buildUpDir = await resolveBuildUpSwsSchemaDirectory(projectId);
  if (!buildUpDir) {
    return [];
  }

  try {
    const entries = await fs.readdir(buildUpDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => decodeURIComponent(entry.name.slice(0, -5)));
  } catch {
    return [];
  }
}
