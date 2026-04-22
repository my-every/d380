import { redirect } from "next/navigation";

// ============================================================================
// Types
// ============================================================================

interface BadgeProfilePageProps {
    params: Promise<{ badgeNumber: string }>;
}

// ============================================================================
// Page - Redirects to workspace/overview
// ============================================================================

export default async function BadgeProfilePage({ params }: BadgeProfilePageProps) {
    const { badgeNumber } = await params;
    redirect(`/profile/${badgeNumber}/workspace/overview`);
}
