"use client";

import { use, useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import {
    Package,
    Search,
    Plus,
    Filter,
    MoreVertical,
    Edit2,
    Trash2,
    Loader2,
    Grid,
    List,
    ChevronRight,
    FolderOpen,
    Database,
    RefreshCw,
    FolderCog,
    FileJson,
    Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";
import { useDashboardAside } from "../dashboard-aside-context";
import { useLayoutUI } from "@/components/layout/layout-context";
import type {
    PartRecord,
    PartCategory,
    PartsRootManifest,
    PartsSearchResult,
} from "@/types/parts-library";
import { PART_CATEGORY_INFO, DEFAULT_PART_TYPES } from "@/types/parts-library";
import { TypeManagementDialog } from "@/components/parts/type-management-dialog";
import { SchemaEditorDialog } from "@/components/parts/schema-editor-dialog";

// ============================================================================
// Types
// ============================================================================

interface Props {
    params: Promise<{ badgeNumber: string }>;
}

type ViewMode = "grid" | "list";
type PhotoFilterMode = "all" | "with-photo-first" | "with-photo" | "without-photo";

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ============================================================================
// Sub Components
// ============================================================================

function PartCardSkeleton() {
    return (
        <Card className="overflow-hidden">
            <Skeleton className="h-28 w-full sm:h-32" />
            <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-5 w-24 sm:w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-1.5">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-5 w-12" />
                </div>
            </CardContent>
        </Card>
    );
}

function CategoryCardSkeleton() {
    return (
        <Card>
            <CardHeader className="space-y-2 pb-2">
                <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-5 w-10" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-1.5">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-14" />
                </div>
            </CardContent>
        </Card>
    );
}

function PartCard({
    part,
    onClick,
}: {
    part: PartRecord;
    onClick: () => void;
}) {
    const photoSrc = part.photo || part.images?.primary?.src || part.images?.icon?.src;
    const hasPhoto = Boolean(photoSrc);
    const categoryLabel = PART_CATEGORY_INFO[part.category]?.label ?? part.category;

    return (
        <button
            type="button"
            className={cn(
                "group  w-full cursor-pointer overflow-hidden rounded-3xl border border-border/70 text-left transition-all hover:border-primary/50 hover:shadow-sm bg-card",
                hasPhoto
                    ? " p-3 sm:p-4"
                    : "min-h-14 max-h-80 border-transparent bg-transparent p-0 shadow-none hover:border-transparent hover:shadow-none"
            )}
            onClick={onClick}
        >
            {hasPhoto ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                    <div className="relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/80 p-2 sm:mx-0">
                        <img
                            src={photoSrc}
                            alt={part.description || part.partNumber}
                            className="h-25 w-25 object-contain"
                        />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="line-clamp-2 text-lg font-medium leading-tight ">
                                {part.description || part.partNumber}
                            </h3>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/80 transition-transform group-hover:translate-x-0.5 sm:h-11 sm:w-11">
                                <ChevronRight className="h-5 w-5" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                            <div className="space-y-1 text-left">
                                <p className="text-xs text-muted-foreground">Part Number</p>
                                <Badge variant="secondary" className="inline-flex  text-xs justify-center font-mono">
                                    {part.partNumber}
                                </Badge>
                            </div>
                            <div className="space-y-1 text-left">
                                <p className="text-xs text-muted-foreground">Category</p>
                                <Badge variant="secondary" className="inline-flex text-xs justify-center  font-mono">
                                    {categoryLabel}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex w-full flex-col items-start justify-start rounded-xl border border-[#cad5e2] bg-white">
                    <div className="relative flex w-full items-center justify-between p-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className="inline-flex text-left rounded-xl bg-slate-100 px-2.5 py-1 text-[8px] font-medium text-black">
                                {part.partNumber}
                            </span>
                            <h3 className="line-clamp-1 min-w-0 text-base font-medium text-black">
                                {part.description || part.partNumber}
                            </h3>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-black transition-transform group-hover:translate-x-0.5" />
                    </div>
                </div>
            )}
        </button>
    );
}

function CategoryCard({
    category,
    count,
    types,
    onClick,
}: {
    category: PartCategory;
    count: number;
    types: string[];
    onClick: () => void;
}) {
    const info = PART_CATEGORY_INFO[category];
    
    return (
        <Card
            className="cursor-pointer  transition-colors"
            onClick={onClick}
        >
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{info?.label ?? category}</CardTitle>
                    <Badge variant="secondary">{count}</Badge>
                </div>
                <CardDescription className="text-xs line-clamp-2">
                    {info?.description}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-1">
                    {types.slice(0, 3).map((type) => (
                        <Badge key={type} variant="outline" className="text-[10px]">
                            {type.replace(/-/g, ' ')}
                        </Badge>
                    ))}
                    {types.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                            +{types.length - 3} more
                        </Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function PartsLibraryPage({ params }: Props) {
    const { badgeNumber } = use(params);
    const searchParams = useSearchParams();
    const { session } = useSession(badgeNumber);
    const { selectedPart, setSelectedPart } = useDashboardAside();
    const { openAside, closeAside, isAsideOpen } = useLayoutUI();
    
    // Handle part selection
    const handlePartClick = (part: PartRecord) => {
        if (selectedPart?.partNumber === part.partNumber && isAsideOpen) {
            setSelectedPart(null);
            closeAside();
            return;
        }
        setSelectedPart(part);
        openAside();
    };
    
    // State
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<PartCategory | "all">("all");
    const [selectedType, setSelectedType] = useState<string | "all">("all");
    const [photoFilter, setPhotoFilter] = useState<PhotoFilterMode>("with-photo-first");
    const [showMigrateDialog, setShowMigrateDialog] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [browseMode, setBrowseMode] = useState<"categories" | "parts">("categories");

    useEffect(() => {
        const requestedCategory = searchParams.get("category");
        if (!requestedCategory) return;

        if (requestedCategory in PART_CATEGORY_INFO) {
            setSelectedCategory(requestedCategory as PartCategory);
            setBrowseMode("parts");
        }
    }, [searchParams]);
    
    // Fetch manifest
    const { data: manifest, mutate: mutateManifest } = useSWR<PartsRootManifest>(
        "/api/parts?manifest=true",
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: false,
            keepPreviousData: true,
            dedupingInterval: 15_000,
        },
    );
    
    // Build search URL
    const searchUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set("query", searchQuery);
        if (selectedCategory !== "all") params.set("category", selectedCategory);
        if (selectedType !== "all") params.set("type", selectedType);
        params.set("limit", "100");
        return `/api/parts?${params.toString()}`;
    }, [searchQuery, selectedCategory, selectedType]);
    
    // Fetch parts (only when in parts browse mode or searching)
    const shouldFetchParts = browseMode === "parts" || searchQuery.length > 0;
    const { data: searchResult, isLoading: isSearching, mutate: mutateParts } = useSWR<PartsSearchResult>(
        shouldFetchParts ? searchUrl : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateIfStale: false,
            keepPreviousData: true,
            dedupingInterval: 10_000,
        },
    );
    
    // Available types for selected category
    const availableTypes = useMemo(() => {
        if (selectedCategory === "all") return [];
        return DEFAULT_PART_TYPES[selectedCategory] ?? [];
    }, [selectedCategory]);

    const displayedParts = useMemo(() => {
        const parts = searchResult?.parts ?? [];
        const hasPhoto = (part: PartRecord) =>
            Boolean(part.photo || part.images?.primary?.src || part.images?.icon?.src);

        if (photoFilter === "with-photo") {
            return parts.filter(hasPhoto);
        }

        if (photoFilter === "without-photo") {
            return parts.filter((part) => !hasPhoto(part));
        }

        if (photoFilter === "with-photo-first") {
            return [...parts].sort((a, b) => Number(hasPhoto(b)) - Number(hasPhoto(a)));
        }

        return parts;
    }, [photoFilter, searchResult?.parts]);
    
    // Permission check
    const hasEditAccess = session?.dashboardAccess?.catalogAccess ?? false;
    
    // Handle category selection
    const handleCategorySelect = (category: PartCategory) => {
        setSelectedCategory(category);
        setSelectedType("all");
        setBrowseMode("parts");
    };
    
    // Handle back to categories
    const handleBackToCategories = () => {
        setSelectedCategory("all");
        setSelectedType("all");
        setBrowseMode("categories");
    };
    
    // Handle migration
    const handleMigrate = async () => {
        setIsMigrating(true);
        try {
            const res = await fetch("/api/parts/migrate", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                await mutateManifest();
                await mutateParts();
            }
            setShowMigrateDialog(false);
        } finally {
            setIsMigrating(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="shrink-0 py-4 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {browseMode === "parts" && selectedCategory !== "all" && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBackToCategories}
                            >
                                <ChevronRight className="h-4 w-4 rotate-180" />
                            </Button>
                        )}
                        <div>
                            <h1 className="text-lg font-semibold">Part Number Library</h1>
                            <p className="text-sm text-muted-foreground">
                                {browseMode === "categories"
                                    ? `${manifest?.totalParts ?? 0} parts across ${Object.keys(manifest?.categories ?? {}).length} categories`
                                    : selectedCategory !== "all"
                                        ? `${PART_CATEGORY_INFO[selectedCategory]?.label} - ${searchResult?.total ?? 0} parts`
                                        : `${searchResult?.total ?? 0} parts found`
                                }
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Show migrate button when no parts exist */}
                        {manifest && manifest.totalParts === 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowMigrateDialog(true)}
                            >
                                <Database className="h-4 w-4 mr-1" />
                                Migrate from Catalog
                            </Button>
                        )}
                        
                        {/* Type management - show when a category is selected */}
                        {hasEditAccess && selectedCategory !== "all" && (
                            <>
                                <TypeManagementDialog 
                                    category={selectedCategory}
                                    trigger={
                                        <Button variant="outline" size="sm">
                                            <FolderCog className="h-4 w-4 mr-1" />
                                            Manage Types
                                        </Button>
                                    }
                                    onTypeChange={() => {
                                        mutateManifest();
                                        mutateParts();
                                    }}
                                />
                                
                                {/* Schema editor - show when a type is selected */}
                                {selectedType !== "all" && (
                                    <SchemaEditorDialog
                                        category={selectedCategory}
                                        type={selectedType}
                                        trigger={
                                            <Button variant="outline" size="sm">
                                                <FileJson className="h-4 w-4 mr-1" />
                                                Edit Schema
                                            </Button>
                                        }
                                        onSchemaChange={() => mutateParts()}
                                    />
                                )}
                            </>
                        )}
                        
                        {hasEditAccess && (
                            <Button variant="default" size="sm">
                                <Plus className="h-4 w-4 mr-1" />
                                Add Part
                            </Button>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Filters */}
            <div className="shrink-0 px-5 border-b ">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search parts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    
                    <Select
                        value={selectedCategory}
                        onValueChange={(v) => {
                            setSelectedCategory(v as PartCategory | "all");
                            setSelectedType("all");
                            if (v !== "all") setBrowseMode("parts");
                        }}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {Object.entries(PART_CATEGORY_INFO).map(([key, info]) => (
                                <SelectItem key={key} value={key}>
                                    {info.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    {selectedCategory !== "all" && availableTypes.length > 0 && (
                        <Select
                            value={selectedType}
                            onValueChange={(v) => setSelectedType(v)}
                        >
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {availableTypes.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type.replace(/-/g, ' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Select
                        value={photoFilter}
                        onValueChange={(v) => setPhotoFilter(v as PhotoFilterMode)}
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="Photo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="with-photo-first">Photo First</SelectItem>
                            <SelectItem value="all">All Parts</SelectItem>
                            <SelectItem value="with-photo">With Photo Only</SelectItem>
                            <SelectItem value="without-photo">Without Photo Only</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <div className="ml-auto">
                        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                            <TabsList className="h-8">
                                <TabsTrigger value="grid" className="h-7 px-2">
                                    <Grid className="h-4 w-4" />
                                </TabsTrigger>
                                <TabsTrigger value="list" className="h-7 px-2">
                                    <List className="h-4 w-4" />
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
            </div>
            
            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-6">
                    {/* Category Browse Mode */}
                    {browseMode === "categories" && !searchQuery && (
                        <>
                            {!manifest ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <CategoryCardSkeleton key={i} />
                                    ))}
                                </div>
                            ) : Object.keys(manifest.categories).length === 0 ? (
                                <div className="text-center py-12">
                                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Parts Yet</h3>
                                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                                        Get started by migrating existing parts from the catalog, or add new parts manually.
                                    </p>
                                    <div className="flex items-center justify-center gap-3">
                                        <Button 
                                            onClick={() => setShowMigrateDialog(true)}
                                            size="lg"
                                        >
                                            <Database className="h-4 w-4 mr-2" />
                                            Migrate from Catalog
                                        </Button>
                                        <Button variant="outline" size="lg">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Part Manually
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {Object.entries(manifest.categories).map(([category, info]) => (
                                        <CategoryCard
                                            key={category}
                                            category={category as PartCategory}
                                            count={info?.count ?? 0}
                                            types={info?.types ?? []}
                                            onClick={() => handleCategorySelect(category as PartCategory)}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    
                    {/* Parts Browse/Search Mode */}
                    {(browseMode === "parts" || searchQuery) && (
                        <>
                            {isSearching ? (
                                <div className="flex flex-wrap items-stretch gap-4">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={i} className="min-h-44 min-w-72 max-w-sm flex-1">
                                            <PartCardSkeleton />
                                        </div>
                                    ))}
                                </div>
                            ) : !displayedParts.length ? (
                                <div className="text-center py-12">
                                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Parts Found</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {searchQuery
                                            ? `No parts match "${searchQuery}"`
                                            : "No parts in this category yet."}
                                    </p>
                                </div>
                            ) : viewMode === "grid" ? (
                                <div className="flex flex-wrap items-stretch gap-4">
                                    {displayedParts.map((part) => (
                                        <div key={part.partNumber} className="flex  min-w-72 max-w-sm">
                                            <PartCard
                                                part={part}
                                                onClick={() => handlePartClick(part)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Part Number</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Manufacturer</TableHead>
                                            <TableHead className="w-10" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {displayedParts.map((part) => (
                                            <TableRow
                                                key={part.partNumber}
                                                className="cursor-pointer"
                                                onClick={() => handlePartClick(part)}
                                            >
                                                <TableCell className="font-mono text-sm">
                                                    {part.partNumber}
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate">
                                                    {part.description}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {PART_CATEGORY_INFO[part.category]?.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {part.type.replace(/-/g, ' ')}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {part.manufacturer ?? '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handlePartClick(part)}>
                                                                <Edit2 className="h-4 w-4 mr-2" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                            {hasEditAccess && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem className="text-destructive">
                                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </>
                    )}
                </div>
            </ScrollArea>
            
            
            {/* Migrate Dialog */}
            <AlertDialog open={showMigrateDialog} onOpenChange={setShowMigrateDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Migrate from Catalog</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will migrate all parts from the existing catalog system to the new
                            Parts Library structure. Parts will be organized by category and type
                            with separate files for each part.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isMigrating}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMigrate} disabled={isMigrating}>
                            {isMigrating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Migrating...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Start Migration
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
