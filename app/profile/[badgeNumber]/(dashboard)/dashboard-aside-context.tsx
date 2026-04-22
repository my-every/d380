"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { UserWithSettings } from "@/components/profile/user-access/user-permissions-panel";
import type { TeamMember } from "@/components/profile/user-access/user-detail-aside";
import type { ProjectManifest } from "@/types/project-manifest";
import type { PartRecord } from "@/types/parts-library";

interface DashboardAsideContextValue {
    // For Users > All view - store selected team member details
    selectedMember: TeamMember | null;
    setSelectedMember: (member: TeamMember | null) => void;
    // For User Access/Skills views - store the full user object
    selectedUser: UserWithSettings | null;
    setSelectedUser: (user: UserWithSettings | null) => void;
    // For Projects views - store selected project
    selectedProject: ProjectManifest | null;
    setSelectedProject: (project: ProjectManifest | null) => void;
    // For Parts Library views - store the selected part
    selectedPart: PartRecord | null;
    setSelectedPart: (part: PartRecord | null) => void;
    // Refresh trigger for when settings change
    refreshTrigger: number;
    triggerRefresh: () => void;
}

const DashboardAsideContext = createContext<DashboardAsideContextValue | null>(null);

export function DashboardAsideProvider({ children }: { children: ReactNode }) {
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserWithSettings | null>(null);
    const [selectedProject, setSelectedProject] = useState<ProjectManifest | null>(null);
    const [selectedPart, setSelectedPart] = useState<PartRecord | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    const triggerRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    return (
        <DashboardAsideContext.Provider
            value={{
                selectedMember,
                setSelectedMember,
                selectedUser,
                setSelectedUser,
                selectedProject,
                setSelectedProject,
                selectedPart,
                setSelectedPart,
                refreshTrigger,
                triggerRefresh,
            }}
        >
            {children}
        </DashboardAsideContext.Provider>
    );
}

export function useDashboardAside() {
    const context = useContext(DashboardAsideContext);
    if (!context) {
        throw new Error("useDashboardAside must be used within a DashboardAsideProvider");
    }
    return context;
}
