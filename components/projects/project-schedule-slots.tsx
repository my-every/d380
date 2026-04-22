"use client";

import { format } from "date-fns";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Columns3,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LwcTypeField } from "@/components/projects/fields/lwc-type-field";
import { cn } from "@/lib/utils";
import { LWC_TYPE_REGISTRY, type LwcType } from "@/lib/workbook/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Rectangle,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ProjectScheduleDetailsModal } from "@/components/projects/project-schedule-details-modal";
import { ProjectScheduleDetailsModalAlt } from "@/components/projects/project-schedule-details-modal-alt";

export type ProjectScheduleLegalsState =
  | "published"
  | "pending_reference"
  | "not_applicable"
  | "missing"
  | "invalid";

export type ProjectScheduleStatus =
  | "Complete"
  | "In Process"
  | "Pending"
  | "Upcoming";

export interface ProjectScheduleSlotsTableRow {
  id: string;
  pdNumber: string;
  projectName: string;
  unit: string;
  dueLabel: string;
  dueMonth: string | null;
  daysLate: number | null;
  legalsState: ProjectScheduleLegalsState;
  legalsLabel: string;
  status: ProjectScheduleStatus;
  extraColumns?: Record<string, string>;
}

interface ProjectScheduleSlotsProps {
  rows: ProjectScheduleSlotsTableRow[];
  selectedRowId: string;
  onSelectRowId: (rowId: string) => void;
  currentBadge?: string;
  detailsModalVariant?: "default" | "alt";
}

interface TableFilters {
  search: string;
  dueMonth: string;
  dueDateFrom: string;
  dueDateTo: string;
  legalsState: "all" | ProjectScheduleLegalsState;
  status: "all" | ProjectScheduleStatus;
  multiUnitProject: "all" | "true" | "false";
}

type BaseColumnKey =
  | "unit"
  | "pdNumber"
  | "projectName"
  | "due"
  | "daysLate"
  | "legals"
  | "status";

const BASE_COLUMNS: BaseColumnKey[] = [
  "unit",
  "pdNumber",
  "projectName",
  "due",
  "daysLate",
  "legals",
  "status",
];

const BASE_COLUMN_LABELS: Record<BaseColumnKey, string> = {
  unit: "Unit",
  pdNumber: "PD#",
  projectName: "Project Name",
  due: "Due",
  daysLate: "Days Late",
  legals: "Legals",
  status: "Status",
};

const UPPERCASE_ABBREVIATIONS = new Set([
  "id",
  "pd",
  "lwc",
  "d380",
  "biq",
  "de",
  "me",
  "pm",
  "cmp",
  "mo",
  "ntb",
  "pwrchk",
  "conasy",
  "conlay",
  "condef",
  "softt",
  "dt",
  "ac",
  "a/c",
]);

function isBaseColumnKey(column: string): column is BaseColumnKey {
  return BASE_COLUMNS.includes(column as BaseColumnKey);
}

function getLegalsBadgeVariant(
  state: ProjectScheduleLegalsState,
): "default" | "secondary" | "outline" | "destructive" {
  switch (state) {
    case "published":
      return "default";
    case "pending_reference":
      return "secondary";
    case "not_applicable":
      return "outline";
    case "missing":
      return "destructive";
    case "invalid":
      return "destructive";
    default:
      return "outline";
  }
}

function getLegalsBadgeLabel(state: ProjectScheduleLegalsState): string {
  switch (state) {
    case "published":
      return "Published";
    case "pending_reference":
      return "Pending Ref";
    case "not_applicable":
      return "N/A";
    case "missing":
      return "Missing";
    default:
      return "Invalid";
  }
}

function getStatusBadgeVariant(
  status: ProjectScheduleStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "Complete":
      return "default";
    case "In Process":
      return "secondary";
    case "Pending":
      return "outline";
    case "Upcoming":
      return "destructive";
    default:
      return "outline";
  }
}

function getStatusDotClass(status: ProjectScheduleStatus): string {
  switch (status) {
    case "Complete":
      return "bg-emerald-500";
    case "In Process":
      return "bg-amber-500";
    case "Pending":
      return "bg-slate-500";
    case "Upcoming":
      return "bg-red-200";
    default:
      return "bg-slate-500";
  }
}

function getFilterValueLabel(filters: TableFilters): string {
  const parts: string[] = [];
  if (filters.dueMonth !== "all") {
    parts.push(`Due ${filters.dueMonth}`);
  }
  if (filters.dueDateFrom) {
    parts.push(`From ${filters.dueDateFrom}`);
  }
  if (filters.dueDateTo) {
    parts.push(`To ${filters.dueDateTo}`);
  }
  if (filters.legalsState !== "all") {
    parts.push(`Legals ${getLegalsBadgeLabel(filters.legalsState)}`);
  }
  if (filters.status !== "all") {
    parts.push(`Status ${filters.status}`);
  }
  if (filters.multiUnitProject !== "all") {
    parts.push(
      filters.multiUnitProject === "true"
        ? "Multi-unit only"
        : "Single-unit only",
    );
  }

  return parts.length > 0 ? parts.join(" • ") : "All filters";
}

function normalizeLabelToken(token: string): string {
  const compact = token.trim();
  if (!compact) {
    return compact;
  }

  const hasHash = compact.endsWith("#");
  const core = hasHash ? compact.slice(0, -1) : compact;
  const lowerCore = core.toLowerCase();

  let normalizedCore = core;
  if (UPPERCASE_ABBREVIATIONS.has(lowerCore)) {
    normalizedCore = core.toUpperCase();
  } else if (/[a-zA-Z]/.test(core)) {
    normalizedCore = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
  }

  return hasHash ? `${normalizedCore}#` : normalizedCore;
}

function normalizeColumnLabel(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return value;
  }

  return normalized
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((segment) =>
          segment
            .split("/")
            .map((part) => normalizeLabelToken(part))
            .join("/"),
        )
        .join("-"),
    )
    .join(" ");
}

function parseLwcTypeFromValue(rawValue: string | undefined): LwcType | undefined {
  if (!rawValue) {
    return undefined;
  }

  const normalized = rawValue.trim().toUpperCase().replace(/\s+/g, " ");
  if (!normalized) {
    return undefined;
  }

  if (normalized.includes("NEW") || normalized.includes("FLEX")) {
    return "NEW_FLEX";
  }
  if (normalized.includes("OFFSKID") || normalized.includes("OFF SKID")) {
    return "OFFSKID";
  }
  if (normalized.includes("ONSKID") || normalized.includes("ON SKID")) {
    return "ONSKID";
  }
  if (normalized.includes("NTB")) {
    return "NTB";
  }
  if (normalized.includes("FLOAT")) {
    return "FLOAT";
  }

  return undefined;
}

function getExtraColumnValue(
  row: ProjectScheduleSlotsTableRow,
  columnName: string,
): string | undefined {
  const entries = Object.entries(row.extraColumns ?? {});
  const target = columnName.trim().toUpperCase();
  const hit = entries.find(([key]) => key.trim().toUpperCase() === target);
  return hit?.[1];
}

function getRowLwcType(row: ProjectScheduleSlotsTableRow): LwcType | undefined {
  return parseLwcTypeFromValue(getExtraColumnValue(row, "LWC"));
}

type LwcTabValue = "ALL" | LwcType;

interface LwcMetricSet {
  totalProjects: number;
  totalUnits: number;
  multiUnitProjects: number;
  singleUnitProjects: number;
  avgDaysLate: number | null;
  medianDaysLate: number | null;
  overdueCount: number;
  earlyCount: number;
  onTimeCount: number;
  legalsPublishedCount: number;
  legalsPendingRefCount: number;
  legalsMissingCount: number;
  legalsInvalidCount: number;
  statusCompleteCount: number;
  statusInProcessCount: number;
  statusPendingCount: number;
  statusUpcomingCount: number;
}

const LWC_TABS: LwcTabValue[] = [
  "ALL",
  ...Object.keys(LWC_TYPE_REGISTRY),
] as LwcTabValue[];

const LWC_OVERVIEW_ORDER: LwcType[] = [
  "ONSKID",
  "NEW_FLEX",
  "OFFSKID",
  "NTB",
  "FLOAT",
];

function getLwcTabLabel(value: LwcTabValue): string {
  if (value === "ALL") {
    return "All";
  }
  return LWC_TYPE_REGISTRY[value].shortLabel;
}

function getTotalProjects(rows: ProjectScheduleSlotsTableRow[]): number {
  // Treat each unit row as a project contribution so multi-unit jobs increase totals.
  return rows.length;
}

function getTotalUnits(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.length;
}

function getMultiUnitProjects(rows: ProjectScheduleSlotsTableRow[]): number {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = `${row.pdNumber}::${row.projectName}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.values(counts).filter((count) => count > 1).length;
}

function getSingleUnitProjects(rows: ProjectScheduleSlotsTableRow[]): number {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = `${row.pdNumber}::${row.projectName}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.values(counts).filter((count) => count === 1).length;
}

function getAvgDaysLate(rows: ProjectScheduleSlotsTableRow[]): number | null {
  const values = rows
    .map((row) => row.daysLate)
    .filter((value): value is number => value != null);
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getMedianDaysLate(rows: ProjectScheduleSlotsTableRow[]): number | null {
  const values = rows
    .map((row) => row.daysLate)
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return null;
  }

  const middle = Math.floor(values.length / 2);
  if (values.length % 2 === 1) {
    return values[middle];
  }
  return (values[middle - 1] + values[middle]) / 2;
}

function getOverdueCount(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.filter((row) => (row.daysLate ?? 0) > 0).length;
}

function getEarlyCount(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.filter((row) => (row.daysLate ?? 0) < 0).length;
}

function getOnTimeCount(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.filter((row) => row.daysLate === 0).length;
}

function getLegalsPublishedCount(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.filter((row) => row.legalsState === "published").length;
}

function getLegalsPendingRefCount(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.filter((row) => row.legalsState === "pending_reference").length;
}

function getLegalsMissingCount(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.filter((row) => row.legalsState === "missing").length;
}

function getLegalsInvalidCount(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.filter((row) => row.legalsState === "invalid").length;
}

function getStatusCompleteCount(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.filter((row) => row.status === "Complete").length;
}

function getStatusInProcessCount(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.filter((row) => row.status === "In Process").length;
}

function getStatusPendingCount(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.filter((row) => row.status === "Pending").length;
}

function getStatusUpcomingCount(rows: ProjectScheduleSlotsTableRow[]): number {
  return rows.filter((row) => row.status === "Upcoming").length;
}

function buildMetrics(rows: ProjectScheduleSlotsTableRow[]): LwcMetricSet {
  return {
    totalProjects: getTotalProjects(rows),
    totalUnits: getTotalUnits(rows),
    multiUnitProjects: getMultiUnitProjects(rows),
    singleUnitProjects: getSingleUnitProjects(rows),
    avgDaysLate: getAvgDaysLate(rows),
    medianDaysLate: getMedianDaysLate(rows),
    overdueCount: getOverdueCount(rows),
    earlyCount: getEarlyCount(rows),
    onTimeCount: getOnTimeCount(rows),
    legalsPublishedCount: getLegalsPublishedCount(rows),
    legalsPendingRefCount: getLegalsPendingRefCount(rows),
    legalsMissingCount: getLegalsMissingCount(rows),
    legalsInvalidCount: getLegalsInvalidCount(rows),
    statusCompleteCount: getStatusCompleteCount(rows),
    statusInProcessCount: getStatusInProcessCount(rows),
    statusPendingCount: getStatusPendingCount(rows),
    statusUpcomingCount: getStatusUpcomingCount(rows),
  };
}

function parseUnitForSort(unit: string): number {
  const parsed = Number(unit);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function parseDueDateForFilter(row: ProjectScheduleSlotsTableRow): Date | null {
  const rawDue = row.dueLabel?.trim();
  if (rawDue) {
    const parsedDue = new Date(rawDue);
    if (!Number.isNaN(parsedDue.getTime())) {
      return parsedDue;
    }
  }

  const rawMonth = row.dueMonth?.trim();
  if (rawMonth) {
    const parsedMonth = new Date(`${rawMonth} 1`);
    if (!Number.isNaN(parsedMonth.getTime())) {
      return parsedMonth;
    }
  }

  return null;
}

function parseInputDateBoundary(value: string, boundary: "start" | "end"): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (boundary === "end") {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed;
}

interface OverviewBarDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

function parseFilterDateString(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function toFilterDateString(value: Date | undefined): string {
  if (!value) {
    return "";
  }
  return format(value, "yyyy-MM-dd");
}

function getDateRangeLabel(dueDateFrom: string, dueDateTo: string): string {
  const fromDate = parseFilterDateString(dueDateFrom);
  const toDate = parseFilterDateString(dueDateTo);

  if (fromDate && toDate) {
    return `${format(fromDate, "MMM d, yyyy")} - ${format(toDate, "MMM d, yyyy")}`;
  }
  if (fromDate) {
    return `From ${format(fromDate, "MMM d, yyyy")}`;
  }
  if (toDate) {
    return `Until ${format(toDate, "MMM d, yyyy")}`;
  }
  return "All Dates";
}

function buildOverviewBarData(
  activeLwcTab: LwcTabValue,
  metricsByLwc: Record<string, LwcMetricSet>,
): OverviewBarDatum[] {
  if (activeLwcTab === "ALL") {
    return LWC_OVERVIEW_ORDER.map((tab) => ({
      key: tab,
      label: LWC_TYPE_REGISTRY[tab].shortLabel,
      value: metricsByLwc[tab]?.totalProjects ?? 0,
      color: LWC_TYPE_REGISTRY[tab].dotColor,
    }));
  }

  const metrics = metricsByLwc[activeLwcTab] ?? buildMetrics([]);
  return [
    {
      key: "totalProjects",
      label: "Projects",
      value: metrics.totalProjects,
      color: LWC_TYPE_REGISTRY[activeLwcTab].dotColor,
    },
    {
      key: "overdue",
      label: "Late",
      value: metrics.overdueCount,
      color: "#ef4444",
    },
    {
      key: "early",
      label: "Early",
      value: metrics.earlyCount,
      color: "#16a34a",
    },
    {
      key: "onTime",
      label: "On Time",
      value: metrics.onTimeCount,
      color: "#0284c7",
    },
    {
      key: "pendingRef",
      label: "Pending Ref",
      value: metrics.legalsPendingRefCount,
      color: "#f59e0b",
    },
    {
      key: "complete",
      label: "Complete",
      value: metrics.statusCompleteCount,
      color: "#0d9488",
    },
  ];
}

function getOverviewStatCards(
  activeLwcTab: LwcTabValue,
  metricsByLwc: Record<string, LwcMetricSet>,
): Array<{ label: string; value: string | number; valueClassName?: string }> {
  const metrics = metricsByLwc[activeLwcTab] ?? buildMetrics([]);

  if (activeLwcTab === "ALL") {
    return [
      { label: "Projects", value: metrics.totalProjects },
      { label: "Late", value: metrics.overdueCount, valueClassName: "text-destructive" },
      { label: "On Time", value: metrics.onTimeCount },
      {
        label: "Avg Days Late",
        value: metrics.avgDaysLate == null ? "-" : metrics.avgDaysLate.toFixed(1),
      },
    ];
  }

  return [
    { label: "Projects", value: metrics.totalProjects },
    { label: "Late", value: metrics.overdueCount, valueClassName: "text-destructive" },
    { label: "Early", value: metrics.earlyCount, valueClassName: "text-emerald-600" },
    { label: "Pending Ref", value: metrics.legalsPendingRefCount },
  ];
}

interface ProjectScheduleDateRangeFilterProps {
  dueDateFrom: string;
  dueDateTo: string;
  onChangeDueDateFrom: (value: string) => void;
  onChangeDueDateTo: (value: string) => void;
}

function ProjectScheduleDateRangeFilter({
  dueDateFrom,
  dueDateTo,
  onChangeDueDateFrom,
  onChangeDueDateTo,
}: ProjectScheduleDateRangeFilterProps) {
  const fromDate = parseFilterDateString(dueDateFrom);
  const toDate = parseFilterDateString(dueDateTo);

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-9 w-41 justify-start text-left text-xs font-normal",
              !fromDate && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {fromDate ? format(fromDate, "MMM d, yyyy") : "From date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={fromDate}
            onSelect={(value) => onChangeDueDateFrom(toFilterDateString(value))}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "h-9 w-41 justify-start text-left text-xs font-normal",
              !toDate && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {toDate ? format(toDate, "MMM d, yyyy") : "To date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={toDate}
            onSelect={(value) => onChangeDueDateTo(toFilterDateString(value))}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface ProjectScheduleOverviewBarChartSwitcherProps {
  activeLwcTab: LwcTabValue;
  onLwcTabChange: (tab: LwcTabValue) => void;
  metricsByLwc: Record<string, LwcMetricSet>;
  dateRangeLabel: string;
}

function ProjectScheduleOverviewBarChartSwitcher({
  activeLwcTab,
  onLwcTabChange,
  metricsByLwc,
  dateRangeLabel,
}: ProjectScheduleOverviewBarChartSwitcherProps) {
  const activeMetrics = metricsByLwc[activeLwcTab] ?? buildMetrics([]);
  const statCards = useMemo(
    () => getOverviewStatCards(activeLwcTab, metricsByLwc),
    [activeLwcTab, metricsByLwc],
  );
  const chartData = useMemo(
    () => buildOverviewBarData(activeLwcTab, metricsByLwc),
    [activeLwcTab, metricsByLwc],
  );

  return (
    <div className="space-y-3">
      <Tabs
        value={activeLwcTab}
        onValueChange={(value) => onLwcTabChange(value as LwcTabValue)}
        className="gap-2"
      >
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/40 p-1.5">
          {LWC_TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="h-8 rounded-lg px-3 text-xs"
            >
              {getLwcTabLabel(tab)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-xl border bg-muted/20 p-2 sm:p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-muted-foreground">
              Queue Overview: {getLwcTabLabel(activeLwcTab)} | {dateRangeLabel}
            </div>
            <Badge variant="outline" className="text-[10px]">
              {activeLwcTab === "ALL" ? "Projects by LWC" : `${getLwcTabLabel(activeLwcTab)} Metrics`}
            </Badge>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <pattern
                    id="chart-hover-stripes"
                    patternUnits="userSpaceOnUse"
                    width="8"
                    height="8"
                    patternTransform="rotate(45)"
                  >
                    <rect width="8" height="8" fill="hsl(var(--muted) / 0.3)" />
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="8"
                      stroke="hsl(var(--muted-foreground) / 0.22)"
                      strokeWidth="3"
                    />
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <RechartsTooltip
                  cursor={
                    <Rectangle
                      fill="url(#chart-hover-stripes)"
                      radius={12}
                      className="rounded-xl"
                    />
                  }
                  formatter={(value: number | string) => [Number(value).toLocaleString(), "Value"]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-2">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-lg border bg-muted/30 p-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {card.label}
              </div>
              <div className={cn("text-3xl font-bold tabular-nums", card.valueClassName)}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type GroupedDisplayEntry =
  | { type: "single"; row: ProjectScheduleSlotsTableRow }
  | {
      type: "group";
      key: string;
      lead: ProjectScheduleSlotsTableRow;
      rows: ProjectScheduleSlotsTableRow[];
    };

export function ProjectScheduleSlotsTable({
  rows,
  selectedRowId,
  onSelectRowId,
  currentBadge,
  detailsModalVariant = "default",
}: ProjectScheduleSlotsProps) {
  const [activeLwcTab, setActiveLwcTab] = useState<LwcTabValue>("ALL");
  const [filters, setFilters] = useState<TableFilters>({
    search: "",
    dueMonth: "all",
    dueDateFrom: "",
    dueDateTo: "",
    legalsState: "all",
    status: "all",
    multiUnitProject: "all",
  });
  const [columnOrder, setColumnOrder] = useState<string[]>(BASE_COLUMNS);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    for (const column of BASE_COLUMNS) {
      initial[column] = true;
    }
    return initial;
  });

  const monthOptions = useMemo(() => {
    const monthSet = new Set<string>();
    for (const row of rows) {
      if (row.dueMonth) {
        monthSet.add(row.dueMonth);
      }
    }
    return [...monthSet].sort();
  }, [rows]);

  const extraColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const row of rows) {
      const extra = row.extraColumns ?? {};
      for (const key of Object.keys(extra)) {
        if (!key || isBaseColumnKey(key)) {
          continue;
        }
        keys.add(key);
      }
    }
    return [...keys].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const allColumns = useMemo(
    () => [...BASE_COLUMNS, ...extraColumns],
    [extraColumns],
  );

  const multiUnitProjectLookup = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const key = row.pdNumber.trim().toUpperCase();
      if (!key) {
        continue;
      }
      counts[key] = (counts[key] ?? 0) + 1;
    }

    const lookup: Record<string, boolean> = {};
    for (const [key, count] of Object.entries(counts)) {
      lookup[key] = count > 1;
    }

    return lookup;
  }, [rows]);

  const rowsAfterMenuFilters = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const dueDateFrom = parseInputDateBoundary(filters.dueDateFrom, "start");
    const dueDateTo = parseInputDateBoundary(filters.dueDateTo, "end");

    return rows.filter((row) => {
      if (filters.dueMonth !== "all" && row.dueMonth !== filters.dueMonth) {
        return false;
      }

      if (dueDateFrom || dueDateTo) {
        const dueDate = parseDueDateForFilter(row);
        if (!dueDate) {
          return false;
        }

        if (dueDateFrom && dueDate < dueDateFrom) {
          return false;
        }
        if (dueDateTo && dueDate > dueDateTo) {
          return false;
        }
      }

      if (filters.legalsState !== "all" && row.legalsState !== filters.legalsState) {
        return false;
      }

      if (filters.status !== "all" && row.status !== filters.status) {
        return false;
      }

      const isMultiUnit =
        multiUnitProjectLookup[row.pdNumber.trim().toUpperCase()] ?? false;
      if (filters.multiUnitProject === "true" && !isMultiUnit) {
        return false;
      }
      if (filters.multiUnitProject === "false" && isMultiUnit) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [row.pdNumber, row.projectName, row.unit, row.legalsLabel]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [filters, rows, multiUnitProjectLookup]);

  const filteredRows = useMemo(() => {
    if (activeLwcTab === "ALL") {
      return rowsAfterMenuFilters;
    }
    return rowsAfterMenuFilters.filter((row) => getRowLwcType(row) === activeLwcTab);
  }, [activeLwcTab, rowsAfterMenuFilters]);

  const metricsByLwc = useMemo(() => {
    const byLwc: Record<string, LwcMetricSet> = {
      ALL: buildMetrics(rowsAfterMenuFilters),
    };

    for (const tab of LWC_TABS) {
      if (tab === "ALL") {
        continue;
      }
      byLwc[tab] = buildMetrics(
        rowsAfterMenuFilters.filter((row) => getRowLwcType(row) === tab),
      );
    }

    return byLwc;
  }, [rowsAfterMenuFilters]);

  useEffect(() => {
    setColumnOrder((prev) => {
      const known = new Set(allColumns);
      const kept = prev.filter((column) => known.has(column));
      const next = [...kept];
      for (const column of allColumns) {
        if (!next.includes(column)) {
          next.push(column);
        }
      }
      return next;
    });

    setColumnVisibility((prev) => {
      const next: Record<string, boolean> = {};
      for (const column of allColumns) {
        if (column in prev) {
          next[column] = prev[column];
        } else {
          // New schedule fields are intentionally hidden by default.
          next[column] = isBaseColumnKey(column);
        }
      }
      return next;
    });
  }, [allColumns]);

  useEffect(() => {
    if (filteredRows.length === 0) {
      return;
    }

    const selectedStillVisible = filteredRows.some(
      (row) => row.id === selectedRowId,
    );

    if (!selectedStillVisible) {
      onSelectRowId(filteredRows[0].id);
    }
  }, [filteredRows, onSelectRowId, selectedRowId]);

  const visibleColumns = useMemo(
    () => columnOrder.filter((column) => columnVisibility[column]),
    [columnOrder, columnVisibility],
  );

  const [expandedGroupKeys, setExpandedGroupKeys] = useState<
    Record<string, boolean>
  >({});
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<ProjectScheduleSlotsTableRow | null>(null);

  const displayEntries = useMemo<GroupedDisplayEntry[]>(() => {
    const groupedRows = new Map<string, ProjectScheduleSlotsTableRow[]>();
    const orderedEntries: Array<
      | { type: "single"; row: ProjectScheduleSlotsTableRow }
      | { type: "group"; key: string }
    > = [];

    for (const row of filteredRows) {
      const isMultiUnit =
        multiUnitProjectLookup[row.pdNumber.trim().toUpperCase()] ?? false;

      if (!isMultiUnit) {
        orderedEntries.push({ type: "single", row });
        continue;
      }

      const groupKey = `${row.pdNumber}::${row.projectName}`;
      const existing = groupedRows.get(groupKey);
      if (existing) {
        existing.push(row);
      } else {
        groupedRows.set(groupKey, [row]);
        orderedEntries.push({ type: "group", key: groupKey });
      }
    }

    return orderedEntries.map((entry) => {
      if (entry.type === "single") {
        return entry;
      }

      const rowsInGroup = groupedRows.get(entry.key) ?? [];
      const sortedRows = [...rowsInGroup].sort((a, b) => {
        const unitCompare = parseUnitForSort(a.unit) - parseUnitForSort(b.unit);
        if (unitCompare !== 0) {
          return unitCompare;
        }
        return a.unit.localeCompare(b.unit, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });

      return {
        type: "group",
        key: entry.key,
        lead: sortedRows[0] ?? rowsInGroup[0],
        rows: sortedRows,
      };
    });
  }, [filteredRows, multiUnitProjectLookup]);

  const visibleColumnCount = useMemo(
    () => Object.values(columnVisibility).filter(Boolean).length,
    [columnVisibility],
  );

  const toggleColumnVisibility = (column: string) => {
    setColumnVisibility((prev) => {
      const currentVisibleCount = Object.values(prev).filter(Boolean).length;
      if (prev[column] && currentVisibleCount <= 1) {
        return prev;
      }
      return {
        ...prev,
        [column]: !prev[column],
      };
    });
  };

  const moveColumn = (column: string, direction: "up" | "down") => {
    setColumnOrder((prev) => {
      const currentIndex = prev.indexOf(column);
      if (currentIndex < 0) {
        return prev;
      }

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const activeFilterCount =
    (filters.dueMonth !== "all" ? 1 : 0) +
    (filters.dueDateFrom ? 1 : 0) +
    (filters.dueDateTo ? 1 : 0) +
    (filters.legalsState !== "all" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0);

  const filterValueLabel = getFilterValueLabel(filters);
  const dateRangeLabel = getDateRangeLabel(filters.dueDateFrom, filters.dueDateTo);
  const queueTitle = `Priority Queue: ${getLwcTabLabel(activeLwcTab)} | ${dateRangeLabel}`;

  const getColumnLabel = (column: string): string => {
    if (isBaseColumnKey(column)) {
      return BASE_COLUMN_LABELS[column];
    }
    return normalizeColumnLabel(column);
  };

  const resetVisibilityAndOrder = () => {
    setColumnOrder(allColumns);
    const nextVisibility: Record<string, boolean> = {};
    for (const column of allColumns) {
      nextVisibility[column] = isBaseColumnKey(column);
    }
    setColumnVisibility(nextVisibility);
  };

  const renderRowCells = (
    row: ProjectScheduleSlotsTableRow,
    options: {
      unitMode: "single" | "group-parent" | "group-child";
      keyPrefix?: string;
      expanded?: boolean;
      groupSize?: number;
      onToggleExpanded?: () => void;
    },
  ) => {
    return visibleColumns.map((column) => (
      <TableCell
        key={`${options.keyPrefix ?? row.id}-${options.unitMode}-${column}`}
        className={cn(
          column === "unit" && "text-xs",
          column === "daysLate" && "text-xs",
          column === "status" && "text-right",
        )}
      >
        {column === "unit" ? (
          <div className="flex items-center gap-2">
            {options.unitMode === "group-parent" ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(event) => {
                  event.stopPropagation();
                  options.onToggleExpanded?.();
                }}
              >
                {options.expanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            ) : (
              <span className="inline-block h-6 w-6" />
            )}
            <span className="font-medium">
              {options.unitMode === "group-parent"
                ? `${options.groupSize ?? 0} units`
                : row.unit}
            </span>
          </div>
        ) : null}
        {column === "pdNumber" ? (
          <div className="font-medium">{row.pdNumber}</div>
        ) : null}
        {column === "projectName" ? (
          <div
            className="max-w-55 truncate text-xs text-muted-foreground"
            title={row.projectName}
          >
            {row.projectName}
          </div>
        ) : null}
        {column === "due" ? row.dueLabel || "-" : null}
        {column === "daysLate" ? (
          <span
            className={cn(
              "text-muted-foreground",
              (row.daysLate ?? 0) > 0 && "text-destructive",
              (row.daysLate ?? 0) < 0 && "text-emerald-600",
            )}
          >
            {row.daysLate == null ? "-" : `${row.daysLate} days`}
          </span>
        ) : null}
        {column === "legals" ? (
          <div className="flex items-center gap-2">
            {row.legalsLabel ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={getLegalsBadgeVariant(row.legalsState)}
                    className="cursor-help text-[10px]"
                  >
                    {getLegalsBadgeLabel(row.legalsState)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  <span className="text-xs">{row.legalsLabel}</span>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Badge
                variant={getLegalsBadgeVariant(row.legalsState)}
                className="text-[10px]"
              >
                {getLegalsBadgeLabel(row.legalsState)}
              </Badge>
            )}
          </div>
        ) : null}
        {column === "status" ? (
          <Badge
            variant={getStatusBadgeVariant(row.status)}
            className="inline-flex items-center gap-1.5 text-[10px]"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                getStatusDotClass(row.status),
              )}
            />
            {row.status}
          </Badge>
        ) : null}
        {!isBaseColumnKey(column) && column.trim().toUpperCase() === "LWC" ? (
          <LwcTypeField
            mode="status"
            value={parseLwcTypeFromValue(getExtraColumnValue(row, column))}
            className="text-[10px]"
          />
        ) : null}
        {!isBaseColumnKey(column) && column.trim().toUpperCase() !== "LWC"
          ? (row.extraColumns?.[column] || "-")
          : null}
      </TableCell>
    ));
  };

  return (
    <>
      <Card>
        <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-base">{queueTitle}</CardTitle>
          <CardDescription>
            Reusable queue table with built-in search and filters.
          </CardDescription>
        </div>
        <ProjectScheduleDateRangeFilter
          dueDateFrom={filters.dueDateFrom}
          dueDateTo={filters.dueDateTo}
          onChangeDueDateFrom={(value) =>
            setFilters((prev) => ({ ...prev, dueDateFrom: value }))
          }
          onChangeDueDateTo={(value) =>
            setFilters((prev) => ({ ...prev, dueDateTo: value }))
          }
        />
      </CardHeader>
        <CardContent className="space-y-4">
        <ProjectScheduleOverviewBarChartSwitcher
          activeLwcTab={activeLwcTab}
          onLwcTabChange={setActiveLwcTab}
          metricsByLwc={metricsByLwc}
          dateRangeLabel={dateRangeLabel}
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-[50%] rounded-xl">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              placeholder="Search PD#, project, unit, legals"
              className="pl-8 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-2 rounded-r-none">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>{filterValueLabel}</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  Due Month
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filters.dueMonth}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, dueMonth: value }))
                  }
                >
                  <DropdownMenuRadioItem value="all">All months</DropdownMenuRadioItem>
                  {monthOptions.map((month) => (
                    <DropdownMenuRadioItem key={month} value={month}>
                      {month}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground rounded-x-none">
                  Legals
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filters.legalsState}
                  onValueChange={(value: TableFilters["legalsState"]) =>
                    setFilters((prev) => ({ ...prev, legalsState: value }))
                  }
                >
                  <DropdownMenuRadioItem value="all">All States</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="published">Published</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="pending_reference">
                    Pending Legals
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="missing">Missing</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="invalid">Invalid</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="not_applicable">
                    Not Applicable
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  Status
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filters.status}
                  onValueChange={(value: TableFilters["status"]) =>
                    setFilters((prev) => ({ ...prev, status: value }))
                  }
                >
                  <DropdownMenuRadioItem value="all">All Statuses</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Complete">Complete</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="In Process">
                    In Process
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Pending">Pending</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Upcoming">Upcoming</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  Multi-Unit Project
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filters.multiUnitProject}
                  onValueChange={(value: TableFilters["multiUnitProject"]) =>
                    setFilters((prev) => ({ ...prev, multiUnitProject: value }))
                  }
                >
                  <DropdownMenuRadioItem value="all">All Projects</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="true">Multi-Unit Only</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="false">Single-Unit Only</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-2 rounded-l-none rounded-r-none">
                  <Columns3 className="h-4 w-4" />
                  Columns ({visibleColumnCount}/{allColumns.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Visibility and Order</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columnOrder.map((column, index) => (
                  <div
                    key={column}
                    className="flex items-center justify-between gap-2 px-2 py-1"
                  >
                    <Button
                      type="button"
                      variant={columnVisibility[column] ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 justify-start px-2 text-xs"
                      onClick={() => toggleColumnVisibility(column)}
                    >
                      {columnVisibility[column] ? "Hide" : "Show"} {getColumnLabel(column)}
                    </Button>
                    <div className="flex items-center gap-1">
                      <DropdownMenuItem
                        className="h-7 w-7 justify-center p-0"
                        disabled={index === 0}
                        onSelect={(event) => {
                          event.preventDefault();
                          moveColumn(column, "up");
                        }}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="h-7 w-7 justify-center p-0"
                        disabled={index === columnOrder.length - 1}
                        onSelect={(event) => {
                          event.preventDefault();
                          moveColumn(column, "down");
                        }}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </DropdownMenuItem>
                    </div>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              variant="outline"
              className="rounded-l-none"
              size="sm"
              onClick={() => {
                setFilters({
                  search: "",
                  dueMonth: "all",
                  dueDateFrom: "",
                  dueDateTo: "",
                  legalsState: "all",
                  status: "all",
                  multiUnitProject: "all",
                });
                resetVisibilityAndOrder();
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="max-h-150 overflow-auto rounded-xl border p-1">
          <Table>
            <TableHeader className="sticky top-0">
              <TableRow>
                {visibleColumns.map((column) => (
                  <TableHead
                    key={column}
                    className={cn(
                      column === "status" ? "text-center" : "text-left",
                    )}
                  >
                    {getColumnLabel(column)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayEntries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={Math.max(visibleColumns.length, 1)}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No projects match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                displayEntries.map((entry) => {
                  if (entry.type === "single") {
                    const row = entry.row;
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "cursor-pointer overflow-hidden",
                          selectedRowId === row.id
                            ? "bg-muted/10"
                            : "hover:bg-muted/40 rounded-md",
                        )}
                        onClick={() => {
                          onSelectRowId(row.id);
                          setDetailsRow(row);
                          setIsDetailsOpen(true);
                        }}
                      >
                        {renderRowCells(row, { unitMode: "single" })}
                      </TableRow>
                    );
                  }

                  const expanded = Boolean(expandedGroupKeys[entry.key]);
                  const groupLead = entry.lead;
                  const groupHasSelectedRow = entry.rows.some(
                    (row) => row.id === selectedRowId,
                  );

                  return (
                    <Fragment key={entry.key}>
                      <TableRow
                        className={cn(
                          "cursor-pointer overflow-hidden",
                          groupHasSelectedRow
                            ? "bg-muted/10"
                            : "hover:bg-muted/40 rounded-md",
                        )}
                        onClick={() => {
                          onSelectRowId(groupLead.id);
                          setDetailsRow(groupLead);
                          setIsDetailsOpen(true);
                        }}
                      >
                        {renderRowCells(groupLead, {
                          unitMode: "group-parent",
                          keyPrefix: entry.key,
                          expanded,
                          groupSize: entry.rows.length,
                          onToggleExpanded: () =>
                            setExpandedGroupKeys((prev) => ({
                              ...prev,
                              [entry.key]: !prev[entry.key],
                            })),
                        })}
                      </TableRow>

                      {expanded ? (
                        entry.rows.map((unitRow) => (
                          <TableRow
                            key={`${entry.key}-${unitRow.id}`}
                            className={cn(
                              "cursor-pointer border-l-2 border-muted/60 bg-muted/10",
                              selectedRowId === unitRow.id && "bg-primary/5",
                            )}
                            onClick={() => {
                              onSelectRowId(unitRow.id);
                              setDetailsRow(unitRow);
                              setIsDetailsOpen(true);
                            }}
                          >
                            {renderRowCells(unitRow, {
                              unitMode: "group-child",
                              keyPrefix: `${entry.key}-${unitRow.id}`,
                            })}
                          </TableRow>
                        ))
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

      {detailsModalVariant === "alt" ? (
        <ProjectScheduleDetailsModalAlt
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          row={detailsRow}
          currentBadge={currentBadge}
        />
      ) : (
        <ProjectScheduleDetailsModal
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          row={detailsRow}
          currentBadge={currentBadge}
        />
      )}
    </>
  );
}
