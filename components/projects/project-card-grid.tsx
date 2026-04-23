"use client";

/**
 * Grid layout for displaying sheet cards.
 * 
 * Organizes sheets by type (operational vs reference) with
 * clear visual sections. Shows matched assignments first, then
 * unmatched sheets in a collapsed "Show More" section.
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectSheetCard } from "./project-sheet-card";
import { ProjectReferenceSheetCard } from "./project-reference-sheet-card";
import { AssignmentCard, type AssignmentCardDensity, type AssignmentCardVisibility, type AssignmentCardChangeHandler } from "./assignment-card";
import type { ProjectManifest, ManifestSheetEntry } from "@/types/project-manifest";
import type { MappedAssignment } from "./project-assignment-mapping-modal";
import type { LayoutPagePreview } from "@/lib/layout-matching";

interface ProjectCardGridProps {
  project: ProjectManifest;
  /** Optional mapped assignments to display as assignment cards */
  assignments?: MappedAssignment[];
  /** Layout pages loaded from persisted state */
  layoutPages?: LayoutPagePreview[];
  /** Callback when an assignment is clicked */
  onAssignmentClick?: (assignment: MappedAssignment) => void;
  /** Card density level */
  cardDensity?: AssignmentCardDensity;
  /** Section visibility overrides */
  cardVisibleSections?: AssignmentCardVisibility;
  /** Inline card field change callback */
  onCardFieldChange?: AssignmentCardChangeHandler;
  /** Assign callback (future modal) */
  onAssign?: (sheetSlug: string) => void;
}

export function ProjectCardGrid({
  project,
  assignments = [],
  layoutPages = [],
  onAssignmentClick,
  cardDensity = "standard",
  cardVisibleSections,
  onCardFieldChange,
  onAssign,
}: ProjectCardGridProps) {
  const [showUnmatched, setShowUnmatched] = useState(false);

  const operationalSheets = useMemo(() => project.sheets.filter(s => s.kind === "operational"), [project.sheets]);
  const referenceSheets = useMemo(() => project.sheets.filter(s => s.kind === "reference"), [project.sheets]);

  // Helper to get assignment for a sheet
  const getAssignment = useCallback((sheetSlug: string): MappedAssignment | undefined => {
    return assignments.find(a => a.sheetSlug === sheetSlug);
  }, [assignments]);

  // Resolve layout page for an assignment by matchedLayoutPage number
  const getLayoutPage = useCallback((assignment?: MappedAssignment): LayoutPagePreview | undefined => {
    if (!assignment?.matchedLayoutPage || layoutPages.length === 0) return undefined;
    return layoutPages.find(p => p.pageNumber === assignment.matchedLayoutPage);
  }, [layoutPages]);

  // Check if we have assignments
  const hasAssignments = assignments.length > 0;

  // Separate matched and unmatched sheets based on assignment existence
  const { matchedSheets, unmatchedSheets } = useMemo(() => {
    const matched: ManifestSheetEntry[] = [];
    const unmatched: ManifestSheetEntry[] = [];

    operationalSheets.forEach(sheet => {
      const assignment = getAssignment(sheet.slug);
      if (assignment) {
        matched.push(sheet);
      } else {
        unmatched.push(sheet);
      }
    });

    return { matchedSheets: matched, unmatchedSheets: unmatched };
  }, [operationalSheets, getAssignment]);

  // Mobile-first responsive grid classes based on card density
  const gridClassName = cardDensity === "compact"
    ? "grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    : "grid grid-cols-1 gap-5 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className="flex flex-col gap-8 h-full overflow-y-auto">
      {/* Operational Sheets Section - Matched Assignments */}
      {operationalSheets.length > 0 && (
        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-3 px-1"
          >

            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Panels / Assignments
              </h2>
              <span className="text-xs text-muted-foreground">
                {matchedSheets.length} matched{unmatchedSheets.length > 0 ? `, ${unmatchedSheets.length} unmatched` : ''}
              </span>
            </div>
          </motion.div>

          {/* Matched Sheets Grid - Use AssignmentCards when assignments are available */}
          <div className={gridClassName}>
            {matchedSheets.map((sheet, index) => {
              const assignment = getAssignment(sheet.slug);

              // Use AssignmentCard if we have a mapped assignment
              if (hasAssignments && assignment) {
                return (
                  <AssignmentCard
                    key={sheet.slug}
                    assignment={assignment}
                    projectId={project.id}
                    index={index}
                    layoutPage={getLayoutPage(assignment)}
                    layoutPages={layoutPages}
                    onViewAssignment={() => onAssignmentClick?.(assignment)}
                    density={cardDensity}
                    visibleSections={cardVisibleSections}
                    onFieldChange={onCardFieldChange}
                    onAssign={onAssign}
                  />
                );
              }

              // Otherwise use the default ProjectSheetCard
              return (
                <ProjectSheetCard
                  key={sheet.slug}
                  sheet={sheet}
                  projectId={project.id}
                  index={index}
                />
              );
            })}
          </div>

          {/* Unmatched Sheets - Collapsible */}
          {unmatchedSheets.length > 0 && (
            <div className="mt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUnmatched(!showUnmatched)}
                className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
              >
                {showUnmatched ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {showUnmatched ? 'Hide' : 'Show'} {unmatchedSheets.length} Unmatched Sheet{unmatchedSheets.length !== 1 ? 's' : ''}
              </Button>

              <AnimatePresence>
                {showUnmatched && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className={gridClassName}>
                      {unmatchedSheets.map((sheet, index) => {
                        const assignment = getAssignment(sheet.slug);

                        if (hasAssignments && assignment) {
                          return (
                            <AssignmentCard
                              key={sheet.slug}
                              assignment={assignment}
                              projectId={project.id}
                              index={matchedSheets.length + index}
                              layoutPage={getLayoutPage(assignment)}
                              layoutPages={layoutPages}
                              onViewAssignment={() => onAssignmentClick?.(assignment)}
                              density={cardDensity}
                              visibleSections={cardVisibleSections}
                              onFieldChange={onCardFieldChange}
                              onAssign={onAssign}
                            />
                          );
                        }

                        return (
                          <ProjectSheetCard
                            key={sheet.slug}
                            sheet={sheet}
                            projectId={project.id}
                            index={matchedSheets.length + index}
                          />
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </section>
      )}

      {/* Reference Sheets Section */}
      {referenceSheets.length > 0 && (
        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 flex items-center gap-3 px-1"
          >

            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Reference Data
              </h2>
              <span className="text-xs text-muted-foreground">
                {referenceSheets.length} reference sheets
              </span>
            </div>
          </motion.div>

          <div className="flex flex-wrap gap-6 justify-center sm:justify-start overflow-hidden snap-proximity">
            {referenceSheets.map((sheet, index) => (
              <ProjectReferenceSheetCard
                key={sheet.slug}
                sheet={sheet}
                projectId={project.id}
                index={index + operationalSheets.length}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {operationalSheets.length === 0 && referenceSheets.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
          <p className="text-muted-foreground">
            No sheets found in this workbook.
          </p>
        </div>
      )}
    </div>
  );
}
