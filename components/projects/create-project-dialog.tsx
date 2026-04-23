"use client";

/**
 * CreateProjectDialog
 *
 * Dialog for creating a new project without requiring legals upload.
 * Collects: project name, PD number, unit number, revision, LWC type,
 *           due date, plan ConLay date, plan ConAssy date, color.
 *
 * Optionally allows uploading UCP or layout PDF later.
 */

import { useState, useCallback } from "react";
import {
    Plus,
    Loader2,
    FolderPlus,
    Calendar,
    FileSpreadsheet,
    Palette,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type LwcType, LWC_TYPE_REGISTRY, type ProjectModel } from "@/lib/workbook/types";
import { useProjectContext } from "@/contexts/project-context";

// ============================================================================
// Types
// ============================================================================

export interface CreateProjectDialogProps {
    /** Trigger element — if omitted, renders default button */
    trigger?: React.ReactNode;
    /** Called after project is created */
    onCreated?: (projectId: string) => void;
    className?: string;
}

interface CreateProjectForm {
    name: string;
    pdNumber: string;
    unitNumber: string;
    revision: string;
    lwcType: LwcType | "";
    dueDate: string;
    planConlayDate: string;
    planConassyDate: string;
    shipDate: string;
    color: string;
}

const DEFAULT_FORM: CreateProjectForm = {
    name: "",
    pdNumber: "",
    unitNumber: "",
    revision: "",
    lwcType: "",
    dueDate: "",
    planConlayDate: "",
    planConassyDate: "",
    shipDate: "",
    color: "#D4A84B",
};

const COLOR_PRESETS = [
    "#D4A84B", "#3B82F6", "#10B981", "#8B5CF6",
    "#F59E0B", "#EF4444", "#06B6D4", "#F97316",
    "#EC4899", "#6366F1", "#14B8A6", "#84CC16",
];

// ============================================================================
// Component
// ============================================================================

export function CreateProjectDialog({
    trigger,
    onCreated,
    className,
}: CreateProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<CreateProjectForm>({ ...DEFAULT_FORM });
    const [creating, setCreating] = useState(false);
    const { saveProject } = useProjectContext();

    const updateField = useCallback(<K extends keyof CreateProjectForm>(
        key: K,
        value: CreateProjectForm[K],
    ) => {
        setForm(prev => ({ ...prev, [key]: value }));
    }, []);

    const isValid = form.name.trim().length > 0;

    const handleCreate = useCallback(async () => {
        if (!isValid) return;
        setCreating(true);

        // Build a minimal ProjectModel for a pre-legals project
        const now = new Date();
        const projectId = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const model: ProjectModel = {
            id: projectId,
            filename: `${form.name.trim()}.xlsx`,
            name: form.name.trim(),
            pdNumber: form.pdNumber.trim() || undefined,
            unitNumber: form.unitNumber.trim() || undefined,
            revision: form.revision.trim() || undefined,
            lwcType: (form.lwcType as LwcType) || undefined,
            dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
            planConlayDate: form.planConlayDate ? new Date(form.planConlayDate) : undefined,
            planConassyDate: form.planConassyDate ? new Date(form.planConassyDate) : undefined,
            shipDate: form.shipDate ? new Date(form.shipDate) : undefined,
            color: form.color,
            sheets: [],
            sheetData: {},
            createdAt: now,
            warnings: [],
            status: "legals_pending",
            lifecycleGates: [
                { gateId: "LEGALS_READY", status: "LOCKED" },
                { gateId: "BRANDLIST_COMPLETE", status: "LOCKED" },
                { gateId: "BRANDING_READY", status: "LOCKED" },
                { gateId: "KITTING_READY", status: "LOCKED" },
            ],
        };

        // Simulate slight delay for UX
        await new Promise(r => setTimeout(r, 400));

        saveProject(model);
        onCreated?.(projectId);
        setCreating(false);
        setForm({ ...DEFAULT_FORM });
        setOpen(false);
    }, [form, isValid, saveProject, onCreated]);

    const handleOpenChange = useCallback((next: boolean) => {
        setOpen(next);
        if (!next) {
            setForm({ ...DEFAULT_FORM });
        }
    }, []);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button size="sm" className={cn("gap-1.5", className)}>
                        <Plus className="h-4 w-4" />
                        New Project
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderPlus className="h-5 w-5 text-muted-foreground" />
                        Create Project
                    </DialogTitle>
                    <DialogDescription>
                        Create a project placeholder for scheduling and planning.
                        Legals can be uploaded later when ready.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    {/* Project Name */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="project-name" className="text-xs font-medium">
                            Project Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="project-name"
                            placeholder="e.g. MER-SOL, TRP-NAU"
                            value={form.name}
                            onChange={e => updateField("name", e.target.value)}
                            className="h-9"
                            autoFocus
                        />
                    </div>

                    {/* PD Number + Unit + Revision (row) */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="pd-number" className="text-xs font-medium">PD Number</Label>
                            <Input
                                id="pd-number"
                                placeholder="4M371"
                                value={form.pdNumber}
                                onChange={e => updateField("pdNumber", e.target.value.toUpperCase().slice(0, 5))}
                                className="h-9 font-mono"
                                maxLength={5}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="unit-number" className="text-xs font-medium">Unit</Label>
                            <Input
                                id="unit-number"
                                placeholder="1"
                                value={form.unitNumber}
                                onChange={e => updateField("unitNumber", e.target.value)}
                                className="h-9"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="revision" className="text-xs font-medium">Revision</Label>
                            <Input
                                id="revision"
                                placeholder="B.1"
                                value={form.revision}
                                onChange={e => updateField("revision", e.target.value)}
                                className="h-9 font-mono"
                            />
                        </div>
                    </div>

                    {/* LWC Type */}
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium">LWC Type</Label>
                        <Select
                            value={form.lwcType}
                            onValueChange={v => updateField("lwcType", v as LwcType)}
                        >
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select LWC type..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(LWC_TYPE_REGISTRY).map(lwc => (
                                    <SelectItem key={lwc.id} value={lwc.id}>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: lwc.dotColor }}
                                            />
                                            {lwc.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* Dates */}
                    <div className="grid gap-3">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            Planning Dates
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1">
                                <Label htmlFor="due-date" className="text-[11px] text-muted-foreground">Due Date</Label>
                                <Input
                                    id="due-date"
                                    type="date"
                                    value={form.dueDate}
                                    onChange={e => updateField("dueDate", e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label htmlFor="plan-conlay" className="text-[11px] text-muted-foreground">Plan ConLay</Label>
                                <Input
                                    id="plan-conlay"
                                    type="date"
                                    value={form.planConlayDate}
                                    onChange={e => updateField("planConlayDate", e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label htmlFor="plan-conassy" className="text-[11px] text-muted-foreground">Plan ConAssy</Label>
                                <Input
                                    id="plan-conassy"
                                    type="date"
                                    value={form.planConassyDate}
                                    onChange={e => updateField("planConassyDate", e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label htmlFor="ship-date" className="text-[11px] text-muted-foreground">Ship Date</Label>
                                <Input
                                    id="ship-date"
                                    type="date"
                                    value={form.shipDate}
                                    onChange={e => updateField("shipDate", e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Color */}
                    <div className="grid gap-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                            Project Color
                        </Label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {COLOR_PRESETS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    className={cn(
                                        "h-6 w-6 rounded-full border-2 transition-all",
                                        form.color === color
                                            ? "border-foreground scale-110 shadow-sm"
                                            : "border-transparent hover:border-muted-foreground/30",
                                    )}
                                    style={{ backgroundColor: color }}
                                    onClick={() => updateField("color", color)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <div className="flex items-center gap-2 w-full">
                        <Badge variant="outline" className="text-[10px] text-muted-foreground mr-auto">
                            Legals not required
                        </Badge>
                        <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={creating}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={!isValid || creating} className="gap-1.5">
                            {creating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FolderPlus className="h-4 w-4" />
                            )}
                            {creating ? "Creating..." : "Create Project"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
