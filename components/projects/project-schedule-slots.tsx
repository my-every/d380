"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LwcTypeField } from "@/components/projects/fields/lwc-type-field";
import { cn } from "@/lib/utils";
import {
  getDateRangeLabel,
  getFilterValueLabel,
} from "@/components/projects/project-schedule-slots-filters";
import { buildGroupedDisplayEntries } from "@/components/projects/project-schedule-slots-grouping";
import {
  buildMetricsByLwc,
  getLwcTabLabel,
  getRowLwcType,
} from "@/components/projects/project-schedule-slots-metrics";
import {
  ProjectScheduleDateRangeFilter,
  ProjectScheduleOverviewBarChartSwitcher,
} from "@/components/projects/project-schedule-slots-presenters";
import {
  BASE_COLUMNS,
  BASE_COLUMN_LABELS,
  getExtraColumnValue,
  getLegalsBadgeLabel,
  getLegalsBadgeVariant,
  getStatusBadgeVariant,
  getStatusDotClass,
  GroupedDisplayEntry,
  isBaseColumnKey,
  normalizeColumnLabel,
  parseLwcTypeFromValue,
  type LwcMetricSet,
  type LwcTabValue,
  type ProjectScheduleSlotsProps,
  type ProjectScheduleSlotsTableRow,
  type TableFilters,
} from "@/components/projects/project-schedule-slots-types";
import {
  ProjectScheduleDetailsModal,
} from "@/components/projects/project-schedule-details-modal";
import { ProjectScheduleDetailsModalAlt } from "@/components/projects/project-schedule-details-modal-alt";

export type {
  ProjectScheduleLegalsState,
  ProjectScheduleSlotsProps,
  ProjectScheduleSlotsTableRow,
  ProjectScheduleStatus,
  TableFilters,
} from "@/components/projects/project-schedule-slots-types";


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
    return filterProjectScheduleRows(rows, filters, multiUnitProjectLookup);
  }, [filters, rows, multiUnitProjectLookup]);

  const filteredRows = useMemo(() => {
    if (activeLwcTab === "ALL") {
      return rowsAfterMenuFilters;
    }
    return rowsAfterMenuFilters.filter((row) => getRowLwcType(row) === activeLwcTab);
  }, [activeLwcTab, rowsAfterMenuFilters]);

  const metricsByLwc = useMemo(() => {
    return buildMetricsByLwc(rowsAfterMenuFilters);
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
    return buildGroupedDisplayEntries(filteredRows, multiUnitProjectLookup);
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
