"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import PageLayout from "@/components/layout/page-layout";
import { ProjectActionModals } from "@/components/projects/project-action-modals";
import type { ProjectActionKey } from "@/components/projects/project-home-card";
import { ProjectManifestLifecycleTable } from "@/components/projects/project-manifest-lifecycle-table";
import { ProjectUploadFlow } from "@/components/projects/project-upload-flow";
import { projectsListTour } from "@/components/tour/tour/index";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectContext } from "@/contexts/project-context";
import type { ProjectManifest } from "@/types/project-manifest";

interface SlotProjectSeedStatusRow {
  projectId: string;
  legalsUploadStatus: "missing_project" | "seeded_from_slots" | "partial_upload" | "uploaded_legals";
}

export default function ProjectsPage() {
  const { allProjects, isLoading, loadProject } = useProjectContext();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<ProjectManifest | null>(null);
  const [activeAction, setActiveAction] = useState<ProjectActionKey | null>(null);
  const [slotSeedStatuses, setSlotSeedStatuses] = useState<Record<string, SlotProjectSeedStatusRow["legalsUploadStatus"]>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadSlotSeedStatuses() {
      try {
        const response = await fetch("/api/schedule/slots/project-seed-status", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = await response.json() as { rows?: SlotProjectSeedStatusRow[] };
        if (cancelled) {
          return;
        }

        const nextStatuses = Object.fromEntries(
          (payload.rows ?? []).map((row) => [row.projectId, row.legalsUploadStatus]),
        );
        setSlotSeedStatuses(nextStatuses);
      } catch {
        if (!cancelled) {
          setSlotSeedStatuses({});
        }
      }
    }

    void loadSlotSeedStatuses();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleProjects = useMemo(() => {
    return allProjects.filter((project) => {
      const isSlotSeeded = project.filename.startsWith("slots-seeded:");
      if (!isSlotSeeded) {
        return true;
      }

      return slotSeedStatuses[project.id] === "uploaded_legals";
    });
  }, [allProjects, slotSeedStatuses]);

  if (isLoading) {
    return (
      <PageLayout title="Projects" showAside={false}>
        <div className="flex flex-col gap-8">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-[1.75rem]" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Projects"
      floatingActionTourConfig={projectsListTour}
      showAside={false}
      headerActions={
        <Button size="sm" className="gap-2" onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      }
    >
      <ProjectManifestLifecycleTable
        projects={visibleProjects}
        onProjectReload={loadProject}
        onAction={(action, project) => {
          loadProject(project.id);
          setActiveProject(project);
          setActiveAction(action);
        }}
      />

      <ProjectActionModals
        action={activeAction}
        project={activeProject}
        onClose={() => {
          setActiveAction(null);
          setActiveProject(null);
        }}
      />

      {uploadOpen ? (
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-h-[90vh] min-w-6xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Upload an Excel workbook to create a new project.
              </DialogDescription>
            </DialogHeader>
            <ProjectUploadFlow
              mode="create"
              onCancel={() => setUploadOpen(false)}
              onClose={() => setUploadOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
    </PageLayout>
  );
}
