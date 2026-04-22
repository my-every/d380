"use client";

/**
 * Assignment Card Component
 * 
 * Three card density levels with configurable section visibility:
 * - compact:  Title + SWS badge only, minimal footprint
 * - standard: Layout image, icon, status, progress, actions (default)
 * - detailed: Everything in standard + stage, detection info, row count, requirements
 * 
 * Mobile-first responsive: single-column-friendly, touch targets ≥ 44px,
 * text never truncated below readable width.
 * 
 * Quick-edit dropdown lets users change SWS type, stage, and layout
 * inline without opening the full mapping modal.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ExternalLink,
  List,
  Info,
  Zap,
  ArrowRight,
  MoreVertical,
  Users,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { QuickEditModal } from "./assignment-quick-edit-modal";
import type { MappedAssignment } from "./project-assignment-mapping-modal";
import type { SwsTypeId } from "@/lib/assignment/sws-detection";
import { SWS_TYPE_REGISTRY } from "@/lib/assignment/sws-detection";
import { SWS_ICON_MAP } from "@/components/projects/sws-type-grid";
import { ASSIGNMENT_STATUS_CONFIG, type AssignmentStatus } from "@/types/d380-assignment";
import type { AssignmentStageId } from "@/types/d380-assignment-stages";
import type { LayoutPagePreview } from "@/lib/layout-matching";
import { LayoutPreviewModal } from "./layout-preview-modal";

// ============================================================================
// Types
// ============================================================================

/** Card density levels — controls baseline sections shown */
export type AssignmentCardDensity = "compact" | "standard" | "detailed";

/** Toggleable sections within the card */
export type AssignmentCardSection =
  | "layout"       // Layout image header
  | "icon"         // SWS type icon overlay
  | "status"       // Assignees + Status badges
  | "progress"     // Row count + progress bar
  | "actions"      // Wire List / View Assignment buttons
  | "stage"        // Current stage badge

/** Set of which sections are currently visible */
export type AssignmentCardVisibility = Set<AssignmentCardSection>;

/** Default sections for each density */
export const DENSITY_DEFAULTS: Record<AssignmentCardDensity, AssignmentCardSection[]> = {
  compact: ["status"],
  standard: ["layout", "icon", "status", "progress", "actions"],
  detailed: ["layout", "icon", "status", "progress", "actions", "stage"],
};

/** All available sections in display order */
export const ALL_SECTIONS: { key: AssignmentCardSection; label: string }[] = [
  { key: "layout", label: "Layout Image" },
  { key: "icon", label: "SWS Icon" },
  { key: "status", label: "Status & Assignees" },
  { key: "progress", label: "Progress" },
  { key: "stage", label: "Stage" },
  { key: "actions", label: "Action Buttons" },
];

/** Callback for inline edits on the card */
export interface AssignmentCardChangeHandler {
  (sheetSlug: string, field: "selectedSwsType" | "selectedStage" | "matchedLayoutPage", value: string | number): void;
}

interface AssignmentCardProps {
  assignment: MappedAssignment;
  projectId: string;
  index?: number;
  layoutPage?: LayoutPagePreview;
  /** All available layout pages for the layout-page picker submenu */
  layoutPages?: LayoutPagePreview[];
  onViewAssignment?: () => void;
  /** Card density level */
  density?: AssignmentCardDensity;
  /** Override section visibility (takes precedence over density defaults) */
  visibleSections?: AssignmentCardVisibility;
  /** Inline field change callback — saves single-field edits without the modal */
  onFieldChange?: AssignmentCardChangeHandler;
  /** Placeholder: opens a dedicated assign modal in the future */
  onAssign?: (sheetSlug: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const SWS_ICON_SIZE: Record<SwsTypeId, { w: number; h: number }> = {
  BLANK: { w: 30, h: 30 },
  RAIL: { w: 44, h: 33 },
  BOX: { w: 30, h: 30 },
  PANEL: { w: 30, h: 30 },
  COMPONENT: { w: 30, h: 30 },
  UNDECIDED: { w: 30, h: 30 },
};

const STATUS_BADGE_VARIANTS: Record<AssignmentStatus, { variant: "default" | "secondary" | "outline" | "destructive"; className: string }> = {
  NOT_STARTED: { variant: "outline", className: "border-border text-muted-foreground bg-background" },
  IN_PROGRESS: { variant: "secondary", className: "bg-secondary text-secondary-foreground border-0" },
  INCOMPLETE: { variant: "secondary", className: "bg-muted text-muted-foreground border-0" },
  COMPLETE: { variant: "secondary", className: "bg-secondary text-secondary-foreground border-0" },
};

const STAGE_LABELS: Record<string, string> = {
  READY_TO_LAY: "Ready to Lay",
  READY_TO_WIRE: "Ready to Wire",
  READY_FOR_VISUAL: "Ready for Visual",
  READY_TO_HANG: "Ready to Hang",
  READY_TO_TEST: "Ready to Test",
  READY_FOR_BIQ: "Ready for BIQ",
};

// ============================================================================
// Striped Progress Bar
// ============================================================================

function StripedProgressBar({
  value,
  isNotStarted,
  className,
}: {
  value: number;
  isNotStarted: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className,
      )}
    >
      <div
        className={cn(
          "h-full transition-all rounded-full",
          isNotStarted
            ? "bg-muted-foreground/20 dark:bg-muted-foreground/15"
            : "bg-primary",
        )}
        style={{
          width: isNotStarted ? "100%" : `${value}%`,
          ...(isNotStarted
            ? {
              backgroundImage:
                "linear-gradient(45deg, rgba(0,0,0,0.08) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.08) 75%, transparent 75%)",
              backgroundSize: "12px 12px",
            }
            : {}),
        }}
      />
    </div>
  );
}

// ============================================================================
// Quick-Edit Dropdown → opens modal
// ============================================================================

function CardQuickEditMenu({
  assignment,
  layoutPages = [],
  onFieldChange,
  onAssign,
}: {
  assignment: MappedAssignment;
  layoutPages: LayoutPagePreview[];
  onFieldChange?: AssignmentCardChangeHandler;
  onAssign?: (slug: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-7 sm:w-7 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Card options"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            className="text-xs gap-2"
            onSelect={() => setModalOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Quick Edit…
          </DropdownMenuItem>

          {onAssign && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs gap-2"
                onSelect={() => onAssign(assignment.sheetSlug)}
              >
                <Users className="h-3.5 w-3.5" />
                Assign…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <QuickEditModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        assignment={assignment}
        layoutPages={layoutPages}
        onFieldChange={onFieldChange}
        onAssign={onAssign}
      />
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AssignmentCard({
  assignment,
  projectId,
  index = 0,
  layoutPage,
  layoutPages = [],
  onViewAssignment,
  density = "standard",
  visibleSections,
  onFieldChange,
  onAssign,
}: AssignmentCardProps) {
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Resolve which sections to show
  const sections = visibleSections ?? new Set(DENSITY_DEFAULTS[density]);
  const show = (s: AssignmentCardSection) => sections.has(s);

  // SWS type info
  const swsType = assignment.selectedSwsType || "UNDECIDED";
  const swsTypeInfo = SWS_TYPE_REGISTRY[swsType];
  const swsIconPath = SWS_ICON_MAP[swsType];
  const swsIconSize = SWS_ICON_SIZE[swsType];

  // Status info
  const status = assignment.selectedStatus || "NOT_STARTED";
  const statusConfig = ASSIGNMENT_STATUS_CONFIG[status];
  const statusBadgeConfig = STATUS_BADGE_VARIANTS[status];
  const isNotStarted = status === "NOT_STARTED";

  // Stage info
  const stage = assignment.selectedStage || "UNASSIGNED";
  const stageLabel = STAGE_LABELS[stage] || stage;

  // Progress
  const totalSteps = assignment.rowCount || 0;
  const completedSteps = 0; // TODO: wire to actual progress
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Display
  const displayTitle = (assignment.sheetName || assignment.sheetSlug || "Untitled").toUpperCase();
  const hasLayoutImage = layoutPage?.imageUrl;

  const assignmentRoutePath = `/projects/${projectId}/assignments/${assignment.sheetSlug}`;
  const wireListRoutePath = `/projects/${projectId}/${assignment.sheetSlug}`;

  const hasQuickEdit = !!(onFieldChange || onAssign);

  // ─── Compact card ───
  if (density === "compact" && !visibleSections) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
        className="min-w-[200px]"
      >
        <Card className="group gap-0 overflow-hidden relative bg-card border-border/50 hover:border-border hover:shadow-md transition-all rounded-xl">
          <CardContent className="py-3 px-3 sm:px-4">
            {/* Title + SWS badge + quick-edit */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Image
                  src={swsIconPath}
                  alt={swsTypeInfo.label}
                  width={20}
                  height={20}
                  className="opacity-80 shrink-0"
                />
                <h3 className="text-sm font-semibold text-foreground min-w-max ">
                  {displayTitle}
                </h3>
              </div>

              {hasQuickEdit && (
                <CardQuickEditMenu
                  assignment={assignment}
                  layoutPages={layoutPages}
                  onFieldChange={onFieldChange}
                  onAssign={onAssign}
                />
              )}
            </div>

            {/* Compact status: Assignees + Status side-by-side */}
            {show("status") && (
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground mb-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-[10px]">Assignees:</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-background">
                    TBD
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  <span className="text-[10px]">Status:</span>
                  <Badge
                    variant={statusBadgeConfig.variant}
                    className={cn("text-[10px] h-4 px-1.5", statusBadgeConfig.className)}
                  >
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>
            )}

            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-muted text-muted-foreground shrink-0">
              {swsTypeInfo.shortLabel}
            </Badge>

          </CardContent>



          {/* Thin striped progress */}
          <StripedProgressBar value={progressPercent} isNotStarted={isNotStarted} className="h-1" />

          {/* Inline link (z-index below quick-edit trigger) */}
          {!hasQuickEdit && (
            <Link
              href={wireListRoutePath}
              className="absolute inset-0 z-[1]"
              aria-label={`Open ${displayTitle}`}
            />
          )}
        </Card>
      </motion.div>
    );
  }

  // ─── Standard / Detailed card ───
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="w-full"
    >
      <Card
        className={cn(
          "group pt-0 gap-0 overflow-hidden relative bg-card border-border/50 hover:border-border hover:shadow-lg transition-all rounded-2xl",
          density === "detailed" && "border-border",
        )}
      >
        {/* Layout Background Image */}
        {show("layout") && (
          <div
            className="relative h-28 sm:h-32 border border-border bg-muted/70 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => hasLayoutImage && setIsPreviewModalOpen(true)}
            title={hasLayoutImage ? "Click to view layout" : undefined}
          >
            {hasLayoutImage ? (
              <Image
                src={layoutPage.imageUrl}
                alt={`Layout for ${displayTitle}`}
                fill
                className="object-cover transition-opacity"
              />
            ) : (
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <pattern id={`grid-${assignment.sheetSlug}`} width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground" />
                    </pattern>
                  </defs>
                  <rect width="100" height="100" fill={`url(#grid-${assignment.sheetSlug})`} />
                </svg>
              </div>
            )}

            {/* Quick-edit in top-right corner of the image */}
            {hasQuickEdit && (
              <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                <CardQuickEditMenu
                  assignment={assignment}
                  layoutPages={layoutPages}
                  onFieldChange={onFieldChange}
                  onAssign={onAssign}
                />
              </div>
            )}
          </div>
        )}

        {/* SWS Type Icon overlay */}
        {show("icon") && show("layout") && (
          <div className="absolute left-3 sm:left-4 top-[92px] sm:top-[108px] z-10">
            <div className="flex items-center justify-center w-11 h-11 sm:w-14 sm:h-14 rounded-md p-1.5 sm:p-2 bg-background border border-border shadow-md">
              <Image
                src={swsIconPath}
                alt={swsTypeInfo.label}
                width={swsIconSize.w}
                height={swsIconSize.h}
                className="opacity-90"
              />
            </div>
          </div>
        )}

        {/* Card Content */}
        <CardContent
          className={cn(
            "pb-4 gap-2 px-4 sm:px-5",
            show("icon") && show("layout") ? "pt-8 sm:pt-10" : "pt-4 sm:pt-5",
          )}
        >
          {/* Title + SWS Badge (+ quick-edit when no layout header) */}
          <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {show("icon") && !show("layout") && (
                <Image
                  src={swsIconPath}
                  alt={swsTypeInfo.label}
                  width={24}
                  height={24}
                  className="opacity-80 shrink-0"
                />

              )}
              <h3 className="text-sm sm:text-base font-semibold text-foreground line-clamp-2 flex-1">
                {displayTitle}
              </h3>
            </div>
            <Badge variant="secondary" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1.5 bg-muted text-muted-foreground shrink-0">
              {swsTypeInfo.shortLabel}
            </Badge>
            {hasQuickEdit && !show("layout") && (
              <CardQuickEditMenu
                assignment={assignment}
                layoutPages={layoutPages}
                onFieldChange={onFieldChange}
                onAssign={onAssign}
              />
            )}
          </div>

          {/* Status Row */}
          {show("status") && (
            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2  text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px] sm:text-xs">Assignees:</span>
                <Badge variant="outline" className="text-[10px] sm:text-xs h-4 sm:h-5 bg-background">
                  TBD
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px] sm:text-xs">Status:</span>
                <Badge
                  variant={statusBadgeConfig.variant}
                  className={cn("text-[10px] sm:text-xs h-4 sm:h-5", statusBadgeConfig.className)}
                >
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          )}

          {/* Stage Row */}
          {show("stage") && (
            <div className="flex items-center mt-2 gap-2 mb-2 sm:mb-3">
              <span className="text-[11px] sm:text-xs text-muted-foreground">Stage:</span>
              <Badge variant="outline" className="text-[10px] sm:text-xs h-4 sm:h-5 font-medium">
                {stageLabel}
              </Badge>
            </div>
          )}

          {/* Progress Row — always shows striped bar */}
          {show("progress") && (
            <div className="mt-2 sm:mb-3">
              <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-1.5">
                <span className="font-medium tabular-nums">{completedSteps}/{totalSteps}</span>
                <span className="font-medium tabular-nums">{progressPercent}%</span>
              </div>
              <StripedProgressBar
                value={progressPercent}
                isNotStarted={isNotStarted}
                className="h-1.5 sm:h-2"
              />
            </div>
          )}




        </CardContent>

        {/* Footer with Action Buttons — stack vertically on small screens */}
        {show("actions") && (
          <CardFooter className="pt-0 pb-4 px-4 sm:px-5 gap-3 flex-col">
            <Button
              variant="outline"
              size="sm"
              className="w-full  justify-center gap-1 py-1.5 rounded-lg border-border bg-background hover:bg-secondary hover:text-secondary-foreground transition-colors text-xs sm:text-sm"
              asChild
            >
              <Link href={wireListRoutePath}>
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Wire List</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center gap-1 py-1.5 rounded-lg border-border bg-background hover:bg-secondary hover:text-secondary-foreground transition-colors text-xs sm:text-sm"
              asChild
              onClick={onViewAssignment}
            >
              <Link href={assignmentRoutePath}>
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open Assignment</span>
              </Link>
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Layout Preview Modal */}
      {hasLayoutImage && layoutPage && (
        <LayoutPreviewModal
          pages={[layoutPage]}
          initialPageNumber={layoutPage.pageNumber}
          matchedSheetName={assignment.sheetName}
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
        />
      )}
    </motion.div>
  );
}
