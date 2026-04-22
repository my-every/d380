/**
 * Project Manifest — Lightweight project descriptor
 *
 * Replaces the monolithic StoredProject / project-context.json pattern.
 * Contains only the metadata needed for listing, routing, and rendering
 * project cards. Full sheet data lives in per-sheet schema files.
 */

import type { LwcType, ProjectStatus } from '@/lib/workbook/types'
import type { AssignmentStageId, ProjectLifecycleGateState } from '@/types/d380-assignment-stages'

// ── Shared sheet base ─────────────────────────────────────────────────────

export interface ManifestSheetBase {
    sheetSlug: string
    sheetName: string
    kind: 'operational' | 'reference'
    sheetPath?: string
    rowCount: number
    columnCount?: number
    sheetIndex?: number
    hasData?: boolean
}

// ── Reference sheet entry ─────────────────────────────────────────────────

export interface ManifestReferenceSheet extends ManifestSheetBase {
    kind: 'reference'
}

// ── Assignment files ──────────────────────────────────────────────────────

export interface ManifestAssignmentFiles {
    wireListPDFPath?: string
    wireListSchemaPath?: string
    brandListSchemaPath?: string
    brandListExcelPath?: string
    buildUpSWSSchemaPath?: string
}

// ── Layout page match ─────────────────────────────────────────────────────

export type LayoutMatchMethod = 'device-id' | 'title' | 'fallback'

export interface ManifestLayoutPageMatch {
    pageNumber: number
    title: string
    normalizedTitle?: string
    unitType?: string
    panelNumber?: string | null
    boxNumber?: string | null
    confidence: 'high' | 'medium' | 'low' | 'unmatched'
    matchMethod: LayoutMatchMethod
    score: number
}

export interface ManifestLayoutMatch {
    primaryPage?: ManifestLayoutPageMatch
    pages: ManifestLayoutPageMatch[]
}

// ── Device entry (from device-part-numbers.json) ──────────────────────────

export interface ManifestDeviceEntry {
    partNumber: string
    description: string
    category?: string
    sheet: string
}

// ── Unified assignment node ───────────────────────────────────────────────

export interface ManifestAssignmentNode extends ManifestSheetBase {
    kind: 'operational'
    swsType: string
    stage: AssignmentStageId
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'INCOMPLETE' | 'COMPLETE'
    /** Unit type inferred from layout title (e.g. "JB70") */
    unitType?: string
    panducts: string[]
    rails: string[]
    whiteLabels: string[]
    blueLabels: string[]
    /** Unique part numbers used across this assignment */
    partNumbers: string[]
    files: ManifestAssignmentFiles
    buildUpEstTime?: string
    wireListEstTime?: string
    /** Layout pages matched to this assignment */
    layout: ManifestLayoutMatch | null
    /** Devices from device-part-numbers.json keyed by device ID */
    devices: Record<string, ManifestDeviceEntry>
}

// ── Layout summary (project-level) ───────────────────────────────────────

export interface ManifestLayoutSummary {
    totalPages: number
    panelNames: string[]
    sourceFile?: string
}

// ── The manifest itself ───────────────────────────────────────────────────

export interface ProjectManifest {
    /** Unique project identifier */
    id: string
    /** Display name */
    name: string
    /** Original workbook filename */
    filename: string
    /** PD# (Production Drawing number) */
    pdNumber?: string
    /** Unit number */
    unitNumber?: string
    /** Revision string */
    revision?: string
    /** LWC type classification */
    lwcType?: LwcType
    /** Project color for visual identification (hex) */
    color?: string
    /** Derived project status */
    status?: ProjectStatus
    /** ISO timestamp */
    createdAt: string

    // ── Timeline ─────────────────────────────────────────────────────────
    dueDate?: string
    planConlayDate?: string
    planConassyDate?: string
    shipDate?: string
    deptTargetDate?: string

    // ── Assignments (operational sheets, merged) ─────────────────────────
    /** Keyed by sheetSlug. Merges sheet metadata, stage/status, summary, layout, and devices. */
    assignments: Record<string, ManifestAssignmentNode>

    // ── Reference sheets ─────────────────────────────────────────────────
    /** Keyed by sheetSlug. Includes: blue-labels, white-labels, heat-shrink-labels,
     *  part-number-list, cable-part-numbers, panel-errors */
    referenceSheets: Record<string, ManifestReferenceSheet>

    // ── Layout summary ───────────────────────────────────────────────────
    layoutSummary?: ManifestLayoutSummary
    /** Primary unit type inferred from layout-pages.json (most frequent) */
    unitType?: string
    /** All detected unit types from layout-pages.json */
    unitTypes?: string[]
    /** Total panduct count across saved layout pages */
    panducts?: number
    /** Total rail count across saved layout pages */
    rails?: number

    // ── Production lifecycle ─────────────────────────────────────────────
    lifecycleGates?: ProjectLifecycleGateState[]
    estimatedTotalHours?: number
    estimatedPanelCount?: number
    daysLate?: number

    // ── Revision tracking ────────────────────────────────────────────────
    activeWorkbookRevisionId?: string
    activeLayoutRevisionId?: string
}
