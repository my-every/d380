"use client";

/**
 * DashboardProjectAside
 *
 * Comprehensive aside panel for project details with four tabs:
 *   - Overview: Project metadata, lifecycle gate progress, stats
 *   - Legals: Upload flow when no legals, revision history when uploaded
 *   - Assignments: Table of assignments with approval workflow for branding
 *   - Settings: Editable project fields (name, PD#, dates, LWC type, etc.)
 */

import Link from "next/link";
import { useMemo, useState, useCallback, useEffect } from "react";
import {
    FileSpreadsheet,
    Layers,
    Calendar,
    ExternalLink,
    Hash,
    BookOpen,
    Upload,
    CheckCircle2,
    Clock,
    Lock,
    Tag,
    Check,
    FileText,
    ClipboardList,
    Activity,
    Timer,
    ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import AnimatedTabs from "@/components/ui/animated-tabs";
import { LWC_TYPE_REGISTRY, type LwcType } from "@/lib/workbook/types";
import { useProjectContext } from "@/contexts/project-context";
import type { ProjectManifest } from "@/types/project-manifest";
import { cn } from "@/lib/utils";
import {
    PROJECT_LIFECYCLE_GATES,
    ASSIGNMENT_STAGES,
    STAGE_DISPLAY_CONFIG,
    type ProjectLifecycleGateStatus,
    type AssignmentStageId,
} from "@/types/d380-assignment-stages";
import {
    PdNumberField,
    UnitNumberField,
    RevisionField,
    LwcTypeField,
    DateField,
} from "@/components/projects/fields";
import { ProjectUploadFlow } from "@/components/projects/project-upload-flow";

// ============================================================================
// Types
// ============================================================================

export interface DashboardProjectAsideProps {
    project: ProjectManifest;
}

// ============================================================================
// Constants
// ============================================================================

const GATE_COLORS: Record<ProjectLifecycleGateStatus, { dot: string; bg: string; text: string }> = {
    LOCKED: { dot: "bg-slate-400", bg: "bg-slate-50 dark:bg-slate-900/40", text: "text-slate-500" },
    READY: { dot: "bg-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600" },
    COMPLETE: { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600" },
};

const GATE_ICONS: Record<ProjectLifecycleGateStatus, React.ElementType> = {
    LOCKED: Lock,
    READY: Clock,
    COMPLETE: CheckCircle2,
};

const TABS = [
    { id: "overview", label: "Overview" },
    { id: "legals", label: "Legals" },
    { id: "assignments", label: "Assignments" },
    { id: "settings", label: "Settings" },
];

// ============================================================================
// Main Component
// ============================================================================

export function DashboardProjectAside({ project }: DashboardProjectAsideProps) {
    const [activeTab, setActiveTab] = useState("overview");
    const model = project;
    const projectColor = model.color || "#D4A84B";

    const hasLegals = model.sheets.length > 0;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-4 pt-4 pb-2">
                <div className="flex items-center gap-2.5">
                    <div
                        className="rounded-md p-2 shrink-0 flex items-center justify-center shadow-sm"
                        style={{
                            backgroundColor: `${projectColor}15`,
                            border: `1px solid ${projectColor}30`,
                        }}
                    >
                        <FileSpreadsheet className="h-5 w-5" style={{ color: projectColor }} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold truncate">{project.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                            {model.pdNumber && <span className="font-mono">{model.pdNumber}</span>}
                            {model.pdNumber && model.unitNumber && " / "}
                            {model.unitNumber && <span>Unit {model.unitNumber}</span>}
                            {!model.pdNumber && !model.unitNumber && project.filename}
                        </p>
                    </div>
                    {model.status && (
                        <StatusBadge status={model.status} />
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="px-3 pt-1 shrink-0">
                <AnimatedTabs
                    tabs={TABS}
                    activeTab={activeTab}
                    onChange={setActiveTab}
                    variant="underline"
                    layoutId="dash-project-aside-tabs"
                />
            </div>

            {/* Tab Content */}
            <ScrollArea className="flex-1">
                <div className="px-4 pb-4 pt-3">
                    {activeTab === "overview" && (
                        <OverviewTab project={project} projectColor={projectColor} />
                    )}
                    {activeTab === "legals" && (
                        <LegalsTab project={project} projectColor={projectColor} />
                    )}
                    {activeTab === "assignments" && (
                        <AssignmentsTab project={project} projectColor={projectColor} hasLegals={hasLegals} />
                    )}
                    {activeTab === "settings" && (
                        <SettingsTab project={project} />
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

// ============================================================================
// Status Badge
// ============================================================================

function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
        legals_pending: { label: "Legals Pending", variant: "outline", className: "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30" },
        brandlist: { label: "BrandList", variant: "outline", className: "text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/30" },
        branding: { label: "Branding", variant: "outline", className: "text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950/30" },
        kitting: { label: "Kitting", variant: "outline", className: "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30" },
        active: { label: "Active", variant: "outline", className: "text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30" },
        blocked: { label: "Blocked", variant: "destructive" },
        completed: { label: "Completed", variant: "outline", className: "text-emerald-700 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" },
        shipped: { label: "Shipped", variant: "secondary" },
    };
    const c = config[status] ?? { label: status, variant: "secondary" as const };
    return (
        <Badge variant={c.variant} className={cn("text-[10px] px-1.5 h-5 shrink-0", c.className)}>
            {c.label}
        </Badge>
    );
}

// ============================================================================
// Overview Tab
// ============================================================================

function OverviewTab({ project, projectColor }: { project: ProjectManifest; projectColor: string }) {
    const model = project;
    const lwcConfig = model.lwcType ? LWC_TYPE_REGISTRY[model.lwcType] : null;
    const operationalSheets = model.sheets.filter(s => s.kind === "operational");
    const referenceSheets = model.sheets.filter(s => s.kind === "reference");
    const totalRows = model.sheets.reduce((sum, s) => sum + s.rowCount, 0);

    // Derive status when not explicitly set
    const derivedStatus = useMemo(() => {
        if (model.status) return model.status;
        // If sheets exist, the project has legals — derive from lifecycle gates
        if (model.sheets.length > 0) {
            const gates = model.lifecycleGates ?? [];
            const legalsGate = gates.find(g => g.gateId === "LEGALS_READY");
            const brandlistGate = gates.find(g => g.gateId === "BRANDLIST_COMPLETE");
            const brandingGate = gates.find(g => g.gateId === "BRANDING_READY");
            const kittingGate = gates.find(g => g.gateId === "KITTING_READY");

            if (kittingGate?.status === "COMPLETE") return "active";
            if (brandingGate?.status === "COMPLETE") return "kitting";
            if (brandlistGate?.status === "COMPLETE") return "branding";
            if (legalsGate?.status === "COMPLETE") return "brandlist";
            // Sheets uploaded but no gates completed yet → brandlist phase
            return "brandlist";
        }
        return "legals_pending";
    }, [model.status, model.sheets, model.lifecycleGates]);

    const gates = model.lifecycleGates ?? [];
    const gateProgress = gates.length > 0
        ? gates.filter(g => g.status === "COMPLETE").length / gates.length
        : 0;

    // Fetch production stage hours from API
    const [stageHours, setStageHours] = useState<{
        stages: { stageId: string; label: string; estimatedMinutes: number; averageMinutes: number; actualMinutes: number }[];
        sheets: { sheetId: string; sheetName: string; rowCount: number; estimatedMinutes: number }[];
        totalEstimatedMinutes: number;
        totalAverageMinutes: number;
        totalActualMinutes: number;
    } | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/project-context/${project.id}/stage-hours`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (!cancelled && data) setStageHours(data); })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [project.id]);

    // Derive the "current stage" for each operational sheet from project status.
    // Until real per-assignment stage data is stored, we derive from project status.
    const projectStageId = useMemo<AssignmentStageId | null>(() => {
        switch (model.status) {
            case "active": return "READY_TO_LAY";
            case "kitting": return "READY_TO_LAY";
            default: return null;
        }
    }, [model.status]);

    // Group operational sheets by stage — for now all sheets share the project-level stage.
    // When real per-assignment stage data is available, this will group by each sheet's stage.
    const stageGroups = useMemo(() => {
        if (operationalSheets.length === 0) return [];

        const groups: { stageId: AssignmentStageId; label: string; shortLabel: string; color: string; sheets: typeof operationalSheets }[] = [];

        if (projectStageId) {
            // All assignments at the same derived stage
            const cfg = STAGE_DISPLAY_CONFIG[projectStageId];
            groups.push({
                stageId: projectStageId,
                label: cfg.label,
                shortLabel: cfg.shortLabel,
                color: cfg.color,
                sheets: operationalSheets,
            });
        } else {
            // Pre-active: show all as "Pending"
            groups.push({
                stageId: "READY_TO_LAY" as AssignmentStageId,
                label: "Pending",
                shortLabel: "Pending",
                color: "slate",
                sheets: operationalSheets,
            });
        }

        return groups;
    }, [operationalSheets, projectStageId]);

    return (
        <div className="flex flex-col gap-3">
            {/* Current Status Card */}
            <CurrentStatusCard status={derivedStatus} projectColor={projectColor} />

            {/* Lifecycle Gate Progress */}
            {gates.length > 0 && (
                <Collapsible defaultOpen className="rounded-lg border border-border/50 bg-card/60 p-3">
                    <CollapsibleTrigger className="flex items-center justify-between w-full group">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Lifecycle Gates
                        </h4>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="space-y-2 mt-2.5">
                            {PROJECT_LIFECYCLE_GATES.map(gateDef => {
                                const gateState = gates.find(g => g.gateId === gateDef.id);
                                const status: ProjectLifecycleGateStatus = gateState?.status ?? "LOCKED";
                                const colors = GATE_COLORS[status];
                                const Icon = GATE_ICONS[status];

                                return (
                                    <div
                                        key={gateDef.id}
                                        className={cn(
                                            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors",
                                            colors.bg,
                                        )}
                                    >
                                        <Icon className={cn("h-3.5 w-3.5 shrink-0", colors.text)} />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-medium">{gateDef.label}</span>
                                        </div>
                                        <Badge variant="outline" className={cn("text-[9px] px-1.5 h-4", colors.text)}>
                                            {status}
                                        </Badge>
                                        {gateState?.targetDate && (
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                {new Date(gateState.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2.5">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                <span>Gate Progress</span>
                                <span className="font-medium">{Math.round(gateProgress * 100)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${gateProgress * 100}%` }}
                                />
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
                <StatItem icon={Layers} label="Sheets" value={String(model.sheets.length)} />
                <StatItem icon={FileSpreadsheet} label="Active" value={String(operationalSheets.length)} color={projectColor} />
                <StatItem icon={BookOpen} label="Reference" value={String(referenceSheets.length)} />
                <StatItem icon={Hash} label="Total Rows" value={totalRows.toLocaleString()} />
            </div>

            {/* Assignments by Stage */}
            {operationalSheets.length > 0 && (
                <Collapsible defaultOpen className="rounded-lg border border-border/50 bg-card/60 p-3">
                    <CollapsibleTrigger className="flex items-center justify-between w-full group">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Assignments by Stage
                        </h4>
                        <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {operationalSheets.length}
                            </Badge>
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="space-y-3 mt-2.5">
                            {stageGroups.map(group => (
                                <div key={group.stageId}>
                                    {/* Stage header */}
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <StageDot color={group.color} />
                                        <span className="text-[11px] font-semibold">{group.label}</span>
                                        <Badge variant="outline" className="text-[9px] px-1 h-3.5 ml-auto">
                                            {group.sheets.length}
                                        </Badge>
                                    </div>

                                    {/* Sheet rows */}
                                    <div className="rounded-md border border-border/30 overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-muted/40">
                                                    <th className="px-2 py-1 text-left font-medium text-muted-foreground">Sheet</th>
                                                    <th className="px-2 py-1 text-right font-medium text-muted-foreground">Rows</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/20">
                                                {group.sheets.map(sheet => (
                                                    <tr key={sheet.id} className="hover:bg-muted/20 transition-colors">
                                                        <td className="px-2 py-1.5">
                                                            <span className="font-medium truncate block max-w-[180px]" title={sheet.name}>
                                                                {sheet.name}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                                            {sheet.rowCount}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )}

            {/* Production Hours */}
            {stageHours && (stageHours.sheets.length > 0 || stageHours.stages.length > 0) && (
                <Collapsible defaultOpen className="rounded-lg border border-border/50 bg-card/60 p-3">
                    <CollapsibleTrigger className="flex items-center gap-1.5 w-full group">
                        <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Production Hours
                        </h4>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">
                            Est. {formatMinutes(stageHours.totalEstimatedMinutes)} ({formatMinutesToDays(stageHours.totalEstimatedMinutes)})
                        </Badge>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>

                        {/* Per-Sheet Wiring Estimates */}
                        {stageHours.sheets.length > 0 && (
                            <div className="mb-2.5 mt-2.5">
                                <h5 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                                    Wiring Est. by Sheet
                                </h5>
                                <div className="rounded-md border border-border/30 overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-muted/40">
                                                <th className="px-2 py-1 text-left font-medium text-muted-foreground">Sheet</th>
                                                <th className="px-2 py-1 text-right font-medium text-muted-foreground">Rows</th>
                                                <th className="px-2 py-1 text-right font-medium text-muted-foreground">Est. Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/20">
                                            {stageHours.sheets.map(sheet => (
                                                <tr key={sheet.sheetId} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-2 py-1.5">
                                                        <span className="font-medium truncate block max-w-[180px]" title={sheet.sheetName}>
                                                            {sheet.sheetName}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                                        {sheet.rowCount}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                                        {formatMinutes(sheet.estimatedMinutes)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-muted/30 font-semibold">
                                                <td className="px-2 py-1.5">Total Wiring</td>
                                                <td className="px-2 py-1.5 text-right tabular-nums">
                                                    {stageHours.sheets.reduce((s, sh) => s + sh.rowCount, 0)}
                                                </td>
                                                <td className="px-2 py-1.5 text-right tabular-nums">
                                                    {formatMinutes(stageHours.sheets.reduce((s, sh) => s + sh.estimatedMinutes, 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Stage Breakdown */}
                        {stageHours.stages.length > 0 && (
                            <div>
                                <h5 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                                    Est. by Stage
                                </h5>
                                <div className="rounded-md border border-border/30 overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-muted/40">
                                                <th className="px-2 py-1 text-left font-medium text-muted-foreground">Stage</th>
                                                <th className="px-2 py-1 text-right font-medium text-muted-foreground">Estimated</th>
                                                <th className="px-2 py-1 text-right font-medium text-muted-foreground">Average</th>
                                                <th className="px-2 py-1 text-right font-medium text-muted-foreground">Actual</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/20">
                                            {stageHours.stages.map(entry => (
                                                <tr key={entry.stageId} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-2 py-1.5 font-medium">{entry.label}</td>
                                                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                                        {formatMinutes(entry.estimatedMinutes)}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                                        {formatMinutes(entry.averageMinutes)}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                                        {formatMinutes(entry.actualMinutes)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-muted/30 font-semibold">
                                                <td className="px-2 py-1.5">Total</td>
                                                <td className="px-2 py-1.5 text-right tabular-nums">
                                                    {formatMinutes(stageHours.totalEstimatedMinutes)}
                                                </td>
                                                <td className="px-2 py-1.5 text-right tabular-nums">
                                                    {formatMinutes(stageHours.totalAverageMinutes)}
                                                </td>
                                                <td className="px-2 py-1.5 text-right tabular-nums">
                                                    {formatMinutes(stageHours.totalActualMinutes)}
                                                </td>
                                            </tr>
                                            <tr className="bg-muted/20 text-muted-foreground">
                                                <td className="px-2 py-1 text-[10px]">Days (8h)</td>
                                                <td className="px-2 py-1 text-right tabular-nums text-[10px]">
                                                    {formatMinutesToDays(stageHours.totalEstimatedMinutes)}
                                                </td>
                                                <td className="px-2 py-1 text-right tabular-nums text-[10px]">
                                                    {formatMinutesToDays(stageHours.totalAverageMinutes)}
                                                </td>
                                                <td className="px-2 py-1 text-right tabular-nums text-[10px]">
                                                    {formatMinutesToDays(stageHours.totalActualMinutes)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </CollapsibleContent>
                </Collapsible>
            )}

            {/* Metadata */}
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                {lwcConfig && (
                    <MetaRow label="LWC Type">
                        <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: lwcConfig.dotColor }} />
                            <span className="text-xs font-medium">{lwcConfig.label}</span>
                        </div>
                    </MetaRow>
                )}
                {model.revision && (
                    <MetaRow label="Revision">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                            Rev {model.revision}
                        </Badge>
                    </MetaRow>
                )}
                <MetaRow label="Created">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 opacity-60" />
                        {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                </MetaRow>
                {model.dueDate && (
                    <MetaRow label="Due Date">
                        <span className="text-xs font-medium">
                            {new Date(model.dueDate).toLocaleDateString()}
                        </span>
                    </MetaRow>
                )}
                {model.planConlayDate && (
                    <MetaRow label="Plan ConLay">
                        <span className="text-xs text-muted-foreground">
                            {new Date(model.planConlayDate).toLocaleDateString()}
                        </span>
                    </MetaRow>
                )}
                {model.planConassyDate && (
                    <MetaRow label="Plan ConAssy">
                        <span className="text-xs text-muted-foreground">
                            {new Date(model.planConassyDate).toLocaleDateString()}
                        </span>
                    </MetaRow>
                )}
                {model.shipDate && (
                    <MetaRow label="Ship Date">
                        <span className="text-xs text-muted-foreground">
                            {new Date(model.shipDate).toLocaleDateString()}
                        </span>
                    </MetaRow>
                )}
                {model.estimatedTotalHours != null && (
                    <MetaRow label="Est. Hours">
                        <span className="text-xs font-medium tabular-nums">
                            {model.estimatedTotalHours.toFixed(1)}h
                        </span>
                    </MetaRow>
                )}
                {model.estimatedPanelCount != null && (
                    <MetaRow label="Panels">
                        <span className="text-xs font-medium tabular-nums">
                            {model.estimatedPanelCount}
                        </span>
                    </MetaRow>
                )}
            </div>

            {/* Open link */}
            <Button variant="outline" size="sm" className="w-full gap-2 mt-1" asChild>
                <Link href={`/projects/${project.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Project
                </Link>
            </Button>
        </div>
    );
}

// ============================================================================
// Legals Tab
// ============================================================================

function LegalsTab({ project, projectColor }: { project: ProjectManifest; projectColor: string }) {
    const model = project;
    const hasLegals = model.sheets.length > 0;
    const [showUploadFlow, setShowUploadFlow] = useState(false);

    // Check for layout PDF existence from the layout-pdf state file
    const [layoutPageCount, setLayoutPageCount] = useState<number | null>(null);
    useEffect(() => {
        let cancelled = false;
        fetch(`/api/project-context/${encodeURIComponent(project.id)}/layout-pdf`, { cache: "no-store" })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (!cancelled && data?.pdf?.totalSheets) {
                    setLayoutPageCount(data.pdf.totalSheets);
                }
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [project.id]);

    // Legals slot date from lifecycle gates
    const legalsGate = model.lifecycleGates?.find(g => g.gateId === "LEGALS_READY");
    const legalsSlotDate = legalsGate?.targetDate;
    // If legals are already uploaded but no gate status is explicitly set, treat as READY (unlocked)
    const legalsStatus: ProjectLifecycleGateStatus = legalsGate?.status
        ?? (hasLegals ? "READY" : "LOCKED");

    // Current revision upload timestamp — use project createdAt as the upload moment
    const currentRevisionDate = new Date(project.createdAt);

    // Group revisions from available data
    const revisionPairs = useMemo(() => {
        if (!hasLegals) return [];

        const currentRev = model.revision || "A";
        const createdDate = new Date(project.createdAt).toLocaleDateString();

        const pairs: {
            id: string;
            revision: string;
            date: string;
            isCurrent: boolean;
            wireListFile: string | null;
            layoutFile: string | null;
            sheetCount: number;
        }[] = [];

        pairs.push({
            id: "rev-current",
            revision: currentRev,
            date: createdDate,
            isCurrent: true,
            wireListFile: model.filename,
            layoutFile: (model.activeLayoutRevisionId || layoutPageCount)
                ? `${model.pdNumber || project.name}_LAY_${currentRev}.pdf`
                : null,
            sheetCount: model.sheets.length,
        });

        return pairs;
    }, [hasLegals, model, project, layoutPageCount]);

    if (showUploadFlow) {
        return (
            <div className="flex flex-col gap-3 -mx-1">
                <ProjectUploadFlow
                    mode="revision"
                    projectId={project.id}
                    initialProjectName={project.name}
                    initialPdNumber={model.pdNumber}
                    initialUnitNumber={model.unitNumber}
                    initialRevision={model.revision}
                    initialLwcType={model.lwcType}
                    initialDueDate={model.dueDate instanceof Date ? model.dueDate : model.dueDate ? new Date(model.dueDate) : undefined}
                    onCancel={() => setShowUploadFlow(false)}
                    onClose={() => setShowUploadFlow(false)}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Legals slot date */}
            <div className="rounded-lg border border-border/50 bg-card/60 p-3">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Legals Gate
                    </h4>
                    <Badge
                        variant="outline"
                        className={cn("text-[9px] px-1.5 h-4", GATE_COLORS[legalsStatus].text)}
                    >
                        {legalsStatus}
                    </Badge>
                </div>
                <div className="space-y-1.5">
                    <MetaRow label="Slot Date">
                        {legalsSlotDate ? (
                            <span className="text-xs font-medium">
                                {new Date(legalsSlotDate).toLocaleDateString()}
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground italic">Not specified</span>
                        )}
                    </MetaRow>
                    {legalsGate?.completedAt && (
                        <MetaRow label="Completed">
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {new Date(legalsGate.completedAt).toLocaleDateString()}
                            </span>
                        </MetaRow>
                    )}
                    {hasLegals && (
                        <MetaRow label="Current">
                            <span className="text-xs font-medium tabular-nums">
                                {currentRevisionDate.toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                })}
                            </span>
                        </MetaRow>
                    )}
                </div>
            </div>

            {!hasLegals ? (
                /* No legals uploaded — show upload prompt */
                <div className="flex flex-col items-center gap-4 py-6">
                    <div className="rounded-full p-4 bg-muted/60">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center max-w-[240px]">
                        <p className="text-sm font-medium">No Legals Uploaded</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Upload the UCP wire list workbook and layout PDF to begin assignment mapping.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setShowUploadFlow(true)}
                    >
                        <Upload className="h-3.5 w-3.5" />
                        Upload Legals
                    </Button>
                </div>
            ) : (
                /* Legals uploaded — show revision history */
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Revisions
                        </h4>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setShowUploadFlow(true)}
                        >
                            <Upload className="h-3 w-3" />
                            New Revision
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {revisionPairs.map(rev => (
                            <div
                                key={rev.id}
                                className={cn(
                                    "rounded-lg border p-3 space-y-2",
                                    rev.isCurrent
                                        ? "border-primary/30 bg-primary/5"
                                        : "border-border/50 bg-card/40",
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] px-1.5 h-4 font-mono"
                                            style={{
                                                borderColor: rev.isCurrent ? `${projectColor}40` : undefined,
                                                color: rev.isCurrent ? projectColor : undefined,
                                            }}
                                        >
                                            Rev {rev.revision}
                                        </Badge>
                                        {rev.isCurrent && (
                                            <Badge variant="secondary" className="text-[9px] px-1 h-4">
                                                Current
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{rev.date}</span>
                                </div>

                                <div className="space-y-1">
                                    {rev.wireListFile && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                            <span className="truncate text-muted-foreground">{rev.wireListFile}</span>
                                        </div>
                                    )}
                                    {rev.layoutFile ? (
                                        <div className="flex items-center gap-2 text-xs">
                                            <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                            <span className="truncate text-muted-foreground">{rev.layoutFile}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs">
                                            <FileText className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                                            <span className="truncate text-muted-foreground italic">No layout PDF</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                                    <span>{rev.sheetCount} sheets</span>
                                    {layoutPageCount && <span>{layoutPageCount} layout pages</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Assignments Tab
// ============================================================================

interface AssignmentEntry {
    id: string;
    sheetName: string;
    swsType: string;
    rowCount: number;
}

function AssignmentsTab({
    project,
    projectColor,
    hasLegals,
}: {
    project: ProjectManifest;
    projectColor: string;
    hasLegals: boolean;
}) {
    const { saveProject } = useProjectContext();
    const model = project;

    const assignments = useMemo<AssignmentEntry[]>(() => {
        return model.sheets
            .filter(s => s.kind === "operational")
            .map(sheet => ({
                id: sheet.id,
                sheetName: sheet.name,
                swsType: "PANEL",
                rowCount: sheet.rowCount,
            }));
    }, [model.sheets]);

    const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

    const allApproved = assignments.length > 0 && approvedIds.size === assignments.length;
    const approvedCount = approvedIds.size;

    const toggleApproval = useCallback((id: string) => {
        setApprovedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const approveAll = useCallback(() => {
        setApprovedIds(new Set(assignments.map(a => a.id)));
    }, [assignments]);

    const handleMoveToBranding = useCallback(() => {
        if (!allApproved) return;

        const updatedManifest: ProjectManifest = {
            ...model,
            status: "branding",
            lifecycleGates: model.lifecycleGates?.map(gate => {
                if (gate.gateId === "LEGALS_READY") {
                    return { ...gate, status: "COMPLETE" as const, completedAt: new Date().toISOString() };
                }
                if (gate.gateId === "BRANDLIST_COMPLETE") {
                    return { ...gate, status: "READY" as const };
                }
                return gate;
            }),
        };

        saveProject(updatedManifest);
    }, [allApproved, model, saveProject]);

    if (!hasLegals) {
        return (
            <div className="flex flex-col items-center gap-3 py-8">
                <div className="rounded-full p-3 bg-muted/60">
                    <ClipboardList className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center max-w-[220px]">
                    <p className="text-sm font-medium">Legals Required</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Upload the UCP wire list and layout PDF first. Assignments are derived from the uploaded legals.
                    </p>
                </div>
            </div>
        );
    }

    if (assignments.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 py-8">
                <div className="rounded-full p-3 bg-muted/60">
                    <Layers className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No operational sheets found</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Assignments
                    </h4>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {approvedCount}/{assignments.length}
                    </Badge>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={approveAll}
                    disabled={allApproved}
                >
                    Approve All
                </Button>
            </div>

            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-500",
                        allApproved ? "bg-emerald-500" : "bg-blue-500",
                    )}
                    style={{ width: `${assignments.length > 0 ? (approvedCount / assignments.length) * 100 : 0}%` }}
                />
            </div>

            <div className="rounded-lg border border-border/50 overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-muted/50">
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">
                                <span className="sr-only">Approve</span>
                            </th>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Assignment</th>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">SWS</th>
                            <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Rows</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {assignments.map(assignment => {
                            const isApproved = approvedIds.has(assignment.id);
                            return (
                                <tr
                                    key={assignment.id}
                                    className={cn(
                                        "transition-colors",
                                        isApproved
                                            ? "bg-emerald-50/50 dark:bg-emerald-950/10"
                                            : "hover:bg-muted/30",
                                    )}
                                >
                                    <td className="px-2 py-1.5">
                                        <Checkbox
                                            checked={isApproved}
                                            onCheckedChange={() => toggleApproval(assignment.id)}
                                            className="h-3.5 w-3.5"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <span className="font-medium truncate block max-w-[140px]" title={assignment.sheetName}>
                                            {assignment.sheetName}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <Badge variant="outline" className="text-[9px] px-1 h-4">
                                            {assignment.swsType}
                                        </Badge>
                                    </td>
                                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                        {assignment.rowCount}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {allApproved && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-3">
                    <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                All assignments approved for branding
                            </p>
                            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-500/80 mt-0.5">
                                Moving to branding will update the project status and lifecycle gates.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        className="w-full mt-2.5 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleMoveToBranding}
                    >
                        <Tag className="h-3.5 w-3.5" />
                        Move to Branding
                    </Button>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Settings Tab
// ============================================================================

function SettingsTab({ project }: { project: ProjectManifest }) {
    const { saveProject } = useProjectContext();
    const model = project;

    const [name, setName] = useState(model.name);
    const [pdNumber, setPdNumber] = useState(model.pdNumber || "");
    const [unitNumber, setUnitNumber] = useState(model.unitNumber || "");
    const [revision, setRevision] = useState(model.revision || "");
    const [lwcType, setLwcType] = useState<LwcType | undefined>(model.lwcType);
    const [dueDate, setDueDate] = useState<Date | undefined>(
        model.dueDate ? new Date(model.dueDate) : undefined,
    );
    const [planConlayDate, setPlanConlayDate] = useState<Date | undefined>(
        model.planConlayDate ? new Date(model.planConlayDate) : undefined,
    );
    const [planConassyDate, setPlanConassyDate] = useState<Date | undefined>(
        model.planConassyDate ? new Date(model.planConassyDate) : undefined,
    );
    const [shipDate, setShipDate] = useState<Date | undefined>(
        model.shipDate ? new Date(model.shipDate) : undefined,
    );
    const [color, setColor] = useState(model.color || "#D4A84B");
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    const markDirty = useCallback(() => setDirty(true), []);

    const handleSave = useCallback(() => {
        setSaving(true);

        const updatedManifest: ProjectManifest = {
            ...model,
            name: name.trim() || model.name,
            pdNumber: pdNumber.trim() || undefined,
            unitNumber: unitNumber.trim() || undefined,
            revision: revision.trim() || undefined,
            lwcType,
            dueDate,
            planConlayDate,
            planConassyDate,
            shipDate,
            color,
        };

        saveProject(updatedManifest);

        setTimeout(() => {
            setSaving(false);
            setDirty(false);
        }, 300);
    }, [model, name, pdNumber, unitNumber, revision, lwcType, dueDate, planConlayDate, planConassyDate, shipDate, color, saveProject]);

    return (
        <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Project Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); markDirty(); }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
            </div>

            <PdNumberField
                mode="create"
                value={pdNumber}
                onChange={(v) => { setPdNumber(v); markDirty(); }}
                label="PD Number"
            />

            <UnitNumberField
                mode="create"
                value={unitNumber}
                onChange={(v) => { setUnitNumber(v); markDirty(); }}
                label="Unit Number"
            />

            <RevisionField
                mode="create"
                value={revision}
                onChange={(v) => { setRevision(v); markDirty(); }}
                label="Revision"
            />

            <LwcTypeField
                mode="create"
                value={lwcType}
                onChange={(v) => { setLwcType(v); markDirty(); }}
                label="LWC Type"
            />

            <Separator className="my-1" />

            <DateField
                mode="create"
                value={dueDate}
                onChange={(v) => { setDueDate(v); markDirty(); }}
                label="Due Date"
            />
            <DateField
                mode="create"
                value={planConlayDate}
                onChange={(v) => { setPlanConlayDate(v); markDirty(); }}
                label="Plan ConLay Date"
            />
            <DateField
                mode="create"
                value={planConassyDate}
                onChange={(v) => { setPlanConassyDate(v); markDirty(); }}
                label="Plan ConAssy Date"
            />
            <DateField
                mode="create"
                value={shipDate}
                onChange={(v) => { setShipDate(v); markDirty(); }}
                label="Ship Date"
            />

            <Separator className="my-1" />

            <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Project Color</label>
                <div className="flex flex-wrap gap-1.5">
                    {[
                        "#D4A84B", "#3B82F6", "#10B981", "#8B5CF6",
                        "#F59E0B", "#EF4444", "#06B6D4", "#F97316",
                        "#EC4899", "#6366F1", "#14B8A6", "#84CC16",
                    ].map(c => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => { setColor(c); markDirty(); }}
                            className={cn(
                                "h-7 w-7 rounded-md border-2 transition-all",
                                color === c
                                    ? "border-foreground scale-110 shadow-sm"
                                    : "border-transparent hover:border-border",
                            )}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <Button
                size="sm"
                className="w-full gap-1.5 mt-2"
                disabled={!dirty || saving}
                onClick={handleSave}
            >
                {saving ? (
                    <>
                        <Clock className="h-3.5 w-3.5 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Check className="h-3.5 w-3.5" />
                        Save Changes
                    </>
                )}
            </Button>
        </div>
    );
}

// ============================================================================
// Shared Sub-components
// ============================================================================

function StatItem({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color?: string }) {
    return (
        <div className="rounded-lg border border-border/50 bg-card/60 p-2.5 flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" style={color ? { color } : undefined} />
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold tabular-nums">{value}</p>
            </div>
        </div>
    );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}

function formatMinutes(minutes: number): string {
    if (minutes === 0) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

/** Convert minutes to work-days (8 h/day) with remainder hours. */
function formatMinutesToDays(minutes: number): string {
    if (minutes === 0) return "—";
    const totalHours = minutes / 60;
    const days = Math.floor(totalHours / 8);
    const remainHours = Math.round(totalHours - days * 8);
    if (days === 0) return `${remainHours}h`;
    if (remainHours === 0) return `${days}d`;
    return `${days}d ${remainHours}h`;
}

// ============================================================================
// Current Status Card
// ============================================================================

const PROJECT_STATUS_DISPLAY: Record<string, {
    label: string;
    description: string;
    icon: React.ElementType;
    className: string;
    bgClassName: string;
}> = {
    legals_pending: {
        label: "Legals Pending",
        description: "Awaiting UCP wire list and layout PDF upload",
        icon: Upload,
        className: "text-amber-600 dark:text-amber-400",
        bgClassName: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50",
    },
    brandlist: {
        label: "BrandList",
        description: "Working on BrandList generation from wire list",
        icon: ClipboardList,
        className: "text-orange-600 dark:text-orange-400",
        bgClassName: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800/50",
    },
    branding: {
        label: "Branding",
        description: "Physical labels being printed and prepared",
        icon: Tag,
        className: "text-purple-600 dark:text-purple-400",
        bgClassName: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800/50",
    },
    kitting: {
        label: "Kitting",
        description: "Devices being kitted for installation",
        icon: Layers,
        className: "text-blue-600 dark:text-blue-400",
        bgClassName: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50",
    },
    active: {
        label: "Active",
        description: "Assignments in progress across production stages",
        icon: Activity,
        className: "text-emerald-600 dark:text-emerald-400",
        bgClassName: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50",
    },
    blocked: {
        label: "Blocked",
        description: "One or more assignments are blocked",
        icon: Lock,
        className: "text-red-600 dark:text-red-400",
        bgClassName: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50",
    },
    completed: {
        label: "Completed",
        description: "All assignments finished BIQ",
        icon: CheckCircle2,
        className: "text-emerald-700 dark:text-emerald-400",
        bgClassName: "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800/50",
    },
    shipped: {
        label: "Shipped",
        description: "Post-production shipment complete",
        icon: ExternalLink,
        className: "text-slate-600 dark:text-slate-400",
        bgClassName: "bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-700/50",
    },
};

function CurrentStatusCard({ status, projectColor }: { status?: string; projectColor: string }) {
    const cfg = PROJECT_STATUS_DISPLAY[status ?? "legals_pending"]
        ?? PROJECT_STATUS_DISPLAY.legals_pending;
    const Icon = cfg.icon;

    return (
        <div className={cn("rounded-lg border p-3 flex items-start gap-3", cfg.bgClassName)}>
            <div className={cn("rounded-md p-1.5 shrink-0", cfg.className, "bg-white/60 dark:bg-black/20")}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", cfg.className)}>{cfg.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {cfg.description}
                </p>
            </div>
        </div>
    );
}

// ============================================================================
// Stage Dot
// ============================================================================

const STAGE_DOT_COLORS: Record<string, string> = {
    slate: "bg-slate-400",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
    sky: "bg-sky-500",
    fuchsia: "bg-fuchsia-500",
    rose: "bg-rose-500",
    red: "bg-red-500",
    cyan: "bg-cyan-500",
    teal: "bg-teal-500",
    green: "bg-green-500",
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
};

function StageDot({ color }: { color: string }) {
    return (
        <div className={cn("h-2 w-2 rounded-full shrink-0", STAGE_DOT_COLORS[color] ?? "bg-slate-400")} />
    );
}
