"use client";

/**
 * Project Details Page - /projects/[projectId]
 * 
 * Modern project detail view matching main projects page design:
 * - Project Lifecycle on right side of SubHeader
 * - Grid/Board toggle adjacent to filters
 * - Floating toolbar at bottom
 * - No Layout Drawing import area (moved to floating toolbar modal)
 */

import { useState, useCallback, useRef, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  ChevronRight,
  Calendar,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeTogglePill } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext } from "@/contexts/project-context";
import { ProjectCardGrid } from "@/components/projects/project-card-grid";
import { ProjectAssignmentMappingModal, type MappedAssignment } from "@/components/projects/project-assignment-mapping-modal";
import { CrossWireReadinessPanel } from "@/components/projects/cross-wire-readiness-panel";
import { ProjectExportsPanel } from "@/components/projects/project-exports-panel";
import { ProjectSidePanel } from "@/components/projects/project-side-panel";
import { ProjectUploadFlow, type RevisionUploadCompleteResult } from "@/components/projects/project-upload-flow";
import { ProjectUnitCreateFlow } from "@/components/projects/project-unit-create-flow";
import { AssignmentCardControls } from "@/components/projects/assignment-card-controls";
import { DENSITY_DEFAULTS, type AssignmentCardDensity, type AssignmentCardVisibility } from "@/components/projects/assignment-card";
import PageLayout from "@/components/layout/page-layout";
import { useAssignmentDependencyGraph } from "@/hooks/use-assignment-dependency-graph";
import { useProjectRevisions } from "@/hooks/use-project-revisions";
import { useProjectDetailsV2 } from "@/hooks/use-project-details-v2";
import type { FileRevision } from "@/lib/revision/types";
import type { UploadProgress } from "@/lib/workbook/types";

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const {
    currentProject,
    currentProjectId,
    loadProject,
    clearCurrentProject,
    isLoading,
    assignmentMappings,
    hasAssignmentMappings,
    saveAssignmentMappings,
    deleteProject,
  } = useProjectContext();

  // Load project on mount if not already loaded
  useEffect(() => {
    if (projectId && currentProjectId !== projectId) {
      loadProject(projectId);
    }
  }, [projectId, currentProjectId, loadProject]);

  // Layout PDF rendering is disabled in the manifest architecture.
  // Layout pages are loaded from persisted state (extracted during upload).
  const isRenderingLayout = false;
  const renderProgress = 0;
  const compatibility = null;
  const layoutError = null;
  const processLayoutPdf = async (_file: File) => { };
  const clearLayoutData = () => { };

  // Load persisted layout pages (SlimLayoutPage[] with base64 images)
  const [layoutPages, setLayoutPages] = useState<import("@/lib/layout-matching").LayoutPagePreview[]>([]);
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/project-context/${encodeURIComponent(projectId)}/state/layout-pages`, { cache: "no-store" });
        if (!res.ok) return;
        const payload = await res.json() as { data?: { pages?: import("@/lib/layout-matching").LayoutPagePreview[] } };
        if (!cancelled && payload.data?.pages) setLayoutPages(payload.data.pages);
      } catch {
        // Layout pages are optional — silently ignore fetch errors
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // PDF upload state
  const [pdfProgress, setPdfProgress] = useState<UploadProgress>({ state: "idle" });
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfFileRef = useRef<File | null>(null);

  // UI state
  const [isRevisionUploadOpen, setIsRevisionUploadOpen] = useState(false);
  const [isSidePanelExpanded, setIsSidePanelExpanded] = useState(true);
  const [activeRevision, setActiveRevision] = useState<string | null>(null);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [showLifecyclePanel, setShowLifecyclePanel] = useState(true);

  // Card display state
  const [cardDensity, setCardDensity] = useState<AssignmentCardDensity>("standard");
  const [cardVisibleSections, setCardVisibleSections] = useState<AssignmentCardVisibility>(
    () => new Set(DENSITY_DEFAULTS["standard"])
  );

  // Revision history — pass pdNumber for accurate Legal Drawings folder matching
  const {
    history: revisionHistory,
    isLoading: isRevisionHistoryLoading,
    refresh: refreshRevisions,
  } = useProjectRevisions({ projectId, pdNumber: currentProject?.pdNumber });

  // Project details V2 (units)
  const {
    projectRecord: projectDetailsRecord,
    createUnit,
    switchUnit,
  } = useProjectDetailsV2(projectId);

  const [isUnitCreateFlowOpen, setIsUnitCreateFlowOpen] = useState(false);

  // Seed values for upload flow when launched from unit creation
  const [uploadSeed, setUploadSeed] = useState<{
    pdNumber: string;
    unitNumber: string;
    revision: string;
    lwcType?: import('@/lib/workbook/types').LwcType;
    dueDate?: Date;
  } | null>(null);

  const handleCreateUnit = useCallback(async (input: import('@/lib/services/contracts/project-details-v2-service').CreateProjectUnitInput) => {
    await createUnit(input);
  }, [createUnit]);

  // Handle upload-after-create: seed the revision upload flow with unit values
  const handleUnitUploadRevision = useCallback((seed: {
    pdNumber: string;
    unitNumber: string;
    revision: string;
    lwcType?: import('@/lib/workbook/types').LwcType;
    dueDate?: Date;
  }) => {
    setUploadSeed(seed);
    setIsRevisionUploadOpen(true);
  }, []);

  // Use dependency graph for project lifecycle insights
  const {
    snapshot,
    crossWireReadiness,
  } = useAssignmentDependencyGraph(currentProjectId, assignmentMappings);

  // Auto-open mapping modal when project is loaded but has no mappings
  useEffect(() => {
    if (currentProject && !hasAssignmentMappings && currentProject.sheets.length > 0) {
      const timer = setTimeout(() => {
        setIsMappingModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentProject, hasAssignmentMappings]);

  // Handle saving assignment mappings
  const handleSaveAssignmentMappings = useCallback((mappings: MappedAssignment[], _namingConfig?: unknown) => {
    saveAssignmentMappings(mappings);
    setIsMappingModalOpen(false);
  }, [saveAssignmentMappings]);

  // Handle inline card field change (quick-edit dropdown)
  const handleCardFieldChange = useCallback(
    (sheetSlug: string, field: string, value: string | number) => {
      if (!assignmentMappings) return;
      const updated = assignmentMappings.map((m) =>
        m.sheetSlug === sheetSlug ? { ...m, [field]: value } : m,
      );
      saveAssignmentMappings(updated);
    },
    [assignmentMappings, saveAssignmentMappings],
  );

  // Handle assignment card click in kanban
  const handleAssignmentClick = useCallback((assignment: MappedAssignment) => {
    if (currentProject) {
      router.push(`/projects/${currentProject.id}/assignments/${assignment.sheetSlug}`);
    }
  }, [currentProject, router]);

  const handleClearProject = useCallback(() => {
    clearCurrentProject();
    setPdfProgress({ state: "idle" });
    setPdfError(null);
    pdfFileRef.current = null;
    router.push('/projects');
  }, [clearCurrentProject, router]);

  // Layout PDF parsing is disabled in manifest architecture.
  // Layout data is now embedded in sheet schemas during project creation.
  const handlePdfParsed = useCallback(async (_pdfSource: unknown, _fileName: string, _file?: File) => {
    // No-op — layout handling removed
  }, []);

  // Handle revision upload completion from ProjectUploadFlow
  const handleRevisionComplete = useCallback((result: RevisionUploadCompleteResult) => {
    setIsRevisionUploadOpen(false);
    const displayVersion = result.wireListRevision?.revisionInfo.displayVersion
      ?? result.layoutRevision?.revisionInfo.displayVersion
      ?? "UPLOADED";
    setActiveRevision(displayVersion);
    refreshRevisions();

    const updatedFile = result.wireListRevision && result.layoutRevision
      ? "workbook and layout"
      : result.wireListRevision ? "workbook" : "layout";
    toast({
      title: "Revision Updated",
      description: `${updatedFile} for revision ${displayVersion} uploaded successfully`,
      duration: 4000,
    });
  }, [refreshRevisions, toast]);

  // Handle revision selection from sidebar
  const handleRevisionSelect = useCallback((revision: FileRevision) => {
    setActiveRevision(revision.revisionInfo.displayVersion);
  }, []);

  // Handle revision deletion from sidebar
  const handleDeleteRevision = useCallback(async (revision: FileRevision) => {
    // Find paired revision (wire list ↔ layout with same display version)
    const paired = revision.category === "WIRE_LIST"
      ? revisionHistory?.layoutRevisions.find(
        r => r.revisionInfo.displayVersion === revision.revisionInfo.displayVersion
      ) ?? null
      : revisionHistory?.wireListRevisions.find(
        r => r.revisionInfo.displayVersion === revision.revisionInfo.displayVersion
      ) ?? null;

    const fileNames = [revision.filename, ...(paired ? [paired.filename] : [])];
    const confirmed = window.confirm(
      `Delete ${revision.revisionInfo.displayVersion}?\n\nFiles to remove:\n${fileNames.map(f => `  • ${f}`).join("\n")}`
    );
    if (!confirmed) return;

    try {
      // Delete all files for this version
      for (const filename of fileNames) {
        const pdParam = currentProject?.pdNumber ? `?pdNumber=${encodeURIComponent(currentProject.pdNumber)}` : "";
        const response = await fetch(
          `/api/project-context/revisions/${encodeURIComponent(projectId)}/files/${encodeURIComponent(filename)}${pdParam}`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Delete failed" })) as { error?: string };
          throw new Error(payload.error || `Failed to delete ${filename}`);
        }
      }

      // If the deleted revision was actively selected, clear the selection
      if (activeRevision === revision.revisionInfo.displayVersion) {
        setActiveRevision(null);
      }

      refreshRevisions();

      toast({
        title: "Revision deleted",
        description: `${revision.revisionInfo.displayVersion} (${fileNames.length} file${fileNames.length > 1 ? "s" : ""}) has been removed.`,
      });
    } catch (error) {
      console.error("[ProjectPage] Failed to delete revision:", error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete revision.",
        variant: "destructive",
      });
    }
  }, [activeRevision, projectId, refreshRevisions, revisionHistory, toast]);

  // Loading state
  if (isLoading || !currentProject) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-48 rounded-xl" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <PageLayout
      title={currentProject.name}
      subtitle={[
        currentProject.pdNumber && `PD# ${currentProject.pdNumber}`,
        currentProject.unitNumber && `Unit ${currentProject.unitNumber}`,
        currentProject.revision && `Rev ${currentProject.revision.replace(/_/g, " ")}`,
      ].filter(Boolean).join(" · ") || undefined}
      showAside={false}
      showBreadcrumbs
      showHeader
      sidePanelContent={
        <ProjectSidePanel
          project={currentProject}
          activeRevision={activeRevision}
          revisionHistory={revisionHistory ?? null}
          isRevisionLoading={isRevisionHistoryLoading}
          assignments={assignmentMappings}
          layoutPages={layoutPages}
          onRevisionSelect={handleRevisionSelect}
          onUploadRevision={() => setIsRevisionUploadOpen(true)}
          onAssignmentClick={handleAssignmentClick}
          isExpanded={isSidePanelExpanded}
          onExpandedChange={setIsSidePanelExpanded}
          onDeleteRevision={handleDeleteRevision}
          units={projectDetailsRecord?.units ?? []}
          currentUnitId={projectDetailsRecord?.currentUnitId}
          onSelectUnit={(unit) => {
            void switchUnit(unit.id);
          }}
          onCreateUnit={() => setIsUnitCreateFlowOpen(true)}
        />
      }
      subHeader={
        <ProjectExportsPanel
          projectId={currentProject.id}
          onSuccess={(message) => {
            toast({
              title: "Project exports updated",
              description: message,
              duration: 4000,
            });
          }}
          onError={(message) => {
            toast({
              title: "Project exports failed",
              description: message,
              variant: "destructive",
              duration: 5000,
            });
          }}
        />
      }
      headerActions={
        <div className="flex items-center gap-2">
       
        </div>
      }
      floatingActions={
        <>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 h-9 px-4 hover:bg-primary/10"
              onClick={() => setIsMappingModalOpen(true)}
            >
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">
                {hasAssignmentMappings ? 'Edit Mappings' : 'Map Assignments'}
              </span>
            </Button>

            <div className="h-6 w-px bg-border/50" />

            <AssignmentCardControls
              density={cardDensity}
              onDensityChange={setCardDensity}
              visibleSections={cardVisibleSections}
              onVisibleSectionsChange={setCardVisibleSections}
            />

            <div className="h-6 w-px bg-border/50" />

            <ThemeTogglePill />

            <div className="h-6 w-px bg-border/50" />

            <Button
              variant="ghost"
              size="sm"
              className="gap-2 h-9 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleClearProject}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          </div>
        </>
      }
    >
      <ProjectCardGrid
        project={currentProject}
        layoutPages={layoutPages}
        assignments={assignmentMappings}
        onAssignmentClick={handleAssignmentClick}
        cardDensity={cardDensity}
        cardVisibleSections={cardVisibleSections}
        onCardFieldChange={handleCardFieldChange}
      />

      {/* Revision Upload Dialog */}
      <Dialog open={isRevisionUploadOpen} onOpenChange={(open) => {
        setIsRevisionUploadOpen(open);
        if (!open) setUploadSeed(null);
      }}>
        <DialogContent className="max-h-[90vh] min-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Revision</DialogTitle>
            <DialogDescription>
              Upload a new workbook and layout PDF pair for {currentProject.name}.
            </DialogDescription>
          </DialogHeader>
          <ProjectUploadFlow
            mode="revision"
            projectId={currentProject.id}
            currentSheetSlug={currentProject.sheets.find(s => s.kind === 'operational')?.slug}
            initialProjectName={currentProject.name}
            initialPdNumber={uploadSeed?.pdNumber ?? currentProject.pdNumber}
            initialUnitNumber={uploadSeed?.unitNumber ?? currentProject.unitNumber}
            initialRevision={uploadSeed?.revision ?? currentProject.revision}
            initialLwcType={uploadSeed?.lwcType ?? currentProject.lwcType}
            initialDueDate={uploadSeed?.dueDate ?? (currentProject.dueDate ? new Date(currentProject.dueDate) : undefined)}
            onCancel={() => {
              setIsRevisionUploadOpen(false);
              setUploadSeed(null);
            }}
            onRevisionComplete={handleRevisionComplete}
          />
        </DialogContent>
      </Dialog>

      {/* Assignment Mapping Modal */}
      <ProjectAssignmentMappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        onSave={handleSaveAssignmentMappings}
        sheets={Object.values(currentProject.assignments ?? {})}
        projectName={currentProject.name}
        existingMappings={assignmentMappings}
        layoutPages={layoutPages}
      />

      {/* Unit Create Flow */}
      <ProjectUnitCreateFlow
        open={isUnitCreateFlowOpen}
        onClose={() => setIsUnitCreateFlowOpen(false)}
        projectId={currentProject.id}
        projectName={currentProject.name}
        defaultPdNumber={currentProject.pdNumber}
        defaultUnitNumber={currentProject.unitNumber}
        defaultLwcType={currentProject.lwcType}
        defaultRevision={currentProject.revision}
        existingUnits={projectDetailsRecord?.units ?? []}
        onCreateUnit={handleCreateUnit}
        onUploadRevision={handleUnitUploadRevision}
      />
    </PageLayout>
  );
}
