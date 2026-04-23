/**
 * D380 Assignment SWS Configuration Types
 *
 * Manages the binding between assignments (sheets) and SWS templates,
 * per-section overrides, pre-configured components, review workflow,
 * and export review state for wire list and branding list outputs.
 */

import type { SwsTemplateId } from './d380-sws'

// ============================================================================
// SECTION OVERRIDES
// ============================================================================

export interface SwsSectionOverride {
    /** Hide / skip this section entirely */
    hidden?: boolean
    /** Override the default cycle time (format "H:MM") */
    cycleTimeOverride?: string
    /** Additional notes for this section */
    notes?: string
    /** Custom process steps appended to the template steps */
    additionalSteps?: SwsAdditionalStep[]
}

export interface SwsAdditionalStep {
    text: string
    isKeyPoint: boolean
    requiresCheckOff?: boolean
}

// ============================================================================
// COMPONENT CONFIGURATION
// ============================================================================

export interface AssignmentComponentConfig {
    /** Device ID in the wire list, e.g. "KA0561" */
    deviceId: string
    /** Part number override (catalog or manual) */
    partNumber?: string
    /** Link to catalog record */
    catalogRecordId?: string
    /** Custom notes shown to the assembler */
    customNotes?: string
    /** Reference image path override */
    referenceImagePath?: string
}

// ============================================================================
// EXPORT REVIEW STATE
// ============================================================================

export type ExportReviewStatus = 'pending' | 'approved' | 'rejected' | 'revised'

export interface ExportReviewEntry {
    /** What was reviewed */
    exportType: 'wire_list' | 'branding_list'
    /** Review status */
    status: ExportReviewStatus
    /** Who reviewed */
    reviewedBy: string
    /** ISO timestamp */
    reviewedAt: string
    /** Optional rejection reason or comment */
    comment?: string
}

// ============================================================================
// ASSIGNMENT SWS CONFIG (stored per sheet in ProjectSheetStateRecord)
// ============================================================================

export type SwsReviewStatus = 'pending' | 'reviewed' | 'finalized'

export interface AssignmentSwsConfig {
    /** Which SWS template is assigned */
    templateId: SwsTemplateId
    /** Whether the template was manually overridden vs auto-detected */
    isManualOverride: boolean
    /** Override reason (required when manual) */
    overrideReason?: string

    /** Per-section customizations keyed by section id */
    sectionOverrides: Record<string, SwsSectionOverride>
    /** Pre-configured components for this assignment */
    components: AssignmentComponentConfig[]

    /** Overall SWS review status */
    reviewStatus: SwsReviewStatus
    /** Who reviewed/finalized */
    reviewedBy?: string
    /** ISO timestamp of review */
    reviewedAt?: string

    /** Export review entries for wire list and branding list */
    exportReviews: ExportReviewEntry[]
}

// ============================================================================
// DEFAULTS
// ============================================================================

export function createDefaultAssignmentSwsConfig(
    templateId: SwsTemplateId = 'PANEL_BUILD_WIRE',
): AssignmentSwsConfig {
    return {
        templateId,
        isManualOverride: false,
        sectionOverrides: {},
        components: [],
        reviewStatus: 'pending',
        exportReviews: [],
    }
}
