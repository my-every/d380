"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  FolderOpen,
  Layers3,
  Loader2,
  RefreshCw,
  Target,
} from "lucide-react";

import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { MappedAssignment } from "@/lib/assignment/mapped-assignment";
import type { ActivityEntry } from "@/types/activity";
import type { ProjectManifest } from "@/types/project-manifest";
import type { ProjectScheduleSlotsTableRow } from "@/components/projects/project-schedule-slots";
import { FileCard } from "@/components/projects/file-card";

interface ProjectScheduleDetailsModalAltProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: ProjectScheduleSlotsTableRow | null;
  currentBadge?: string;
}

interface ExportSheetItem {
  fileName: string;
  relativePath: string;
  rowCount?: number;
  sheetName?: string;
}

interface ExportManifest {
  combinedFileName?: string;
  combinedRelativePath?: string;
  sheetExports?: ExportSheetItem[];
}

interface AssignmentUnitGroup {
  unitType: string;
  assignments: MappedAssignment[];
  completeCount: number;
  progressPercent: number;
}

interface ScheduleStepperMilestoneConfig {
  key: string;
  label: string;
  plannedField: string;
  actualAliases?: string[];
}

interface ScheduleStepperMilestone {
  key: string;
  label: string;
  plannedRaw: string;
  plannedDate: Date | null;
  actualRaw: string;
  actualDate: Date | null;
  isReached: boolean;
}

const STAGE_SUBGROUPS: Array<{ label: string; stages: string[] }> = [
  {
    label: "Queued",
    stages: [
      "READY_TO_LAY",
      "READY_TO_WIRE",
      "READY_FOR_VISUAL",
      "READY_TO_HANG",
      "READY_TO_CROSS_WIRE",
      "READY_TO_TEST",
      "READY_FOR_BIQ",
    ],
  },
  {
    label: "In Work",
    stages: ["BUILD_UP", "WIRING", "BOX_BUILD", "CROSS_WIRE", "TEST_1ST_PASS", "BIQ"],
  },
  {
    label: "Complete",
    stages: ["FINISHED_BIQ"],
  },
];

const STEP_MILESTONES: ScheduleStepperMilestoneConfig[] = [
  { key: "LEGALS", label: "LEGALS", plannedField: "LEGALS", actualAliases: ["LEGALS A/C", "LEGALS ACTUAL"] },
  { key: "BRAND_LIST", label: "BRAND LIST", plannedField: "BRAND LIST", actualAliases: ["BRAND LIST A/C", "BRAND LIST ACTUAL"] },
  { key: "BRAND_WIRE", label: "BRAND WIRE", plannedField: "BRAND WIRE", actualAliases: ["BRAND WIRE A/C", "BRAND WIRE ACTUAL"] },
  { key: "PROJ_KITTED", label: "PROJ KITTED", plannedField: "PROJ KITTED", actualAliases: ["PROJ KITTED A/C", "PROJ KITTED ACTUAL"] },
  { key: "CONLAY", label: "CONLAY", plannedField: "CONLAY", actualAliases: ["CONLAY A/C", "CONLAY ACTUAL"] },
  { key: "CONASY", label: "CONASY", plannedField: "CONASY", actualAliases: ["CONASY A/C", "CONASY ACTUAL"] },
  { key: "PWRCHK", label: "PWRCHK", plannedField: "PWRCHK", actualAliases: ["NEW PWRCHK", "PWRCHK ACTUAL"] },
  { key: "D380_FINAL_BIQ", label: "D380 FINAL-BIQ", plannedField: "D380 FINAL-BIQ", actualAliases: ["BIQ COMP", "D380 FINAL-BIQ A/C", "D380 FINAL-BIQ ACTUAL"] },
  { key: "DEPT_380_TARGET", label: "DEPT 380 TARGET", plannedField: "DEPT 380 TARGET", actualAliases: ["DEPT 380 TARGET A/C", "DEPT 380 ACTUAL"] },
];

const STAGE_MILESTONE_INDEX: Record<string, number> = {
  READY_TO_LAY: 4,
  BUILD_UP: 4,
  READY_TO_WIRE: 5,
  WIRING: 5,
  READY_TO_TEST: 6,
  TEST_1ST_PASS: 6,
  READY_FOR_BIQ: 7,
  BIQ: 7,
  FINISHED_BIQ: 8,
};

function normalizeUnitTypeToken(rawValue: string | undefined): string {
  if (!rawValue) return "UNSPECIFIED";
  const match = rawValue.match(/\b(JB\d+)\b/i);
  if (match?.[1]) return match[1].toUpperCase();
  const compact = rawValue.trim();
  return compact ? compact.toUpperCase() : "UNSPECIFIED";
}

function inferAssignmentUnitType(assignment: MappedAssignment, fallback?: string): string {
  const fromLayout = normalizeUnitTypeToken(assignment.matchedLayoutTitle);
  if (fromLayout !== "UNSPECIFIED") return fromLayout;

  const fromName = normalizeUnitTypeToken(assignment.sheetName);
  if (fromName !== "UNSPECIFIED") return fromName;

  return normalizeUnitTypeToken(fallback);
}

function formatStageLabel(stage: string): string {
  return stage
    .toLowerCase()
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function getStatusVariant(status: MappedAssignment["selectedStatus"]): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "COMPLETE":
      return "default";
    case "IN_PROGRESS":
      return "secondary";
    case "INCOMPLETE":
      return "destructive";
    case "NOT_STARTED":
    default:
      return "outline";
  }
}

function buildExportFileUrl(projectId: string, relativePath: string): string {
  const cleaned = relativePath.trim().replace(/^\/+/, "");
  const segments = cleaned.split("/").filter(Boolean);
  const fileSegments = segments[0] === "exports" ? segments.slice(1) : segments;
  const encoded = fileSegments.map((segment) => encodeURIComponent(segment)).join("/");
  return `/api/project-context/${encodeURIComponent(projectId)}/exports/files/${encoded}?download=1`;
}

function parseScheduleDate(rawValue: string | undefined): Date | null {
  if (!rawValue) return null;
  const normalized = rawValue.trim();
  if (!normalized) return null;
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getFullYear() !== year
  ) {
    return null;
  }

  return date;
}

function formatScheduleDisplayDate(date: Date | null, fallback: string): string {
  if (!date) return fallback || "-";
  const month = `${date.getMonth() + 1}`;
  const day = `${date.getDate()}`;
  const year = `${date.getFullYear()}`;
  return `${month}/${day}/${year}`;
}

export function ProjectScheduleDetailsModalAlt({
  open,
  onOpenChange,
  row,
  currentBadge,
}: ProjectScheduleDetailsModalAltProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectManifest | null>(null);
  const [assignments, setAssignments] = useState<MappedAssignment[]>([]);
  const [brandingExports, setBrandingExports] = useState<ExportManifest | null>(null);
  const [wireListExports, setWireListExports] = useState<ExportManifest | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [manifestRefreshing, setManifestRefreshing] = useState(false);
  const [manifestRefreshMessage, setManifestRefreshMessage] = useState<string | null>(null);

  const fallbackUnitType = row?.extraColumns?.["Unit Type"];

  const operationalAssignments = useMemo(
    () => assignments.filter((entry) => entry.sheetKind === "assignment"),
    [assignments],
  );

  const referenceMappings = useMemo(
    () => assignments.filter((entry) => entry.sheetKind === "reference"),
    [assignments],
  );

  const assignmentGroups = useMemo<AssignmentUnitGroup[]>(() => {
    const groupMap = new Map<string, MappedAssignment[]>();

    for (const assignment of operationalAssignments) {
      const unitType = inferAssignmentUnitType(assignment, fallbackUnitType);
      const existing = groupMap.get(unitType);
      if (existing) {
        existing.push(assignment);
      } else {
        groupMap.set(unitType, [assignment]);
      }
    }

    return Array.from(groupMap.entries())
      .map(([unitType, groupedAssignments]) => {
        const completeCount = groupedAssignments.filter((entry) => entry.selectedStatus === "COMPLETE").length;
        return {
          unitType,
          assignments: groupedAssignments.sort((a, b) => a.sheetName.localeCompare(b.sheetName)),
          completeCount,
          progressPercent: groupedAssignments.length
            ? Math.round((completeCount / groupedAssignments.length) * 100)
            : 0,
        };
      })
      .sort((a, b) => a.unitType.localeCompare(b.unitType));
  }, [fallbackUnitType, operationalAssignments]);

  const stats = useMemo(() => {
    const total = operationalAssignments.length;
    const complete = operationalAssignments.filter((entry) => entry.selectedStatus === "COMPLETE").length;
    const inProgress = operationalAssignments.filter((entry) => entry.selectedStatus === "IN_PROGRESS").length;
    const pending = operationalAssignments.filter((entry) => entry.selectedStatus === "NOT_STARTED").length;

    return {
      total,
      complete,
      inProgress,
      pending,
      completionPercent: total ? Math.round((complete / total) * 100) : 0,
      unitTypeCount: assignmentGroups.length,
      referenceCount: referenceMappings.length,
    };
  }, [assignmentGroups.length, operationalAssignments, referenceMappings.length]);

  const scheduleStepper = useMemo(() => {
    const source = row?.extraColumns ?? {};
    const legalsValue = row?.legalsLabel ?? source.LEGALS ?? "";
    const targetValue = row?.dueLabel ?? source["DEPT 380 TARGET"] ?? "";

    const stageIndexFromAssignments = operationalAssignments.reduce((maxIndex, assignment) => {
      const index = STAGE_MILESTONE_INDEX[assignment.selectedStage] ?? -1;
      return Math.max(maxIndex, index);
    }, -1);

    const fallbackStatusIndex = row?.status === "Complete"
      ? STEP_MILESTONES.length - 1
      : row?.status === "In Process"
        ? 5
        : row?.status === "Pending"
          ? 3
          : -1;

    const reachedByProgressIndex = Math.max(stageIndexFromAssignments, fallbackStatusIndex);

    const milestones: ScheduleStepperMilestone[] = STEP_MILESTONES.map((step, index) => {
      const plannedRaw = step.plannedField === "LEGALS"
        ? legalsValue
        : step.plannedField === "DEPT 380 TARGET"
          ? targetValue
          : (source[step.plannedField] ?? "");

      const plannedDate = parseScheduleDate(plannedRaw);
      const actualRaw = [step.label, ...(step.actualAliases ?? [])]
        .map((alias) => source[alias] ?? "")
        .find((value) => value.trim().length > 0) ?? "";
      const actualDate = parseScheduleDate(actualRaw);
      const isReached = Boolean(actualDate) || reachedByProgressIndex >= index;

      return {
        key: step.key,
        label: step.label,
        plannedRaw,
        plannedDate,
        actualRaw,
        actualDate,
        isReached,
      };
    });

    const completed = milestones.filter((step) => step.isReached).length;
    const percent = milestones.length ? Math.round((completed / milestones.length) * 100) : 0;

    return {
      milestones,
      completed,
      percent,
      total: milestones.length,
    };
  }, [operationalAssignments, row]);

  const refreshActivities = useCallback(async () => {
    if (!open || !project?.id || !currentBadge) {
      setActivities([]);
      return;
    }

    setActivitiesLoading(true);
    setActivitiesError(null);

    try {
      const shifts = ["1st", "2nd"];
      const responses = await Promise.all(
        shifts.map((shift) =>
          fetch(
            `/api/activity/${encodeURIComponent(currentBadge)}?shift=${encodeURIComponent(shift)}&projectIds=${encodeURIComponent(project.id)}&limit=150&includeDocument=false`,
            { cache: "no-store" },
          ),
        ),
      );

      const payloads = await Promise.all(
        responses.map(async (response) => {
          if (!response.ok) return { activities: [] as ActivityEntry[] };
          return (await response.json()) as { activities?: ActivityEntry[] };
        }),
      );

      const merged = payloads.flatMap((payload) => payload.activities ?? []);
      const uniqueById = new Map<string, ActivityEntry>();
      for (const activity of merged) {
        uniqueById.set(activity.id, activity);
      }

      const mergedActivities = Array.from(uniqueById.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setActivities(mergedActivities);
    } catch (fetchError) {
      setActivitiesError(fetchError instanceof Error ? fetchError.message : "Failed to load project activity");
    } finally {
      setActivitiesLoading(false);
    }
  }, [currentBadge, open, project?.id]);

  const refreshManifest = useCallback(async () => {
    if (!project?.id) {
      return;
    }

    setManifestRefreshing(true);
    setManifestRefreshMessage(null);

    try {
      const response = await fetch(
        `/api/project-context/${encodeURIComponent(project.id)}/manifest/regenerate`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("Failed to regenerate manifest");
      }

      const payload = (await response.json()) as { manifest?: ProjectManifest };
      if (payload.manifest) {
        setProject(payload.manifest);
      }
      setManifestRefreshMessage("Manifest regenerated successfully.");
    } catch (refreshError) {
      setManifestRefreshMessage(
        refreshError instanceof Error ? refreshError.message : "Failed to regenerate manifest",
      );
    } finally {
      setManifestRefreshing(false);
    }
  }, [project?.id]);

  useEffect(() => {
    if (!open || !row) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setProject(null);
      setAssignments([]);
      setBrandingExports(null);
      setWireListExports(null);

      try {
        const response = await fetch("/api/project-context/projects", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load project manifests");
        }

        const payload = (await response.json()) as { manifests?: ProjectManifest[] };
        const manifests = payload.manifests ?? [];

        const pd = row.pdNumber.trim().toUpperCase();
        const unit = row.unit.trim();
        const projectName = row.projectName.trim().toUpperCase();

        const match =
          manifests.find(
            (manifest) =>
              manifest.pdNumber?.trim().toUpperCase() === pd &&
              (manifest.unitNumber?.trim() ?? "") === unit,
          ) ??
          manifests.find(
            (manifest) =>
              manifest.pdNumber?.trim().toUpperCase() === pd &&
              manifest.name.trim().toUpperCase() === projectName,
          ) ??
          manifests.find((manifest) => manifest.pdNumber?.trim().toUpperCase() === pd) ??
          null;

        if (!match) {
          throw new Error(`No project manifest found for ${row.pdNumber} unit ${row.unit}`);
        }

        if (cancelled) return;
        setProject(match);

        const [assignmentRes, brandingRes, wireRes] = await Promise.all([
          fetch(`/api/project-context/${encodeURIComponent(match.id)}/assignment-mappings`, { cache: "no-store" }),
          fetch(`/api/project-context/${encodeURIComponent(match.id)}/exports?kind=branding`, { cache: "no-store" }).catch(() => null),
          fetch(`/api/project-context/${encodeURIComponent(match.id)}/exports?kind=wire-lists`, { cache: "no-store" }).catch(() => null),
        ]);

        if (assignmentRes.ok) {
          const assignmentPayload = (await assignmentRes.json()) as { mappings?: MappedAssignment[] };
          if (!cancelled) {
            setAssignments(assignmentPayload.mappings ?? []);
          }
        }

        if (brandingRes?.ok) {
          const brandingPayload = (await brandingRes.json()) as ExportManifest;
          if (!cancelled) setBrandingExports(brandingPayload);
        }

        if (wireRes?.ok) {
          const wirePayload = (await wireRes.json()) as ExportManifest;
          if (!cancelled) setWireListExports(wirePayload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load project details");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, row]);

  useEffect(() => {
    void refreshActivities();
  }, [refreshActivities]);

  const title = row
    ? `${row.pdNumber} · Unit ${row.unit}`
    : "Project Details";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] min-w-[96vw] overflow-hidden border-0 bg-card p-0 sm:max-w-[96vw]" showCloseButton>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border  text-foreground shadow-2xl">
          <div className="pointer-events-none absolute inset-0 " />

          <DialogHeader className="relative border-b border-border/90 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground-50">{title}</DialogTitle>
                <DialogDescription className="text-foreground">
                  {row?.projectName || "Alternative project control board"}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="border border-slate-700 /80 text-foreground">
                  <Target className="mr-1 h-3 w-3" /> {stats.completionPercent}% complete
                </Badge>
                <Badge variant="outline" className="border-slate-700 text-foreground">{stats.total} assignments</Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="relative grid min-h-0 flex-1 xl:grid-cols-[1.45fr_0.9fr]">
            <div className="min-h-0 overflow-y-auto border-b border-border px-4 py-4 sm:px-5 xl:border-b-0 xl:border-r">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading project details...
                </div>
              ) : error ? (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : (
                <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList className="h-auto w-full justify-start overflow-x-auto border border-border p-1">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="workboard">Workboard</TabsTrigger>
                    <TabsTrigger value="exports">Exports</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <Card className="">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                          <CalendarDays className="h-4 w-4 text-sky-300" /> Planned vs Actual Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-foreground">
                          <span>{scheduleStepper.completed}/{scheduleStepper.total} milestones reached</span>
                          <span>{scheduleStepper.percent}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full ">
                          <div className="h-full rounded-full bg-linear-to-r from-cyan-400 via-sky-400 to-emerald-400" style={{ width: `${scheduleStepper.percent}%` }} />
                        </div>

                        <div className="space-y-2 md:hidden">
                          {scheduleStepper.milestones.map((step) => (
                            <div key={step.key} className="rounded-lg border border-border  p-3">
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm">
                                  {step.isReached ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4 text-foreground" />}
                                  <span>{step.label}</span>
                                </div>
                                <Badge variant={step.isReached ? "default" : "outline"} className={cn("text-[10px]", !step.isReached && "border-slate-600 text-foreground")}> 
                                  {step.isReached ? "Reached" : "Pending"}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-md  p-2">
                                  <div className="text-[10px] uppercase text-foreground">Planned</div>
                                  <div>{formatScheduleDisplayDate(step.plannedDate, step.plannedRaw || "-")}</div>
                                </div>
                                <div className="rounded-md  p-2">
                                  <div className="text-[10px] uppercase text-foreground">Actual</div>
                                  <div>{formatScheduleDisplayDate(step.actualDate, step.actualRaw || (step.isReached ? "Reached" : "-"))}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="hidden gap-2 overflow-x-auto pb-1 md:flex">
                          {scheduleStepper.milestones.map((step, index) => (
                            <div key={step.key} className="min-w-45 rounded-lg border border-border bg-sky-500 p-3">
                              <div className="mb-2 flex items-center gap-2">
                                <Badge variant="outline" className="border-slate-700 text-foreground">{index + 1}</Badge>
                                <div className="truncate text-xs font-semibold text-foreground">{step.label}</div>
                              </div>
                              <div className="space-y-1 text-xs text-foreground">
                                <div>Plan: {formatScheduleDisplayDate(step.plannedDate, step.plannedRaw || "-")}</div>
                                <div>Actual: {formatScheduleDisplayDate(step.actualDate, step.actualRaw || (step.isReached ? "Reached" : "-"))}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                      <Card className="col-span-2 border-border bg-sky-900/70 xl:col-span-2">
                        <CardHeader className="pb-2"><CardTitle className="text-xs text-foreground">Completion</CardTitle></CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold tabular-nums text-foreground-50">{stats.completionPercent}%</div>
                          <div className="text-xs text-foreground">{stats.complete}/{stats.total} assignments</div>
                        </CardContent>
                      </Card>
                      <Card className="border-border "><CardHeader className="pb-2"><CardTitle className="text-xs text-foreground">In Progress</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums text-foreground-50">{stats.inProgress}</div></CardContent></Card>
                      <Card className="border-border "><CardHeader className="pb-2"><CardTitle className="text-xs text-foreground">Pending</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums text-foreground-50">{stats.pending}</div></CardContent></Card>
                      <Card className="border-border "><CardHeader className="pb-2"><CardTitle className="text-xs text-foreground">Unit Types</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums text-foreground-50">{stats.unitTypeCount}</div></CardContent></Card>
                      <Card className="border-border "><CardHeader className="pb-2"><CardTitle className="text-xs text-foreground">References</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums text-foreground-50">{stats.referenceCount}</div></CardContent></Card>
                    </div>

                    <Card className="border-border ">
                      <CardHeader>
                        <CardTitle className="text-sm text-foreground">Reference Sheets</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {referenceMappings.length === 0 ? (
                          <div className="text-sm text-foreground">No reference sheets found for this project.</div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {referenceMappings
                              .slice()
                              .sort((a, b) => a.sheetName.localeCompare(b.sheetName))
                              .map((reference) => (
                                <Badge key={reference.sheetSlug} variant="outline" className="border-slate-700 text-foreground">
                                  {reference.sheetName}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="workboard" className="space-y-4">
                    {assignmentGroups.length === 0 ? (
                      <Card className="border-border ">
                        <CardContent className="py-6 text-sm text-foreground">No assignment mappings were found for this project.</CardContent>
                      </Card>
                    ) : (
                      <Accordion type="multiple" className="space-y-3">
                        {assignmentGroups.map((group) => (
                          <AccordionItem key={group.unitType} value={group.unitType} className="rounded-xl border border-border  px-4">
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex w-full items-center justify-between gap-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="border-slate-700 text-foreground">{group.unitType}</Badge>
                                  <span className="text-xs text-foreground">{group.assignments.length} assignments</span>
                                </div>
                                <div className="w-36">
                                  <div className="mb-1 flex items-center justify-between text-[11px] text-foreground">
                                    <span>{group.completeCount}/{group.assignments.length}</span>
                                    <span>{group.progressPercent}%</span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full ">
                                    <div className="h-full rounded-full bg-linear-to-r from-sky-500 to-emerald-400" style={{ width: `${group.progressPercent}%` }} />
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pb-2">
                                {group.assignments.map((assignment) => (
                                  <div key={assignment.sheetSlug} className="rounded-lg border border-border  p-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-foreground">{assignment.sheetName}</div>
                                        <div className="text-xs text-foreground">{assignment.rowCount} rows · {assignment.selectedSwsType}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={getStatusVariant(assignment.selectedStatus)} className="text-[10px]">
                                          {assignment.selectedStatus.replace("_", " ")}
                                        </Badge>
                                        <Badge variant="outline" className="border-slate-700 text-[10px] text-foreground">
                                          {formatStageLabel(assignment.selectedStage)}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                      {STAGE_SUBGROUPS.map((subgroup) => {
                                        const isActive = subgroup.stages.includes(assignment.selectedStage);
                                        return (
                                          <div
                                            key={`${assignment.sheetSlug}-${subgroup.label}`}
                                            className={cn(
                                              "rounded-md border px-2 py-1.5 text-xs",
                                              isActive
                                                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-100"
                                                : "border-border  text-foreground",
                                            )}
                                          >
                                            <div className="font-medium">{subgroup.label}</div>
                                            <div>{isActive ? formatStageLabel(assignment.selectedStage) : "-"}</div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </TabsContent>

                  <TabsContent value="exports" className="space-y-4">
                    <Card className="border-border ">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm text-foreground">Delivery Artifacts</CardTitle>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-2 border-slate-700 text-foreground"
                            disabled={!project?.id || manifestRefreshing}
                            onClick={() => void refreshManifest()}
                          >
                            <RefreshCw className={cn("h-3.5 w-3.5", manifestRefreshing && "animate-spin")} />
                            Regenerate Manifest
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {manifestRefreshMessage ? (
                          <div className="rounded-md border border-slate-700 px-3 py-2 text-xs text-foreground">
                            {manifestRefreshMessage}
                          </div>
                        ) : null}

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-border  p-3">
                            <div className="mb-3 flex items-center gap-2 text-sm text-foreground">
                              <Layers3 className="h-4 w-4 text-cyan-300" /> Branding Bundle
                            </div>
                            <div className="mb-3">
                              <FileCard formatFile="xlsx" />
                            </div>
                            {project?.id && brandingExports?.combinedRelativePath ? (
                              <Button asChild size="sm" className="w-full justify-start gap-2">
                                <a href={buildExportFileUrl(project.id, brandingExports.combinedRelativePath)}>
                                  <Download className="h-3.5 w-3.5" />
                                  Download Combined Branding Workbook
                                </a>
                              </Button>
                            ) : (
                              <p className="text-xs text-foreground">No combined branding export found yet.</p>
                            )}
                          </div>

                          <div className="rounded-xl border border-border  p-3">
                            <div className="mb-3 flex items-center gap-2 text-sm text-foreground">
                              <FolderOpen className="h-4 w-4 text-emerald-300" /> Wire-list Files
                            </div>
                            {project?.id && (wireListExports?.sheetExports?.length ?? 0) > 0 ? (
                              <div className="space-y-2">
                                {wireListExports?.sheetExports?.slice(0, 3).map((item) => (
                                  <Button key={item.fileName} asChild size="sm" variant="outline" className="w-full justify-start gap-2 border-slate-700 text-foreground">
                                    <a href={buildExportFileUrl(project.id, item.relativePath)}>
                                      <Download className="h-3.5 w-3.5" />
                                      {item.sheetName || item.fileName}
                                    </a>
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-foreground">No wire-list exports found yet.</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>

            <div className="min-h-0 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="space-y-4">
                <Card className="border-border ">
                  <CardHeader>
                    <CardTitle className="text-sm text-foreground">Project Facts</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm text-foreground sm:grid-cols-2 xl:grid-cols-1">
                    <div><span className="text-foreground">Project:</span> {project?.name || row?.projectName || "-"}</div>
                    <div><span className="text-foreground">Project ID:</span> {project?.id || "-"}</div>
                    <div><span className="text-foreground">PD#:</span> {project?.pdNumber || row?.pdNumber || "-"}</div>
                    <div><span className="text-foreground">Unit:</span> {project?.unitNumber || row?.unit || "-"}</div>
                    <div><span className="text-foreground">Legals:</span> {row?.legalsLabel || "-"}</div>
                    <div><span className="text-foreground">Due:</span> {row?.dueLabel || "-"}</div>
                    <div className="sm:col-span-2 xl:col-span-1"><span className="text-foreground">Status:</span> {row?.status || "-"}</div>
                  </CardContent>
                </Card>

                <Card className="h-[56vh] border-border ">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm text-foreground">
                      <Clock3 className="h-4 w-4 text-sky-300" /> Activity Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-4.5rem)] overflow-y-auto p-0">
                    {!project?.id ? (
                      <div className="px-4 py-3 text-sm text-foreground">
                        Activity will appear once a matching project record is resolved.
                      </div>
                    ) : !currentBadge ? (
                      <div className="px-4 py-3 text-sm text-foreground">
                        Sign-in badge is required to load project-associated activity.
                      </div>
                    ) : (
                      <ActivityTimeline
                        activities={activities}
                        loading={activitiesLoading}
                        error={activitiesError}
                        maxItems={120}
                        compact={false}
                        showStats
                        allowFiltering
                        allowSearch
                        showComments={false}
                        showNestedActivities
                        onRefresh={refreshActivities}
                        currentBadge={currentBadge}
                        className="p-0"
                        containerClassName="p-4"
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
