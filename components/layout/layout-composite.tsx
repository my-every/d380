"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PanelLeft, PanelRight, Search, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLayoutUI } from "@/components/layout/layout-context";

const SPRING = {
    type: "spring",
    stiffness: 280,
    damping: 28,
    mass: 0.8,
} as const;

type CompositeRegionProps = {
    children: React.ReactNode;
    className?: string;
};

export type CommandSearchItem = {
    id: string;
    label: string;
    description?: string;
    href?: string;
    keywords?: string[];
    shortcut?: string;
    icon?: React.ReactNode;
    imageSrc?: string;
    count?: number;
    badge?: string;
};

export type CommandSearchGroup = {
    heading: string;
    items: CommandSearchItem[];
};

export function CompositeSidePanel({ children, className }: CompositeRegionProps) {
    const { isSidePanelOpen, closeSidePanel } = useLayoutUI();

    return (
        <>
            {isSidePanelOpen ? (
                <aside className={cn("hidden border-r border-border lg:block", className)}>{children}</aside>
            ) : null}

            <AnimatePresence>
                {isSidePanelOpen ? (
                    <>
                        <motion.button
                            key="sidepanel-overlay"
                            type="button"
                            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
                            onClick={closeSidePanel}
                            aria-label="Close side panel"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        />
                        <motion.aside
                            key="sidepanel-mobile"
                            className={cn(
                                "fixed inset-y-2 left-2 z-40 w-[82%] max-w-[19rem] rounded-3xl border border-border bg-card p-3 shadow-xl lg:hidden",
                                className
                            )}
                            initial={{ x: "-110%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-110%" }}
                            transition={SPRING}
                        >
                            <div className="mb-3 flex items-center justify-between">

                                <button
                                    type="button"
                                    onClick={closeSidePanel}
                                    className="rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    aria-label="Close panel"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            {children}
                        </motion.aside>
                    </>
                ) : null}
            </AnimatePresence>
        </>
    );
}

export function CompositeAside({ children, className }: CompositeRegionProps) {
    const { isAsideOpen } = useLayoutUI();

    if (!isAsideOpen) {
        return null;
    }

    return (
        <motion.aside
            className={cn("flex flex-col flex-1 shrink-0 border-l border-border bg-background  max-w-xl",className)}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={SPRING}
        >
            {children}
        </motion.aside>
    );
}

export function CompositeHeaderSearch({ className }: { className?: string }) {
    const { openCommandSearch } = useLayoutUI();

    return (
        <button
            type="button"
            className={cn(
                "hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-muted-foreground md:flex min-w-[400px] hover:bg-accent hover:text-accent-foreground w-full ",
                className
            )}
            onClick={openCommandSearch}
            aria-label="Open command search"
        >
            <Search className="h-4 w-4" />
            <span className="text-sm flex-1">Search</span>
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Ctrl/⌘ K
            </span>
        </button>
    );
}

export function CompositeCommandSearchModal({
    groups,
    placeholder = "Search..",
}: {
    groups: CommandSearchGroup[];
    placeholder?: string;
}) {
    const { isCommandSearchOpen, closeCommandSearch, openCommandSearch, toggleCommandSearch } = useLayoutUI();
    const router = useRouter();
    const [activeGroup, setActiveGroup] = useState<string>("");

    const groupHeadings = useMemo(() => groups.map((group) => group.heading), [groups]);
    const resolvedActiveGroup =
        groupHeadings.length === 0 ? "" : (groupHeadings.includes(activeGroup) ? activeGroup : groupHeadings[0]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const isHotkey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

            if (!isHotkey) {
                return;
            }

            event.preventDefault();
            toggleCommandSearch();
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [toggleCommandSearch]);

    return (
        <CommandDialog open={isCommandSearchOpen} onOpenChange={(open) => (open ? openCommandSearch() : closeCommandSearch())}>
            <Command className="gap-0">
                <div className="border-b border-border p-2">
                    <CommandInput placeholder={placeholder} className="h-8" />
                    {groupHeadings.length > 0 ? (
                        <div className="no-scrollbar mt-2 flex items-center gap-1 overflow-x-auto pb-1">
                            {groupHeadings.map((heading) => {
                                const isActive = heading === activeGroup;

                                return (
                                    <button
                                        key={heading}
                                        type="button"
                                        className={cn(
                                            "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                                            isActive
                                                ? "border-primary/40 bg-primary/12 text-foreground"
                                                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        )}
                                        onClick={() => setActiveGroup(heading)}
                                        aria-pressed={isActive}
                                    >
                                        {heading}
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                </div>

                <CommandList className="max-h-[360px] p-1">
                    <CommandEmpty>No results found.</CommandEmpty>
                    {groups
                        .filter((group) => (resolvedActiveGroup ? group.heading === resolvedActiveGroup : true))
                        .map((group) => (
                            <CommandGroup key={group.heading} heading={group.heading}>
                                {group.items.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        value={[item.label, item.description, item.badge, ...(item.keywords ?? [])].filter(Boolean).join(" ")}
                                        keywords={item.keywords}
                                        onSelect={() => {
                                            if (item.href) {
                                                router.push(item.href);
                                            }
                                            closeCommandSearch();
                                        }}
                                    >
                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                            {item.imageSrc ? (
                                                <Image
                                                    src={item.imageSrc}
                                                    alt={item.label}
                                                    width={32}
                                                    height={32}
                                                    className="h-8 w-8 shrink-0 rounded-md object-cover"
                                                />
                                            ) : item.icon ? (
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 text-muted-foreground">
                                                    {item.icon}
                                                </span>
                                            ) : null}

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm text-foreground">{item.label}</p>
                                                {item.description ? (
                                                    <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                                                ) : null}
                                            </div>

                                            {typeof item.count === "number" ? (
                                                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                    {item.count}
                                                </span>
                                            ) : null}

                                            {item.badge ? (
                                                <Badge size="sm" variant="dot" color="blue" className="text-[10px]">
                                                    {item.badge}
                                                </Badge>
                                            ) : null}
                                        </div>
                                        {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                </CommandList>
            </Command>
        </CommandDialog>
    );
}

export function CompositeFloatingActions({ children, className }: CompositeRegionProps) {
    const { isFloatingActionsOpen } = useLayoutUI();

    return (
        <AnimatePresence>
            {isFloatingActionsOpen ? (
                <motion.div
                    className={cn("pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-3", className)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={SPRING}
                >
                    <div className="pointer-events-auto max-w-max">
                        {children}
                    </div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

type CompositeSingleToggleProps = {
    className?: string;
    show?: boolean;
};

export function CompositeSidePanelToggle({ className, show = true }: CompositeSingleToggleProps) {
    const { toggleSidePanel } = useLayoutUI();

    return (
        <AnimatePresence initial={false}>
            {show ? (
                <motion.button
                    key="side-panel-toggle"
                    type="button"
                    onClick={toggleSidePanel}
                    className={cn("rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground", className)}
                    aria-label="Toggle side panel"
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={SPRING}
                >
                    <PanelLeft className="h-4 w-4" />
                </motion.button>
            ) : null}
        </AnimatePresence>
    );
}

export function CompositeAsideToggle({ className, show = true }: CompositeSingleToggleProps) {
    const { toggleAside } = useLayoutUI();

    return (
        <AnimatePresence initial={false}>
            {show ? (
                <motion.button
                    key="aside-toggle"
                    type="button"
                    onClick={toggleAside}
                    className={cn("rounded-xl border border-border bg-card p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground", className)}
                    aria-label="Toggle aside"
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={SPRING}
                >
                    <PanelRight className="h-4 w-4" />
                </motion.button>
            ) : null}
        </AnimatePresence>
    );
}

export function CompositeToggleButtons({ className, showSidePanelToggle = true, showAsideToggle = true }: { className?: string; showSidePanelToggle?: boolean; showAsideToggle?: boolean }) {

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <CompositeSidePanelToggle show={showSidePanelToggle} />
            <CompositeAsideToggle show={showAsideToggle} />
        </div>
    );
}
