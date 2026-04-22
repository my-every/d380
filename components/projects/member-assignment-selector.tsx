"use client"

/**
 * Member Assignment Selector
 *
 * Refactored member selector that:
 * - Consumes TeamMember data (badge, role, stages, status, avatars)
 * - Filters by availability (status === "active" with no current assignment)
 * - Shows required skills per assignment stage
 * - Displays role badges, skill match level, and workload
 * - Supports assigning members to a project assignment
 */

import * as React from "react"
import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import {
    Plus,
    Search,
    Check,
    X,
    Shield,
    GraduationCap,
    UserCheck,
    AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { AssignmentStageId } from "@/types/d380-assignment-stages"

// ============================================================================
// Types
// ============================================================================

/** Subset of TeamMember used by this component */
export interface AssignableMember {
    badge: string
    fullName: string
    firstName: string
    lastName: string
    initials: string
    shift: string
    primaryRole: string
    secondaryRoles: string[]
    status: "active" | "break" | "meeting" | "offline"
    experiencedStages: string[]
    traineeEligibleStages: string[]
    avatarPath: string | null
    /** Currently assigned project IDs (empty = available) */
    currentProjectIds?: string[]
    /** Current sheet names being worked on */
    currentSheetNames?: string[]
}

export interface MemberAssignmentSelectorProps {
    /** All members from roster */
    members: AssignableMember[]
    /** Currently assigned badges */
    selected: string[]
    /** Callback when selection changes */
    onChange: (selected: string[]) => void
    /** Max simultaneous assignees */
    max?: number
    /** Max visible avatars before overflow */
    maxVisible?: number
    /** Label above the selector */
    label?: string
    /** Required stage for skill filtering */
    requiredStage?: AssignmentStageId
    /** If true, only show members matching the required stage */
    filterBySkill?: boolean
    /** If true, only show available (active + unassigned) members */
    filterByAvailability?: boolean
    className?: string
}

// ============================================================================
// Stage → Role mapping
// ============================================================================

const STAGE_ROLE_MAP: Partial<Record<AssignmentStageId, string[]>> = {
    READY_TO_LAY: ["BUILDUP", "FLOAT_LEAD"],
    BUILD_UP: ["BUILDUP", "FLOAT_LEAD"],
    READY_TO_WIRE: ["WIRING", "FLOAT_LEAD"],
    WIRING: ["WIRING", "FLOAT_LEAD"],
    READY_FOR_VISUAL: ["WIRING", "FLOAT_LEAD"],
    WIRING_IPV: ["WIRING", "FLOAT_LEAD"],
    READY_TO_HANG: ["BUILDUP", "WIRING", "FLOAT_LEAD"],
    BOX_BUILD: ["BUILDUP", "WIRING", "FLOAT_LEAD"],
    READY_TO_CROSS_WIRE: ["WIRING", "FLOAT_LEAD"],
    CROSS_WIRE: ["WIRING", "FLOAT_LEAD"],
    CROSS_WIRE_IPV: ["WIRING", "FLOAT_LEAD"],
    READY_TO_TEST: ["TEST", "FLOAT_LEAD"],
    TEST_1ST_PASS: ["TEST", "FLOAT_LEAD"],
    POWER_CHECK: ["TEST", "FLOAT_LEAD"],
    READY_FOR_BIQ: ["TEST", "FLOAT_LEAD"],
    BIQ: ["TEST", "FLOAT_LEAD"],
}

// ============================================================================
// Availability & Skill Helpers
// ============================================================================

function isAvailable(member: AssignableMember): boolean {
    return (
        member.status === "active" &&
        (!member.currentProjectIds || member.currentProjectIds.length === 0)
    )
}

type SkillMatch = "experienced" | "trainee" | "none"

function getSkillMatch(
    member: AssignableMember,
    stage: AssignmentStageId | undefined,
): SkillMatch {
    if (!stage) return "experienced" // no filter — assume match
    if (member.experiencedStages.includes(stage)) return "experienced"
    if (member.traineeEligibleStages.includes(stage)) return "trainee"

    // Also check role-based match
    const requiredRoles = STAGE_ROLE_MAP[stage]
    if (requiredRoles) {
        const allRoles = [member.primaryRole, ...member.secondaryRoles]
        if (allRoles.some((r) => requiredRoles.includes(r))) return "experienced"
    }

    return "none"
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

// ============================================================================
// Status indicator colors
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
    active: "bg-emerald-500",
    break: "bg-amber-400",
    meeting: "bg-blue-400",
    offline: "bg-slate-400",
}

// ============================================================================
// Avatar with status dot
// ============================================================================

interface AvatarProps {
    member: AssignableMember
    isSelected: boolean
    skillMatch: SkillMatch
    onClick: () => void
}

function MemberAvatar({ member, isSelected, skillMatch, onClick }: AvatarProps) {
    return (
        <motion.button
            layoutId={`member-${member.badge}`}
            onClick={onClick}
            className="group relative flex flex-col items-center gap-1.5 outline-none cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
            <div
                className={cn(
                    "relative w-11 h-11 rounded-full overflow-hidden transition-all duration-200",
                    "group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2",
                    !isSelected && "opacity-50 hover:opacity-75",
                )}
            >
                {member.avatarPath ? (
                    <img
                        src={member.avatarPath}
                        alt={member.fullName}
                        className={cn(
                            "w-full h-full object-cover transition-all duration-200",
                            !isSelected && "grayscale",
                        )}
                    />
                ) : (
                    <div
                        className={cn(
                            "w-full h-full flex items-center justify-center text-xs font-medium transition-colors duration-200",
                            isSelected
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground",
                        )}
                    >
                        {getInitials(member.fullName)}
                    </div>
                )}

                {/* Status dot */}
                <div
                    className={cn(
                        "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                        STATUS_COLORS[member.status] || STATUS_COLORS.offline,
                    )}
                />
            </div>

            {/* Skill match indicator */}
            {skillMatch === "trainee" && (
                <div className="absolute -top-0.5 -right-0.5">
                    <GraduationCap className="h-3.5 w-3.5 text-amber-500" />
                </div>
            )}

            {/* Add icon for unselected */}
            <AnimatePresence>
                {!isSelected && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute bottom-5 right-0 w-4 h-4 rounded-full bg-foreground dark:bg-white flex items-center justify-center shadow-sm"
                    >
                        <Plus className="w-2.5 h-2.5 text-background dark:text-black" strokeWidth={2.5} />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.span
                layoutId={`member-name-${member.badge}`}
                className={cn(
                    "text-[10px] font-medium truncate max-w-[52px] transition-colors duration-200",
                    isSelected ? "text-foreground" : "text-muted-foreground",
                )}
            >
                {member.firstName}
            </motion.span>
        </motion.button>
    )
}

// ============================================================================
// Add Button
// ============================================================================

function AddButton({ onClick, isOpen }: { onClick: () => void; isOpen: boolean }) {
    return (
        <motion.button
            onClick={onClick}
            className="group flex flex-col items-center gap-1.5 outline-none cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            <div
                className={cn(
                    "w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-200",
                    "group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2",
                    isOpen
                        ? "border-primary bg-primary/10"
                        : "border-muted-foreground/40 hover:border-muted-foreground/60 hover:bg-muted/50",
                )}
            >
                <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                    <Plus
                        className={cn(
                            "w-5 h-5 transition-colors duration-200",
                            isOpen ? "text-primary" : "text-muted-foreground",
                        )}
                    />
                </motion.div>
            </div>
            <span
                className={cn(
                    "text-[10px] font-medium transition-colors duration-200",
                    isOpen ? "text-primary" : "text-muted-foreground",
                )}
            >
                Add
            </span>
        </motion.button>
    )
}

// ============================================================================
// Dropdown
// ============================================================================

interface DropdownProps {
    members: AssignableMember[]
    selected: string[]
    onSelect: (badge: string) => void
    searchQuery: string
    onSearchChange: (query: string) => void
    requiredStage?: AssignmentStageId
    filterBySkill: boolean
    filterByAvailability: boolean
}

function MemberDropdown({
    members,
    selected,
    onSelect,
    searchQuery,
    onSearchChange,
    requiredStage,
    filterBySkill,
    filterByAvailability,
}: DropdownProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const filteredMembers = useMemo(() => {
        const query = searchQuery.toLowerCase()
        return members
            .filter((m) => {
                // Text search
                if (
                    query &&
                    !m.fullName.toLowerCase().includes(query) &&
                    !m.badge.includes(query)
                )
                    return false

                // Availability filter
                if (filterByAvailability && !isAvailable(m)) return false

                // Skill filter
                if (filterBySkill && requiredStage) {
                    const match = getSkillMatch(m, requiredStage)
                    if (match === "none") return false
                }

                return true
            })
            .sort((a, b) => {
                // Selected first
                const aSelected = selected.includes(a.badge)
                const bSelected = selected.includes(b.badge)
                if (aSelected && !bSelected) return -1
                if (!aSelected && bSelected) return 1

                // Available first
                const aAvail = isAvailable(a)
                const bAvail = isAvailable(b)
                if (aAvail && !bAvail) return -1
                if (!aAvail && bAvail) return 1

                // Experienced over trainee
                if (requiredStage) {
                    const aMatch = getSkillMatch(a, requiredStage)
                    const bMatch = getSkillMatch(b, requiredStage)
                    if (aMatch === "experienced" && bMatch !== "experienced") return -1
                    if (bMatch === "experienced" && aMatch !== "experienced") return 1
                }

                return 0
            })
    }, [members, selected, searchQuery, filterByAvailability, filterBySkill, requiredStage])

    const availableCount = filteredMembers.filter(isAvailable).length

    return (
        <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full right-0 mt-2 w-80 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-50"
        >
            {/* Search */}
            <div className="p-3 border-b border-border">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search by name or badge..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-transparent rounded-lg outline-none focus:border-primary/50 focus:bg-background placeholder:text-muted-foreground transition-colors"
                    />
                </div>
                {/* Availability summary */}
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                    <UserCheck className="h-3 w-3" />
                    <span>
                        {availableCount} available
                        {requiredStage && ` · Stage: ${requiredStage.replace(/_/g, " ")}`}
                    </span>
                </div>
            </div>

            {/* Member list */}
            <div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                <AnimatePresence mode="popLayout">
                    {filteredMembers.map((member, index) => {
                        const isSelected = selected.includes(member.badge)
                        const available = isAvailable(member)
                        const skillMatch = getSkillMatch(member, requiredStage)

                        return (
                            <motion.button
                                key={member.badge}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ delay: index * 0.02, duration: 0.15 }}
                                onClick={() => onSelect(member.badge)}
                                disabled={!available && !isSelected}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                                    isSelected
                                        ? "bg-primary/5 hover:bg-primary/10"
                                        : available
                                            ? "hover:bg-muted/50"
                                            : "opacity-50 cursor-not-allowed",
                                )}
                            >
                                {/* Avatar */}
                                <div
                                    className={cn(
                                        "w-9 h-9 rounded-full overflow-hidden flex-shrink-0 relative",
                                        !isSelected && !available && "grayscale opacity-60",
                                    )}
                                >
                                    {member.avatarPath ? (
                                        <img
                                            src={member.avatarPath}
                                            alt={member.fullName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div
                                            className={cn(
                                                "w-full h-full flex items-center justify-center text-xs font-medium",
                                                isSelected
                                                    ? "bg-primary/10 text-primary"
                                                    : "bg-muted text-muted-foreground",
                                            )}
                                        >
                                            {getInitials(member.fullName)}
                                        </div>
                                    )}
                                    {/* Status dot */}
                                    <div
                                        className={cn(
                                            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-popover",
                                            STATUS_COLORS[member.status] || STATUS_COLORS.offline,
                                        )}
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={cn(
                                                "text-sm font-medium truncate transition-colors",
                                                isSelected ? "text-foreground" : "text-foreground/80",
                                            )}
                                        >
                                            {member.fullName}
                                        </span>
                                        {/* Skill match badge */}
                                        {skillMatch === "experienced" && requiredStage && (
                                            <Shield className="h-3 w-3 text-emerald-500 shrink-0" />
                                        )}
                                        {skillMatch === "trainee" && (
                                            <GraduationCap className="h-3 w-3 text-amber-500 shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge
                                            variant="outline"
                                            className="text-[9px] h-3.5 px-1 font-mono"
                                        >
                                            {member.badge}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground capitalize">
                                            {member.primaryRole.toLowerCase().replace("_", " ")}
                                        </span>
                                        {!available && (
                                            <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                                                <AlertCircle className="h-2.5 w-2.5" />
                                                {member.status === "active" ? "busy" : member.status}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Check circle */}
                                <div
                                    className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200",
                                        isSelected
                                            ? "bg-primary"
                                            : "border-2 border-muted-foreground/30",
                                    )}
                                >
                                    {isSelected && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        >
                                            <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                                        </motion.div>
                                    )}
                                </div>
                            </motion.button>
                        )
                    })}
                </AnimatePresence>

                {filteredMembers.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                        No eligible members found
                    </div>
                )}
            </div>
        </motion.div>
    )
}

// ============================================================================
// Main Component
// ============================================================================

const MemberAssignmentSelector = React.forwardRef<
    HTMLDivElement,
    MemberAssignmentSelectorProps
>(
    (
        {
            members,
            selected,
            onChange,
            max,
            maxVisible = 5,
            label,
            requiredStage,
            filterBySkill = true,
            filterByAvailability = true,
            className,
        },
        ref,
    ) => {
        const [isOpen, setIsOpen] = useState(false)
        const [searchQuery, setSearchQuery] = useState("")
        const containerRef = useRef<HTMLDivElement>(null)

        useEffect(() => {
            function handleClickOutside(event: MouseEvent) {
                if (
                    containerRef.current &&
                    !containerRef.current.contains(event.target as Node)
                ) {
                    setIsOpen(false)
                    setSearchQuery("")
                }
            }

            document.addEventListener("mousedown", handleClickOutside)
            return () => document.removeEventListener("mousedown", handleClickOutside)
        }, [])

        // Sort members: selected first, then available, then rest
        const sortedMembers = useMemo(() => {
            return [...members].sort((a, b) => {
                const aSelected = selected.includes(a.badge)
                const bSelected = selected.includes(b.badge)
                if (aSelected && !bSelected) return -1
                if (!aSelected && bSelected) return 1

                const aAvail = isAvailable(a)
                const bAvail = isAvailable(b)
                if (aAvail && !bAvail) return -1
                if (!aAvail && bAvail) return 1

                return 0
            })
        }, [members, selected])

        const visibleMembers = sortedMembers
            .filter((m) => selected.includes(m.badge) || isAvailable(m))
            .slice(0, maxVisible)

        const toggleMember = useCallback(
            (badge: string) => {
                const current = selected.includes(badge)
                if (current) {
                    onChange(selected.filter((s) => s !== badge))
                } else {
                    if (max && selected.length >= max) return
                    onChange([...selected, badge])
                }
            },
            [selected, onChange, max],
        )

        return (
            <div ref={ref} className={cn("relative", className)}>
                {label && (
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        {label}
                        {requiredStage && (
                            <span className="ml-2 normal-case tracking-normal font-normal text-[10px]">
                                · {requiredStage.replace(/_/g, " ")}
                            </span>
                        )}
                    </div>
                )}
                <div ref={containerRef} className="flex items-start gap-3 flex-wrap">
                    <LayoutGroup>
                        {visibleMembers.map((member) => (
                            <MemberAvatar
                                key={member.badge}
                                member={member}
                                isSelected={selected.includes(member.badge)}
                                skillMatch={getSkillMatch(member, requiredStage)}
                                onClick={() => toggleMember(member.badge)}
                            />
                        ))}

                        <div className="relative">
                            <AddButton
                                isOpen={isOpen}
                                onClick={() => setIsOpen(!isOpen)}
                            />

                            <AnimatePresence>
                                {isOpen && (
                                    <MemberDropdown
                                        members={members}
                                        selected={selected}
                                        onSelect={toggleMember}
                                        searchQuery={searchQuery}
                                        onSearchChange={setSearchQuery}
                                        requiredStage={requiredStage}
                                        filterBySkill={filterBySkill}
                                        filterByAvailability={filterByAvailability}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </LayoutGroup>
                </div>
            </div>
        )
    },
)

MemberAssignmentSelector.displayName = "MemberAssignmentSelector"

export { MemberAssignmentSelector }
