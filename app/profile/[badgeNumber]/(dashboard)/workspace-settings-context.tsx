"use client";

import { createContext, useContext } from "react";
import type { ProfileSettingsData } from "@/components/profile/profile-settings";

type WorkspaceSettingsContextValue = {
    settingsData: ProfileSettingsData | null;
    settingsDraft: ProfileSettingsData | null;
    onFormChange: (data: ProfileSettingsData, isDirty: boolean) => void;
};

const WorkspaceSettingsContext = createContext<WorkspaceSettingsContextValue | null>(null);

export function WorkspaceSettingsProvider({
    value,
    children,
}: {
    value: WorkspaceSettingsContextValue;
    children: React.ReactNode;
}) {
    return (
        <WorkspaceSettingsContext.Provider value={value}>
            {children}
        </WorkspaceSettingsContext.Provider>
    );
}

export function useWorkspaceSettingsContext() {
    const context = useContext(WorkspaceSettingsContext);
    if (!context) {
        throw new Error("useWorkspaceSettingsContext must be used inside WorkspaceSettingsProvider");
    }
    return context;
}
