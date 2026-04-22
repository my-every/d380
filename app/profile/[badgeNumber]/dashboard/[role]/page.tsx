import { redirect } from "next/navigation";

interface Props { params: Promise<{ badgeNumber: string; role: string }> }

export default async function LegacyDashboardRolePage({ params }: Props) {
    const { badgeNumber } = await params;
    redirect(`/profile/${badgeNumber}`);
}
