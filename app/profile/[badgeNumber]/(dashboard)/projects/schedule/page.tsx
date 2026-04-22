"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { ProjectScheduleFeatureView } from "@/components/profile/project-schedule/project-schedule-feature-view";
import { USER_ROLE_LABELS } from "@/types/d380-user-session";

interface Props {
    params: Promise<{ badgeNumber: string }>;
}

export default function ProjectSchedulePage({ params }: Props) {
    const { badgeNumber } = use(params);
    const { user } = useSession();
    const router = useRouter();

    // Permission check - redirect if user doesn't have projectSchedule access
    useEffect(() => {
        if (!user) return;

        fetch(`/api/users/${user.badge}/settings?shift=${encodeURIComponent(user.currentShift ?? "1st")}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.dashboardAccess?.projectSchedule === false) {
                    // Redirect to projects overview if no access
                    router.replace(`/profile/${badgeNumber}/projects/overview`);
                }
            })
            .catch(() => {});
    }, [user, badgeNumber, router]);

    if (!user) return null;

    const roleLabel = USER_ROLE_LABELS[user.role];

    return (
        <ProjectScheduleFeatureView roleLabel={roleLabel} />
    );
}
