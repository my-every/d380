"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleCheckBig, CircleDashed, Download, FolderOpen, Layers3, Loader2, RefreshCw } from "lucide-react";

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

interface ProjectScheduleDetailsModalProps {
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

export function ProjectScheduleDetailsModal({
  open,
  onOpenChange,
  row,
  currentBadge,
}: ProjectScheduleDetailsModalProps) {
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
      <DialogContent className="h-[88vh] max-w-[95vw] overflow-hidden p-0 sm:max-w-[95vw]" showCloseButton>
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {row?.projectName || "Review complete project schedule details, grouped assignments, exports, and project activity."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[1.6fr_0.9fr]">
            <div className="min-h-0 overflow-y-auto border-r px-5 py-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading project details...
                </div>
              ) : error ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : (
                <Tabs defaultValue="overview" className="gap-4">
                  <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="assignments">Assignments</TabsTrigger>
                    <TabsTrigger value="exports">Exports</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Actual vs Planned Schedule</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{scheduleStepper.completed}/{scheduleStepper.total} milestones reached</Badge>
                          <Badge variant="secondary">{scheduleStepper.percent}% complete</Badge>
                        </div>

                        <div className="space-y-3 md:hidden">
                          {scheduleStepper.milestones.map((step) => (
                            <div key={step.key} className="rounded-lg border p-3">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  {step.isReached ? (
                                    <CircleCheckBig className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <CircleDashed className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <div className="text-sm font-medium">{step.label}</div>
                                </div>
                                <Badge variant={step.isReached ? "default" : "outline"} className="text-[10px]">
                                  {step.isReached ? "Reached" : "Pending"}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                                  <div className="text-[10px] uppercase text-muted-foreground">Planned</div>
                                  <div className="font-medium">
                                    {formatScheduleDisplayDate(step.plannedDate, step.plannedRaw || "-")}
                                  </div>
                                </div>
                                <div className="rounded-md bg-muted/40 px-2 py-1.5">
                                  <div className="text-[10px] uppercase text-muted-foreground">Actual</div>
                                  <div className="font-medium">
                                    {formatScheduleDisplayDate(step.actualDate, step.actualRaw || (step.isReached ? "Reached" : "-"))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="hidden md:block">
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {scheduleStepper.milestones.map((step) => (
                              <div key={step.key} className="rounded-lg border p-3">
                                <div className="mb-2 flex items-center gap-2">
                                  {step.isReached ? (
                                    <CircleCheckBig className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <CircleDashed className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <div className="text-xs font-semibold">{step.label}</div>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Planned:</span>{" "}
                                    {formatScheduleDisplayDate(step.plannedDate, step.plannedRaw || "-")}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Actual:</span>{" "}
                                    {formatScheduleDisplayDate(step.actualDate, step.actualRaw || (step.isReached ? "Reached" : "-"))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                      <Card className="md:col-span-2 xl:col-span-2">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs text-muted-foreground">Completion</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold tabular-nums">{stats.completionPercent}%</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {stats.complete}/{stats.total} assignments complete
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">In Progress</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-semibold tabular-nums">{stats.inProgress}</div></CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pending</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-semibold tabular-nums">{stats.pending}</div></CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Unit Types</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-semibold tabular-nums">{stats.unitTypeCount}</div></CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Due</CardTitle></CardHeader>
                        <CardContent><div className="text-lg font-semibold">{row?.dueLabel || "-"}</div></CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">References</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-semibold tabular-nums">{stats.referenceCount}</div></CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Project Snapshot</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                        <div><span className="text-muted-foreground">Project:</span> {project?.name || row?.projectName || "-"}</div>
                        <div><span className="text-muted-foreground">Project ID:</span> {project?.id || "-"}</div>
                        <div><span className="text-muted-foreground">PD#:</span> {project?.pdNumber || row?.pdNumber || "-"}</div>
                        <div><span className="text-muted-foreground">Unit:</span> {project?.unitNumber || row?.unit || "-"}</div>
                        <div><span className="text-muted-foreground">Legals:</span> {row?.legalsLabel || "-"}</div>
                        <div><span className="text-muted-foreground">Status:</span> {row?.status || "-"}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">References</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {referenceMappings.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            No reference sheets found for this project.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {referenceMappings
                              .slice()
                              .sort((a, b) => a.sheetName.localeCompare(b.sheetName))
                              .map((reference) => (
                                <Badge key={reference.sheetSlug} variant="outline" className="text-xs">
                                  {reference.sheetName}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="assignments" className="space-y-4">
                    {assignmentGroups.length === 0 ? (
                      <Card>
                        <CardContent className="py-6 text-sm text-muted-foreground">
                          No assignment mappings were found for this project.
                        </CardContent>
                      </Card>
                    ) : (
                      <Accordion type="multiple" className="w-full rounded-lg border px-4">
                        {assignmentGroups.map((group) => (
                          <AccordionItem key={group.unitType} value={group.unitType}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex w-full items-center justify-between gap-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{group.unitType}</Badge>
                                  <span className="text-sm text-muted-foreground">{group.assignments.length} assignments</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {group.completeCount}/{group.assignments.length} complete ({group.progressPercent}%)
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <Accordion type="multiple" className="rounded-lg border px-3">
                                {group.assignments.map((assignment) => (
                                  <AccordionItem key={assignment.sheetSlug} value={`${group.unitType}-${assignment.sheetSlug}`}>
                                    <AccordionTrigger className="hover:no-underline">
                                      <div className="flex w-full items-center justify-between gap-2 pr-4">
                                        <div className="min-w-0">
                                          <div className="truncate text-sm font-medium">{assignment.sheetName}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {assignment.rowCount} rows · {assignment.selectedSwsType}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant={getStatusVariant(assignment.selectedStatus)} className="text-[10px]">
                                            {assignment.selectedStatus.replace("_", " ")}
                                          </Badge>
                                          <Badge variant="outline" className="text-[10px]">
                                            {formatStageLabel(assignment.selectedStage)}
                                          </Badge>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      <div className="space-y-2 rounded-md bg-muted/30 p-3">
                                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                          Stage Subgroups
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-3">
                                          {STAGE_SUBGROUPS.map((subgroup) => {
                                            const isActive = subgroup.stages.includes(assignment.selectedStage);
                                            return (
                                              <div
                                                key={`${assignment.sheetSlug}-${subgroup.label}`}
                                                className={cn(
                                                  "rounded-md border px-2 py-1.5 text-xs",
                                                  isActive ? "border-primary bg-primary/5" : "border-border bg-background",
                                                )}
                                              >
                                                <div className="font-medium">{subgroup.label}</div>
                                                <div className="text-muted-foreground">{isActive ? formatStageLabel(assignment.selectedStage) : "-"}</div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                        {assignment.matchedLayoutTitle ? (
                                          <div className="text-xs text-muted-foreground">
                                            Layout Match: {assignment.matchedLayoutTitle}
                                          </div>
                                        ) : null}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </TabsContent>

                  <TabsContent value="exports" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm">Download Project Exports</CardTitle>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-2"
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
                          <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
                            {manifestRefreshMessage}
                          </div>
                        ) : null}

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border p-3">
                            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                              <Layers3 className="h-4 w-4" /> Branding Exports
                            </div>
                            {project?.id && brandingExports?.combinedRelativePath ? (
                              <Button asChild size="sm" className="w-full justify-start gap-2">
                                <a href={buildExportFileUrl(project.id, brandingExports.combinedRelativePath)}>
                                  <Download className="h-3.5 w-3.5" />
                                  Download Combined Branding Workbook
                                </a>
                              </Button>
                            ) : (
                              <p className="text-xs text-muted-foreground">No combined branding export found yet.</p>
                            )}
                          </div>

                          <div className="rounded-lg border p-3">
                            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                              <FolderOpen className="h-4 w-4" /> Wire-List Exports
                            </div>
                            {project?.id && (wireListExports?.sheetExports?.length ?? 0) > 0 ? (
                              <div className="space-y-1">
                                {wireListExports?.sheetExports?.slice(0, 3).map((item) => (
                                  <Button key={item.fileName} asChild size="sm" variant="outline" className="w-full justify-start gap-2">
                                    <a href={buildExportFileUrl(project.id, item.relativePath)}>
                                      <Download className="h-3.5 w-3.5" />
                                      {item.sheetName || item.fileName}
                                    </a>
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No wire-list exports found yet.</p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                          Reserved for additional export workflows (bundled ZIP, publish package, and downstream handoff artifacts).
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>

            <div className="min-h-0 overflow-y-auto px-4 py-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-sm">Project Activity</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-4.5rem)] overflow-y-auto p-0">
                  {!project?.id ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      Activity will appear once a matching project record is resolved.
                    </div>
                  ) : !currentBadge ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
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
      </DialogContent>
    </Dialog>
  );
}
