"use client";

import { use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { UsersView } from "@/components/profile/user-access/users-view";
import { UserPermissionsPanel, type UserWithSettings } from "@/components/profile/user-access/user-permissions-panel";
import { USER_ROLE_LABELS } from "@/types/d380-user-session";
import type { TeamMember } from "@/components/profile/user-access/user-detail-aside";
import { useDashboardAside } from "../../dashboard-aside-context";

interface Props {
    params: Promise<{ badgeNumber: string; view: string }>;
}

export default function UsersViewPage({ params }: Props) {
    const { badgeNumber, view } = use(params);
    const { user } = useSession();
    const router = useRouter();
    const { selectedMember, setSelectedMember, selectedUser, setSelectedUser } = useDashboardAside();

    useEffect(() => {
        if (!user) return;
        if (view !== "access" && view !== "skills") return;

        fetch(`/api/users/${user.badge}/settings?shift=${encodeURIComponent(user.currentShift ?? "1st")}`)
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
                if (data?.dashboardAccess?.userAccess === false) {
                    router.replace(`/profile/${badgeNumber}/users/all`);
                }
            })
            .catch(() => {});
    }, [user, view, badgeNumber, router]);

    useEffect(() => {
        if (view !== "all" && view !== "access" && view !== "skills") {
            router.replace(`/profile/${badgeNumber}/users/all`);
        }
    }, [badgeNumber, router, view]);

    useEffect(() => {
        return () => {
            setSelectedUser(null);
            setSelectedMember(null);
        };
    }, [setSelectedUser, setSelectedMember]);

    const handleSelectMember = useCallback((member: TeamMember | null) => {
        setSelectedMember(member);
    }, [setSelectedMember]);

    const handleSelectUser = useCallback((selectedUserData: UserWithSettings | null) => {
        setSelectedUser(selectedUserData);
    }, [setSelectedUser]);

    if (view === "all") {
        return (
            <UsersView
                onSelectMember={handleSelectMember}
                selectedBadge={selectedMember?.badge ?? null}
                performerBadge={badgeNumber}
            />
        );
    }

    if (view === "access" || view === "skills") {
        if (!user) return null;

        return (
            <UserPermissionsPanel
                managerBadge={badgeNumber}
                roleLabel={USER_ROLE_LABELS[user.role]}
                onUserSelect={handleSelectUser}
                selectedBadge={selectedUser?.badge ?? null}
                variant={view === "skills" ? "skills" : undefined}
            />
        );
    }

    return null;
}
