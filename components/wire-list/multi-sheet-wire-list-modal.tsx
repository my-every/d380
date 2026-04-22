"use client";

import { MultiSheetPrintModal } from "@/components/wire-list/multi-sheet-print-modal";

interface MultiSheetWireListModalProps {
  projectId?: string;
  currentSheetSlug?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MultiSheetWireListModal({
  projectId,
  currentSheetSlug,
  open,
  onOpenChange,
}: MultiSheetWireListModalProps) {
  return (
    <MultiSheetPrintModal
      projectId={projectId}
      currentSheetSlug={currentSheetSlug}
      open={open}
      onOpenChange={onOpenChange}
      showTrigger={false}
      title="Multi-Sheet Wire List Review"
      description="Browse each wire list sheet, inspect the matched layout context, and open the current sheet PDF as needed."
      combineLabel="Combine Wire Lists"
      workspaceMode="wire-list"
    />
  );
}
