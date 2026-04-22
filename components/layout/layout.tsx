"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import {
    CompositeAside,
    CompositeCommandSearchModal,
    CompositeFloatingActions,
    CompositeHeaderSearch,
    type CommandSearchGroup,
    CompositeSidePanel,
} from "@/components/layout/layout-composite";
import { DynamicBreadcrumb } from "@/components/layout/dynamic-breadcrumb";
import { LayoutUIProvider, useLayoutUI } from "@/components/layout/layout-context";
import { UserAvatarMenu, type UserAvatarMenuProps } from "@/components/layout/user-avatar-menu";
import { SessionAvatarMenu } from "@/components/layout/session-avatar-menu";
import { cn } from "@/lib/utils";

export type RootNavItem = {
    id: string;
    href: string;
    label: string;
    icon: LucideIcon;
};

export type LayoutVariant = "default" | "compact" | "wide";

export type LayoutScaffoldClassNames = Partial<{
    root: string;
    shell: string;
    rootRail: string;
    sidePanel: string;
    header: string;
    main: string;
    mainInner: string;
    aside: string;
    bottomRail: string;
}>;

type LayoutScaffoldProps = {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    activeRootId: string;
    navItems: RootNavItem[];
    sidePanel: React.ReactNode;
    showPanel?: boolean;
    aside?: React.ReactNode;
    subHeader?: React.ReactNode;
    headerActions?: React.ReactNode;
    floatingActions?: React.ReactNode;
    commandSearchGroups?: CommandSearchGroup[];
    commandSearchPlaceholder?: string;
    variant?: LayoutVariant;
    showAside?: boolean;
    showBreadcrumbs?: boolean;
    showHeader?: boolean;
    showHeading?: boolean;
    showHeaderTitleInline?: boolean;
    showSubHeader?: boolean;
    showStartUpButton?: boolean;
    sideRailFooter?: React.ReactNode;
    showSidePanelToggle?: boolean;
    showAsideToggle?: boolean;
    userAvatarMenu?: UserAvatarMenuProps;
    showUserAvatarMenu?: boolean;
    classNames?: LayoutScaffoldClassNames;
};

const SPRING = {
    type: "spring",
    stiffness: 280,
    damping: 28,
    mass: 0.8,
} as const;

const VARIANT_STYLES: Record<LayoutVariant, { shell: string; sidePanel: string; aside: string }> = {
    default: {
        shell: "max-w-[1840px]",
        sidePanel: "lg:w-72 lg:max-w-[300px]",
        aside: "xl:w-80",
    },
    compact: {
        shell: "max-w-[1520px]",
        sidePanel: "lg:w-64 lg:max-w-[300px]",
        aside: "xl:w-72",
    },
    wide: {
        shell: "max-w-[1960px]",
        sidePanel: "lg:w-[22rem] lg:max-w-[300px]",
        aside: "xl:w-[23rem]",
    },
};

function RootRail({
    navItems,
    activeRootId,
    className,
}: {
    navItems: RootNavItem[];
    activeRootId: string;
    className?: string;
}) {
    const { openSidePanel } = useLayoutUI();

    return (
        <nav className={cn("flex items-center justify-around gap-2", className)}>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeRootId;

                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => openSidePanel()}
                        className={cn(
                            "group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-200",
                            isActive
                                ? "border-primary/60 bg-primary text-primary-foreground"
                                : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground"
                        )}
                        aria-label={item.label}
                        title={item.label}
                    >
                        <motion.span whileHover={{ y: -1.5 }} whileTap={{ scale: 0.96 }} transition={SPRING}>
                            <Icon className="h-5 w-5" />
                        </motion.span>
                    </Link>
                );
            })}
        </nav>
    );
}

function LayoutScaffoldShell({
    children,
    title,
    subtitle,
    activeRootId,
    navItems,
    sidePanel,
    showPanel,
    aside,
    subHeader,
    headerActions,
    floatingActions,
    commandSearchGroups,
    commandSearchPlaceholder,
    variant = "default",
    showAside,
    showBreadcrumbs = false,
    showHeader = true,
    showHeading = true,
    showHeaderTitleInline = false,
    showSubHeader = true,
    showStartUpButton = false,
    sideRailFooter,
    showSidePanelToggle,
    showAsideToggle,
    userAvatarMenu,
    showUserAvatarMenu = true,
    classNames,
}: LayoutScaffoldProps) {
    const prefersReducedMotion = useReducedMotion();
    const { isSidebarOpen } = useLayoutUI();

    return (
        <div
            className={cn(
                "h-screen bg-[radial-gradient(circle_at_top,var(--color-muted),var(--color-background)_58%,var(--color-accent))] p-2 sm:p-3 lg:p-4 flex flex-col overflow-hidden",
                classNames?.root
            )}
        >
            <motion.div
                className={cn(
                    "mx-auto flex h-full w-full overflow-hidden border-border border rounded-3xl",
                    VARIANT_STYLES[variant].shell,
                    classNames?.shell
                )}
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                transition={SPRING}
            >
                {isSidebarOpen ? (
                    <aside className="hidden w-20 shrink-0 py-6 lg:flex lg:flex-col lg:justify-between">
                        <RootRail navItems={navItems} activeRootId={activeRootId} className={cn("flex-col", classNames?.rootRail)} />
                        {sideRailFooter ?? (
                            <div className="mx-auto flex flex-col items-center gap-3">
                                {showUserAvatarMenu ? (
                                    userAvatarMenu ? (
                                        <UserAvatarMenu
                                            {...userAvatarMenu}
                                            showName={false}
                                            className={cn("h-12 w-12 rounded-2xl", userAvatarMenu.className)}
                                        />
                                    ) : (
                                        <SessionAvatarMenu
                                            showName={false}
                                            className="h-12 w-12 rounded-2xl"
                                        />
                                    )
                                ) : null}
                            </div>
                        )}
                    </aside>
                ) : null}



                <div className="flex min-h-0 flex-1 flex-wrap rounded-xl border border-border lg:flex-nowrap overflow-hidden">
                {showPanel ? (   <CompositeSidePanel className={cn(VARIANT_STYLES[variant].sidePanel, classNames?.sidePanel)}>
                        {sidePanel}
                    </CompositeSidePanel>): null}
                    <div className="flex min-h-0 flex-1 flex-col mx-auto lg:max-w-none lg:mx-0 overflow-hidden">
                        {showHeader ? (
                            <motion.header
                                className={cn(
                                    "sticky top-0 z-20 border-b border-border px-2 py-3.5 flex items-center justify-between backdrop-blur sm:px-4 lg:px-3",
                                    classNames?.header
                                )}
                                initial={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                                transition={SPRING}
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                                    {showBreadcrumbs ? (
                                        <div className="max-w-max">
                                            <DynamicBreadcrumb />
                                        </div>
                                    ) : null}
                                    {showHeaderTitleInline ? (
                                        <div className="min-w-0 shrink-0 pr-1 sm:pr-2">
                                            <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">
                                                {title}
                                            </h2>
                                            {subtitle ? (
                                                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                                                    {subtitle}
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}
                                    <div className="relative flex min-h-10 flex-1 items-center justify-center">
                                        <div className="w-full max-w-xl">
                                            <CompositeHeaderSearch className="mx-auto w-full min-w-0" />
                                        </div>
                                    </div>
                                </div>
                                {headerActions ? <div className="ml-2 flex shrink-0 items-center justify-end gap-2">{headerActions}</div> : null}
                            </motion.header>
                        ) : null}


                        {showHeading ? (
                            <div className="text-left px-3 sm:px-4 gap-3 flex flex-col lg:px-5">
                                <h2 className="truncate text-2xl font-medium tracking-tight text-foreground">{title}</h2>
                                {subtitle ? <p className="truncate text-md text-muted-foreground">{subtitle}</p> : null}
                            </div>
                        ) : null}

                        {showSubHeader && subHeader ? <div className="text-lg">{subHeader}</div> : null}

                        <div className="flex min-h-0 flex-1 flex-col overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                            {children}

                        </div>
                    </div>
               

                </div>
                {showAside && aside ? (
                        <CompositeAside className={cn(VARIANT_STYLES[variant].aside, classNames?.aside)}>{aside}</CompositeAside>
                    ) : null}

            </motion.div>

            <CompositeFloatingActions className={classNames?.bottomRail}>
                <div className="flex items-center gap-2">
                    {floatingActions ?? <RootRail navItems={navItems} activeRootId={activeRootId} />}
                    {showStartUpButton ? (
                        <Link
                            href="/startup?revisit=1"
                            className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-transparent text-muted-foreground transition-colors duration-200 hover:border-border hover:bg-accent hover:text-accent-foreground"
                            aria-label="Open startup selector"
                            title="Open startup selector"
                        >
                            <motion.span whileHover={{ y: -1.5 }} whileTap={{ scale: 0.96 }} transition={SPRING}>
                                <Sparkles className="h-5 w-5" />
                            </motion.span>
                        </Link>
                    ) : null}
                </div>
            </CompositeFloatingActions>

            <CompositeCommandSearchModal
                groups={commandSearchGroups ?? []}
                placeholder={commandSearchPlaceholder}
            />
        </div>
    );
}

export default function LayoutScaffold({
    children,
    title,
    subtitle,
    activeRootId,
    navItems,
    sidePanel,
    showPanel,
    aside,
    subHeader,
    headerActions,
    floatingActions,
    commandSearchGroups,
    commandSearchPlaceholder,
    variant = "default",
    showAside = true,
    showBreadcrumbs = true,
    showHeader = true,
    showHeading = true,
    showHeaderTitleInline = false,
    showSubHeader = true,
    showStartUpButton = false,
    sideRailFooter,
    showSidePanelToggle,
    showAsideToggle,
    userAvatarMenu,
    showUserAvatarMenu = true,
    classNames,
}: LayoutScaffoldProps) {
    return (
        <LayoutUIProvider defaultAsideOpen={showAside} defaultSidePanelOpen={Boolean(sidePanel)}>
            <LayoutScaffoldShell
                title={title}
                subtitle={subtitle}
                activeRootId={activeRootId}
                navItems={navItems}
                sidePanel={sidePanel}
                aside={aside}
                subHeader={subHeader}
                showPanel={showPanel}
                headerActions={headerActions}
                floatingActions={floatingActions}
                commandSearchGroups={commandSearchGroups}
                commandSearchPlaceholder={commandSearchPlaceholder}
                variant={variant}
                showAside={showAside}
                showBreadcrumbs={showBreadcrumbs}
                showHeader={showHeader}
                showHeading={showHeading}
                showHeaderTitleInline={showHeaderTitleInline}
                showSubHeader={showSubHeader}
                showStartUpButton={showStartUpButton}
                sideRailFooter={sideRailFooter}
                showSidePanelToggle={showSidePanelToggle}
                showAsideToggle={showAsideToggle}
                userAvatarMenu={userAvatarMenu}
                showUserAvatarMenu={showUserAvatarMenu}
                classNames={classNames}
            >
                {children}
            </LayoutScaffoldShell>
        </LayoutUIProvider>
    );
}
