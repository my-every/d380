"use client";

import { use, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardProjectsGrid } from "@/components/projects/dashboard-projects-grid";
import type { ProjectManifest } from "@/types/project-manifest";
import { useDashboardAside } from "../../dashboard-aside-context";

interface Props {
    params: Promise<{ badgeNumber: string; view: string }>;
}

const GRID_VIEWS = new Set(["overview", "priority", "completed", "blocked", "upcoming"]);

export default function ProjectsViewPage({ params }: Props) {
    const { view } = use(params);
    const router = useRouter();
    const { selectedProject, setSelectedProject } = useDashboardAside();

    useEffect(() => {
        if (!GRID_VIEWS.has(view)) {
            router.replace("./overview");
        }
    }, [router, view]);

    if (!GRID_VIEWS.has(view)) {
        return null;
    }

    const handleSelectProject = useCallback((project: ProjectManifest | null) => {
        setSelectedProject(project);
    }, [setSelectedProject]);

    return (
        <DashboardProjectsGrid
            activeSubItem={view}
            onSelectProject={handleSelectProject}
            selectedProjectId={selectedProject?.id ?? null}
        />
    );
}
