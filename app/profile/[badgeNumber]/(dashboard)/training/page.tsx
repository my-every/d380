"use client";

import { use, useMemo, useState } from "react";
import useSWR from "swr";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    GraduationCap,
    Plus,
    Search,
    MoreVertical,
    Edit2,
    Trash2,
    Loader2,
    Package,
    Layers,
    Clock,
    Copy,
    Settings2,
    Shield,
    Eye,
    ExternalLink,
    Lock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { TrainingModuleBuilder } from "@/components/training/training-module-builder";
import { TrainingPreview } from "@/components/training/training-preview";
import type { UserRole } from "@/types/d380-user-session";
import { USER_ROLE_LABELS } from "@/types/d380-user-session";
import type { TrainingCategory, TrainingSummary, TrainingModuleV2 } from "@/types/training";
import { createEmptyTrainingModuleV2 } from "@/types/training";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface TrainingPageProps {
    params: Promise<{ badgeNumber: string }>;
}

const ALL_ROLES: UserRole[] = [
    "DEVELOPER",
    "MANAGER",
    "SUPERVISOR",
    "TEAM_LEAD",
    "QA",
    "BRANDER",
    "ASSEMBLER",
];

function slugify(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

type EditableCategory = {
    previousId: string;
    id: string;
    label: string;
    description?: string;
    visibleRoles: UserRole[];
};

export default function TrainingPage({ params }: TrainingPageProps) {
    const { badgeNumber } = use(params);
    const { user } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const selectedCategory = searchParams.get("category") ?? "all";

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
    const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("updated-desc");
    const [showBuilder, setShowBuilder] = useState(false);
    const [editingModule, setEditingModule] = useState<TrainingModuleV2 | null>(null);
    const [isCategoriesDialogOpen, setIsCategoriesDialogOpen] = useState(false);
    const [previewTrainingId, setPreviewTrainingId] = useState<string | null>(null);
    const [newCategoryLabel, setNewCategoryLabel] = useState("");
    const [newCategoryDescription, setNewCategoryDescription] = useState("");
    const [newCategoryRoles, setNewCategoryRoles] = useState<UserRole[]>(ALL_ROLES);
    const [pendingCategoryEdits, setPendingCategoryEdits] = useState<Record<string, EditableCategory>>({});

    const trainingQueryParams = useMemo(() => {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (selectedCategory !== "all") params.set("category", selectedCategory);
        if (user?.role) params.set("role", user.role);
        return params;
    }, [statusFilter, selectedCategory, user?.role]);
    
    const { data, mutate, isLoading } = useSWR<{ trainings: TrainingSummary[] }>(
        `/api/training${trainingQueryParams.toString() ? `?${trainingQueryParams.toString()}` : ""}`,
        fetcher
    );

    const { data: visibleCategoriesData, mutate: mutateVisibleCategories } = useSWR<{ categories: TrainingCategory[] }>(
        user?.role ? `/api/training/categories?role=${encodeURIComponent(user.role)}` : null,
        fetcher
    );

    const { data: allCategoriesData, mutate: mutateAllCategories } = useSWR<{ categories: TrainingCategory[] }>(
        "/api/training/categories",
        fetcher
    );

    const { data: previewData, isLoading: isPreviewLoading } = useSWR<{ training: TrainingModuleV2 }>(
        previewTrainingId ? `/api/training/${previewTrainingId}` : null,
        fetcher
    );

    const visibleCategories = visibleCategoriesData?.categories ?? [];
    const allCategories = allCategoriesData?.categories ?? [];
    const selectedCategoryLabel =
        visibleCategories.find((category) => category.id === selectedCategory)?.label || selectedCategory;
    
    const trainings = data?.trainings ?? [];

    const filteredTrainings = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        const filtered = trainings.filter((training) => {
            const matchesQuery = !query
                || training.name.toLowerCase().includes(query)
                || training.description?.toLowerCase().includes(query);

            const matchesDifficulty =
                difficultyFilter === "all" || (training.difficulty || "unknown") === difficultyFilter;

            const matchesVisibility =
                visibilityFilter === "all" || (training.visibility || "everyone") === visibilityFilter;

            return matchesQuery && matchesDifficulty && matchesVisibility;
        });

        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "updated-asc":
                    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                case "updated-desc":
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                case "parts-desc":
                    return b.partCount - a.partCount;
                case "parts-asc":
                    return a.partCount - b.partCount;
                default:
                    return 0;
            }
        });
    }, [trainings, searchQuery, difficultyFilter, visibilityFilter, sortBy]);

    const dashboardStats = useMemo(() => {
        const published = trainings.filter((entry) => entry.status === "published").length;
        const drafts = trainings.filter((entry) => entry.status === "draft").length;
        const restricted = trainings.filter((entry) => (entry.visibility || "everyone") !== "everyone").length;
        return {
            total: trainings.length,
            published,
            drafts,
            restricted,
        };
    }, [trainings]);
    
    const handleCreateNew = () => {
        if (selectedCategory !== "all") {
            const seed = createEmptyTrainingModuleV2(`training-${Date.now()}`, "New Training Module");
            setEditingModule({ ...seed, category: selectedCategory });
        } else {
            setEditingModule(null);
        }
        setShowBuilder(true);
    };

    const handleCategoryChange = (categoryId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (categoryId === "all") {
            params.delete("category");
        } else {
            params.set("category", categoryId);
        }

        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname);
    };

    const updatePendingCategory = (category: EditableCategory) => {
        setPendingCategoryEdits((previous) => ({
            ...previous,
            [category.previousId]: category,
        }));
    };

    const upsertPendingCategoryRole = (previousId: string, role: UserRole, checked: boolean) => {
        const source = pendingCategoryEdits[previousId]
            || (() => {
                const category = allCategories.find((entry) => entry.id === previousId);
                return category
                    ? {
                        previousId: category.id,
                        id: category.id,
                        label: category.label,
                        description: category.description,
                        visibleRoles: [...category.visibleRoles],
                    }
                    : null;
            })();

        if (!source) return;

        const nextRoles = checked
            ? Array.from(new Set([...source.visibleRoles, role]))
            : source.visibleRoles.filter((entry) => entry !== role);

        updatePendingCategory({
            ...source,
            visibleRoles: nextRoles.length > 0 ? nextRoles : [role],
        });
    };

    const handleCreateCategory = async () => {
        const trimmed = newCategoryLabel.trim();
        if (!trimmed) return;

        const response = await fetch("/api/training/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                label: trimmed,
                id: slugify(trimmed),
                description: newCategoryDescription.trim() || undefined,
                visibleRoles: newCategoryRoles,
            }),
        });

        if (!response.ok) {
            console.error("Failed to create training category");
            return;
        }

        setNewCategoryLabel("");
        setNewCategoryDescription("");
        setNewCategoryRoles(ALL_ROLES);
        mutateAllCategories();
        mutateVisibleCategories();
    };

    const handleSaveCategory = async (previousId: string) => {
        const pending = pendingCategoryEdits[previousId];
        if (!pending) return;

        const response = await fetch("/api/training/categories", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                previousId: pending.previousId,
                id: slugify(pending.id),
                label: pending.label,
                description: pending.description,
                visibleRoles: pending.visibleRoles,
            }),
        });

        if (!response.ok) {
            console.error("Failed to update training category");
            return;
        }

        setPendingCategoryEdits((previous) => {
            const next = { ...previous };
            delete next[previousId];
            return next;
        });

        mutateAllCategories();
        mutateVisibleCategories();
        mutate();
    };

    const handleDeleteCategory = async (categoryId: string) => {
        const response = await fetch("/api/training/categories", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: categoryId }),
        });

        if (!response.ok) {
            console.error("Failed to delete training category");
            return;
        }

        if (selectedCategory === categoryId) {
            handleCategoryChange("all");
        }

        mutateAllCategories();
        mutateVisibleCategories();
        mutate();
    };
    
    const handleEdit = async (id: string) => {
        try {
            const res = await fetch(`/api/training/${id}`);
            if (res.ok) {
                const { training } = await res.json();
                setEditingModule(training);
                setShowBuilder(true);
            }
        } catch (error) {
            console.error("Failed to load training:", error);
        }
    };
    
    const handleDuplicate = async (id: string) => {
        try {
            const res = await fetch(`/api/training/${id}`);
            if (res.ok) {
                const { training } = await res.json();
                // Create a copy with new ID
                const duplicate: TrainingModuleV2 = {
                    ...training,
                    id: `training-${Date.now()}`,
                    name: `${training.name} (Copy)`,
                    slug: `${training.slug}-copy-${Date.now()}`,
                    status: "draft" as const,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    publishedAt: undefined,
                };
                setEditingModule(duplicate);
                setShowBuilder(true);
            }
        } catch (error) {
            console.error("Failed to duplicate training:", error);
        }
    };
    
    const handleSave = async (module: TrainingModuleV2) => {
        const isNew = !editingModule || editingModule.id !== module.id || !trainings.some(t => t.id === module.id);
        
        const res = await fetch(
            isNew ? "/api/training" : `/api/training/${module.id}`,
            {
                method: isNew ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(module),
            }
        );
        
        if (!res.ok) {
            throw new Error("Failed to save training module");
        }
        
        mutate();
    };
    
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this training?")) return;
        
        const res = await fetch(`/api/training/${id}`, { method: "DELETE" });
        if (res.ok) {
            mutate();
        }
    };
    
    const getDifficultyColor = (difficulty?: string) => {
        switch (difficulty) {
            case "beginner": return "bg-green-100 text-green-800";
            case "intermediate": return "bg-yellow-100 text-yellow-800";
            case "advanced": return "bg-red-100 text-red-800";
            default: return "bg-muted text-muted-foreground";
        }
    };
    
    const getStatusColor = (status: string) => {
        switch (status) {
            case "published": return "bg-green-100 text-green-800";
            case "draft": return "bg-yellow-100 text-yellow-800";
            case "archived": return "bg-muted text-muted-foreground";
            default: return "bg-muted text-muted-foreground";
        }
    };
    
    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Training Modules</h1>
                    <p className="text-muted-foreground">
                        Create and manage role-scoped training content
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Dialog open={isCategoriesDialogOpen} onOpenChange={setIsCategoriesDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-1.5">
                                <Settings2 className="h-4 w-4" />
                                Categories
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Training Categories</DialogTitle>
                                <DialogDescription>
                                    Add, rename, delete categories, and set role visibility.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                                {allCategories.map((category) => {
                                    const draft = pendingCategoryEdits[category.id] ?? {
                                        previousId: category.id,
                                        id: category.id,
                                        label: category.label,
                                        description: category.description,
                                        visibleRoles: [...category.visibleRoles],
                                    };

                                    return (
                                        <div key={category.id} className="rounded-lg border p-3 space-y-2">
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                <Input
                                                    value={draft.label}
                                                    onChange={(event) => updatePendingCategory({ ...draft, label: event.target.value })}
                                                    placeholder="Category name"
                                                />
                                                <Input
                                                    value={draft.id}
                                                    onChange={(event) => updatePendingCategory({ ...draft, id: event.target.value })}
                                                    placeholder="category-id"
                                                />
                                            </div>
                                            <Input
                                                value={draft.description ?? ""}
                                                onChange={(event) => updatePendingCategory({ ...draft, description: event.target.value })}
                                                placeholder="Optional description"
                                            />

                                            <div className="space-y-1">
                                                <Label className="text-xs">Visible Roles</Label>
                                                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                                    {ALL_ROLES.map((role) => {
                                                        const checked = draft.visibleRoles.includes(role);
                                                        return (
                                                            <label key={role} className="flex items-center gap-2 rounded border px-2 py-1 text-xs cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={(event) => upsertPendingCategoryRole(category.id, role, event.target.checked)}
                                                                />
                                                                <span>{USER_ROLE_LABELS[role]}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                                    Delete
                                                </Button>
                                                <Button size="sm" onClick={() => handleSaveCategory(category.id)}>
                                                    Save
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="rounded-lg border border-dashed p-3 space-y-2">
                                    <p className="text-sm font-medium">Add Category</p>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <Input
                                            value={newCategoryLabel}
                                            onChange={(event) => setNewCategoryLabel(event.target.value)}
                                            placeholder="Category label"
                                        />
                                        <Input
                                            value={newCategoryDescription}
                                            onChange={(event) => setNewCategoryDescription(event.target.value)}
                                            placeholder="Optional description"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                        {ALL_ROLES.map((role) => {
                                            const checked = newCategoryRoles.includes(role);
                                            return (
                                                <label key={role} className="flex items-center gap-2 rounded border px-2 py-1 text-xs cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(event) => {
                                                            setNewCategoryRoles((previous) => {
                                                                if (event.target.checked) {
                                                                    return Array.from(new Set([...previous, role]));
                                                                }
                                                                const filtered = previous.filter((entry) => entry !== role);
                                                                return filtered.length > 0 ? filtered : [role];
                                                            });
                                                        }}
                                                    />
                                                    <span>{USER_ROLE_LABELS[role]}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreateCategory}>
                                            <Plus className="h-4 w-4 mr-1" />
                                            Add Category
                                        </Button>
                                    </DialogFooter>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button onClick={handleCreateNew}>
                        <Plus className="h-4 w-4 mr-1" />
                        New Training
                    </Button>
                </div>
            </div>
            
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-2xl font-semibold">{dashboardStats.total}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Published</p>
                        <p className="text-2xl font-semibold text-green-700">{dashboardStats.published}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Drafts</p>
                        <p className="text-2xl font-semibold text-amber-700">{dashboardStats.drafts}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Restricted</p>
                        <p className="text-2xl font-semibold text-zinc-700">{dashboardStats.restricted}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    onClick={() => handleCategoryChange("all")}
                >
                    All
                </Button>
                {visibleCategories.map((category) => (
                    <Button
                        key={category.id}
                        type="button"
                        size="sm"
                        variant={selectedCategory === category.id ? "default" : "outline"}
                        onClick={() => handleCategoryChange(category.id)}
                        className="max-w-full"
                    >
                        <span className="truncate">{category.label}</span>
                    </Button>
                ))}
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="space-y-3 p-4">
                    <div className="relative w-full md:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search training modules..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Difficulty</SelectItem>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Visibility" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Visibility</SelectItem>
                                <SelectItem value="everyone">Everyone</SelectItem>
                                <SelectItem value="restricted">Restricted</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger>
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="updated-desc">Newest Updated</SelectItem>
                                <SelectItem value="updated-asc">Oldest Updated</SelectItem>
                                <SelectItem value="name-asc">Name A-Z</SelectItem>
                                <SelectItem value="name-desc">Name Z-A</SelectItem>
                                <SelectItem value="parts-desc">Most Parts</SelectItem>
                                <SelectItem value="parts-asc">Least Parts</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            
            {/* Training List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : filteredTrainings.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        {selectedCategory !== "all" ? (
                            <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        ) : (
                            <GraduationCap className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        )}
                        <h3 className="text-lg font-medium">
                            {selectedCategory !== "all"
                                ? `No trainings in ${selectedCategoryLabel}`
                                : "No training modules yet"}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
                            {selectedCategory !== "all"
                                ? `This category has no modules available for your role yet. Create one to get started.`
                                : "Create your first training module to get started."}
                        </p>
                        <Button className="mt-4" onClick={handleCreateNew}>
                            <Plus className="h-4 w-4 mr-1" />
                            {selectedCategory !== "all" ? `Create ${selectedCategoryLabel} Training` : "Create Training"}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredTrainings.map((training) => (
                        <Card key={training.id} className="group gap-2 pt-0 transition-shadow hover:shadow-md">
                            {training.coverImageUrl ? (
                                <div className="relative h-32 w-full overflow-hidden rounded-t-lg border-b">
                                    <img
                                        src={training.coverImageUrl}
                                        alt={training.name}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-t-lg border-b bg-linear-to-br from-muted/70 to-muted">
                                    <GraduationCap className="h-8 w-8 text-muted-foreground/70" />
                                </div>
                            )}
                            <CardHeader className="px-3 pb-2 pt-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="line-clamp-1 text-base font-semibold">
                                            {training.name}
                                        </CardTitle>
                                        {training.description && (
                                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                                {training.description}
                                            </p>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-70 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEdit(training.id)}>
                                                <Edit2 className="h-4 w-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDuplicate(training.id)}>
                                                <Copy className="h-4 w-4 mr-2" />
                                                Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(training.id)}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 px-3 pb-3 pt-0">
                                <div className="flex flex-wrap gap-2">
                                    {training.category && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {visibleCategories.find((category) => category.id === training.category)?.label || training.category}
                                        </Badge>
                                    )}
                                    <Badge variant="secondary" className={cn("text-[10px]", getStatusColor(training.status))}>
                                        {training.status}
                                    </Badge>
                                    {training.difficulty && (
                                        <Badge variant="secondary" className={cn("text-[10px]", getDifficultyColor(training.difficulty))}>
                                            {training.difficulty}
                                        </Badge>
                                    )}
                                    {(training.visibility || "everyone") !== "everyone" && (
                                        <Badge variant="outline" className="text-[10px] border-zinc-300 text-zinc-700">
                                            Restricted
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Package className="h-3.5 w-3.5" />
                                        <span>{training.partCount} parts</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Layers className="h-3.5 w-3.5" />
                                        <span>{training.stageCount} stages</span>
                                    </div>
                                    {training.totalEstimatedMinutes ? (
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>{training.totalEstimatedMinutes} min</span>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => setPreviewTrainingId(training.id)}
                                    >
                                        <Eye className="h-3.5 w-3.5 mr-1" />
                                        Preview
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        asChild
                                    >
                                        <a href={`/profile/${badgeNumber}/training/${training.id}`}>
                                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                            Open
                                        </a>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={!!previewTrainingId} onOpenChange={(open) => !open && setPreviewTrainingId(null)}>
                <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden p-0">
                    <DialogHeader className="border-b px-5 pt-4 pb-2">
                        <DialogTitle>Training Module Preview</DialogTitle>
                        <DialogDescription>
                            Preview respects module visibility rules.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative overflow-auto p-4">
                        {isPreviewLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : previewData?.training ? (
                            <>
                                <TrainingPreview module={previewData.training} />
                                {(previewData.training.visibility || "everyone") !== "everyone" && (
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6">
                                        <div className="max-w-md rounded-lg border bg-background p-4 text-center shadow-lg">
                                            <Lock className="h-8 w-8 mx-auto text-amber-600" />
                                            <h3 className="mt-2 text-base font-semibold">Preview Restricted</h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                This module is restricted. Set visibility to Everyone to enable preview overlays.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                                Could not load training preview.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Training Module Builder */}
            <TrainingModuleBuilder
                isOpen={showBuilder}
                onClose={() => {
                    setShowBuilder(false);
                    setEditingModule(null);
                }}
                initialModule={editingModule}
                onSave={handleSave}
            />
        </div>
    );
}
