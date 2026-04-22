"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    BookOpen,
    Search,
    Plus,
    MoreVertical,
    Edit2,
    Archive,
    Users,
    Loader2,
    AlertCircle,
    Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";
import { SkillDefinitionDialog } from "@/components/profile/user-access/skill-definition-dialog";

// ============================================================================
// Types
// ============================================================================

export interface SkillDefinition {
    id: string;
    name: string;
    category: string;
    description: string;
    levels: {
        level: number;
        name: string;
        description?: string;
    }[];
    usersCount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface Props {
    params: Promise<{ badgeNumber: string }>;
}

// ============================================================================
// Constants
// ============================================================================

const SKILL_CATEGORIES = [
    { value: "production", label: "Production" },
    { value: "quality", label: "Quality" },
    { value: "leadership", label: "Leadership" },
    { value: "safety", label: "Safety" },
];

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_SKILL_DEFINITIONS: SkillDefinition[] = [
    {
        id: "brandList",
        name: "Brand List",
        category: "production",
        description: "Ability to read and interpret brand lists for production",
        levels: [
            { level: 0, name: "Not Trained" },
            { level: 1, name: "Beginner" },
            { level: 2, name: "Intermediate" },
            { level: 3, name: "Advanced" },
            { level: 4, name: "Expert" },
        ],
        usersCount: 24,
        isActive: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-03-15",
    },
    {
        id: "branding",
        name: "Branding",
        category: "production",
        description: "Application of brand labels and markings",
        levels: [
            { level: 0, name: "Not Trained" },
            { level: 1, name: "Beginner" },
            { level: 2, name: "Intermediate" },
            { level: 3, name: "Advanced" },
            { level: 4, name: "Expert" },
        ],
        usersCount: 18,
        isActive: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-03-15",
    },
    {
        id: "buildUp",
        name: "Build Up",
        category: "production",
        description: "Assembly of component builds",
        levels: [
            { level: 0, name: "Not Trained" },
            { level: 1, name: "Beginner" },
            { level: 2, name: "Intermediate" },
            { level: 3, name: "Advanced" },
            { level: 4, name: "Expert" },
        ],
        usersCount: 32,
        isActive: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-03-15",
    },
    {
        id: "wiring",
        name: "Wiring",
        category: "production",
        description: "Electrical wiring and connections",
        levels: [
            { level: 0, name: "Not Trained" },
            { level: 1, name: "Beginner" },
            { level: 2, name: "Intermediate" },
            { level: 3, name: "Advanced" },
            { level: 4, name: "Expert" },
        ],
        usersCount: 28,
        isActive: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-03-15",
    },
    {
        id: "test",
        name: "Testing",
        category: "quality",
        description: "Quality testing and verification procedures",
        levels: [
            { level: 0, name: "Not Trained" },
            { level: 1, name: "Beginner" },
            { level: 2, name: "Intermediate" },
            { level: 3, name: "Advanced" },
            { level: 4, name: "Expert" },
        ],
        usersCount: 15,
        isActive: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-03-15",
    },
    {
        id: "biq",
        name: "BIQ Inspection",
        category: "quality",
        description: "Built-in quality inspection process",
        levels: [
            { level: 0, name: "Not Trained" },
            { level: 1, name: "Beginner" },
            { level: 2, name: "Intermediate" },
            { level: 3, name: "Advanced" },
            { level: 4, name: "Expert" },
        ],
        usersCount: 12,
        isActive: true,
        createdAt: "2024-01-01",
        updatedAt: "2024-03-15",
    },
];

// ============================================================================
// Main Component
// ============================================================================

export default function SkillDefinitionsPage({ params }: Props) {
    const { badgeNumber } = use(params);
    const { user } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [skills, setSkills] = useState<SkillDefinition[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<SkillDefinition | null>(null);

    // Permission check
    useEffect(() => {
        if (!user) return;

        fetch(`/api/users/${user.badge}/settings?shift=${encodeURIComponent(user.currentShift ?? "1st")}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.permissions?.canManageSkillDefinitions === false) {
                    router.replace(`/profile/${badgeNumber}/users/skills`);
                }
            })
            .catch(() => {});
    }, [user, badgeNumber, router]);

    // Load skills
    useEffect(() => {
        const timer = setTimeout(() => {
            setSkills(MOCK_SKILL_DEFINITIONS);
            setLoading(false);
        }, 400);
        return () => clearTimeout(timer);
    }, []);

    // Filter skills
    const filteredSkills = useMemo(() => {
        return skills.filter((skill) => {
            if (searchQuery) {
                const search = searchQuery.toLowerCase();
                if (!skill.name.toLowerCase().includes(search) &&
                    !skill.description.toLowerCase().includes(search)) {
                    return false;
                }
            }
            if (categoryFilter !== "all" && skill.category !== categoryFilter) {
                return false;
            }
            return true;
        });
    }, [skills, searchQuery, categoryFilter]);

    const handleEdit = (skill: SkillDefinition) => {
        setEditingSkill(skill);
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingSkill(null);
        setDialogOpen(true);
    };

    const handleSave = (data: Partial<SkillDefinition>) => {
        if (editingSkill) {
            // Update existing
            setSkills((prev) =>
                prev.map((s) =>
                    s.id === editingSkill.id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
                )
            );
        } else {
            // Create new
            const newSkill: SkillDefinition = {
                id: `skill_${Date.now()}`,
                name: data.name || "New Skill",
                category: data.category || "production",
                description: data.description || "",
                levels: data.levels || [
                    { level: 0, name: "Not Trained" },
                    { level: 1, name: "Beginner" },
                    { level: 2, name: "Intermediate" },
                    { level: 3, name: "Advanced" },
                    { level: 4, name: "Expert" },
                ],
                usersCount: 0,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            setSkills((prev) => [...prev, newSkill]);
        }
        setDialogOpen(false);
        setEditingSkill(null);
    };

    const handleArchive = (skillId: string) => {
        setSkills((prev) =>
            prev.map((s) =>
                s.id === skillId ? { ...s, isActive: false } : s
            )
        );
    };

    if (!user) return null;

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <BookOpen className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Skill Definitions</h2>
                        <p className="text-xs text-muted-foreground">
                            Manage skill types and proficiency levels
                        </p>
                    </div>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Skill
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search skills..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {SKILL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card">
                {loading ? (
                    <div className="p-4 space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-5 flex-1" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                        ))}
                    </div>
                ) : filteredSkills.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                        <h3 className="font-medium">No skills found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {searchQuery || categoryFilter !== "all"
                                ? "Try adjusting your filters"
                                : "Add a skill to get started"}
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Skill Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="hidden md:table-cell">Description</TableHead>
                                <TableHead className="text-center">Levels</TableHead>
                                <TableHead className="text-center">Users</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSkills.map((skill) => (
                                <TableRow key={skill.id} className={cn(!skill.isActive && "opacity-50")}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-primary" />
                                            <span className="font-medium">{skill.name}</span>
                                            {!skill.isActive && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    Archived
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {skill.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[300px] truncate">
                                        {skill.description}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-sm">{skill.levels.length}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-sm">
                                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                            {skill.usersCount}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(skill)}>
                                                    <Edit2 className="h-4 w-4 mr-2" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleArchive(skill.id)}
                                                    className="text-destructive"
                                                >
                                                    <Archive className="h-4 w-4 mr-2" />
                                                    Archive
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Skill Definition Dialog */}
            <SkillDefinitionDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                skill={editingSkill}
                onSave={handleSave}
            />
        </div>
    );
}
