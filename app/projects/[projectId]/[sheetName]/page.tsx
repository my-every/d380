"use client";

/**
 * Sheet detail page — /projects/[projectId]/[sheetName]
 *
 * Renders wire list data for a specific sheet (operational or reference).
 * Uses WorkspaceLayout with the revision sidebar and pinned subheader,
 * keeping the same viewport-locked scroll pattern as the project page.
 */

import { use, useMemo } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useSheetRoute, getProjectsRoutePath } from "@/hooks/use-sheet-route";
import { useProjectContext } from "@/contexts/project-context";
import { useLayout } from "@/contexts/layout-context";
import { SWS_TYPE_REGISTRY, type SwsTypeId } from "@/lib/assignment/sws-detection";

import { WireList } from "@/components/wire-list/wire-list";
import { SemanticWireList } from "@/components/wire-list/semantic-wire-list";
import { WireListSchemaView } from "@/components/wire-list/wire-list-schema-view";
import { ProjectSheetSubheader } from "@/components/wire-list/project-sheet-subheader";
import { useRevisionPanel } from "@/components/revision";
import { WorkspaceLayout } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";

interface SheetDetailPageProps {
  params: Promise<{
    projectId: string;
    sheetName: string;
  }>;
}

export default function SheetDetailPage({ params }: SheetDetailPageProps) {
  const resolvedParams = use(params);
  const { project, sheetEntry, sheetSchema, wireListSchema, isLoading, error, found } = useSheetRoute({
    projectId: resolvedParams.projectId,
    sheetName: resolvedParams.sheetName,
  });

  // Get assignment mappings for SWS type
  const { assignmentMappings } = useProjectContext();
  const { layoutPages } = useLayout();

  const currentAssignment = useMemo(() => {
    if (!sheetEntry) return undefined;
    return assignmentMappings.find(a => a.sheetSlug === sheetEntry.slug);
  }, [assignmentMappings, sheetEntry]);

  // Resolve the matched layout page from the assignment mapping's page number
  const matchedLayoutPage = useMemo(() => {
    if (!currentAssignment?.matchedLayoutPage || layoutPages.length === 0) return undefined;
    return layoutPages.find(p => p.pageNumber === currentAssignment.matchedLayoutPage) ?? undefined;
  }, [currentAssignment?.matchedLayoutPage, layoutPages]);

  const layoutMatch = useMemo(() => {
    if (!currentAssignment?.matchedLayoutPage) return undefined;
    return {
      pageNumber: currentAssignment.matchedLayoutPage,
      pageTitle: currentAssignment.matchedLayoutTitle ?? '',
      confidence: 'high' as const,
    };
  }, [currentAssignment?.matchedLayoutPage, currentAssignment?.matchedLayoutTitle]);

  const semanticRows = sheetSchema?.rows ?? [];
  const hasSchemaFallback = Boolean(wireListSchema);

  // Get SWS type info for this sheet from assignment mappings
  const swsType = useMemo(() => {
    if (!sheetEntry) return undefined;
    const assignment = assignmentMappings.find(a => a.sheetSlug === sheetEntry.slug);
    if (!assignment) return undefined;
    const swsInfo = SWS_TYPE_REGISTRY[assignment.selectedSwsType as SwsTypeId];
    if (!swsInfo) return undefined;
    return {
      id: swsInfo.id,
      label: swsInfo.label,
      shortLabel: swsInfo.shortLabel,
      color: swsInfo.color,
    };
  }, [sheetEntry, assignmentMappings]);

  // Revision panel hook — called unconditionally (before early returns)
  // so that WorkspaceLayout can be the outermost layout shell.
  const {
    sidebar,
    overlays,
    activeRows,
    activeRowId,
    clearActiveRow,
    activeWireListRevision,
    isRevisionLoading,
  } = useRevisionPanel({
    projectId: resolvedParams.projectId,
    project,
    sheetName: sheetEntry?.name,
    projectName: project?.name,
    currentRows: semanticRows,
    sheetSlug: sheetEntry?.slug,
    defaultExpanded: true,
  });


  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading sheet data...</p>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !found || !project || !sheetEntry || (!sheetSchema && !hasSchemaFallback)) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h1 className="text-xl font-semibold text-foreground">Sheet Not Found</h1>
            <p className="text-center text-muted-foreground">
              {error || "The requested sheet could not be found."}
            </p>
            <Button variant="outline" asChild>
              <Link href={getProjectsRoutePath()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <WorkspaceLayout
      sidePanel={sidebar}
      subheader={
        <ProjectSheetSubheader
          project={project}
          sheet={sheetEntry}
          layoutPage={matchedLayoutPage}
          layoutMatch={layoutMatch}
          allPages={layoutPages}
          metadata={sheetSchema?.metadata}
          swsType={swsType}
          activeRevisionLabel={activeWireListRevision?.revisionInfo.displayVersion}
          activeRowCount={activeRows.length}
        />
      }
      overlays={overlays}
      scrollClassName="pr-2"
    >
      {/* Revision loading skeleton overlay */}
      {isRevisionLoading && (
        <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="flex flex-col gap-3 p-4">
            <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
            <div className="h-6 w-full rounded-md bg-muted animate-pulse" />
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                <div className="h-5 w-20 rounded bg-muted animate-pulse" />
                <div className="h-5 w-16 rounded bg-muted animate-pulse" />
                <div className="h-5 w-14 rounded bg-muted animate-pulse" />
                <div className="h-5 w-12 rounded bg-muted animate-pulse" />
                <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                <div className="h-5 flex-1 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-4 pb-6 transition-opacity duration-200 ${isRevisionLoading ? "opacity-30" : "opacity-100"}`}>
        {sheetEntry.kind !== "reference" && sheetSchema?.rows && sheetSchema.rows.length > 0 ? (
          <div onClick={clearActiveRow}>
            <SemanticWireList
              rows={activeRows}
              title={sheetEntry.name}
              currentSheetName={sheetEntry.name}
              projectId={resolvedParams.projectId}
              sheetSlug={sheetEntry.slug}
              activeRowId={activeRowId}
              featureConfig={{
                showCheckboxColumns: false,
                showFromCheckbox: false,
                showToCheckbox: false,
                showIPVCheckbox: false,
                showComments: false,
                groupByLocation: true,
                groupByFromDevice: true,
                showDeviceGroupHeader: true,
                stickyGroupHeaders: true,
                showPartNumber: false,
              }}
              swsType={swsType}
              showFloatingToolbar={false}
            />
          </div>
        ) : sheetEntry.kind !== "reference" && wireListSchema ? (
          <div onClick={clearActiveRow}>
            <WireListSchemaView
              schema={wireListSchema}
              title={sheetEntry.name}
              projectId={resolvedParams.projectId}
              sheetSlug={sheetEntry.slug}
              swsType={swsType}
            />
          </div>
        ) : (
          <WireList
            projectId={resolvedParams.projectId}
            sheetSlug={sheetEntry.slug}
            title={sheetEntry.name}
            rows={sheetSchema?.rawRows ?? sheetSchema?.rows ?? []}
            headers={sheetSchema?.headers ?? []}
            sheetMetadata={sheetSchema?.metadata}
          />
        )}
      </div>
    </WorkspaceLayout>
  );
}
