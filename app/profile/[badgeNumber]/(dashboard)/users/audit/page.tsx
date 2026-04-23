"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    History,
    Search,
    Filter,
    Calendar,
    ChevronDown,
    Shield,
    User,
    ArrowRight,
    Loader2,
    AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";
import { getAvatarColor, getAvatarInitials } from "@/lib/profile/avatar-utils";
import { PERMISSION_LABELS } from "@/types/user-settings";
import type { GranularPermissions } from "@/types/user-settings";

// ============================================================================
// Types
// ============================================================================

interface AuditEntry {
    id: string;
    timestamp: string;
    action: "PERMISSION_GRANTED" | "PERMISSION_REVOKED" | "PERMISSION_DELEGATED";
    performedBy: {
        badge: string;
        name: string;
    };
    targetUser: {
        badge: string;
        name: string;
    };
    permissionKey: keyof GranularPermissions;
    previousValue: boolean;
    newValue: boolean;
    cascadedFrom?: string;
}

interface Props {
    params: Promise<{ badgeNumber: string }>;
}

// ============================================================================
// Mock Data (replace with API calls)
// ============================================================================

const MOCK_AUDIT_ENTRIES: AuditEntry[] = [
    {
        id: "1",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        action: "PERMISSION_GRANTED",
        performedBy: { badge: "75241", name: "Billy Truong" },
        targetUser: { badge: "68511", name: "Albert AJ Destura" },
        permissionKey: "canEditSkills",
        previousValue: false,
        newValue: true,
    },
    {
        id: "2",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        action: "PERMISSION_REVOKED",
        performedBy: { badge: "75241", name: "Billy Truong" },
        targetUser: { badge: "70061", name: "Adrian Leal" },
        permissionKey: "canGrantPermissions",
        previousValue: true,
        newValue: false,
    },
    {
        id: "3",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        action: "PERMISSION_GRANTED",
        performedBy: { badge: "75241", name: "Billy Truong" },
        targetUser: { badge: "75788", name: "Alejandra Orejel-Barron" },
        permissionKey: "canViewSkills",
        previousValue: false,
        newValue: true,
    },
    {
        id: "4",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        action: "PERMISSION_DELEGATED",
        performedBy: { badge: "75241", name: "Billy Truong" },
        targetUser: { badge: "41052", name: "Alfonso Ramos" },
        permissionKey: "canGrantPermissions",
        previousValue: false,
        newValue: true,
        cascadedFrom: "75241",
    },
];

// ============================================================================
// Sub-Components
// ============================================================================

function AuditEntrySkeleton() {
    return (
        <div className="flex gap-3 p-3 border-b last:border-0">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
            </div>
        </div>
    );
}

function AuditEntryItem({ entry }: { entry: AuditEntry }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const performerInitials = getAvatarInitials(entry.performedBy.name);
    const performerColor = getAvatarColor(entry.performedBy.badge);
    const targetInitials = getAvatarInitials(entry.targetUser.name);
    const targetColor = getAvatarColor(entry.targetUser.badge);

    const permissionMeta = PERMISSION_LABELS[entry.permissionKey];
    const timeAgo = getRelativeTime(entry.timestamp);

    const actionLabel = entry.action === "PERMISSION_GRANTED"
        ? "granted"
        : entry.action === "PERMISSION_REVOKED"
            ? "revoked"
            : "delegated";

    const actionColor = entry.action === "PERMISSION_GRANTED"
        ? "text-emerald-600"
        : entry.action === "PERMISSION_REVOKED"
            ? "text-destructive"
            : "text-blue-600";

    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
                <button className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0">
                    <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={cn("text-xs", performerColor)}>
                            {performerInitials}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm">
                            <span className="font-medium">{entry.performedBy.name}</span>
                            <span className={cn("mx-1", actionColor)}>{actionLabel}</span>
                            <span className="font-medium">{permissionMeta?.label || entry.permissionKey}</span>
                            <span className="mx-1">for</span>
                            <span className="font-medium">{entry.targetUser.name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
                    </div>

                    <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                        isExpanded && "rotate-180"
                    )} />
                </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
                <div className="px-3 pb-3 ml-11 space-y-2">
                    <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Permission</span>
                            <Badge variant="outline">{permissionMeta?.label || entry.permissionKey}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Change</span>
                            <div className="flex items-center gap-2">
                                <Badge variant={entry.previousValue ? "default" : "secondary"}>
                                    {entry.previousValue ? "Enabled" : "Disabled"}
                                </Badge>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <Badge variant={entry.newValue ? "default" : "secondary"}>
                                    {entry.newValue ? "Enabled" : "Disabled"}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Target User</span>
                            <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5">
                                    <AvatarFallback className={cn("text-[10px]", targetColor)}>
                                        {targetInitials}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{entry.targetUser.name}</span>
                                <span className="text-muted-foreground">#{entry.targetUser.badge}</span>
                            </div>
                        </div>
                        {entry.cascadedFrom && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Delegated from</span>
                                <span className="font-medium">#{entry.cascadedFrom}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Timestamp</span>
                            <span className="font-mono text-xs">
                                {new Date(entry.timestamp).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function getRelativeTime(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    return new Date(timestamp).toLocaleDateString();
}

// ============================================================================
// Main Component
// ============================================================================

export default function UsersAuditPage({ params }: Props) {
    const { badgeNumber } = use(params);
    const { user } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [dateRange, setDateRange] = useState<string>("7days");

    // Permission check
    useEffect(() => {
        if (!user) return;

        fetch(`/api/users/${user.badge}/settings?shift=${encodeURIComponent(user.currentShift ?? "1st")}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.dashboardAccess?.userAccess === false) {
                    router.replace(`/profile/${badgeNumber}/users/all`);
                }
            })
            .catch(() => {});
    }, [user, badgeNumber, router]);

    // Load audit entries (mock for now)
    useEffect(() => {
        const timer = setTimeout(() => {
            setEntries(MOCK_AUDIT_ENTRIES);
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Filter entries
    const filteredEntries = useMemo(() => {
        return entries.filter((entry) => {
            // Search filter
            if (searchQuery) {
                const search = searchQuery.toLowerCase();
                const matchesPerformer = entry.performedBy.name.toLowerCase().includes(search) ||
                    entry.performedBy.badge.includes(search);
                const matchesTarget = entry.targetUser.name.toLowerCase().includes(search) ||
                    entry.targetUser.badge.includes(search);
                const matchesPermission = entry.permissionKey.toLowerCase().includes(search);
                if (!matchesPerformer && !matchesTarget && !matchesPermission) {
                    return false;
                }
            }

            // Action filter
            if (actionFilter !== "all" && entry.action !== actionFilter) {
                return false;
            }

            // Date filter
            const entryDate = new Date(entry.timestamp);
            const now = new Date();
            if (dateRange === "today") {
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                if (entryDate < today) return false;
            } else if (dateRange === "7days") {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (entryDate < weekAgo) return false;
            } else if (dateRange === "30days") {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                if (entryDate < monthAgo) return false;
            }

            return true;
        });
    }, [entries, searchQuery, actionFilter, dateRange]);

    // Group entries by date
    const groupedEntries = useMemo(() => {
        const groups: Record<string, AuditEntry[]> = {};
        filteredEntries.forEach((entry) => {
            const date = new Date(entry.timestamp).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(entry);
        });
        return groups;
    }, [filteredEntries]);

    if (!user) return null;

    return (
        <div className="flex flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <History className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">Permission Audit Log</h2>
                        <p className="text-xs text-muted-foreground">
                            Track all permission changes across users
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by user or permission..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-[160px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Action type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="PERMISSION_GRANTED">Granted</SelectItem>
                        <SelectItem value="PERMISSION_REVOKED">Revoked</SelectItem>
                        <SelectItem value="PERMISSION_DELEGATED">Delegated</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[140px]">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Date range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="7days">Last 7 days</SelectItem>
                        <SelectItem value="30days">Last 30 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
                </p>
            </div>

            {/* Audit List */}
            <div className="rounded-lg border bg-card">
                {loading ? (
                    <div>
                        {[1, 2, 3, 4].map((i) => (
                            <AuditEntrySkeleton key={i} />
                        ))}
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                        <h3 className="font-medium">No audit entries found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {searchQuery || actionFilter !== "all"
                                ? "Try adjusting your filters"
                                : "Permission changes will appear here"}
                        </p>
                    </div>
                ) : (
                    <div>
                        {Object.entries(groupedEntries).map(([date, dateEntries]) => (
                            <div key={date}>
                                <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-3 py-1.5 border-b">
                                    <p className="text-xs font-medium text-muted-foreground">{date}</p>
                                </div>
                                {dateEntries.map((entry) => (
                                    <AuditEntryItem key={entry.id} entry={entry} />
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
