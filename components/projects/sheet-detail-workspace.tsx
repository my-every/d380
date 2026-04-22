"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertCircle, ArrowLeft, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";

import { useSheetRoute, getProjectsRoutePath, getSheetRoutePath } from "@/hooks/use-sheet-route";
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
import { cn } from "@/lib/utils";

type SheetWorkspacePresentation = "page" | "modal";

interface SheetDetailPagination {
  index: number;
  total: number;
  canPrevious: boolean;
  canNext: boolean;
}

interface SheetDetailWorkspaceProps {
  projectId: string;
  sheetName: string;
  presentation?: SheetWorkspacePresentation;
  showRevisionPanel?: boolean;
  onRequestClose?: () => void;
  onRequestPrevious?: () => void;
  onRequestNext?: () => void;
  pagination?: SheetDetailPagination;
}

function ModalPaginationBar({
  projectId,
  sheetName,
  pagination,
  onRequestClose,
  onRequestPrevious,
  onRequestNext,
}: {
  projectId: string;
  sheetName: string;
  pagination?: SheetDetailPagination;
  onRequestClose?: () => void;
  onRequestPrevious?: () => void;
  onRequestNext?: () => void;
}) {
  return (
    <div className="border-t bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {onRequestClose ? (
            <Button variant="outline" onClick={onRequestClose}>
              Close
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link href={getSheetRoutePath(projectId, sheetName)}>
              Open Full Page
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" onClick={onRequestPrevious} disabled={!pagination?.canPrevious}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          <div className="min-w-[88px] text-center text-sm text-muted-foreground">
            {pagination ? `${pagination.index} of ${pagination.total}` : "Sheet"}
          </div>
          <Button variant="outline" onClick={onRequestNext} disabled={!pagination?.canNext}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SheetDetailWorkspace({
  projectId,
  sheetName,
  presentation = "page",
  showRevisionPanel = true,
  onRequestClose,
  onRequestPrevious,
  onRequestNext,
  pagination,
}: SheetDetailWorkspaceProps) {
  const { project, sheetEntry, sheetSchema, wireListSchema, isLoading, error, found } = useSheetRoute({
    projectId,
    sheetName,
  });
  const { assignmentMappings } = useProjectContext();
  const { layoutPages } = useLayout();

  const currentAssignment = useMemo(() => {
    if (!sheetEntry) return undefined;
    return assignmentMappings.find(a => a.sheetSlug === sheetEntry.slug);
  }, [assignmentMappings, sheetEntry]);

  const matchedLayoutPage = useMemo(() => {
    if (!currentAssignment?.matchedLayoutPage || layoutPages.length === 0) return undefined;
    return layoutPages.find(p => p.pageNumber === currentAssignment.matchedLayoutPage) ?? undefined;
  }, [currentAssignment?.matchedLayoutPage, layoutPages]);

  const layoutMatch = useMemo(() => {
    if (!currentAssignment?.matchedLayoutPage) return undefined;
    return {
      pageNumber: currentAssignment.matchedLayoutPage,
      pageTitle: currentAssignment.matchedLayoutTitle ?? "",
      confidence: "high" as const,
    };
  }, [currentAssignment?.matchedLayoutPage, currentAssignment?.matchedLayoutTitle]);

  const semanticRows = sheetSchema?.rows ?? [];
  const hasSchemaFallback = Boolean(wireListSchema);

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

  const {
    sidebar,
    overlays,
    activeRows,
    activeRowId,
    clearActiveRow,
    activeWireListRevision,
    isRevisionLoading,
  } = useRevisionPanel({
    projectId,
    project,
    sheetName: sheetEntry?.name,
    projectName: project?.name,
    currentRows: semanticRows,
    sheetSlug: sheetEntry?.slug,
    defaultExpanded: showRevisionPanel,
  });

  const mainContent = (
    <>
      {isRevisionLoading ? (
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
      ) : null}

      <div className={cn("flex flex-col gap-4 pb-6 transition-opacity duration-200", isRevisionLoading ? "opacity-30" : "opacity-100")}>
        {sheetEntry?.kind !== "reference" && sheetSchema?.rows && sheetSchema.rows.length > 0 ? (
          <div onClick={clearActiveRow}>
            <SemanticWireList
              rows={activeRows}
              title={sheetEntry.name}
              currentSheetName={sheetEntry.name}
              projectId={projectId}
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
              toolbarOptions={{
                showPrint: false,
                showMultiSheet: false,
                showExport: false,
              }}
            />
          </div>
        ) : sheetEntry?.kind !== "reference" && wireListSchema ? (
          <div onClick={clearActiveRow}>
            <WireListSchemaView
              schema={wireListSchema}
              title={sheetEntry.name}
              projectId={projectId}
              sheetSlug={sheetEntry.slug}
              swsType={swsType}
            />
          </div>
        ) : sheetEntry ? (
          <WireList
            projectId={projectId}
            sheetSlug={sheetEntry.slug}
            title={sheetEntry.name}
            rows={sheetSchema?.rawRows ?? sheetSchema?.rows ?? []}
            headers={sheetSchema?.headers ?? []}
            sheetMetadata={sheetSchema?.metadata}
          />
        ) : null}
      </div>
    </>
  );

  if (isLoading) {
    const loadingUi = (
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading sheet data...</p>
        </div>
      </div>
    );

    if (presentation === "modal") {
      return loadingUi;
    }

    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {loadingUi}
        </div>
      </main>
    );
  }

  if (error || !found || !project || !sheetEntry || (!sheetSchema && !hasSchemaFallback)) {
    const errorUi = (
      <div className="flex h-full min-h-0 items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-xl font-semibold text-foreground">Sheet Not Found</h1>
          <p className="max-w-xl text-center text-muted-foreground">
            {error || "The requested sheet could not be found."}
          </p>
          <div className="flex items-center gap-2">
            {presentation === "modal" && onRequestClose ? (
              <Button variant="outline" onClick={onRequestClose}>
                Close
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href={getProjectsRoutePath()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );

    if (presentation === "modal") {
      return errorUi;
    }

    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {errorUi}
        </div>
      </main>
    );
  }

  const subheader = (
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
      headerActions={sheetEntry.kind !== "reference" ? (
        <Button variant="outline" asChild>
          <a
            href={`/api/project-context/${encodeURIComponent(projectId)}/wire-list-pdf/${encodeURIComponent(sheetEntry.slug)}?download=1`}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Wirelist PDF
          </a>
        </Button>
      ) : null}
    />
  );

  if (presentation === "modal") {
    return (
      <div className="flex h-full min-h-0 bg-accent">
        {showRevisionPanel ? sidebar : null}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <div className="shrink-0 border-b px-2">{subheader}</div>
          <div className="relative min-h-0 flex-1 overflow-y-auto p-4">
            {mainContent}
          </div>
          <ModalPaginationBar
            projectId={projectId}
            sheetName={sheetEntry.slug}
            pagination={pagination}
            onRequestClose={onRequestClose}
            onRequestPrevious={onRequestPrevious}
            onRequestNext={onRequestNext}
          />
          {overlays}
        </div>
      </div>
    );
  }

  return (
    <WorkspaceLayout
      sidePanel={showRevisionPanel ? sidebar : undefined}
      subheader={subheader}
      overlays={overlays}
      scrollClassName="pr-2"
    >
      {mainContent}
    </WorkspaceLayout>
  );
}
