import { redirect } from "next/navigation";

interface Props {
    params: Promise<{ badgeNumber: string }>;
}

export default async function WorkspacePage({ params }: Props) {
    const { badgeNumber } = await params;
    redirect(`/profile/${badgeNumber}/workspace/overview`);
}
