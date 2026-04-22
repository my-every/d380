import { NextResponse } from "next/server";

import { buildShareProjectWorkspaceDataSet } from "@/lib/d380-import/share-project-import";
import { ASSIGNMENT_STAGES } from "@/types/d380-assignment-stages";
import type { AssignmentProgressRecord, ProjectAssignmentProgress } from "@/lib/data-loader/share-utils";

function deriveProjectProgress(
  projectId: string,
  assignments: Array<{ id: string; sheetName: string; stage: string; progressPercent: number; estimatedHours: number }>,
): ProjectAssignmentProgress {
  const stageCounts = new Map<string, number>();
  for (const assignment of assignments) {
    const count = stageCounts.get(assignment.stage) ?? 0;
    stageCounts.set(assignment.stage, count + 1);
  }

  let currentStage = "BUILD_UP";
  for (const stage of ASSIGNMENT_STAGES) {
    if (stageCounts.has(stage.id)) {
      currentStage = stage.id;
      break;
    }
  }

  const assignmentRecords: AssignmentProgressRecord[] = assignments.map((assignment) => ({
    assignmentId: assignment.id,
    sheetName: assignment.sheetName,
    currentStage: assignment.stage,
    stageHistory: [],
    progress: assignment.progressPercent,
    wireCount: Math.round(assignment.estimatedHours * 20),
    completedWires: Math.round(assignment.estimatedHours * 20 * (assignment.progressPercent / 100)),
  }));

  return {
    projectId,
    currentStage,
    stageHistory: [],
    assignments: assignmentRecords,
    updatedAt: new Date().toISOString(),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  try {
    const dataSet = await buildShareProjectWorkspaceDataSet();
    const project = dataSet.projects.find(
      (candidate) => candidate.id === projectId || candidate.id.includes(projectId.replace("pd-", "")),
    );

    if (!project) {
      return NextResponse.json(
        { error: "Project not found", projectId },
        { status: 404 },
      );
    }

    const progress = deriveProjectProgress(project.id, project.assignments);
    return NextResponse.json(progress);
  } catch (error) {
    console.error("[API] Failed to load project progress:", error);
    return NextResponse.json(
      { error: "Failed to load project data", projectId },
      { status: 500 },
    );
  }
}
