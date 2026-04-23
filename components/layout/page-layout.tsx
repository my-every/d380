"use client";

import {
    BarChart3,
    Boxes,
    FolderKanban,
    Home,
    Library,
} from "lucide-react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { type CommandSearchGroup } from "@/components/layout/layout-composite";
import { type UserAvatarMenuProps } from "@/components/layout/user-avatar-menu";
import LayoutScaffold, {
    type LayoutScaffoldClassNames,
    type LayoutVariant,
    type RootNavItem,
} from "./layout";


type PageLayoutProps = {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    headerActions?: React.ReactNode;
    floatingActions?: React.ReactNode;
    variant?: LayoutVariant;
    contentVariant?: "default" | "grid" | "focus";
    showAside?: boolean;
    navItems?: RootNavItem[];
    activeRootId?: string;
    commandSearchGroups?: CommandSearchGroup[];
    commandSearchPlaceholder?: string;
    classNames?: LayoutScaffoldClassNames;
    // Optional custom content components - use defaults if not provided
    sidePanelContent?: React.ReactNode;
    asideContent?: React.ReactNode;
    subHeader?: React.ReactNode;
    sideRailFooter?: React.ReactNode;
    showSidePanelToggle?: boolean;
    showAsideToggle?: boolean;
    showBreadcrumbs?: boolean;
    showHeader?: boolean;
    showHeading?: boolean;
    showHeaderTitleInline?: boolean;
    showSubHeader?: boolean;
    showStartUpButton?: boolean;
    userAvatarMenu?: UserAvatarMenuProps;
    showUserAvatarMenu?: boolean;
};

const SPRING = {
    type: "spring",
    stiffness: 260,
    damping: 24,
    mass: 0.75,
} as const;

const ROOT_NAV: RootNavItem[] = [
    { id: "home", href: "/", label: "Home", icon: Home },
    { id: "projects", href: "/projects", label: "Projects", icon: FolderKanban },
    { id: "parts", href: "/parts", label: "Parts", icon: Library },
    { id: "startup", href: "/startup", label: "Startup", icon: BarChart3 },
];

function resolveRoot(pathname: string): string {
    if (pathname === "/") {
        return "home";
    }

    if (pathname.startsWith("/projects")) {
        return "projects";
    }

    if (pathname.startsWith("/startup")) {
        return "startup";
    }

    if (pathname.startsWith("/parts")) {
        return "parts";
    }

    return "home";
}

export default function PageLayout({
    children,
    title,
    subtitle,
    headerActions,
    floatingActions,
    variant = "default",
    showAside = true,
    navItems = ROOT_NAV,
    activeRootId: activeRootIdProp,
    commandSearchGroups = [],
    commandSearchPlaceholder,
    classNames,
    sidePanelContent,
    asideContent,
    subHeader,
    sideRailFooter,
    showSidePanelToggle,
    showAsideToggle,
    showBreadcrumbs = true,
    showHeader = true,
    showHeading = false,
    showHeaderTitleInline = false,
    showSubHeader = true,
    showStartUpButton = false,
    userAvatarMenu,
    showUserAvatarMenu = true,
}: PageLayoutProps) {
    const pathname = usePathname();

    const activeRoot = useMemo(() => activeRootIdProp ?? resolveRoot(pathname), [activeRootIdProp, pathname]);
    const activeNav = navItems.find((item) => item.id === activeRoot) ?? navItems[0];

    return (
        <LayoutScaffold
            title={title ?? activeNav.label}
            subtitle={subtitle}
            activeRootId={activeRoot}
            navItems={navItems}
            sidePanel={sidePanelContent}
            aside={showAside ? asideContent : undefined}
            subHeader={subHeader}
            showAside={showAside}
            variant={variant}
            classNames={classNames}
            floatingActions={floatingActions}
            commandSearchGroups={commandSearchGroups}
            commandSearchPlaceholder={commandSearchPlaceholder ?? `Search in ${title ?? activeNav.label}...`}
            sideRailFooter={sideRailFooter}
            showSidePanelToggle={showSidePanelToggle}
            showAsideToggle={showAsideToggle ?? showAside}
            showBreadcrumbs={showBreadcrumbs}
            showHeader={showHeader}
            showHeading={showHeading}
            showHeaderTitleInline={showHeaderTitleInline}
            showSubHeader={showSubHeader}
            showStartUpButton={showStartUpButton}
            userAvatarMenu={userAvatarMenu}
            showUserAvatarMenu={showUserAvatarMenu}
            headerActions={headerActions}
        >
            <motion.div
                className="w-full h-full p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING}
            >
                {children}
            </motion.div>
        </LayoutScaffold>
    );
}
