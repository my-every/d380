"use client";

import { use } from "react";

import { SheetDetailWorkspace } from "@/components/projects/sheet-detail-workspace";

interface SheetDetailPageProps {
  params: Promise<{
    projectId: string;
    sheetName: string;
  }>;
}

export default function SheetDetailPage({ params }: SheetDetailPageProps) {
  const resolvedParams = use(params);

  return (
    <SheetDetailWorkspace
      projectId={resolvedParams.projectId}
      sheetName={resolvedParams.sheetName}
      presentation="page"
      showRevisionPanel
    />
  );
}
