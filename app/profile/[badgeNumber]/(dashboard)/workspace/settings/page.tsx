"use client";

import { use } from "react";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileSettings } from "@/components/profile/profile-settings";
import { useWorkspaceSettingsContext } from "../../workspace-settings-context";

interface Props {
    params: Promise<{ badgeNumber: string }>;
}

export default function WorkspaceSettingsPage({ params }: Props) {
    const { badgeNumber } = use(params);
    const { settingsDraft, onFormChange } = useWorkspaceSettingsContext();

    return (
        <div className="space-y-4">
            <ProfileHeader badgeNumber={badgeNumber} isEditable />
            {settingsDraft ? (
                <ProfileSettings initialData={settingsDraft} onFormChange={onFormChange} />
            ) : (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                    Loading settings...
                </div>
            )}
        </div>
    );
}
