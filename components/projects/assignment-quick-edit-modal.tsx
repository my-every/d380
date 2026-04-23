"use client";

/**
 * Assignment Quick-Edit Modal
 * 
 * Popup dialog opened from the card's ⋮ menu. Shows current
 * SWS Type, Stage, and Layout Page with inline editors and
 * a feedback banner on save.
 */

import { useState, useCallback, useEffect } from "react";
import {
  CheckCircle2,
  Layers,
  ArrowRight,
  Map,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MappedAssignment } from "./project-assignment-mapping-modal";
import type { SwsTypeId } from "@/lib/assignment/sws-detection";
import { SWS_TYPE_REGISTRY } from "@/lib/assignment/sws-detection";
import type { AssignmentStage } from "@/types/d380-assignment";
import type { LayoutPagePreview } from "@/lib/layout-matching";
import type { AssignmentCardChangeHandler } from "./assignment-card";
import { SwsTypeGrid } from "@/components/projects/sws-type-grid";

// ============================================================================
// Constants
// ============================================================================

const STAGE_OPTIONS: { value: AssignmentStage; label: string }[] = [
  { value: "UNASSIGNED", label: "Unassigned" },
  { value: "BUILD_UP", label: "Build Up" },
  { value: "BUILD_UP_IPV", label: "Build Up IPV" },
  { value: "WIRING", label: "Wiring" },
  { value: "BOX_BUILD", label: "Box Build" },
  { value: "CROSS_WIRE", label: "Cross Wire" },
  { value: "TEST_1ST_PASS", label: "1st Pass Test" },
  { value: "PWR_CHECK", label: "Power Check" },
  { value: "FINISHED_BIQ", label: "BIQ Complete" },
];

// ============================================================================
// Types
// ============================================================================

interface QuickEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: MappedAssignment;
  layoutPages?: LayoutPagePreview[];
  onFieldChange?: AssignmentCardChangeHandler;
  onAssign?: (sheetSlug: string) => void;
}

interface PendingChange {
  field: "selectedSwsType" | "selectedStage" | "matchedLayoutPage";
  label: string;
  from: string;
  to: string;
  value: string | number;
}

// ============================================================================
// Component
// ============================================================================

export function QuickEditModal({
  open,
  onOpenChange,
  assignment,
  layoutPages = [],
  onFieldChange,
  onAssign,
}: QuickEditModalProps) {
  // Local draft state
  const [swsType, setSwsType] = useState(assignment.selectedSwsType || "UNDECIDED");
  const [stage, setStage] = useState(assignment.selectedStage || "UNASSIGNED");
  const [layoutPage, setLayoutPage] = useState(
    assignment.matchedLayoutPage != null ? String(assignment.matchedLayoutPage) : "",
  );

  // Feedback
  const [savedChanges, setSavedChanges] = useState<PendingChange[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);

  // Reset local state when the modal opens with fresh data
  useEffect(() => {
    if (open) {
      setSwsType(assignment.selectedSwsType || "UNDECIDED");
      setStage(assignment.selectedStage || "UNASSIGNED");
      setLayoutPage(
        assignment.matchedLayoutPage != null ? String(assignment.matchedLayoutPage) : "",
      );
      setSavedChanges([]);
      setShowFeedback(false);
    }
  }, [open, assignment]);

  // Compute pending changes
  const getPendingChanges = useCallback((): PendingChange[] => {
    const changes: PendingChange[] = [];

    const origSws = assignment.selectedSwsType || "UNDECIDED";
    if (swsType !== origSws) {
      changes.push({
        field: "selectedSwsType",
        label: "SWS Type",
        from: SWS_TYPE_REGISTRY[origSws]?.label ?? origSws,
        to: SWS_TYPE_REGISTRY[swsType]?.label ?? swsType,
        value: swsType,
      });
    }

    const origStage = assignment.selectedStage || "UNASSIGNED";
    if (stage !== origStage) {
      const fromLabel = STAGE_OPTIONS.find((s) => s.value === origStage)?.label ?? origStage;
      const toLabel = STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? stage;
      changes.push({
        field: "selectedStage",
        label: "Stage",
        from: fromLabel,
        to: toLabel,
        value: stage,
      });
    }

    const origLayout = assignment.matchedLayoutPage != null ? String(assignment.matchedLayoutPage) : "";
    if (layoutPage !== origLayout) {
      const fromPage = origLayout || "None";
      const toPage = layoutPage || "None";
      changes.push({
        field: "matchedLayoutPage",
        label: "Layout Page",
        from: `Page ${fromPage}`,
        to: `Page ${toPage}`,
        value: layoutPage ? Number(layoutPage) : 0,
      });
    }

    return changes;
  }, [assignment, swsType, stage, layoutPage]);

  const pendingChanges = getPendingChanges();
  const hasChanges = pendingChanges.length > 0;

  const handleSave = useCallback(() => {
    if (!onFieldChange) return;

    for (const change of pendingChanges) {
      onFieldChange(assignment.sheetSlug, change.field, change.value);
    }

    setSavedChanges(pendingChanges);
    setShowFeedback(true);

    // Auto-close after brief feedback
    setTimeout(() => {
      onOpenChange(false);
    }, 1200);
  }, [assignment.sheetSlug, onFieldChange, onOpenChange, pendingChanges]);

  const displayTitle = (assignment.sheetName || assignment.sheetSlug || "Untitled").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Quick Edit
            <Badge variant="secondary" className="text-xs font-normal">
              {displayTitle}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Change SWS type, stage, or layout page for this assignment.
          </DialogDescription>
        </DialogHeader>

        {/* Feedback banner */}
        {showFeedback && savedChanges.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-xs space-y-0.5">
              <p className="font-medium text-emerald-800 dark:text-emerald-300">
                {savedChanges.length} change{savedChanges.length !== 1 ? "s" : ""} saved
              </p>
              {savedChanges.map((c) => (
                <p key={c.field} className="text-emerald-700 dark:text-emerald-400/80">
                  {c.label}: {c.from} → {c.to}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Editor fields */}
        {!showFeedback && (
          <div className="space-y-4 py-1">
            {/* SWS Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                SWS Type
              </Label>
              <SwsTypeGrid
                selected={swsType}
                onSelect={(id) => setSwsType(id)}
                compact
              />
            </div>

            {/* Stage */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                Stage
              </Label>
              <Select value={stage} onValueChange={(v) => setStage(v as AssignmentStage)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-sm">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Layout Page */}
            {layoutPages.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Map className="h-3.5 w-3.5" />
                  Layout Page
                </Label>
                <Select value={layoutPage} onValueChange={setLayoutPage}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select page…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {layoutPages.map((lp) => (
                      <SelectItem key={lp.pageNumber} value={String(lp.pageNumber)} className="text-sm">
                        Page {lp.pageNumber}
                        {lp.title && ` — ${lp.title}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Assign placeholder */}
            {onAssign && (
              <>
                <div className="h-px bg-border" />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 justify-start text-sm h-9"
                  onClick={() => {
                    onAssign(assignment.sheetSlug);
                    onOpenChange(false);
                  }}
                >
                  <Users className="h-3.5 w-3.5" />
                  Assign…
                </Button>
              </>
            )}
          </div>
        )}

        {/* Change summary + actions */}
        {!showFeedback && (
          <DialogFooter className="gap-2 sm:gap-2">
            {hasChanges && (
              <div className="flex-1 text-xs text-muted-foreground">
                {pendingChanges.length} pending change{pendingChanges.length !== 1 ? "s" : ""}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!hasChanges} onClick={handleSave}>
              Save Changes
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
