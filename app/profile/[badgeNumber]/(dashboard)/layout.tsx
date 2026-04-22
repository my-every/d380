"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    KeyRound,
    LogOut,
    Package,
    Repeat,
    ShieldCheck,
    Save,
    LayoutDashboard,
    FolderOpen,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AnimatedTabs from "@/components/ui/animated-tabs";

import PageLayout from "@/components/layout/page-layout";
import type { RootNavItem } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileSettings } from "@/components/profile/profile-settings";
import { ProfileHeader } from "@/components/profile/profile-header";
import { PinChangeDialog } from "@/components/profile/pin-change-dialog";
import { ActivityTimelineFilter, ActivityTimelinePanel } from "@/components/activity";
import { DashboardSideNavRouted } from "@/components/layout/dashboard-side-nav-routed";
import { DashboardAsideProvider, useDashboardAside } from "./dashboard-aside-context";
import { WorkspaceSettingsProvider } from "./workspace-settings-context";
import { UserPermissionsAside } from "@/components/profile/user-access/user-permissions-aside";
import { MemberStatCards } from "@/components/profile/user-access/member-stat-cards";
import { PartDetailAside } from "@/components/parts/part-detail-aside";
import { DashboardProjectAside } from "@/components/projects/dashboard-project-aside";
import { useSession } from "@/hooks/use-session";
import { useFeedbackLoader } from "@/contexts/feedback-loader-context";
import { activityService } from "@/lib/services/activity-service";
import { ROLE_DISPLAY_CONFIG } from "@/types/profile";
import {
    USER_ROLE_LABELS,
    type UserRole as SessionUserRole,
} from "@/types/d380-user-session";
import type { DashboardAccess } from "@/types/user-settings";
import type { ProfileSettingsData } from "@/components/profile/profile-settings";

// ============================================================================
// Types
// ============================================================================

interface DashboardLayoutProps {
    children: React.ReactNode;
    params: Promise<{ badgeNumber: string }>;
}

const SESSION_TO_PROFILE_ROLE: Record<string, string> = {
    DEVELOPER: "developer",
    MANAGER: "manager",
    SUPERVISOR: "supervisor",
    TEAM_LEAD: "team_lead",
    QA: "qa",
    BRANDER: "brander",
    ASSEMBLER: "assembler",
};

const ALL_SESSION_ROLES: SessionUserRole[] = [
    "DEVELOPER",
    "MANAGER",
    "SUPERVISOR",
    "TEAM_LEAD",
    "QA",
    "BRANDER",
    "ASSEMBLER",
];

const ASIDE_TABS = [
    { id: "details", label: "Details" },
    { id: "activity", label: "Activity" },
];

function toTitleCase(value: string): string {
    return value
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Build profile-specific root nav items
function buildProfileRootNav(badgeNumber: string): RootNavItem[] {
    const base = `/profile/${badgeNumber}`;
    return [
        { id: "workspace", href: `${base}/workspace/overview`, label: "Workspace", icon: LayoutDashboard },
        { id: "projects", href: `${base}/projects/overview`, label: "Projects", icon: FolderOpen },
        { id: "users", href: `${base}/users/all`, label: "Users", icon: Users },
        { id: "parts", href: `${base}/parts`, label: "Parts", icon: Package },
    ];
}

function resolveCurrentView(pathname: string, badgeNumber: string): { view: string; subItem: string } {
    const basePath = `/profile/${badgeNumber}`;
    const relativePath = pathname.replace(basePath, "");

    if (relativePath === "" || relativePath === "/workspace" || relativePath === "/workspace/overview") {
        return { view: "workspace", subItem: "overview" };
    }
    if (relativePath === "/workspace/settings") {
        return { view: "workspace", subItem: "settings" };
    }
    if (relativePath.startsWith("/projects")) {
        const sub = relativePath.replace("/projects/", "").replace("/projects", "") || "overview";
        return { view: "projects", subItem: sub };
    }
    if (relativePath.startsWith("/users")) {
        const sub = relativePath.replace("/users/", "").replace("/users", "") || "all";
        return { view: "users", subItem: sub };
    }
    if (relativePath.startsWith("/parts")) {
        const sub = relativePath.replace("/parts/", "").replace("/parts", "") || "all";
        return { view: "parts", subItem: sub };
    }
    if (relativePath.startsWith("/training")) {
        const sub = relativePath.replace("/training/", "").replace("/training", "") || "all";
        return { view: "training", subItem: sub };
    }

    return { view: "workspace", subItem: "overview" };
}

// ============================================================================
// Layout
// ============================================================================

export default function DashboardLayout({ children, params }: DashboardLayoutProps) {
    const { badgeNumber } = use(params);
    
    return (
        <DashboardAsideProvider>
            <DashboardLayoutInner badgeNumber={badgeNumber}>
                {children}
            </DashboardLayoutInner>
        </DashboardAsideProvider>
    );
}

function DashboardLayoutInner({ 
    children, 
    badgeNumber 
}: { 
    children: React.ReactNode; 
    badgeNumber: string 
}) {
    const router = useRouter();
    const pathname = usePathname();
    const {
        selectedMember,
        setSelectedMember,
        selectedUser,
        setSelectedUser,
        selectedProject,
        setSelectedProject,
        selectedPart,
        setSelectedPart,
        refreshTrigger,
    } = useDashboardAside();
    const {
        user,
        isAuthenticated,
        isLoading,
        signOut,
        switchRole,
        canSwitchRoles,
        originalRole,
    } = useSession();
    const { hideLoader } = useFeedbackLoader();

    const [showPinChange, setShowPinChange] = useState(false);
    const [dashboardAccess, setDashboardAccess] = useState<Partial<DashboardAccess>>({});

    // Settings state (for workspace/settings page)
    const [settingsData, setSettingsData] = useState<ProfileSettingsData | null>(null);
    const [settingsDraft, setSettingsDraft] = useState<ProfileSettingsData | null>(null);
    const [isSettingsDirty, setIsSettingsDirty] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [settingsSaveMessage, setSettingsSaveMessage] = useState<string | null>(null);
    const [asideTab, setAsideTab] = useState("details");

    // Build profile-specific root nav
    const profileNavItems = useMemo(() => buildProfileRootNav(badgeNumber), [badgeNumber]);

    // Determine current view from pathname
    const currentView = useMemo(() => resolveCurrentView(pathname, badgeNumber), [pathname, badgeNumber]);

    const viewTitle = useMemo(() => {
        const view = resolveCurrentView(pathname, badgeNumber).view;
        switch (view) {
            case "workspace":
                return "Workspace";
            case "projects":
                return "Projects";
            case "users":
                return "Users";
            case "parts":
                return "Parts Library";
            case "training":
                return "Training";
            default:
                return "Workspace";
        }
    }, [pathname, badgeNumber]);

    const viewSubtitle = useMemo(() => {
        const subItem = resolveCurrentView(pathname, badgeNumber).subItem;
        if (!subItem) return `Badge #${badgeNumber}`;
        return `${toTitleCase(subItem)} • Badge #${badgeNumber}`;
    }, [pathname, badgeNumber]);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) router.replace("/auth");
    }, [isLoading, isAuthenticated, router]);

    // Dismiss loader once ready
    useEffect(() => {
        if (!isLoading && user) hideLoader();
    }, [isLoading, user, hideLoader]);

    // PIN change prompt
    useEffect(() => {
        if (user?.requiresPinChange) setShowPinChange(true);
    }, [user?.requiresPinChange]);

    // Fetch dashboard access + profile settings
    useEffect(() => {
        if (!user) return;
        const shift = user.currentShift ?? "1st";

        fetch(`/api/users/${user.badge}/settings?shift=${encodeURIComponent(shift)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.dashboardAccess) setDashboardAccess(data.dashboardAccess);
            })
            .catch(() => {});

        fetch(`/api/users/${user.badge}/profile`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                const p = data?.profile;
                if (p) {
                    const s: ProfileSettingsData = {
                        preferredName: p.preferredName ?? null,
                        email: p.email ?? null,
                        phone: p.phone ?? null,
                        bio: p.bio ?? null,
                        department: p.department ?? null,
                        title: p.title ?? null,
                        location: p.location ?? null,
                        preferences: p.preferences ?? {
                            theme: "system",
                            notifications: {
                                stageComplete: true,
                                assignmentBlocked: true,
                                handoffRequired: true,
                                shiftReminders: true,
                            },
                            dashboardLayout: "expanded",
                            defaultViews: { projectBoard: "grid", workAreaBoard: "floor" },
                        },
                    };
                    setSettingsData(s);
                    setSettingsDraft(s);
                }
            })
            .catch(() => {});
    }, [user]);

    const profileRole = user ? (SESSION_TO_PROFILE_ROLE[user.role] ?? "assembler") : "assembler";
    const roleConfig = ROLE_DISPLAY_CONFIG[profileRole as keyof typeof ROLE_DISPLAY_CONFIG];

    const handleSignOut = useCallback(async () => {
        if (user?.badge) {
            void activityService.logAction(user.badge, user.currentShift, {
                action: "COMPLETED",
                metadata: { source: "profile_sign_out", event: "shift_ended" },
                performedBy: user.badge,
            });
        }
        await signOut();
        router.replace("/auth");
    }, [router, signOut, user]);

    const handleSwitchRole = useCallback(
        (sessionRole: SessionUserRole) => {
            if (!user) return;
            void activityService.logAction(user.badge, user.currentShift, {
                action: "STAGE_CHANGED",
                metadata: { source: "role_switch", fromRole: user.role, toRole: sessionRole },
                performedBy: user.badge,
                result: "success",
            });
            void switchRole(sessionRole);
        },
        [switchRole, user],
    );

    const handleSettingsFormChange = useCallback(
        (data: ProfileSettingsData, isDirty: boolean) => {
            setSettingsDraft(data);
            setIsSettingsDirty(isDirty);
        },
        [],
    );

    const handleFloatingSave = useCallback(async () => {
        if (!user?.badge || !settingsDraft) return;
        setIsSavingSettings(true);
        setSettingsSaveMessage(null);
        try {
            const res = await fetch(`/api/users/${user.badge}/profile`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    preferredName: settingsDraft.preferredName,
                    email: settingsDraft.email,
                    phone: settingsDraft.phone,
                    bio: settingsDraft.bio,
                    preferences: settingsDraft.preferences,
                }),
            });
            if (!res.ok) throw new Error("Save failed");
            setSettingsSaveMessage("Settings saved");
            setSettingsData(settingsDraft);
            setIsSettingsDirty(false);
            setTimeout(() => setSettingsSaveMessage(null), 2500);
        } catch {
            setSettingsSaveMessage("Failed to save settings");
        } finally {
            setIsSavingSettings(false);
        }
    }, [settingsDraft, user?.badge]);

    // Clear selections when navigating away from their respective views
    useEffect(() => {
        if (currentView.view !== "users") {
            setSelectedMember(null);
            setSelectedUser(null);
        }
        if (currentView.view !== "projects") {
            setSelectedProject(null);
        }
        if (currentView.view !== "parts") {
            setSelectedPart(null);
        }
    }, [currentView.view, setSelectedMember, setSelectedUser, setSelectedProject, setSelectedPart]);
    
    // Determine if we should show aside
    const showAsideForSettings = currentView.view === "workspace" && currentView.subItem === "settings";
    const showAsideForUsersAll = currentView.view === "users" && currentView.subItem === "all" && selectedMember !== null;
    const showAsideForUsersPermissions =
        currentView.view === "users" && (currentView.subItem === "access" || currentView.subItem === "skills") && selectedUser !== null;
    const showAsideForUsers = showAsideForUsersAll || showAsideForUsersPermissions;
    const showAsideForProjects = currentView.view === "projects" && currentView.subItem !== "schedule" && selectedProject !== null;
    const showAsideForParts = currentView.view === "parts" && selectedPart !== null;
    const showAside = showAsideForSettings || showAsideForUsers || showAsideForProjects || showAsideForParts;
    
    // Handle closing the aside
    const handleCloseAside = useCallback(() => {
        setSelectedMember(null);
        setSelectedUser(null);
        setSelectedProject(null);
        setSelectedPart(null);
    }, [setSelectedMember, setSelectedUser, setSelectedProject, setSelectedPart]);
    
    // Build aside content based on what's selected
    const asideContentElement = useMemo(() => {
        if (showAsideForSettings) {
            return (
                <ActivityTimelineFilter
                    badge={user?.badge ?? ""}
                    shift={user?.currentShift ?? "1st"}
                    maxItems={25}
                    compact={false}
                    showStats={true}
                    allowFiltering={true}
                    allowSearch={true}
                />
            );
        }
        if (showAsideForUsersAll && selectedMember) {
            return (
                <div className="flex h-full flex-col overflow-hidden">
                    <ProfileHeader badgeNumber={selectedMember.badge} compact />
                    <div className="shrink-0 px-3 pt-2">
                        <AnimatedTabs
                            tabs={ASIDE_TABS}
                            activeTab={asideTab}
                            onChange={setAsideTab}
                            variant="underline"
                            layoutId="dashboard-routed-aside-tabs"
                        />
                    </div>
                    <div className="flex-1 overflow-auto px-3 pb-4 pt-2">
                        {asideTab === "details" ? (
                            <MemberStatCards
                                member={selectedMember}
                                mode="view"
                                variant="card"
                            />
                        ) : (
                            <ActivityTimelinePanel
                                badge={selectedMember.badge}
                                shift={selectedMember.shift ?? "1st"}
                            />
                        )}
                    </div>
                </div>
            );
        }
        if (showAsideForUsersPermissions && selectedUser && user) {
            const asideVariant = currentView.subItem === "skills" ? "skills" : "access";
            return (
                <UserPermissionsAside
                    key={`${selectedUser.badge}-${refreshTrigger}-${asideVariant}`}
                    selectedUser={selectedUser}
                    onClose={handleCloseAside}
                    managerBadge={user.badge}
                    shift={user.currentShift ?? "1st"}
                    variant={asideVariant}
                />
            );
        }
        if (showAsideForProjects && selectedProject) {
            return (
                <DashboardProjectAside project={selectedProject} />
            );
        }
        if (showAsideForParts && selectedPart) {
            return (
                <PartDetailAside
                    key={selectedPart.partNumber}
                    part={selectedPart}
                    onClose={handleCloseAside}
                    canEdit={dashboardAccess.catalogAccess ?? false}
                />
            );
        }
        return undefined;
    }, [showAsideForSettings, showAsideForUsersAll, showAsideForUsersPermissions, showAsideForProjects, showAsideForParts, selectedMember, selectedUser, selectedProject, selectedPart, user, asideTab, refreshTrigger, handleCloseAside, dashboardAccess.catalogAccess, currentView.subItem]);

    if (isLoading || !user) return null;

    return (
        <PageLayout
            title={viewTitle}
            subtitle={viewSubtitle}
            navItems={profileNavItems}
            activeRootId={currentView.view}
            showAside={showAside}
            showBreadcrumbs={false}
            showSubHeader={false}
            showHeading={false}
            showHeaderTitleInline={true}
            sidePanelContent={
                <DashboardSideNavRouted
                    badgeNumber={badgeNumber}
                    access={dashboardAccess}
                />
            }
            asideContent={asideContentElement}
            headerActions={
                <>
                    {canSwitchRoles ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "hidden sm:inline-flex gap-1.5 rounded-full",
                                        roleConfig?.borderColor,
                                        roleConfig?.color,
                                    )}
                                >
                                    <Repeat className="h-3 w-3" />
                                    {roleConfig?.label ?? USER_ROLE_LABELS[user.role]}
                                    {originalRole && (
                                        <span className="text-[10px] opacity-60 ml-0.5">(switched)</span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    Switch Role
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {ALL_SESSION_ROLES.map((sr) => {
                                    const isActive = user.role === sr;
                                    const isOriginal = (originalRole ?? user.role) === sr;
                                    return (
                                        <DropdownMenuItem
                                            key={sr}
                                            className={cn("gap-2 text-sm", isActive && "font-semibold")}
                                            onClick={() => handleSwitchRole(sr)}
                                        >
                                            <span className="flex-1">{USER_ROLE_LABELS[sr]}</span>
                                            {isActive && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                    Active
                                                </Badge>
                                            )}
                                            {isOriginal && !isActive && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                    Original
                                                </Badge>
                                            )}
                                        </DropdownMenuItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Badge
                            variant="outline"
                            className={cn(
                                "hidden sm:inline-flex gap-1.5",
                                roleConfig?.borderColor,
                                roleConfig?.color,
                            )}
                        >
                            <ShieldCheck className="h-3 w-3" />
                            {roleConfig?.label ?? USER_ROLE_LABELS[user.role]}
                        </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setShowPinChange(true)} title="Change PIN">
                        <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign Out">
                        <LogOut className="h-4 w-4" />
                    </Button>
                </>
            }
            floatingActions={
                showAsideForSettings && settingsData ? (
                    <div className="flex items-center gap-3 px-1">
                        {settingsSaveMessage && (
                            <span
                                className={cn(
                                    "text-sm font-medium",
                                    settingsSaveMessage.includes("Failed")
                                        ? "text-destructive"
                                        : "text-green-600 dark:text-green-400",
                                )}
                            >
                                {settingsSaveMessage.includes("Failed") ? "X" : "ok"} {settingsSaveMessage}
                            </span>
                        )}
                        <Button
                            onClick={handleFloatingSave}
                            disabled={!isSettingsDirty || isSavingSettings || !settingsDraft}
                            className="gap-1.5"
                            size="sm"
                        >
                            <Save className="h-4 w-4" />
                            {isSavingSettings ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                ) : undefined
            }
        >
            <WorkspaceSettingsProvider
                value={{
                    settingsData,
                    settingsDraft,
                    onFormChange: handleSettingsFormChange,
                }}
            >
                {children}
            </WorkspaceSettingsProvider>

            <PinChangeDialog
                open={showPinChange}
                onOpenChange={setShowPinChange}
                badge={user.badge}
                required={user.requiresPinChange}
            />
        </PageLayout>
    );
}
