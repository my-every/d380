"use client";

/**
 * Hook for resolving sheet data from route parameters.
 *
 * In the manifest-based architecture, sheet data is no longer embedded in the
 * project context.  This hook resolves the sheet *manifest entry* from the
 * current ProjectManifest and lazily fetches the full SheetSchema on demand.
 */

import { useEffect, useMemo, useState } from "react";
import { useProjectContext, fetchSheetSchema } from "@/contexts/project-context";
import type { ProjectManifest, ManifestAssignmentNode, ManifestReferenceSheet } from "@/types/project-manifest";
import type { SheetSchema } from "@/types/sheet-schema";
import type { PartNumberLookupResult } from "@/lib/part-number-list";
import { useProjectPartNumbers, useProjectBlueLabels, type BlueLabelLookupResult } from "@/hooks/use-project-lookups";

interface UseSheetRouteParams {
  /** The project ID from the route */
  projectId: string;
  /** The sheet name/slug from the route */
  sheetName: string;
}

interface UseSheetRouteReturn {
  /** The project manifest */
  project: ProjectManifest | null;
  /** The resolved manifest sheet entry (assignment or reference) */
  sheetEntry: ManifestAssignmentNode | ManifestReferenceSheet | null;
  /** The fully loaded sheet schema (fetched on demand) */
  sheetSchema: SheetSchema | null;
  /** Pre-built part number map */
  partNumberMap: Map<string, PartNumberLookupResult>;
  /** Part number lookup helper */
  getPartNumber: (deviceId: string | null | undefined) => PartNumberLookupResult | undefined;
  /** Pre-built Blue Labels map */
  blueLabelsMap: Map<string, BlueLabelLookupResult>;
  /** Blue Labels lookup helper */
  hasBlueLabel: (deviceId: string | null | undefined) => boolean;
  /** Get Blue Labels for a device */
  getBlueLabels: (deviceId: string | null | undefined) => BlueLabelLookupResult | undefined;
  /** Whether we are loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Whether the sheet was found */
  found: boolean;
}

/**
 * Hook for resolving sheet data from route parameters.
 */
export function useSheetRoute(params: UseSheetRouteParams): UseSheetRouteReturn {
  const { currentProject: project, isLoading: contextLoading } = useProjectContext();
  const { partNumberMap, getPartNumber } = useProjectPartNumbers();
  const { blueLabelsMap, hasBlueLabel, getBlueLabels } = useProjectBlueLabels();

  const [sheetSchema, setSheetSchema] = useState<SheetSchema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  // Resolve manifest sheet entry
  const resolved = useMemo(() => {
    if (!project) {
      return { sheetEntry: null, found: false, error: contextLoading ? null : "No project loaded" };
    }

    const decodedProjectId = decodeURIComponent(params.projectId);
    if (project.id !== decodedProjectId && project.id !== params.projectId) {
      return { sheetEntry: null, found: false, error: "Project ID mismatch" };
    }

    const decodedSheetName = decodeURIComponent(params.sheetName);
    const allSheets = [
      ...Object.values(project.assignments ?? {}),
      ...Object.values(project.referenceSheets ?? {}),
    ];
    const entry =
      allSheets.find(s => s.sheetSlug === decodedSheetName) ??
      allSheets.find(s => s.sheetSlug === params.sheetName) ??
      allSheets.find(s => s.sheetName === decodedSheetName);

    if (!entry) {
      return { sheetEntry: null, found: false, error: `Sheet "${params.sheetName}" not found in project` };
    }

    return { sheetEntry: entry, found: true, error: null };
  }, [project, params.projectId, params.sheetName, contextLoading]);

  // Fetch the full sheet schema when the resolved entry changes
  useEffect(() => {
    if (!resolved.sheetEntry || !project) {
      setSheetSchema(null);
      return;
    }

    let cancelled = false;
    setSchemaLoading(true);

    fetchSheetSchema(project.id, resolved.sheetEntry.sheetSlug).then(schema => {
      if (!cancelled) {
        setSheetSchema(schema);
        setSchemaLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [project?.id, resolved.sheetEntry?.sheetSlug, project]);

  const isLoading = contextLoading || schemaLoading;

  return {
    project,
    sheetEntry: resolved.sheetEntry,
    sheetSchema,
    partNumberMap,
    getPartNumber,
    blueLabelsMap,
    hasBlueLabel,
    getBlueLabels,
    isLoading,
    error: resolved.error,
    found: resolved.found,
  };
}

/**
 * Generate the route path for a project detail page.
 */
export function getProjectRoutePath(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}`;
}

/**
 * Generate the route path for a sheet detail page.
 */
export function getSheetRoutePath(projectId: string, sheetSlug: string): string {
  return `/projects/${encodeURIComponent(projectId)}/${encodeURIComponent(sheetSlug)}`;
}

/**
 * Generate the route path for the projects page.
 */
export function getProjectsRoutePath(): string {
  return "/projects";
}