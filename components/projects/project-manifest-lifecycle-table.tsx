"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, FileUp, Lock, Sparkles, Tags, type LucideIcon } from "lucide-react";

import { ProjectUploadFlow } from "@/components/projects/project-upload-flow";
import type { ProjectActionKey } from "@/components/projects/project-home-card";
import { MultiSheetPrintModal } from "@/components/wire-list/multi-sheet-print-modal";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ProjectManifest } from "@/types/project-manifest";

type UploadAwareManifest = ProjectManifest & {
  activeWorkbookRevisionId?: string | null;
  activeLayoutRevisionId?: string | null;
};

type LifecycleStepId = "legals-ready" | "legals-uploaded" | "brand-list-reviewed" | "branding-ready";

type LifecycleStepStatus = "complete" | "available" | "locked";

type LifecycleStepAction = ProjectActionKey | "upload" | "brand-review" | "download-branding" | null;

interface LifecycleStep {
  id: LifecycleStepId;
  label: string;
  description: string;
  status: LifecycleStepStatus;
  action: LifecycleStepAction;
  icon: LucideIcon;
}

interface ProjectActionStateSummary {
  hasOperationalSheets?: boolean;
  brandListReady?: boolean;
  brandingCombinedRelativePath?: string | null;
}

interface ProjectActionStateResponse {
  summary?: ProjectActionStateSummary;
}

interface ProjectManifestLifecycleTableProps {
  projects: ProjectManifest[];
  onAction: (action: ProjectActionKey, project: ProjectManifest) => void;
  onProjectReload?: (projectId: string) => void;
}

function gateStatus(project: ProjectManifest, gateId: string) {
  return project.lifecycleGates?.find((gate) => gate.gateId === gateId)?.status ?? "LOCKED";
}

function gateIsComplete(project: ProjectManifest, gateId: string) {
  const status = gateStatus(project, gateId);
  return status === "READY" || status === "COMPLETE";
}

function hasUploadedProjectFiles(project: ProjectManifest) {
  const uploadAwareProject = project as UploadAwareManifest;
  const hasWorkbook = Boolean(uploadAwareProject.activeWorkbookRevisionId);
  const hasLayout = Boolean(uploadAwareProject.activeLayoutRevisionId);
  const hasOperationalSheets = (project.sheets ?? []).some((sheet) => sheet.kind === "operational" && sheet.hasData);

  return (hasWorkbook && hasLayout) || hasOperationalSheets;
}

function getStepStatus(isComplete: boolean, isUnlocked: boolean): LifecycleStepStatus {
  if (isComplete) {
    return "complete";
  }

  return isUnlocked ? "available" : "locked";
}

function buildProjectLifecycleSteps(
  project: ProjectManifest,
  summary: ProjectActionStateSummary | null,
): LifecycleStep[] {
  const legalsReady = gateIsComplete(project, "LEGALS_READY") || hasUploadedProjectFiles(project);
  const legalsUploaded = hasUploadedProjectFiles(project);
  const brandListReviewed = gateIsComplete(project, "BRANDLIST_COMPLETE") || Boolean(summary?.brandListReady);
  const brandingReady = Boolean(summary?.brandingCombinedRelativePath);

  return [
    {
      id: "legals-ready",
      label: "Legals Ready",
      description: legalsReady
        ? "Legals gate is ready for this project."
        : "Mark or confirm the legal package before project upload work begins.",
      status: getStepStatus(legalsReady, true),
      action: "lifecycle",
      icon: Check,
    },
    {
      id: "legals-uploaded",
      label: "Legals Uploaded",
      description: legalsUploaded
        ? "Project upload artifacts are available on disk."
        : "Upload the workbook and layout package for this project.",
      status: getStepStatus(legalsUploaded, legalsReady),
      action: "upload",
      icon: FileUp,
    },
    {
      id: "brand-list-reviewed",
      label: "Brand List Reviewed",
      description: brandListReviewed
        ? "All approved sheets were combined into the branding workbook."
        : "Open the multi-sheet brand review, approve each sheet, then combine/export.",
      status: getStepStatus(brandListReviewed, legalsUploaded),
      action: "brand-review",
      icon: Tags,
    },
    {
      id: "branding-ready",
      label: "Branding Ready",
      description: brandingReady
        ? "Download the exported Excel brand list package."
        : "The combined branding workbook appears here after brand review export.",
      status: getStepStatus(brandingReady, brandListReviewed),
      action: brandingReady ? "download-branding" : null,
      icon: Sparkles,
    },
  ];
}

function getStepLabel(step: LifecycleStep) {
  if (step.status === "complete") {
    return `${step.label} complete`;
  }

  if (step.status === "available") {
    return `${step.label} is unlocked`;
  }

  return `${step.label} is locked`;
}

function ProjectLifecycleStepper({
  project,
  summary,
  onAction,
  onUpload,
  onBrandReview,
  onDownloadBranding,
}: {
  project: ProjectManifest;
  summary: ProjectActionStateSummary | null;
  onAction: (action: ProjectActionKey, project: ProjectManifest) => void;
  onUpload: (project: ProjectManifest) => void;
  onBrandReview: (project: ProjectManifest) => void;
  onDownloadBranding: (project: ProjectManifest, relativePath: string) => void;
}) {
  const steps = useMemo(() => buildProjectLifecycleSteps(project, summary), [project, summary]);

  return (
    <div className="min-w-[620px] overflow-x-auto py-2">
      <div className="flex w-max items-start">
        {steps.map((step, index) => {
          const Icon = step.status === "complete" ? Check : step.status === "locked" ? Lock : step.icon;
          const disabled = step.status === "locked" || !step.action;
          const isComplete = step.status === "complete";
          const isAvailable = step.status === "available";

          return (
            <div key={step.id} className="flex items-start">
              <div className="flex w-28 flex-col items-center gap-2 text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={getStepLabel(step)}
                      onClick={() => {
                        if (step.action === "upload") {
                          onUpload(project);
                          return;
                        }

                        if (step.action === "brand-review") {
                          onBrandReview(project);
                          return;
                        }

                        if (step.action === "download-branding" && summary?.brandingCombinedRelativePath) {
                          onDownloadBranding(project, summary.brandingCombinedRelativePath);
                          return;
                        }

                        if (step.action && step.action !== "download-branding") {
                          onAction(step.action, project);
                        }
                      }}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full border text-sm transition-all",
                        isComplete && "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/25",
                        isAvailable && "border-primary bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground",
                        step.status === "locked" && "border-border bg-muted text-muted-foreground opacity-70",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-64 text-xs">
                    {step.description}
                  </TooltipContent>
                </Tooltip>

                <span
                  className={cn(
                    "max-w-24 text-wrap text-[11px] font-semibold leading-tight",
                    isComplete && "text-emerald-700 dark:text-emerald-400",
                    isAvailable && "text-foreground",
                    step.status === "locked" && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 ? (
                <div
                  className={cn(
                    "mt-[21px] h-0.5 w-12 rounded-full",
                    step.status === "complete" ? "bg-emerald-500" : "bg-border",
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildExportHref(projectId: string, relativePath: string) {
  const normalizedRelativePath = relativePath.replace(/^exports\//, "");
  const encodedSegments = normalizedRelativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/project-context/${encodeURIComponent(projectId)}/exports/files/${encodedSegments}?download=1`;
}

function ProjectManifestLifecycleRow({
  project,
  refreshKey,
  onAction,
  onUpload,
  onBrandReview,
  onDownloadBranding,
}: {
  project: ProjectManifest;
  refreshKey: number;
  onAction: (action: ProjectActionKey, project: ProjectManifest) => void;
  onUpload: (project: ProjectManifest) => void;
  onBrandReview: (project: ProjectManifest) => void;
  onDownloadBranding: (project: ProjectManifest, relativePath: string) => void;
}) {
  const [summary, setSummary] = useState<ProjectActionStateSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/project-context/${encodeURIComponent(project.id)}/action-state`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<ProjectActionStateResponse>;
      })
      .then((payload) => {
        if (!cancelled) {
          setSummary(payload.summary ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [project.id, refreshKey]);

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell className="px-4">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-foreground">{project.name}</span>
          <span className="truncate text-xs text-muted-foreground">{project.filename}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="rounded-full font-mono">
          {project.pdNumber || "TBD"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {project.unitNumber || project.unitType || "TBD"}
      </TableCell>
      <TableCell>
        <ProjectLifecycleStepper
          project={project}
          summary={summary}
          onAction={onAction}
          onUpload={onUpload}
          onBrandReview={onBrandReview}
          onDownloadBranding={onDownloadBranding}
        />
      </TableCell>
    </TableRow>
  );
}

export function ProjectManifestLifecycleTable({
  projects,
  onAction,
  onProjectReload,
}: ProjectManifestLifecycleTableProps) {
  const [uploadProject, setUploadProject] = useState<ProjectManifest | null>(null);
  const [brandReviewProject, setBrandReviewProject] = useState<ProjectManifest | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (projects.length === 0) {
    return null;
  }

  return (
    <>
      <section className="container mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Project Lifecycle</h2>
            <p className="text-sm text-muted-foreground">
              Manifest-backed project gates with each step unlocking the next actionable workspace.
            </p>
          </div>
          <Badge variant="outline" className="w-fit rounded-full">
            {projects.length} projects
          </Badge>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border bg-card/70 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[26%] px-4">Project</TableHead>
                <TableHead>PD#</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="min-w-[680px]">Project Lifecycle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <ProjectManifestLifecycleRow
                  key={project.id}
                  project={project}
                  refreshKey={refreshKey}
                  onAction={onAction}
                  onUpload={setUploadProject}
                  onBrandReview={(nextProject) => {
                    onProjectReload?.(nextProject.id);
                    setBrandReviewProject(nextProject);
                  }}
                  onDownloadBranding={(nextProject, relativePath) => {
                    window.open(buildExportHref(nextProject.id, relativePath), "_blank", "noopener,noreferrer");
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {uploadProject ? (
        <Dialog open={Boolean(uploadProject)} onOpenChange={(open) => !open && setUploadProject(null)}>
          <DialogContent className="max-h-[90vh] min-w-6xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Legals</DialogTitle>
              <DialogDescription>
                Upload or revise the workbook and layout files for {uploadProject.name}.
              </DialogDescription>
            </DialogHeader>
            <ProjectUploadFlow
              mode="revision"
              projectId={uploadProject.id}
              initialProjectName={uploadProject.name}
              initialPdNumber={uploadProject.pdNumber}
              initialUnitNumber={uploadProject.unitNumber}
              initialRevision={uploadProject.revision}
              onCancel={() => setUploadProject(null)}
              onClose={() => {
                onProjectReload?.(uploadProject.id);
                setRefreshKey((key) => key + 1);
                setUploadProject(null);
              }}
              onRevisionComplete={() => {
                onProjectReload?.(uploadProject.id);
                setRefreshKey((key) => key + 1);
                setUploadProject(null);
              }}
            />
          </DialogContent>
        </Dialog>
      ) : null}

      {brandReviewProject ? (
        <MultiSheetPrintModal
          projectId={brandReviewProject.id}
          open={Boolean(brandReviewProject)}
          onOpenChange={(open) => {
            if (!open) {
              onProjectReload?.(brandReviewProject.id);
              setRefreshKey((key) => key + 1);
              setBrandReviewProject(null);
            }
          }}
          showTrigger={false}
          title="Brand List Review"
          description="Approve every project sheet, then combine/export the reviewed brand list workbook."
          combineLabel="Combine & Export Brand List"
          workspaceMode="print"
        />
      ) : null}
    </>
  );
}
