'use client'

/**
 * SWS Worksheet Renderer
 * 
 * Main component for rendering SWS worksheets in both print and tablet modes.
 * Uses template-driven structure to ensure consistency with real SWS packets.
 */

import { cn } from '@/lib/utils'
import type {
  SwsTemplateId,
  SwsExecutionMode,
  SwsWorksheetData,
  SwsWorksheetMetadata,
  SwsSectionState,
  SwsWorksheetOverrideState,
} from '@/types/d380-sws'
import { getSwsTemplate } from '@/lib/sws/sws-template-registry'
import { SwsWorksheetHeader } from './sws-worksheet-header'
import { SwsWorksheetMetadataGrid } from './sws-worksheet-metadata-grid'
import { SwsWorksheetWorkElementsTable } from './sws-worksheet-work-elements-table'
import { SwsWorksheetDiscrepancyCodes } from './sws-worksheet-discrepancy-codes'
import { SwsWorksheetFooter } from './sws-worksheet-footer'
import { SwsPrintSidebarOverrides } from './sws-print-sidebar-overrides'

export interface SwsWorksheetRendererProps {
  /** SWS type to render */
  swsType: SwsTemplateId

  /** Execution mode */
  executionMode: SwsExecutionMode

  /** Worksheet metadata */
  metadata: SwsWorksheetMetadata

  /** Section states */
  sectionStates?: SwsSectionState[]

  /** Override state (for print mode) */
  overrides?: SwsWorksheetOverrideState

  /** Whether to show the print sidebar */
  showPrintSidebar?: boolean

  /** Callback when metadata field changes */
  onMetadataChange?: (field: string, value: string) => void

  /** Callback when section state changes */
  onSectionChange?: (sectionId: string, state: Partial<SwsSectionState>) => void

  /** Callback when checklist item toggled */
  onChecklistToggle?: (sectionId: string, stepId: string, checked: boolean) => void

  /** Callback when override applied */
  onOverrideChange?: (field: string, value: string, reason?: string) => void

  /** Additional class name */
  className?: string
}

export function SwsWorksheetRenderer({
  swsType,
  executionMode,
  metadata,
  sectionStates = [],
  overrides,
  showPrintSidebar = false,
  onMetadataChange,
  onSectionChange,
  onChecklistToggle,
  onOverrideChange,
  className,
}: SwsWorksheetRendererProps) {
  const template = getSwsTemplate(swsType)

  if (!template) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Unknown SWS type: {swsType}
      </div>
    )
  }

  const isPrintMode = executionMode === 'PRINT_MANUAL'
  const isTabletMode = executionMode === 'TABLET_INTERACTIVE'

  // Get section states map
  const sectionStateMap = new Map(
    sectionStates.map(s => [s.sectionId, s])
  )

  return (
    <div className={cn(
      'flex gap-6',
      className
    )}>
      {/* Print Sidebar (only in print mode with sidebar enabled) */}
      {isPrintMode && showPrintSidebar && (
        <SwsPrintSidebarOverrides
          template={template}
          metadata={metadata}
          overrides={overrides}
          onOverrideChange={onOverrideChange}
        />
      )}

      {/* Main Worksheet */}
      <div className={cn(
        'flex-1 bg-white',
        isPrintMode && 'print:bg-white',
      )}>
        {/* Page 1 */}
        <div className={cn(
          'border border-border',
          isPrintMode && 'print:border-black',
        )}>
          {/* Header */}
          <SwsWorksheetHeader
            template={template}
            executionMode={executionMode}
          />

          {/* Metadata Grid */}
          <SwsWorksheetMetadataGrid
            template={template}
            metadata={metadata}
            overrides={overrides}
            executionMode={executionMode}
            onFieldChange={onMetadataChange}
          />

          {/* Work Elements Table - First Half */}
          <SwsWorksheetWorkElementsTable
            template={template}
            sections={template.sections.slice(0, Math.ceil(template.sections.length / 2))}
            sectionStateMap={sectionStateMap}
            executionMode={executionMode}
            onSectionChange={onSectionChange}
            onChecklistToggle={onChecklistToggle}
          />

          {/* Footer */}
          <SwsWorksheetFooter
            template={template}
            pageNumber={1}
            totalPages={template.pageCount}
          />
        </div>

        {/* Page 2 (if multi-page) */}
        {template.pageCount > 1 && (
          <div className={cn(
            'border border-border mt-4',
            isPrintMode && 'print:border-black print:mt-0 print:break-before-page',
          )}>
            {/* Header (repeated) */}
            <SwsWorksheetHeader
              template={template}
              executionMode={executionMode}
            />

            {/* Metadata Grid (repeated) */}
            <SwsWorksheetMetadataGrid
              template={template}
              metadata={metadata}
              overrides={overrides}
              executionMode={executionMode}
              onFieldChange={onMetadataChange}
            />

            {/* Work Elements Table - Second Half */}
            <SwsWorksheetWorkElementsTable
              template={template}
              sections={template.sections.slice(Math.ceil(template.sections.length / 2))}
              sectionStateMap={sectionStateMap}
              executionMode={executionMode}
              onSectionChange={onSectionChange}
              onChecklistToggle={onChecklistToggle}
            />

            {/* Discrepancy Codes */}
            <SwsWorksheetDiscrepancyCodes
              executionMode={executionMode}
            />

            {/* Footer */}
            <SwsWorksheetFooter
              template={template}
              pageNumber={2}
              totalPages={template.pageCount}
            />
          </div>
        )}
      </div>
    </div>
  )
}
