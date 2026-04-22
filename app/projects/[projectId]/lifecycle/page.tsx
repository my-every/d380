"use client";

import { use } from "react";

import { ProjectLifecycleWorkspace } from "@/components/projects/project-lifecycle-workspace";

interface ProjectLifecycleRoutePageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default function ProjectLifecycleRoutePage({
  params,
}: ProjectLifecycleRoutePageProps) {
  const { projectId } = use(params);

  return <ProjectLifecycleWorkspace projectId={projectId} presentation="page" />;
}
