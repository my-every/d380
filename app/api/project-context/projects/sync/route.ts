import { NextResponse } from "next/server";
import { syncProjectsFromLegalDrawings, getProjectFolders } from "@/lib/d380-import/project-sync-service";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await syncProjectsFromLegalDrawings();

    return NextResponse.json({
      success: true,
      message: `Synced ${result.syncedProjects} of ${result.totalProjects} projects`,
      ...result,
    });
  } catch (error) {
    console.error("[Sync] Failed to sync projects:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const folders = await getProjectFolders();

    return NextResponse.json({
      success: true,
      projectFolders: folders,
      count: folders.length,
    });
  } catch (error) {
    console.error("[Sync] Failed to get project folders:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
