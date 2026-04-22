"use client";

import { use } from "react";
import { ProfileHeader } from "@/components/profile/profile-header";
import { useSession } from "@/hooks/use-session";

import { DeveloperDashboard } from "@/components/profile/dashboards/developer-dashboard";
import { ManagerDashboard } from "@/components/profile/dashboards/manager-dashboard";
import { SupervisorDashboard } from "@/components/profile/dashboards/supervisor-dashboard";
import { TeamLeadDashboard } from "@/components/profile/dashboards/team-lead-dashboard";
import { QaDashboard } from "@/components/profile/dashboards/qa-dashboard";
import { BranderDashboard } from "@/components/profile/dashboards/brander-dashboard";
import { AssemblerDashboard } from "@/components/profile/dashboards/assembler-dashboard";
import type { UserRole } from "@/types/d380-user-session";

interface Props {
    params: Promise<{ badgeNumber: string }>;
}

function RoleWorkspace({ role, badgeNumber }: { role: UserRole; badgeNumber: string }) {
    switch (role) {
        case "DEVELOPER":
            return <DeveloperDashboard badgeNumber={badgeNumber} />;
        case "MANAGER":
            return <ManagerDashboard badgeNumber={badgeNumber} />;
        case "SUPERVISOR":
            return <SupervisorDashboard badgeNumber={badgeNumber} />;
        case "TEAM_LEAD":
            return <TeamLeadDashboard badgeNumber={badgeNumber} />;
        case "QA":
            return <QaDashboard badgeNumber={badgeNumber} />;
        case "BRANDER":
            return <BranderDashboard badgeNumber={badgeNumber} />;
        case "ASSEMBLER":
            return <AssemblerDashboard badgeNumber={badgeNumber} />;
        default:
            return <DeveloperDashboard badgeNumber={badgeNumber} />;
    }
}

export default function WorkspaceOverviewPage({ params }: Props) {
    const { badgeNumber } = use(params);
    const { user } = useSession();

    if (!user) return null;

    return (
        <div className="space-y-4">
            
            <RoleWorkspace role={user.role} badgeNumber={badgeNumber} />
        </div>
    );
}
