"use client";

import { use, useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Loader2,
    Save,
    Package,
    ChevronDown,
    ChevronRight,
    Clock,
    AlertTriangle,
    Lightbulb,
    X,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
    TrainingModuleV2,
    TrainingStage,
    TrainingSection,
} from "@/types/training";
import { TRAINING_STAGES, TRAINING_STAGE_INFO } from "@/types/training";
import { cn } from "@/lib/utils";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Failed to load training");
    }
    return payload;
};

interface TrainingEditorPageProps {
    params: Promise<{ badgeNumber: string; id: string }>;
}

const CATEGORY_ROUTE_IDS = new Set([
    "app",
    "onboarding",
    "safety",
    "device",
    "tool",
    "preparation",
    "buildup",
    "wiring",
    "cross-wiring",
    "testing",
]);

export default function TrainingEditorPage({ params }: TrainingEditorPageProps) {
    const { badgeNumber, id } = use(params);
    const router = useRouter();

    useEffect(() => {
        if (CATEGORY_ROUTE_IDS.has(id)) {
            router.replace(`/profile/${badgeNumber}/training?category=${encodeURIComponent(id)}`);
        }
    }, [id, badgeNumber, router]);

    if (CATEGORY_ROUTE_IDS.has(id)) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const { data, mutate, isLoading, error } = useSWR<{ training: TrainingModuleV2 }>(
        `/api/training/${id}`,
        fetcher
    );
    
    const [training, setTraining] = useState<TrainingModuleV2 | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [expandedStages, setExpandedStages] = useState<Set<TrainingStage>>(new Set());
    const [newPartNumber, setNewPartNumber] = useState("");
    
    // Sync from API data
    if (data?.training && !training) {
        setTraining(data.training);
    }
    
    const updateTraining = useCallback((updates: Partial<TrainingModuleV2>) => {
        setTraining(prev => {
            if (!prev) return prev;
            return { ...prev, ...updates };
        });
        setHasChanges(true);
    }, []);
    
    const toggleStageEnabled = useCallback((stage: TrainingStage) => {
        setTraining(prev => {
            if (!prev) return prev;
            const isEnabled = prev.enabledStages.includes(stage);
            return {
                ...prev,
                enabledStages: isEnabled
                    ? prev.enabledStages.filter(s => s !== stage)
                    : [...prev.enabledStages, stage],
            };
        });
        setHasChanges(true);
    }, []);
    
    const addPartNumber = useCallback(() => {
        if (!newPartNumber.trim()) return;
        setTraining(prev => {
            if (!prev) return prev;
            if (prev.partNumbers.includes(newPartNumber.trim())) return prev;
            return { ...prev, partNumbers: [...prev.partNumbers, newPartNumber.trim()] };
        });
        setNewPartNumber("");
        setHasChanges(true);
    }, [newPartNumber]);
    
    const removePartNumber = useCallback((pn: string) => {
        setTraining(prev => {
            if (!prev) return prev;
            return { ...prev, partNumbers: prev.partNumbers.filter(p => p !== pn) };
        });
        setHasChanges(true);
    }, []);
    
    const handleSave = async () => {
        if (!training) return;
        
        setIsSaving(true);
        try {
            const res = await fetch(`/api/training/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(training),
            });
            
            if (res.ok) {
                const updated = await res.json();
                setTraining(updated.training);
                mutate(updated);
                setHasChanges(false);
            }
        } finally {
            setIsSaving(false);
        }
    };
    
    const toggleStageExpanded = (stage: TrainingStage) => {
        setExpandedStages(prev => {
            const next = new Set(prev);
            if (next.has(stage)) {
                next.delete(stage);
            } else {
                next.add(stage);
            }
            return next;
        });
    };
    
    // Get sections for a specific stage
    const getSectionsForStage = (stage: TrainingStage): TrainingSection[] => {
        if (!training) return [];
        return training.sections
            .filter(s => s.stage === stage)
            .sort((a, b) => a.order - b.order);
    };

    if (error) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertTriangle className="h-10 w-10 text-amber-600 mb-3" />
                        <h2 className="text-lg font-semibold">Training Not Found</h2>
                        <p className="text-sm text-muted-foreground mt-1 max-w-md">
                            The training module "{id}" does not exist or could not be loaded.
                        </p>
                        <Link href={`/profile/${badgeNumber}/training`} className="mt-4">
                            <Button>
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back to Training Modules
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (isLoading || !training) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/profile/${badgeNumber}/training`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{training.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            Version {training.version} - Last updated {new Date(training.updatedAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={training.status}
                        onValueChange={(v) => updateTraining({ status: v as TrainingModuleV2["status"] })}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                    </Button>
                </div>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
                {/* Main Content - Stages */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Training Stages</h2>
                    
                    {TRAINING_STAGES.map((stage, stageIndex) => {
                        const stageInfo = TRAINING_STAGE_INFO[stage];
                        const isExpanded = expandedStages.has(stage);
                        const isEnabled = training.enabledStages.includes(stage);
                        const stageSections = getSectionsForStage(stage);
                        
                        return (
                            <Card key={stage} className={cn(!isEnabled && "opacity-60")}>
                                <Collapsible open={isExpanded} onOpenChange={() => toggleStageExpanded(stage)}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CollapsibleTrigger asChild>
                                                <button className="flex items-center gap-2 text-left">
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                    <CardTitle className="text-base">
                                                        {stageIndex + 1}. {stageInfo.label}
                                                    </CardTitle>
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        {stageSections.length} sections
                                                    </Badge>
                                                </button>
                                            </CollapsibleTrigger>
                                            <Switch
                                                checked={isEnabled}
                                                onCheckedChange={() => toggleStageEnabled(stage)}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground pl-6">
                                            {stageInfo.description}
                                        </p>
                                    </CardHeader>
                                    
                                    <CollapsibleContent>
                                        <CardContent className="pt-0 space-y-4">
                                            {/* Sections */}
                                            {stageSections.length === 0 ? (
                                                <p className="text-sm text-muted-foreground py-4 text-center">
                                                    No sections for this stage. Use the builder to add content.
                                                </p>
                                            ) : (
                                                stageSections.map((section) => (
                                                    <div
                                                        key={section.id}
                                                        className="border rounded-lg p-4 space-y-2 bg-muted/30"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-sm">{section.title}</span>
                                                            <Badge variant="outline" className="text-[10px]">
                                                                {section.type}
                                                            </Badge>
                                                        </div>
                                                        {!section.visible && (
                                                            <Badge variant="secondary" className="text-[10px]">
                                                                Hidden
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </CardContent>
                                    </CollapsibleContent>
                                </Collapsible>
                            </Card>
                        );
                    })}
                </div>
                
                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    value={training.name}
                                    onChange={(e) => updateTraining({ name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={training.description || ""}
                                    onChange={(e) => updateTraining({ description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Difficulty</Label>
                                <Select
                                    value={training.difficulty}
                                    onValueChange={(v) => updateTraining({ difficulty: v as TrainingModuleV2["difficulty"] })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Estimated Time (min)</Label>
                                <Input
                                    type="number"
                                    value={training.totalEstimatedMinutes || ""}
                                    onChange={(e) => updateTraining({ 
                                        totalEstimatedMinutes: e.target.value ? parseInt(e.target.value) : undefined 
                                    })}
                                    placeholder="30"
                                />
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Part Numbers */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Applicable Parts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-2">
                                <Input
                                    value={newPartNumber}
                                    onChange={(e) => setNewPartNumber(e.target.value)}
                                    placeholder="Part number"
                                    onKeyDown={(e) => e.key === "Enter" && addPartNumber()}
                                />
                                <Button size="sm" onClick={addPartNumber} disabled={!newPartNumber.trim()}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            {training.partNumbers.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {training.partNumbers.map((pn) => (
                                        <Badge key={pn} variant="secondary" className="gap-1">
                                            {pn}
                                            <button
                                                onClick={() => removePartNumber(pn)}
                                                className="ml-1 hover:text-destructive"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    No part numbers assigned yet
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
