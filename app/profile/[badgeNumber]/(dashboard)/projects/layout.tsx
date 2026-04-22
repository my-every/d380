"use client";

import { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { DashboardProjectAside } from "@/components/projects/dashboard-project-aside";
import type { ProjectManifest } from "@/types/project-manifest";
import { ProjectsAsideProvider, useProjectsAside } from "./projects-aside-context";

interface ProjectsLayoutProps {
    children: React.ReactNode;
}

function ProjectsLayoutInner({ children }: ProjectsLayoutProps) {
    const pathname = usePathname();
    const { selectedProject, setSelectedProject, showAside, setShowAside } = useProjectsAside();

    // Show aside for all project views except schedule
    const isScheduleView = pathname.includes("/projects/schedule");

    return (
        <>
            {children}
        </>
    );
}

export default function ProjectsLayout({ children }: ProjectsLayoutProps) {
    return (
        <ProjectsAsideProvider>
            <ProjectsLayoutInner>{children}</ProjectsLayoutInner>
        </ProjectsAsideProvider>
    );
}
