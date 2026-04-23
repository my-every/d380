"use client";

/**
 * ProjectSheetSubheader
 *
 * Unified header for the sheet detail page. Combines:
 * - Breadcrumb navigation
 * - Sheet title + wire row / column counts
 * - Layout cover image (object-top so the drawing header is always visible)
 * - Project metadata (merged into the same visual card)
 *
 * Responsive: stacks vertically on small screens, side-by-side on md+.
 * Revision-aware: accepts layout page/match as props so it stays in sync
 * when the active revision changes in the sidebar.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ChevronRight,
  FileImage,
  ZoomIn,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getProjectsRoutePath } from "@/hooks/use-sheet-route";
import type {
  ProjectModel,
  ProjectSheetSummary,
  SheetMetadataInfo,
} from "@/lib/workbook/types";
import type { ProjectManifest, ManifestSheetEntry } from "@/types/project-manifest";
import type { LayoutPagePreview, SheetLayoutMatch } from "@/lib/layout-matching";
import { LayoutPreviewModal } from "@/components/projects/layout-preview-modal";
import { getSheetKindLabel, getSheetKindVariant } from "@/lib/workbook/classify-sheet";

// ============================================================================
// Props
// ============================================================================

interface ProjectSheetSubheaderProps {
  project: ProjectModel | ProjectManifest;
  sheet: ProjectSheetSummary | ManifestSheetEntry;
  /** Current revision-aware layout page */
  layoutPage?: LayoutPagePreview | null;
  /** Current revision-aware layout match */
  layoutMatch?: SheetLayoutMatch | null;
  /** All rendered layout pages (for the full-screen modal) */
  allPages?: LayoutPagePreview[];
  /** Extracted metadata from the sheet preamble */
  metadata?: SheetMetadataInfo;
  /** Optional SWS type badge info */
  swsType?: { label: string; shortLabel: string; color: string } | null;
  /** Active revision label (shown when viewing a non-current revision) */
  activeRevisionLabel?: string;
  /** Override row count when viewing a different revision */
  activeRowCount?: number;
}

// ============================================================================
// Metadata labels
// ============================================================================

const META_LABELS: Record<string, string> = {
  projectNumber: "Project #",
  projectName: "Project",
  revision: "Rev",
  controlsDE: "Controls DE",
  phone: "Phone",
  from: "From",
};

// ============================================================================
// Component
// ============================================================================

export function ProjectSheetSubheader({
  project,
  sheet,
  layoutPage,
  layoutMatch,
  allPages,
  metadata,
  swsType,
  activeRevisionLabel,
  activeRowCount,
}: ProjectSheetSubheaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const kindLabel = getSheetKindLabel(sheet.kind);
  const kindVariant = getSheetKindVariant(sheet.kind);

  const hasImage = Boolean(layoutPage?.imageUrl) && !imageError;
  const isMatched =
    layoutMatch && layoutMatch.confidence !== "unmatched";
  const modalPages = layoutPage ? [layoutPage] : [];

  // Merge project-level + sheet-level metadata
  const metaEntries = metadata
    ? Object.entries(metadata).filter(
      ([key, value]) => !key.startsWith("_") && value !== undefined && value !== "",
    )
    : [];

  // Fall back to project model fields when sheet metadata is missing
  if (!metaEntries.find(([k]) => k === "projectName") && project.name) {
    metaEntries.unshift(["projectName", project.name]);
  }
  if (!metaEntries.find(([k]) => k === "revision") && project.revision) {
    metaEntries.unshift(["revision", project.revision]);
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground overflow-x-auto">
          <Link
            href={getProjectsRoutePath()}
            className="flex items-center gap-1 whitespace-nowrap hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <Link
            href={getProjectsRoutePath()}
            className="truncate hover:text-foreground transition-colors"
          >
            {project.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-medium text-foreground truncate">
            {sheet.name}
          </span>
        </nav>

        {/* Combined card: cover image + info */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col md:flex-row">
            {/* Layout cover image — flex-start so top of drawing is visible */}
            {hasImage && isMatched ? (
              <div
                className="relative w-full md:w-80 lg:w-96 flex-shrink-0 cursor-pointer group"
                onClick={() => setIsModalOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setIsModalOpen(true);
                  }
                }}
              >
                <div className="relative h-44 md:h-full min-h-[11rem] bg-muted">
                  <Image
                    src={layoutPage!.imageUrl}
                    alt={`Layout for ${sheet.name}`}
                    fill
                    className="object-cover object-top transition-transform duration-200 group-hover:scale-[1.02]"
                    onError={() => setImageError(true)}
                    unoptimized
                  />
                  {/* Subtle gradient for readability */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex items-center gap-2 text-white bg-black/50 px-4 py-2 rounded-full text-sm font-medium">
                      <ZoomIn className="h-4 w-4" />
                      View Full Size
                    </div>
                  </div>
                  {/* Page + confidence badge floating bottom-right */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="bg-white/90 text-foreground text-[10px] backdrop-blur-sm"
                    >
                      Page {layoutPage!.pageNumber}
                    </Badge>

                  </div>
                </div>
              </div>
            ) : (
              /* No layout placeholder */
              <div className="w-full md:w-80 lg:w-96 flex-shrink-0 flex items-center justify-center bg-muted/40 p-6 min-h-[8rem]">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileImage className="h-8 w-8 opacity-30" />
                  <span className="text-xs">No layout preview</span>
                </div>
              </div>
            )}

            {/* Right side: sheet info + project metadata */}
            <div className="flex flex-1 flex-col justify-between gap-4 p-4 md:p-5 min-w-0">
              {/* Top: sheet identity */}
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground leading-tight">
                    {sheet.name}
                  </h1>
                  {swsType && (
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{
                        borderColor: swsType.color,
                        color: swsType.color,
                      }}
                    >
                      {swsType.shortLabel}
                    </Badge>
                  )}
                  {activeRevisionLabel && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      Rev {activeRevisionLabel}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {(activeRowCount ?? sheet.rowCount).toLocaleString()} wire rows
                  <span className="mx-1.5 text-muted-foreground/40">·</span>
                  {sheet.columnCount} columns
                </p>
              </div>

              {/* Bottom: merged project metadata */}
              {metaEntries.length > 0 && (
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 border-t border-border pt-3">
                  {metaEntries.map(([key, value]) => (
                    <div key={key} className="flex items-baseline gap-1.5 min-w-0">
                      <dt className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {META_LABELS[key] || key}:
                      </dt>
                      <dd className="text-sm font-medium text-foreground truncate">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Layout Preview Modal */}
      {modalPages.length > 0 && (
        <LayoutPreviewModal
          pages={modalPages}
          initialPageNumber={layoutPage?.pageNumber ?? 1}
          matchedSheetName={sheet.name}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
