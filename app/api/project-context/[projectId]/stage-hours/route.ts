import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { readProjectBundle, resolveProjectStateDirectory } from "@/lib/project-state/share-project-state-handlers";
import {
  ASSIGNMENT_STAGES,
  SWS_STAGE_PROFILES,
  type AssignmentStageId,
  type SwsTypeId,
} from "@/types/d380-assignment-stages";
import { estimateWireTime } from "@/lib/wire-list-print/time-estimation";

export interface SheetTimeBreakdown {
  sheetId: string;
  sheetName: string;
  rowCount: number;
  estimatedMinutes: number;
}

export interface StageHoursEntry {
  stageId: AssignmentStageId;
  label: string;
  shortLabel: string;
  category: string;
  order: number;
  estimatedMinutes: number;
  averageMinutes: number;
  actualMinutes: number;
}

export interface ProjectStageHoursResponse {
  projectId: string;
  totalEstimatedMinutes: number;
  totalAverageMinutes: number;
  totalActualMinutes: number;
  stages: StageHoursEntry[];
  sheets: SheetTimeBreakdown[];
}

function computeSheetWiringMinutes(
  rows: Array<{ gaugeSize?: string; fromDeviceId?: string; toDeviceId?: string; wireNo?: string; wireId?: string }>,
): number {
  let total = 0;
  for (const row of rows) {
    const wireNo = (row.wireNo || "").trim();
    const wireId = (row.wireId || "").trim();
    const gaugeSize = (row.gaugeSize || "").trim();
    if (wireNo === "*" && !wireId && !gaugeSize) continue;

    const est = estimateWireTime(undefined, row.gaugeSize);
    total += est.totalMinutes;
  }
  return total;
}

function computeStageHoursFromWiringTotal(
  wiringMinutes: number,
  swsType: SwsTypeId = "PANEL",
): StageHoursEntry[] {
  const profile = SWS_STAGE_PROFILES[swsType] ?? SWS_STAGE_PROFILES.UNDECIDED;
  const weights = profile.stageWeightPercent;
  const wiringWeight = (weights.WIRING ?? 40) / 100;
  const impliedTotal = wiringWeight > 0 ? wiringMinutes / wiringWeight : wiringMinutes;

  return ASSIGNMENT_STAGES
    .filter((stage) => !stage.isQueue && weights[stage.id] != null)
    .map((stage) => {
      const weight = (weights[stage.id] ?? 0) / 100;
      const estimated = stage.id === "WIRING"
        ? Math.round(wiringMinutes)
        : Math.round(impliedTotal * weight);

      return {
        stageId: stage.id,
        label: stage.label,
        shortLabel: stage.shortLabel,
        category: stage.category,
        order: stage.order,
        estimatedMinutes: estimated,
        averageMinutes: estimated,
        actualMinutes: 0,
      };
    });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  try {
    const bundle = await readProjectBundle(projectId);

    if (!bundle) {
      return NextResponse.json(
        { error: "Project not found", projectId },
        { status: 404 },
      );
    }

    const { manifest, sheetSchemas } = bundle;
    const operationalSchemas = sheetSchemas.filter((schema) => schema.kind === "operational");

    const sheetBreakdowns: SheetTimeBreakdown[] = [];
    let projectWiringMinutes = 0;

    for (const schema of operationalSchemas) {
      const rows = schema.rows ?? [];
      const sheetMinutes = computeSheetWiringMinutes(rows);

      sheetBreakdowns.push({
        sheetId: schema.slug,
        sheetName: schema.name,
        rowCount: rows.length,
        estimatedMinutes: sheetMinutes,
      });

      projectWiringMinutes += sheetMinutes;
    }

    const stages = computeStageHoursFromWiringTotal(projectWiringMinutes, "PANEL");

    const stateDir = await resolveProjectStateDirectory(manifest.id);
    if (stateDir) {
      const actualsFile = path.join(stateDir, "stage-hours-actuals.json");
      try {
        const raw = await fs.readFile(actualsFile, "utf-8");
        const actuals = JSON.parse(raw) as { stages?: Record<string, number> };
        if (actuals.stages) {
          for (const stage of stages) {
            if (actuals.stages[stage.stageId] != null) {
              stage.actualMinutes = actuals.stages[stage.stageId];
            }
          }
        }
      } catch {
        // No saved actuals file yet.
      }
    }

    const response: ProjectStageHoursResponse = {
      projectId: manifest.id,
      totalEstimatedMinutes: stages.reduce((sum, stage) => sum + stage.estimatedMinutes, 0),
      totalAverageMinutes: stages.reduce((sum, stage) => sum + stage.averageMinutes, 0),
      totalActualMinutes: stages.reduce((sum, stage) => sum + stage.actualMinutes, 0),
      stages,
      sheets: sheetBreakdowns,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API] Failed to compute stage hours:", error);
    return NextResponse.json(
      { error: "Failed to compute stage hours", projectId },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  let body: { stages?: Record<string, number> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.stages || typeof body.stages !== "object") {
    return NextResponse.json(
      { error: "Body must include stages: { STAGE_ID: minutes }" },
      { status: 400 },
    );
  }

  const validStageIds = new Set(ASSIGNMENT_STAGES.map((stage) => stage.id));
  for (const [key, value] of Object.entries(body.stages)) {
    if (!validStageIds.has(key as AssignmentStageId)) {
      return NextResponse.json({ error: `Unknown stage: ${key}` }, { status: 400 });
    }
    if (typeof value !== "number" || value < 0) {
      return NextResponse.json(
        { error: `Invalid value for ${key}: must be a non-negative number` },
        { status: 400 },
      );
    }
  }

  try {
    const stateDir = await resolveProjectStateDirectory(projectId);
    if (!stateDir) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const actualsFile = path.join(stateDir, "stage-hours-actuals.json");

    let existing: Record<string, number> = {};
    try {
      const raw = await fs.readFile(actualsFile, "utf-8");
      const data = JSON.parse(raw) as { stages?: Record<string, number> };
      existing = data.stages ?? {};
    } catch {
      // No prior file.
    }

    const merged = { ...existing, ...body.stages };
    const payload = {
      projectId,
      stages: merged,
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(actualsFile, JSON.stringify(payload, null, 2), "utf-8");

    return NextResponse.json({ ok: true, stages: merged });
  } catch (error) {
    console.error("[API] Failed to save stage hours actuals:", error);
    return NextResponse.json(
      { error: "Failed to save stage hours actuals", projectId },
      { status: 500 },
    );
  }
}
