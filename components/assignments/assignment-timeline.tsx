"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Timeline,
    TimelineCurrentTime,
    TimelineGrid,
    TimelineHeader,
    TimelineProvider,
    TimelineRow,
    TimelineSlot,
    TimelineSlotContent,
    TimelineSlotData,
    TimelineSlotLabel,
    minutesToTime,
    timeToMinutes,
} from "@/components/ui/timeline";
import {
    FLOOR_AREAS,
    FLOOR_AREA_META,
    FLOOR_STATIONS,
    FloorArea,
    StationDefinition,
    STAGE_ESTIMATES,
} from "@/types/floor-layout";
import { cn } from "@/lib/utils";

export interface AssignmentTimelineProps {
    className?: string;
    initialFloorArea?: FloorArea;
    slotsByArea?: Partial<Record<FloorArea, TimelineSlotData[]>>;
    onSlotsChange?: (floorArea: FloorArea, slots: TimelineSlotData[]) => void;
}

const DEFAULT_CONFIG = {
    startHour: 6,
    endHour: 18,
    snapIntervalMinutes: 15,
    columnWidth: 180,
};

const NORMALIZED_BADGE_CLASS = "h-5 rounded-full px-2 text-[10px] font-semibold leading-none";

function createDefaultSlots(stations: StationDefinition[]): TimelineSlotData[] {
    const slotCount = Math.min(5, stations.length);
    const baseStartMinutes = DEFAULT_CONFIG.startHour * 60 + 60;
    const stageCycle = ["BUILD_UP", "WIRING", "BOX_BUILD", "CROSS_WIRE", "TEST_1ST_PASS"];

    return stations.slice(0, slotCount).map((station, index) => ({
        stage: stageCycle[index % stageCycle.length],
        id: `${station.id}-slot-${index + 1}`,
        rowId: station.id,
        startTime: minutesToTime(baseStartMinutes + index * 60),
        duration: 90,
        estimatedMinutes: STAGE_ESTIMATES[stageCycle[index % stageCycle.length]]?.estimatedMinutes ?? 180,
        assignmentLabel: `Assignment ${index + 1}`,
        owner: `Owner ${index + 1}`,
    }));
}

function getEstimatedMinutes(slot: TimelineSlotData): number {
    if (typeof slot.estimatedMinutes === "number" && Number.isFinite(slot.estimatedMinutes)) {
        return slot.estimatedMinutes;
    }

    if (typeof slot.stage === "string") {
        return STAGE_ESTIMATES[slot.stage]?.estimatedMinutes ?? slot.duration;
    }

    return slot.duration;
}

function getForecastExtensionPercent(slot: TimelineSlotData): number {
    const estimated = getEstimatedMinutes(slot);
    const actual = Math.max(slot.duration, 15);
    const extension = ((estimated - actual) / actual) * 100;
    return Math.max(0, Math.min(extension, 900));
}

function clampToTimeline(startTime: string, durationMinutes: number): string {
    const rawMinutes = timeToMinutes(startTime);
    const minMinutes = DEFAULT_CONFIG.startHour * 60;
    const maxStart = DEFAULT_CONFIG.endHour * 60 - Math.max(durationMinutes, 15);
    const clamped = Math.max(minMinutes, Math.min(maxStart, rawMinutes));
    return minutesToTime(clamped);
}

export function AssignmentTimeline({
    className,
    initialFloorArea = "NEW_FLEX",
    slotsByArea,
    onSlotsChange,
}: AssignmentTimelineProps) {
    const [selectedFloorArea, setSelectedFloorArea] = useState<FloorArea>(initialFloorArea);
    const [showAssignmentForecast, setShowAssignmentForecast] = useState(true);

    const initialSlots = useMemo<Record<FloorArea, TimelineSlotData[]>>(
        () => ({
            NEW_FLEX: slotsByArea?.NEW_FLEX ?? createDefaultSlots(FLOOR_STATIONS.NEW_FLEX),
            ONSKID: slotsByArea?.ONSKID ?? createDefaultSlots(FLOOR_STATIONS.ONSKID),
            OFFSKID: slotsByArea?.OFFSKID ?? createDefaultSlots(FLOOR_STATIONS.OFFSKID),
        }),
        [slotsByArea],
    );

    const [slotsState, setSlotsState] = useState<Record<FloorArea, TimelineSlotData[]>>(initialSlots);

    const rows = useMemo(
        () =>
            FLOOR_STATIONS[selectedFloorArea].map((station) => ({
                id: station.id,
                label: station.label,
                shortLabel: station.shortLabel,
                category: station.category,
            })),
        [selectedFloorArea],
    );

    const slots = slotsState[selectedFloorArea] ?? [];

    const handleSlotPositionChange = async (slotId: string, newTime: string, newRowId: string) => {
        setSlotsState((prev) => {
            const nextAreaSlots = (prev[selectedFloorArea] ?? []).map((slot) =>
                slot.id === slotId
                    ? {
                          ...slot,
                          rowId: newRowId,
                          startTime: clampToTimeline(newTime, slot.duration),
                      }
                    : slot,
            );

            const nextState = {
                ...prev,
                [selectedFloorArea]: nextAreaSlots,
            };

            onSlotsChange?.(selectedFloorArea, nextAreaSlots);
            return nextState;
        });

        return true;
    };

    return (
        <section className={cn("rounded-lg border bg-card p-4", className)}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-semibold">Assignment Timeline</h3>
                    <p className="text-sm text-muted-foreground">
                        Drag assignments across stations and time windows.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 rounded-md border px-2 py-1 text-xs text-muted-foreground">
                        <Checkbox
                            checked={showAssignmentForecast}
                            onCheckedChange={(checked) => setShowAssignmentForecast(Boolean(checked))}
                        />
                        Show assignment forecast
                    </label>
                    <Badge variant="outline" className={cn(NORMALIZED_BADGE_CLASS, "text-xs") }>
                        {FLOOR_AREA_META[selectedFloorArea].label}
                    </Badge>
                    <Select
                        value={selectedFloorArea}
                        onValueChange={(value) => setSelectedFloorArea(value as FloorArea)}
                    >
                        <SelectTrigger className="w-42.5">
                            <SelectValue placeholder="Select LWC" />
                        </SelectTrigger>
                        <SelectContent>
                            {FLOOR_AREAS.map((area) => (
                                <SelectItem key={area} value={area}>
                                    {FLOOR_AREA_META[area].label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <TimelineProvider config={DEFAULT_CONFIG} percentageInView={100} onSlotPositionChange={handleSlotPositionChange}>
                <Timeline slots={slots} rows={rows} className="h-115 rounded-md">
                    <TimelineHeader columnLabel="Station" />
                    <TimelineGrid>
                        {rows.map((row) => (
                            <TimelineRow
                                key={row.id}
                                row={row}
                                slots={slots}
                                className="h-20 sm:h-24"
                                renderRowHeader={() => (
                                    <div className="w-full px-3 py-1">
                                        <p className="truncate text-xs font-semibold leading-4">{row.shortLabel}</p>
                                        <p className="truncate text-[11px] text-muted-foreground leading-4">{row.label}</p>
                                    </div>
                                )}
                            >
                                {(slot) => (
                                    <TimelineSlot slot={slot} className="overflow-visible rounded-lg border-2 border-sky-500 bg-zinc-100 text-zinc-800 shadow-sm">
                                        <div className="relative flex h-full min-w-0 flex-col justify-between rounded-md p-1.5 sm:p-2">
                                            {showAssignmentForecast && getForecastExtensionPercent(slot) > 0 && (
                                                <div
                                                    aria-hidden="true"
                                                    className="pointer-events-none absolute top-0 bottom-0 left-full -z-10 rounded-r-md border-y-2 border-r-2 border-dashed border-sky-500 bg-sky-100/30"
                                                    style={{
                                                        width: `${getForecastExtensionPercent(slot)}%`,
                                                        backgroundImage:
                                                            "repeating-linear-gradient(to right, rgba(15,23,42,0.25) 0px, rgba(15,23,42,0.25) 2px, transparent 2px, transparent 16px)",
                                                        backgroundPosition: "bottom",
                                                        backgroundRepeat: "repeat-x",
                                                        backgroundSize: "16px 18px",
                                                    }}
                                                >
                                                    <div className="absolute right-3 bottom-2 text-[10px] font-medium text-zinc-500">
                                                        Est. {Math.max(1, Math.round(getEstimatedMinutes(slot) / 60))} hrs
                                                    </div>
                                                </div>
                                            )}

                                            <div className="min-w-0 space-y-0.5">
                                                <div className="flex min-w-0 items-center gap-1">
                                                    <Badge className={cn(NORMALIZED_BADGE_CLASS, "max-w-28 bg-amber-400 text-zinc-900 hover:bg-amber-400") }>
                                                        <span className="truncate">{slot.id.split("-")[0]}</span>
                                                    </Badge>
                                                </div>
                                                <TimelineSlotLabel className="truncate text-[11px] font-bold uppercase leading-4 tracking-tight text-zinc-800 sm:text-sm">
                                                    {slot.assignmentLabel ?? slot.id}
                                                </TimelineSlotLabel>
                                                <TimelineSlotContent className="truncate text-[10px] font-semibold uppercase leading-4 text-sky-600 sm:text-xs">
                                                    {row.label}
                                                </TimelineSlotContent>
                                            </div>

                                            <div className="flex min-w-0 items-center justify-between gap-1">
                                                <TimelineSlotContent className="truncate text-[10px] text-zinc-600">
                                                    {slot.owner ?? "Unassigned"}
                                                </TimelineSlotContent>
                                                <div className="shrink-0">
                                                    <Badge variant="outline" className={cn(NORMALIZED_BADGE_CLASS, "border-zinc-300 bg-zinc-50 text-zinc-700") }>
                                                        {slot.status ?? "Not Started"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </TimelineSlot>
                                )}
                            </TimelineRow>
                        ))}
                        <TimelineCurrentTime />
                    </TimelineGrid>
                </Timeline>
            </TimelineProvider>
        </section>
    );
}
