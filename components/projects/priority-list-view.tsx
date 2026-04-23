"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    ChevronDown,
    ChevronRight,
    FileSpreadsheet,
    AlertCircle,
    Clock,
    Search,
    Package,
    Hammer,
    Layers,
    Wrench,
    Zap,
    ClipboardCheck,
    ShieldCheck,
    Check,
    X,
    CalendarIcon,
    Pencil,
    LayoutGrid,
    List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    parsePriorityListCSV,
} from "@/lib/priority-list/parse-priority-csv";
import {
    PRIORITY_STAGE_ORDER,
    PRIORITY_STAGE_CONFIG,
    type PriorityEntry,
    type PriorityListData,
    type PriorityStage,
} from "@/lib/priority-list/types";
import { ProjectPriorityCard, type ProjectPriorityCardVariant } from "@/components/projects/project-priority-card";

// ============================================================================
// Stage Icons
// ============================================================================

const STAGE_ICONS: Record<PriorityStage, React.ReactNode> = {
    upcoming: <Clock className="h-4 w-4" />,
    kitting: <Package className="h-4 w-4" />,
    conlay: <Layers className="h-4 w-4" />,
    conassy: <Hammer className="h-4 w-4" />,
    test: <Zap className="h-4 w-4" />,
    "pwr-check": <Wrench className="h-4 w-4" />,
    biq: <ClipboardCheck className="h-4 w-4" />,
    completed: <ShieldCheck className="h-4 w-4" />,
};

// ============================================================================
// API Helpers
// ============================================================================

async function loadPriorityList(): Promise<PriorityListData | null> {
    try {
        const res = await fetch("/api/schedule/priority-list");
        if (!res.ok) return null;
        const data = await res.json();
        return data as PriorityListData | null;
    } catch {
        return null;
    }
}

async function savePriorityList(data: PriorityListData): Promise<boolean> {
    try {
        const res = await fetch("/api/schedule/priority-list", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        return res.ok;
    } catch {
        return false;
    }
}

// ============================================================================
// Editable Cell Types
// ============================================================================

type EditableField =
    | "status"
    | "unitLocation"
    | "shortagesNotes"
    | "planConlay"
    | "conassy"
    | "target"
    | "concus"
    | "productionPlanner"
    | "stage"
    | "lwc";

interface FieldConfig {
    key: EditableField;
    label: string;
    type: "text" | "date" | "select" | "textarea";
    options?: { value: string; label: string }[];
}

const LWC_OPTIONS = [
    { value: "New", label: "New" },
    { value: "Onskid", label: "Onskid" },
    { value: "Offskid", label: "Offskid" },
    { value: "NTB", label: "NTB" },
];

const PLANNER_OPTIONS = [
    { value: "M. RUGNETA", label: "M. Rugneta" },
    { value: "E. GONZALEZ", label: "E. Gonzalez" },
    { value: "M. ANDREWS", label: "M. Andrews" },
];

const FIELD_CONFIG: Record<EditableField, FieldConfig> = {
    status: { key: "status", label: "Status", type: "text" },
    unitLocation: { key: "unitLocation", label: "Location", type: "text" },
    shortagesNotes: { key: "shortagesNotes", label: "Shortages & Notes", type: "textarea" },
    planConlay: { key: "planConlay", label: "Plan Conlay", type: "date" },
    conassy: { key: "conassy", label: "Conassy", type: "date" },
    target: { key: "target", label: "Target", type: "date" },
    concus: { key: "concus", label: "Concus", type: "date" },
    productionPlanner: {
        key: "productionPlanner",
        label: "Planner",
        type: "select",
        options: PLANNER_OPTIONS,
    },
    stage: {
        key: "stage",
        label: "Stage",
        type: "select",
        options: PRIORITY_STAGE_ORDER.map((s) => ({
            value: s,
            label: PRIORITY_STAGE_CONFIG[s].label,
        })),
    },
    lwc: {
        key: "lwc",
        label: "LWC",
        type: "select",
        options: LWC_OPTIONS,
    },
};

// ============================================================================
// Editable Cell Popover
// ============================================================================

interface EditableCellProps {
    value: string;
    field: EditableField;
    onSave: (value: string) => void;
    className?: string;
    children?: React.ReactNode;
}

function EditableCell({ value, field, onSave, className = "", children }: EditableCellProps) {
    const config = FIELD_CONFIG[field];
    const [isOpen, setIsOpen] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setEditValue(value);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, value]);

    const handleSave = useCallback(() => {
        onSave(editValue);
        setIsOpen(false);
    }, [editValue, onSave]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSave();
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        },
        [handleSave]
    );

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <td
                    className={`px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors group relative ${className}`}
                    title="Click to edit"
                >
                    {children ?? (
                        <span className="block truncate">{value || <span className="text-muted-foreground/50 italic">—</span>}</span>
                    )}
                    <Pencil className="h-3 w-3 absolute top-1 right-1 opacity-0 group-hover:opacity-40 text-muted-foreground" />
                </td>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3" side="bottom">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {config.label}
                    </label>

                    {config.type === "text" && (
                        <Input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-8 text-sm"
                        />
                    )}

                    {config.type === "date" && (
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    ref={inputRef as React.RefObject<HTMLInputElement>}
                                    type="date"
                                    value={parseDateForInput(editValue)}
                                    onChange={(e) => setEditValue(formatDateFromInput(e.target.value))}
                                    onKeyDown={handleKeyDown}
                                    className="h-8 text-sm pl-8"
                                />
                            </div>
                        </div>
                    )}

                    {config.type === "textarea" && (
                        <textarea
                            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setIsOpen(false);
                            }}
                            rows={3}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                    )}

                    {config.type === "select" && (
                        <Select
                            value={editValue}
                            onValueChange={(v) => {
                                setEditValue(v);
                                onSave(v);
                                setIsOpen(false);
                            }}
                        >
                            <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder={`Select ${config.label}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {config.options?.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {config.type !== "select" && (
                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 px-3 gap-1"
                                onClick={handleSave}
                            >
                                <Check className="h-3.5 w-3.5" />
                                Save
                            </Button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

/** Parse "MM/DD/YY" to "YYYY-MM-DD" for <input type="date"> */
function parseDateForInput(dateStr: string): string {
    if (!dateStr) return "";
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
        const month = match[1].padStart(2, "0");
        const day = match[2].padStart(2, "0");
        let year = match[3];
        if (year.length === 2) {
            year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        }
        return `${year}-${month}-${day}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    return "";
}

/** Convert "YYYY-MM-DD" back to "MM/DD/YY" display format */
function formatDateFromInput(isoStr: string): string {
    if (!isoStr) return "";
    const [year, month, day] = isoStr.split("-");
    const shortYear = year.slice(-2);
    return `${month}/${day}/${shortYear}`;
}

// ============================================================================
// Priority List Table Row (Editable)
// ============================================================================

interface PriorityTableRowProps {
    entry: PriorityEntry;
    onUpdateEntry: (id: string, field: string, value: string) => void;
}

function PriorityTableRow({ entry, onUpdateEntry }: PriorityTableRowProps) {
    const isOverdue = useMemo(() => {
        if (!entry.target) return false;
        const target = new Date(entry.target);
        return !isNaN(target.getTime()) && target < new Date() && entry.stage !== "completed";
    }, [entry.target, entry.stage]);

    const handleSave = useCallback(
        (field: string) => (value: string) => {
            onUpdateEntry(entry.id, field, value);
        },
        [entry.id, onUpdateEntry]
    );

    return (
        <tr className="border-b border-border/30 hover:bg-muted/30 transition-colors text-sm">
            {/* CM # — read only */}
            <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                {entry.cmNumber}
            </td>
            {/* Customer — read only */}
            <td className="px-3 py-2 font-medium max-w-[200px] truncate" title={entry.customer}>
                {entry.customer}
            </td>
            {/* Unit — read only */}
            <td className="px-3 py-2 text-center whitespace-nowrap">{entry.unit}</td>
            {/* PD — read only */}
            <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{entry.pd}</td>
            {/* LWC — editable select */}
            <EditableCell
                value={entry.lwc}
                field="lwc"
                onSave={handleSave("lwc")}
                className="whitespace-nowrap text-xs"
            />
            {/* Plan Conlay — editable date */}
            <EditableCell
                value={entry.planConlay}
                field="planConlay"
                onSave={handleSave("planConlay")}
                className="whitespace-nowrap text-xs"
            />
            {/* Conassy — editable date */}
            <EditableCell
                value={entry.conassy}
                field="conassy"
                onSave={handleSave("conassy")}
                className="whitespace-nowrap text-xs"
            />
            {/* Target — editable date */}
            <EditableCell
                value={entry.target}
                field="target"
                onSave={handleSave("target")}
                className={`whitespace-nowrap text-xs font-medium ${isOverdue ? "text-red-500" : ""}`}
            >
                <span className="block truncate">
                    {entry.target || <span className="text-muted-foreground/50 italic">—</span>}
                    {isOverdue && <AlertCircle className="inline-block h-3 w-3 ml-1 text-red-500" />}
                </span>
            </EditableCell>
            {/* Concus — editable date */}
            <EditableCell
                value={entry.concus}
                field="concus"
                onSave={handleSave("concus")}
                className="whitespace-nowrap text-xs"
            />
            {/* Planner — editable select */}
            <EditableCell
                value={entry.productionPlanner}
                field="productionPlanner"
                onSave={handleSave("productionPlanner")}
                className="whitespace-nowrap text-xs max-w-[120px]"
            />
            {/* Location — editable text */}
            <EditableCell
                value={entry.unitLocation}
                field="unitLocation"
                onSave={handleSave("unitLocation")}
                className="whitespace-nowrap text-xs max-w-[120px]"
            />
            {/* Status — editable text */}
            <EditableCell
                value={entry.status}
                field="status"
                onSave={handleSave("status")}
                className="text-xs max-w-[200px]"
            />
            {/* Shortages & Notes — editable textarea */}
            <EditableCell
                value={entry.shortagesNotes}
                field="shortagesNotes"
                onSave={handleSave("shortagesNotes")}
                className="text-xs max-w-[250px] text-muted-foreground"
            />
        </tr>
    );
}

// ============================================================================
// Collapsible Stage Section
// ============================================================================

interface StageSectionProps {
    stage: PriorityStage;
    entries: PriorityEntry[];
    defaultOpen?: boolean;
    onUpdateEntry: (id: string, field: string, value: string) => void;
}

function StageSection({ stage, entries, defaultOpen = true, onUpdateEntry }: StageSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const config = PRIORITY_STAGE_CONFIG[stage];

    if (entries.length === 0) return null;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <button
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-none border ${config.borderColor} ${config.bgColor} hover:opacity-90 transition-opacity cursor-pointer`}
                >
                    <span className={config.color}>{STAGE_ICONS[stage]}</span>
                    <span className={`font-semibold text-sm ${config.color}`}>
                        {config.label}
                    </span>
                    <Badge
                        variant="secondary"
                        className="ml-auto mr-2 text-xs tabular-nums"
                    >
                        {entries.length}
                    </Badge>
                    {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="mt-2 rounded-none border border-border/50 overflow-x-auto bg-card">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                                <th className="px-3 py-2 whitespace-nowrap">CM #</th>
                                <th className="px-3 py-2 whitespace-nowrap">Customer</th>
                                <th className="px-3 py-2 whitespace-nowrap text-center">Unit</th>
                                <th className="px-3 py-2 whitespace-nowrap">PD</th>
                                <th className="px-3 py-2 whitespace-nowrap">LWC</th>
                                <th className="px-3 py-2 whitespace-nowrap">Plan Conlay</th>
                                <th className="px-3 py-2 whitespace-nowrap">Conassy</th>
                                <th className="px-3 py-2 whitespace-nowrap">Target</th>
                                <th className="px-3 py-2 whitespace-nowrap">Concus</th>
                                <th className="px-3 py-2 whitespace-nowrap">Planner</th>
                                <th className="px-3 py-2 whitespace-nowrap">Location</th>
                                <th className="px-3 py-2 whitespace-nowrap">Status</th>
                                <th className="px-3 py-2 whitespace-nowrap">Shortages & Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <PriorityTableRow
                                    key={entry.id}
                                    entry={entry}
                                    onUpdateEntry={onUpdateEntry}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

// ============================================================================
// Empty / Import State
// ============================================================================

function ImportPrompt({ onImport }: { onImport: (file: File) => void }) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                onImport(file);
                e.target.value = "";
            }
        },
        [onImport]
    );

    return (
        <Card className="border-dashed border-border/50 bg-card/30">
            <CardContent className="flex flex-col items-center justify-center gap-6 py-16">
                <div className="rounded-xl bg-primary/10 p-4 border border-primary/20">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center max-w-md">
                    <h3 className="text-xl font-semibold text-foreground">
                        No Priority List Imported
                    </h3>
                    <p className="text-muted-foreground mt-2">
                        Import a Priority List CSV to track project schedules and progress
                        across all stages.
                    </p>
                </div>
                <Button
                    size="lg"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="h-5 w-5" />
                    Import CSV
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Main Priority List View
// ============================================================================

type ViewMode = "table" | "grid";

export function PriorityListView() {
    const [listData, setListData] = useState<PriorityListData | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const [cardVariant, setCardVariant] = useState<ProjectPriorityCardVariant>("compact");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    // Load persisted data on mount
    useEffect(() => {
        loadPriorityList().then((data) => {
            if (data) setListData(data);
            setIsLoading(false);
        });
    }, []);

    // Debounced save to API
    const persistData = useCallback((data: PriorityListData) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            await savePriorityList(data);
            setIsSaving(false);
        }, 500);
    }, []);

    const handleImport = useCallback(
        (file: File) => {
            setError(null);
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const data = parsePriorityListCSV(text, file.name);
                    if (data.entries.length === 0) {
                        setError("No valid entries found in CSV. Check the file format.");
                        return;
                    }
                    setListData(data);
                    persistData(data);
                } catch (err) {
                    console.error("Priority list CSV parse error:", err);
                    setError("Failed to parse CSV file. Ensure it follows the Priority List format.");
                }
            };
            reader.onerror = () => setError("Failed to read file.");
            reader.readAsText(file);
        },
        [persistData]
    );

    // Update a single entry field and persist
    const handleUpdateEntry = useCallback(
        (id: string, field: string, value: string) => {
            setListData((prev) => {
                if (!prev) return prev;
                const updated: PriorityListData = {
                    ...prev,
                    entries: prev.entries.map((entry) =>
                        entry.id === id ? { ...entry, [field]: value } : entry
                    ),
                };
                persistData(updated);
                return updated;
            });
        },
        [persistData]
    );

    // Group entries by stage, filtered by search
    const groupedEntries = useMemo(() => {
        if (!listData) return null;

        let entries = listData.entries;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            entries = entries.filter(
                (e) =>
                    e.cmNumber.toLowerCase().includes(q) ||
                    e.customer.toLowerCase().includes(q) ||
                    e.pd.toLowerCase().includes(q) ||
                    e.productionPlanner.toLowerCase().includes(q) ||
                    e.unitLocation.toLowerCase().includes(q) ||
                    e.status.toLowerCase().includes(q)
            );
        }

        const groups: Record<PriorityStage, PriorityEntry[]> = {
            upcoming: [],
            kitting: [],
            conlay: [],
            conassy: [],
            test: [],
            "pwr-check": [],
            biq: [],
            completed: [],
        };

        for (const entry of entries) {
            groups[entry.stage].push(entry);
        }

        return groups;
    }, [listData, searchQuery]);

    // Stage summary counts
    const stageCounts = useMemo(() => {
        if (!groupedEntries) return null;
        return PRIORITY_STAGE_ORDER.map((stage) => ({
            stage,
            count: groupedEntries[stage].length,
            config: PRIORITY_STAGE_CONFIG[stage],
        }));
    }, [groupedEntries]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm">Loading priority list...</span>
                </div>
            </div>
        );
    }

    if (!listData) {
        return (
            <div className="flex flex-col gap-0">
                <ImportPrompt onImport={handleImport} />
                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-none px-4 py-3">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">
                            {listData.filename}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {listData.entries.length} entries &middot; Imported{" "}
                            {new Date(listData.importedAt).toLocaleDateString()}
                            {isSaving && (
                                <span className="ml-2 text-primary">Saving...</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search priority list..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-64 bg-card/50 border-border/50 h-9 text-sm"
                        />
                    </div>
                    {/* View mode toggle */}
                    <div className="flex items-center rounded-lg border border-border/50 p-0.5">
                        <Button
                            variant={viewMode === "table" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setViewMode("table")}
                            title="Table view"
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setViewMode("grid")}
                            title="Grid view"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Card variant selector (only in grid mode) */}
                    {viewMode === "grid" && (
                        <Select
                            value={cardVariant}
                            onValueChange={(v) => setCardVariant(v as ProjectPriorityCardVariant)}
                        >
                            <SelectTrigger className="h-9 w-32 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="full">Full Card</SelectItem>
                                <SelectItem value="compact">Compact</SelectItem>
                                <SelectItem value="grid">Grid Layout</SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="h-4 w-4" />
                        Re-import
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                handleImport(file);
                                e.target.value = "";
                            }
                        }}
                    />
                </div>
            </div>

            {/* Stage Summary Bar */}
            {stageCounts && (
                <div className="flex flex-wrap gap-2">
                    {stageCounts
                        .filter((s) => s.count > 0)
                        .map(({ stage, count, config }) => (
                            <div
                                key={stage}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none border ${config.borderColor} ${config.bgColor}`}
                            >
                                <span className={config.color}>{STAGE_ICONS[stage]}</span>
                                <span className={`text-xs font-medium ${config.color}`}>
                                    {config.label}
                                </span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 h-4 ml-1">
                                    {count}
                                </Badge>
                            </div>
                        ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-none px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Stage Sections — Table View */}
            {groupedEntries && viewMode === "table" && (
                <div className="flex flex-col gap-0">
                    <AnimatePresence mode="popLayout">
                        {PRIORITY_STAGE_ORDER.map((stage) => {
                            const entries = groupedEntries[stage];
                            if (entries.length === 0) return null;

                            return (
                                <motion.div
                                    key={stage}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <StageSection
                                        stage={stage}
                                        entries={entries}
                                        defaultOpen={stage !== "completed"}
                                        onUpdateEntry={handleUpdateEntry}
                                    />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Stage Sections — Grid View */}
            {groupedEntries && viewMode === "grid" && (
                <div className="flex flex-col gap-6">
                    <AnimatePresence mode="popLayout">
                        {PRIORITY_STAGE_ORDER.map((stage) => {
                            const entries = groupedEntries[stage];
                            if (entries.length === 0) return null;
                            const config = PRIORITY_STAGE_CONFIG[stage];

                            return (
                                <motion.div
                                    key={stage}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <Collapsible defaultOpen={stage !== "completed"}>
                                        <CollapsibleTrigger asChild>
                                            <button
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border ${config.borderColor} ${config.bgColor} hover:opacity-90 transition-opacity cursor-pointer`}
                                            >
                                                <span className={config.color}>{STAGE_ICONS[stage]}</span>
                                                <span className={`font-semibold text-sm ${config.color}`}>
                                                    {config.label}
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="ml-auto mr-2 text-xs tabular-nums"
                                                >
                                                    {entries.length}
                                                </Badge>
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <div className={`mt-3 grid gap-4 ${cardVariant === "grid"
                                                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                                                    : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                                                }`}>
                                                {entries.map((entry) => (
                                                    <motion.div
                                                        key={entry.id}
                                                        initial={{ opacity: 0, scale: 0.97 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ duration: 0.12 }}
                                                    >
                                                        <ProjectPriorityCard
                                                            entry={entry}
                                                            variant={cardVariant}
                                                        />
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
