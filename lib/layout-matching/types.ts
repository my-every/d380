/**
 * Types for layout PDF and workbook matching system.
 */

// ============================================================================
// Project Metadata Types
// ============================================================================

/**
 * Extracted project metadata from filename or document content.
 */
export interface ProjectMetadata {
  projectNumber?: string;
  revision?: string;
  source: "filename" | "content" | "both";
}

/**
 * Compatibility status between workbook and layout PDF.
 */
export type CompatibilityStatus = "matched" | "partial_match" | "mismatch" | "missing_pdf";

/**
 * Result of comparing workbook and PDF compatibility.
 */
export interface CompatibilityResult {
  status: CompatibilityStatus;
  projectNumberMatch: boolean;
  revisionMatch: boolean;
  workbookMeta: ProjectMetadata | null;
  pdfMeta: ProjectMetadata | null;
  warnings: string[];
  sheetMatchCount: number;
  totalSheets: number;
}

// ============================================================================
// Layout Page Types
// ============================================================================

/**
 * Preview data for a single PDF page.
 * imageUrl is a base64 data URL for localStorage persistence.
 */
export interface LayoutPagePreview {
  pageNumber: number;
  title?: string;
  normalizedTitle?: string;
  /** Unit type extracted from JB# pattern in title (e.g., "JB70") */
  unitType?: string;
  /** Base64 data URL of the rendered page image */
  imageUrl: string;
  width?: number;
  height?: number;
  projectNumber?: string;
  revision?: string;
  /** Panel part number extracted from "PANEL: xxx" text (unique per panel layout) */
  panelNumber?: string;
  /** Box part number extracted from "BOX: xxx" text */
  boxNumber?: string;
  /** Whether layout has door labels (indicates BOX type) */
  hasDoorLabels?: boolean;
  /** Raw text content for additional analysis */
  textContent?: string;
  /** Positioned text items for debugging extraction */
  textItems?: Array<{ str: string; x: number; y: number; width: number; height: number }>;
  /** Devices grouped by DIN rail from spatial analysis */
  railGroups?: RailGroup[];
  /** Panducts (wiring ducts) on this page */
  panducts?: PanductInfo[];
}

/**
 * A DIN rail and the devices mounted on it, extracted from layout PDF positioning.
 */
export interface RailGroup {
  /** Rail label as it appears on the drawing (e.g., "RAIL 58.25\"") */
  railLabel: string;
  /** Y position of the rail in PDF coordinates */
  railY: number;
  /** Devices mounted on this rail, sorted left-to-right by X position */
  devices: RailDevice[];
}

/**
 * Slim rail record for persisted layout pages (no devices).
 */
export interface SlimRail {
  /** Rail label as it appears on the drawing (e.g., "RAIL 58.25\"") */
  railLabel: string;
  /** Y position of the rail in PDF coordinates */
  railY: number;
}

export interface RailDevice {
  /** Device tag (e.g., "AF0041", "KA0001") */
  tag: string;
  /** X position on the drawing */
  x: number;
  /** Y position on the drawing */
  y: number;
  /** Part number(s) found near this device */
  partNumbers: string[];
  /** Number of terminals detected near this device */
  terminalCount?: number;
}

/**
 * Panduct (wiring duct) extracted from the layout PDF.
 */
export interface PanductInfo {
  /** Label as it appears on the drawing */
  label: string;
  /** Y position in PDF coordinates */
  y: number;
}

/**
 * Slim page record persisted to layout-pages.json.
 * Contains only the structural metadata — no heavy text or device data.
 */
export interface SlimLayoutPage {
  pageNumber: number;
  title?: string;
  normalizedTitle?: string;
  /** Unit type extracted from JB# pattern in title (e.g., "JB70") */
  unitType?: string;
  width?: number;
  height?: number;
  boxNumber?: string;
  panelNumber?: string;
  /** Rails on this page (dimensions only, no devices) */
  rails: SlimRail[];
  /** Panducts (wiring ducts) on this page */
  panducts: PanductInfo[];
  /** Base64 data URL of the rendered page image */
  imageUrl: string;
}

/**
 * Match confidence levels for sheet-to-page matching.
 */
export type MatchConfidence = "high" | "medium" | "low" | "unmatched";

/**
 * Result of matching a wire-list sheet to a layout page.
 */
export interface SheetLayoutMatch {
  sheetName: string;
  sheetSlug: string;
  matchedPageNumber?: number;
  matchedPageTitle?: string;
  /** Panel number from the matched layout (unique per panel, critical for disambiguation) */
  matchedPanelNumber?: string;
  confidence: MatchConfidence;
  imageUrl?: string;
  score: number;
  /** Reasons explaining why this match was made (for debugging) */
  reasons?: string[];
  alternativeMatches?: Array<{
    pageNumber: number;
    pageTitle: string;
    score: number;
    panelNumber?: string;
  }>;
}

/**
 * Lightweight per-page layout detail (no base64 images or raw text).
 * Stored in layout-mapping.json alongside the sheet matches.
 */
export interface LayoutPageDetail {
  pageNumber: number;
  title?: string;
  normalizedTitle?: string;
  panelNumber?: string;
  boxNumber?: string;
  hasDoorLabels?: boolean;
  width?: number;
  height?: number;
  projectNumber?: string;
  revision?: string;
  railGroups?: RailGroup[];
}

/**
 * Complete mapping of sheets to layout pages.
 */
export interface SheetLayoutMapping {
  matches: SheetLayoutMatch[];
  unmatchedSheets: string[];
  unmatchedPages: number[];
  overallConfidence: MatchConfidence;
  /** Per-page layout detail with rail groups, device metadata, and panel info */
  pages?: LayoutPageDetail[];
}

// ============================================================================
// Highlight Region Types (for future overlay support)
// ============================================================================

/**
 * A region on the layout image for highlighting.
 */
export interface LayoutHighlightRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  deviceIds?: string[];
  style?: "primary" | "secondary" | "warning";
}

// ============================================================================
// Modal Props Types
// ============================================================================

/**
 * Props for the layout preview modal.
 */
export interface LayoutPreviewModalProps {
  pages: LayoutPagePreview[];
  initialPageNumber?: number;
  matchedSheetName?: string;
  isOpen: boolean;
  onClose: () => void;
  highlightRegions?: LayoutHighlightRegion[];
}
