import { redirect } from "next/navigation";

interface Props {
    params: Promise<{ badgeNumber: string; category: string }>;
}

export default async function PartsCategoryCompatibilityPage({ params }: Props) {
    const { badgeNumber, category } = await params;
    redirect(`/profile/${badgeNumber}/parts?category=${encodeURIComponent(category)}`);
}
