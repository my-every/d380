"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ProjectInitializationWorkspace } from "@/components/projects/project-initialization-workspace";
import type { ProjectManifest } from "@/types/project-manifest";
import type { ProjectUnit, ProjectUnitsPayload } from "@/lib/project-units/types";
import type { SlimLayoutPage } from "@/lib/layout-matching/types";

interface ProjectInitializePageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectInitializePage({ params }: ProjectInitializePageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = useState<ProjectManifest | null>(null);
  const [unitsPayload, setUnitsPayload] = useState<ProjectUnitsPayload | null>(null);
  const [layoutPages, setLayoutPages] = useState<SlimLayoutPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const [projectResponse, unitsResponse, layoutPagesResponse] = await Promise.all([
          fetch(`/api/project-context/${encodeURIComponent(projectId)}`, { cache: "no-store" }),
          fetch(`/api/project-context/${encodeURIComponent(projectId)}/units`, { cache: "no-store" }),
          fetch(`/api/project-context/${encodeURIComponent(projectId)}/state/layout-pages`, { cache: "no-store" }),
        ]);

        if (!projectResponse.ok) {
          throw new Error("Project not found");
        }

        if (!unitsResponse.ok) {
          throw new Error("Failed to load project units");
        }

        const projectPayload = (await projectResponse.json()) as { manifest?: ProjectManifest };
        const unitsData = (await unitsResponse.json()) as ProjectUnitsPayload;
        const layoutPagesPayload = layoutPagesResponse.ok
          ? (await layoutPagesResponse.json()) as { data?: { pages?: SlimLayoutPage[] } }
          : { data: { pages: [] } };

        if (!cancelled) {
          setProject(projectPayload.manifest ?? null);
          setUnitsPayload(unitsData);
          setLayoutPages(layoutPagesPayload.data?.pages ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Initialization Unavailable",
            description: error instanceof Error ? error.message : "Failed to load initialization workspace",
            variant: "destructive",
          });
          router.push(`/projects/${projectId}`);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId, router, toast]);

  const handleSaveUnits = useCallback(async (units: ProjectUnit[]) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/project-context/${encodeURIComponent(projectId)}/units`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units }),
      });

      if (!response.ok) {
        throw new Error("Failed to save units");
      }

      const payload = (await response.json()) as ProjectUnitsPayload;
      setUnitsPayload(payload);
      toast({
        title: "Units Saved",
        description: `${payload.document.units.length} units are now persisted for this project.`,
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save project units",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [projectId, toast]);

  const handleGenerateWorkflow = useCallback(async (units: ProjectUnit[]) => {
    setIsGeneratingWorkflow(true);
    try {
      const response = await fetch(`/api/project-context/${encodeURIComponent(projectId)}/units/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate workflow");
      }

      const payload = (await response.json()) as { document?: ProjectUnitsPayload["document"]; generatedCount?: number };
      if (payload.document) {
        setUnitsPayload({
          document: payload.document,
          source: "persisted",
          summary: {
            unmatchedSheetSlugs: [],
            unmatchedPageNumbers: [],
          },
        });
      }

      toast({
        title: "Unit Workflow Generated",
        description: `${payload.generatedCount ?? 0} assignment mappings were derived from the unit model.`,
      });
      router.push(`/projects/${projectId}`);
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate unit workflow",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingWorkflow(false);
    }
  }, [projectId, router, toast]);

  if (isLoading || !project || !unitsPayload) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Skeleton className="h-[720px] rounded-3xl" />
          <Skeleton className="h-[720px] rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
        <ProjectInitializationWorkspace
      project={project}
      unitsPayload={unitsPayload}
      layoutPages={layoutPages}
      isSaving={isSaving}
      isGeneratingWorkflow={isGeneratingWorkflow}
      onSaveUnits={handleSaveUnits}
      onGenerateWorkflow={handleGenerateWorkflow}
      onContinueToProject={() => router.push(`/projects/${projectId}`)}
    />
  );
}
