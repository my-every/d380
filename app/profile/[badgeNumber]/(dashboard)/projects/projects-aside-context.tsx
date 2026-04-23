"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ProjectManifest } from "@/types/project-manifest";

interface ProjectsAsideContextValue {
    selectedProject: ProjectManifest | null;
    setSelectedProject: (project: ProjectManifest | null) => void;
    showAside: boolean;
    setShowAside: (show: boolean) => void;
}

const ProjectsAsideContext = createContext<ProjectsAsideContextValue | null>(null);

export function ProjectsAsideProvider({ children }: { children: ReactNode }) {
    const [selectedProject, setSelectedProject] = useState<ProjectManifest | null>(null);
    const [showAside, setShowAside] = useState(false);

    return (
        <ProjectsAsideContext.Provider
            value={{ selectedProject, setSelectedProject, showAside, setShowAside }}
        >
            {children}
        </ProjectsAsideContext.Provider>
    );
}

export function useProjectsAside() {
    const context = useContext(ProjectsAsideContext);
    if (!context) {
        throw new Error("useProjectsAside must be used within a ProjectsAsideProvider");
    }
    return context;
}
