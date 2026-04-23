/**
 * Drawing Metadata Extraction
 *
 * Extracts structured metadata from layout PDF pages:
 * - Drawing title (spatial + regex strategies)
 * - Panel / box part numbers
 * - Door labels detection
 * - DIN rail groups with mounted devices
 *
 * All functions operate on either raw text or positioned text items
 * obtained from pdf.js `getTextContent()`.
 */

import type { RailGroup, RailDevice, PanductInfo } from "./types";

// ============================================================================
// Positioned Text Item
// ============================================================================

/**
 * A single text fragment from pdf.js with its page-space coordinates.
 */
export interface PositionedTextItem {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

// ============================================================================
// Drawing Title Patterns
// ============================================================================

/**
 * Valid Drawing Title patterns for Solar Turbines layouts.
 * These patterns identify panel/sheet names in the DRAWING TITLE field.
 */
const DRAWING_TITLE_PATTERNS: RegExp[] = [
    // Panel naming with optional suffix (e.g., "PNL A,SMT130", "PNL B,SMT130")
    /^(PNL\s*[A-Z](?:[,\s]+\w+)*)$/i,
    /^(PANEL\s*[A-Z](?:[,\s]+\w+)*)$/i,

    // Control panels (e.g., "CONTROL,JB70", "CONTROL A,JB70", "BOP CTRL,JB74")
    /^((?:BOP\s+)?CTRL?(?:OL)?[,\s]*[A-Z]?[,\s]*(?:JB\d+)?)$/i,
    /^(CONTROL[,\s]*[A-Z]?[,\s]*(?:\d+-BAY|JB\d+|SMT\d+|TT\d+)?)$/i,
    /^(BOP\s+CTRL[,\s]*(?:JB\d+)?)$/i,

    // Rail patterns (e.g., "RAIL,RIGHT,JB70", "RAIL,LEFT,JB73")
    /^(RAIL[,\s]+(?:RIGHT|LEFT|TOP|BOTTOM)[,\s]*(?:JB\d+)?)$/i,
    /^(RAIL[,\s]*JB\d+)$/i,
    /^((?:RIGHT|LEFT)\s+SIDE\s+RAIL[,\s]*(?:JB\d+)?)$/i,
    /^(JB\d+[,\s]*(?:RIGHT|LEFT)?\s*(?:SIDE)?\s*RAIL)$/i,

    // F&G / Fire & Gas patterns
    /^(F&G[,\s]*(?:EDIO|PWR|CTRL)?[,\s]*(?:ONSK)?[,\s]*(?:JB\d+)?)$/i,
    /^(FG&E[,\s]*(?:CTRL)?[,\s]*(?:SMT\d+|JB\d+)?)$/i,

    // FO CONV / VFD patterns
    /^(FO\s+CONV[,\s]*(?:VFD)?[,\s]*(?:JB\d+)?)$/i,
    /^(VFD[,\s]*(?:JB\d+)?)$/i,
    /^(CONV[,\s]*(?:VFD)?[,\s]*(?:JB\d+)?)$/i,

    // HMI patterns
    /^(HMI[,\s\-]*[A-Z]?\s*(?:PWR)?[,\s]*(?:JB\d+)?)$/i,

    // HPC patterns
    /^(HPC[,\s]*(?:CTRL)?[,\s]*(?:JB\d+)?)$/i,

    // TCP - Thermocouple Panel
    /^(TCP[,\s]*(?:SMT\d+|JB\d+)?)$/i,

    // Power Distribution
    /^(PWR\s*DST[,\s]*(?:DR[,\s]*)?(?:SMT\d+)?)$/i,

    // PLC Panel
    /^(PLC[,\s]*(?:PANEL|JB\d+)?)$/i,

    // Generator patterns
    /^(GEN\s+(?:CMPNT|CTRL|CONTROL|VIB|PWR|PANEL)[,\s]*(?:JB\d+|SMT\d+)?)$/i,

    // Beckwith Relay
    /^(BECKWITH[,\s]*(?:RELAY)?[,\s]*(?:SMT\d+)?)$/i,

    // Door panels
    /^(PNL[,\s]+DOOR[,\s]*(?:\d+-BAY)?)$/i,
    /^(DOOR[,\s]+\d+-BAY)$/i,
    /^((?:CONSOLE\s+)?DOOR[,\s]*(?:PNL|PANEL)[,\s]*(?:\d+-BAY)?)$/i,

    // MCC Panel
    /^(MCC[,\s]*(?:PNL)?[,\s]*(?:SMT\d+)?)$/i,

    // Proximity/Vibration panels
    /^(PROX[,\s]*(?:TURB)?[,\s]*(?:SMT\d+)?)$/i,
    /^(VIB[,\s]*(?:PANEL)?[,\s]*(?:SMT\d+)?)$/i,

    // Generic: keywords + JB number
    /^([A-Z0-9&\-]+(?:[,\s]+[A-Z0-9&\-]+)*[,\s]*JB\d+)$/i,

    // TT suffix patterns
    /^([A-Z0-9&\-]+(?:[,\s]+[A-Z0-9&\-]+)*[,;\s]*TT\d+)$/i,

    // Assembly / ASSY patterns
    /^(ASSY[,\s]+(?:[A-Z0-9]+[,\s]*)+)$/i,
    /^(ASSEMBLY[,\s]+[A-Z0-9,\s\-]+)$/i,

    // Console patterns
    /^(CONSOLE[,\s]+[A-Z0-9,\s\-]+)$/i,

    // Remote I/O Box patterns
    /^(REMOTE\s+I\/?O\s+BOX[\s#]*\d*)$/i,

    // Directional + PANEL patterns
    /^((?:BACK|LEFT|RIGHT|FRONT)\s+(?:SIDE\s+)?PANEL[,\s]*.*)$/i,

    // SCS Panel
    /^(SCS\s+PANEL[,\s]*.*)$/i,
];

/**
 * Lines to skip when scanning for a drawing title.
 */
const SKIP_PATTERNS: RegExp[] = [
    /^DRAWING TITLE$/i,
    /^DWG NO\.?$/i,
    /^SHEETOF$/i,
    /^REV$/i,
    /^DATE$/i,
    /^CAGE NO/i,
    /^P\.?O\.? B/i,
    /^San Diego/i,
    /^\d+$/,
    /^\d+\.\d+$/,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
    /^CATERPILLAR/i,
    /^THIS PRINT/i,
    /^THIS COPYRIGHT/i,
    /^CONFIDENTIAL/i,
    /^Solar Turbines/i,
    /^DESCRIPTION/i,
    /^REVISION/i,
    /^RELEASE/i,
    /^STAMP/i,
    /^MODEL$/i,
    /^LOC$/i,
    /^SIZE$/i,
    /^DATA$/i,
    /^CONTROL$/i,
    /^LEVEL$/i,
    /^PROJECT NAME$/i,
    /^MFG DES ENGINEER$/i,
    /^DESIGN ENGINEER$/i,
    /^PANEL NO\.?$/i,
    /^\d+[A-Z]\d+$/,
    /^T:\\PROJECT/i,
    /^PD-$/i,
    /^\d+(?:\.\d+)?["']\s/i,
    /^\d+(?:\.\d+)?["']$/i,
    /^\d+(?:\.\d+)?\s*(?:IN|INCH|MM|CM)\b/i,
    /^RAIL$/i,
    /^DOOR$/i,
    /^FRAME$/i,
    /^GROUND$/i,
    /^VIEW$/i,
    /^PANELS?$/i,
    /^LAYOUT$/i,
    /^GROUNDING$/i,
    /^INSTALL\b/i,
    /^ADD\s/i,
    /^NOTE/i,
    /^GRN\/YLW/i,
    /^\d+\s*PLACES?$/i,
    /BOX:\s*\d/i,
    /PANEL:\s*\d{5}/i,
    /^SPRING\b/i,
    /^\d{5,}[-]\d/,
    /^NON-PAINTED/i,
    /^SIDE VIEW$/i,
    /^TO\s+/i,
];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a line should be skipped when scanning for a drawing title.
 */
function shouldSkipLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 2) return true;
    if (trimmed.length > 40) return true;
    return SKIP_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Check if a line looks like a valid drawing title based on known patterns.
 */
function isValidDrawingTitle(line: string): boolean {
    const trimmed = line.trim().toUpperCase();
    const hasKeyword =
        /\b(PNL|PANEL|CTRL|CONTROL|TCP|PLC|MCC|PWR|GEN|FG&E|F&G|BECKWITH|VIB|PROX|BOP|HMI|CONV|VFD|FO|EDIO|ONSK|HPC|TT\d|SIDE|ASSY|ASSEMBLY|CONSOLE|REMOTE|DOORS?|BAY|SCS|BOX)\b/i.test(
            trimmed,
        );
    const hasJbPattern = /\bJB\d+\b/i.test(trimmed);
    if (!hasKeyword && !hasJbPattern) return false;
    return DRAWING_TITLE_PATTERNS.some(p => p.test(trimmed));
}

// ============================================================================
// Title Extraction
// ============================================================================

/**
 * Extract the drawing title by spatial proximity to the "DRAWING TITLE" label.
 * The title block layout is consistent: the value is below the label in the
 * same column area.
 */
export function extractTitleByPosition(
    items: PositionedTextItem[],
): string | undefined {
    // Find the "DRAWING TITLE" label (may be one item or two separate items)
    let labelItem: PositionedTextItem | undefined;

    // Try single item first
    labelItem = items.find(i => /^DRAWING\s+TITLE$/i.test(i.str));

    // If not found as one item, look for "DRAWING" near "TITLE"
    if (!labelItem) {
        const drawingItem = items.find(i => /^DRAWING$/i.test(i.str));
        const titleItem = items.find(i => /^TITLE$/i.test(i.str));
        if (drawingItem && titleItem) {
            labelItem = drawingItem.x <= titleItem.x ? drawingItem : titleItem;
            labelItem = {
                ...labelItem,
                width: Math.max(
                    drawingItem.x +
                    (drawingItem.width || 0) -
                    Math.min(drawingItem.x, titleItem.x),
                    titleItem.x +
                    (titleItem.width || 0) -
                    Math.min(drawingItem.x, titleItem.x),
                ),
            };
        }
    }

    if (!labelItem) return undefined;

    const labelX = labelItem.x;
    const labelY = labelItem.y;
    const yTolerance = 70;
    const xTolerance = 120;

    function isNoise(str: string): boolean {
        if (
            /^(DRAWING TITLE|DWG NO\.?|DATE|REV|SIZE|CAGE NO|SHEET|SHT|Solar Turbines|CATERPILLAR|P\.?O\.?\s*BOX|San Diego|PANEL NO\.?|DWG REV|MFG DES|DESIGN ENGINEER|PROJECT NAME|MODEL|LOC|DATA|CONTROL|LEVEL|RELEASE|STAMP|DESCRIPTION|REVISION|A Caterpillar|OF)$/i.test(
                str,
            )
        )
            return true;
        if (/^\d+$/.test(str)) return true;
        if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(str)) return true;
        if (/^T:\\/.test(str)) return true;
        if (/^\d+[A-Z]\d+/.test(str)) return true;
        if (/^PD-/.test(str)) return true;
        if (/^\d{5,}[-]/.test(str)) return true;
        if (/^[A-Z]\d*$/.test(str) && str.length <= 2) return true;
        if (/^\d{4,}$/.test(str)) return true;
        return false;
    }

    const titleItems: PositionedTextItem[] = [];
    for (const item of items) {
        if (item === labelItem) continue;
        const str = item.str.trim();
        if (!str || str.length < 2) continue;
        if (isNoise(str)) continue;
        const dy = labelY - item.y;
        const dx = item.x - labelX;
        if (dy > 0 && dy < yTolerance && Math.abs(dx) < xTolerance) {
            titleItems.push(item);
        }
    }

    if (titleItems.length === 0) return undefined;

    // Sort top-to-bottom (descending Y)
    titleItems.sort((a, b) => b.y - a.y);

    // Combine adjacent lines (multi-line titles like "ASSEMBLY" + "CONSOLE")
    const lines: string[] = [];
    let lastY = titleItems[0].y;
    for (const item of titleItems) {
        const gap = lastY - item.y;
        if (lines.length > 0 && gap > 30) break;
        lines.push(item.str.trim());
        lastY = item.y;
    }

    const combined = lines.join(" ").toUpperCase();
    if (combined.length < 3) return undefined;
    return combined;
}

/**
 * Extract the drawing title using regex strategies on raw text.
 * Used as a fallback when spatial extraction fails.
 */
export function extractTitleByRegex(
    textContent: string,
): string | undefined {
    const lines = textContent
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

    // Strategy 1: Known title patterns
    for (const line of lines) {
        const trimmed = line.trim();
        if (shouldSkipLine(trimmed)) continue;
        for (const pattern of DRAWING_TITLE_PATTERNS) {
            const match = trimmed.match(pattern);
            if (match) return match[1].toUpperCase();
        }
    }

    // Strategy 2: Lines after "DRAWING TITLE" marker
    const drawingTitleIndex = lines.findIndex(l =>
        /^DRAWING TITLE$/i.test(l.trim()),
    );
    if (drawingTitleIndex >= 0) {
        for (
            let i = drawingTitleIndex + 1;
            i < Math.min(drawingTitleIndex + 8, lines.length);
            i++
        ) {
            if (shouldSkipLine(lines[i])) continue;
            if (isValidDrawingTitle(lines[i])) return lines[i].trim().toUpperCase();
        }
    }

    // Strategy 3: Lines with JB pattern
    for (const line of lines) {
        const trimmed = line.trim();
        if (shouldSkipLine(trimmed)) continue;
        if (
            /\bJB\d+\b/i.test(trimmed) &&
            trimmed.length >= 5 &&
            trimmed.length <= 40 &&
            /^[A-Z0-9&,\s\-;]+$/i.test(trimmed)
        ) {
            return trimmed.toUpperCase();
        }
    }

    // Strategy 4: Lines before "SHEETOF" marker
    const sheetOfIndex = lines.findIndex(l => /^SHEETOF$/i.test(l.trim()));
    if (sheetOfIndex > 0) {
        for (let i = sheetOfIndex - 1; i >= Math.max(0, sheetOfIndex - 10); i--) {
            if (shouldSkipLine(lines[i])) continue;
            if (isValidDrawingTitle(lines[i])) return lines[i].trim().toUpperCase();
        }
    }

    // Strategy 5: First valid title in first 150 lines
    for (const line of lines.slice(0, 150)) {
        if (shouldSkipLine(line)) continue;
        if (isValidDrawingTitle(line)) return line.trim().toUpperCase();
    }

    return undefined;
}

// ============================================================================
// Panel / Box / Door Extraction
// ============================================================================

/**
 * Extract panel number from page text.
 * Searches line-by-line to avoid cross-line false matches.
 */
export function extractPanelNumber(
    textContent: string,
): string | undefined {
    const lines = textContent.split("\n");
    const panelPatterns = [
        /(?:^|\b)PANEL:\s*(\d{5,}[-]?\d*)/i,
        /(?:^|\b)PANEL\s+NO\.?\s*:?\s*(\d{5,}[-]?\d*)/i,
        /(?:^|\b)PANEL\s+#\s*(\d{5,}[-]?\d*)/i,
        /(?:^|\b)PNL:\s*(\d{5,}[-]?\d*)/i,
    ];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        for (const pattern of panelPatterns) {
            const match = trimmed.match(pattern);
            if (match) return match[1].trim();
        }
    }
    return undefined;
}

/**
 * Extract box number from page text.
 * Searches line-by-line to avoid cross-line false matches.
 */
export function extractBoxNumber(
    textContent: string,
): string | undefined {
    const lines = textContent.split("\n");
    const boxPatterns = [
        /(?:^|\b)BOX:\s*(\d{5,}[-]?\d*)/i,
        /(?:^|\b)BOX\s+NO\.?\s*:?\s*(\d{5,}[-]?\d*)/i,
        /(?:^|\b)BOX\s+#\s*(\d{5,}[-]?\d*)/i,
        /(?:^|\b)ENCLOSURE:\s*(\d{5,}[-]?\d*)/i,
    ];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        for (const pattern of boxPatterns) {
            const match = trimmed.match(pattern);
            if (match) return match[1].trim();
        }
    }
    return undefined;
}

/**
 * Detect if layout has door labels (indicates BOX type).
 */
export function hasDoorLabels(textContent: string): boolean {
    const doorPatterns = [
        /right\s*door\s*label/i,
        /left\s*door\s*label/i,
        /door\s*labels?\s*pn/i,
        /left\s*interior\s*view/i,
        /right\s*interior\s*view/i,
        /front\s*view.*interior/i,
    ];
    return doorPatterns.some(p => p.test(textContent));
}

// ============================================================================
// Rail & Device Extraction
// ============================================================================

/** Pattern for single-item rail labels: "RAIL 58.25\"" or "5.75\" Rail" or "17\" Rail (2)" or "14.25\" LOW RAIL" */
const RAIL_SINGLE_PATTERNS = [
    /^RAIL\s+([\d.]+["\u201D]?)\s*(?:\(\d+\))?$/i,
    /^([\d.]+["\u201D]?)\s*RAIL\s*(?:\(\d+\))?$/i,
    /^([\d.]+["\u201D]?)\s*LOW\s+RAIL\s*(?:\(\d+\))?$/i,
    /^LOW\s+RAIL\s+([\d.]+["\u201D]?)\s*(?:\(\d+\))?$/i,
];

/** Device tags: 2 uppercase letters + 4 digits (e.g., AF0041, KA0001) */
const DEVICE_TAG_PATTERN = /^[A-Z]{2}\d{4}$/;

/** Part numbers: 5+ digits with dash suffix (e.g., 2684693-17) */
const PART_NUMBER_PATTERN = /^\d{5,}[-]\d+$/;

/**
 * Extract rail groups with their devices from positioned text items.
 * Uses spatial proximity to assign devices to the nearest rail above them.
 */
export function extractRailGroups(
    items: PositionedTextItem[],
): RailGroup[] {
    // 1. Find all rail labels — single items first, then combine split items
    const rails: { label: string; x: number; y: number }[] = [];
    const usedIndices = new Set<number>();

    // Pass 1: Single-item rails
    for (let i = 0; i < items.length; i++) {
        const str = items[i].str.trim();
        for (const pattern of RAIL_SINGLE_PATTERNS) {
            if (pattern.test(str)) {
                rails.push({ label: str, x: items[i].x, y: items[i].y });
                usedIndices.add(i);
                break;
            }
        }
    }

    // Pass 2: Split rail labels ("RAIL" or "LOW RAIL" near a dimension like "14.25\"")
    for (let i = 0; i < items.length; i++) {
        if (usedIndices.has(i)) continue;
        if (!/^(?:LOW\s+)?RAIL$/i.test(items[i].str.trim())) continue;

        for (let j = 0; j < items.length; j++) {
            if (i === j || usedIndices.has(j)) continue;
            const dimStr = items[j].str.trim();
            if (!/^[\d.]+["\u201D]$/.test(dimStr)) continue;

            const dx = Math.abs(items[i].x - items[j].x);
            const dy = Math.abs(items[i].y - items[j].y);
            if (dy < 15 && dx < 200) {
                const leftItem = items[i].x < items[j].x ? items[i] : items[j];
                const rightItem = items[i].x < items[j].x ? items[j] : items[i];
                rails.push({
                    label: `${leftItem.str.trim()} ${rightItem.str.trim()}`,
                    x: Math.min(items[i].x, items[j].x),
                    y: items[i].y,
                });
                usedIndices.add(i);
                usedIndices.add(j);
                break;
            }
        }
    }

    // 2. Collect device tags, part numbers, and terminal labels
    const deviceItems: { tag: string; x: number; y: number }[] = [];
    const partNumberItems: { pn: string; x: number; y: number }[] = [];
    const terminalNumberItems: { num: number; x: number; y: number }[] = [];

    for (const item of items) {
        const str = item.str.trim();
        if (DEVICE_TAG_PATTERN.test(str)) {
            deviceItems.push({ tag: str, x: item.x, y: item.y });
        } else if (PART_NUMBER_PATTERN.test(str)) {
            partNumberItems.push({ pn: str, x: item.x, y: item.y });
        } else if (/^\d{1,2}$/.test(str) && item.width < 15) {
            terminalNumberItems.push({
                num: parseInt(str, 10),
                x: item.x,
                y: item.y,
            });
        }
    }

    // If no devices found at all, nothing to do
    if (deviceItems.length === 0) return [];

    // 3. Assign each device to the nearest rail above it
    const maxVerticalDistance = 700;

    // Sort rails top-to-bottom (descending Y)
    rails.sort((a, b) => b.y - a.y);

    const groups = rails.map(rail => ({
        railLabel: rail.label,
        railY: rail.y,
        railX: rail.x,
        devices: [] as RailDevice[],
    }));

    const unassignedDevices: RailDevice[] = [];

    for (const device of deviceItems) {
        let bestRail: (typeof groups)[number] | null = null;
        let bestDist = Infinity;
        let bestDx = Infinity;

        for (const group of groups) {
            const dy = group.railY - device.y;
            if (dy > 0 && dy < maxVerticalDistance) {
                const dx = Math.abs(group.railX - device.x);
                // Prefer closest vertical; for same-height rails, prefer closest horizontal
                if (dy < bestDist || (Math.abs(dy - bestDist) < 5 && dx < bestDx)) {
                    bestDist = dy;
                    bestDx = dx;
                    bestRail = group;
                }
            }
        }

        // Build device record with nearby part numbers and terminals
        const nearbyParts: string[] = [];
        for (const pn of partNumberItems) {
            const dx = Math.abs(pn.x - device.x);
            const dy = device.y - pn.y;
            if (dx < 50 && dy > 0 && dy < 30) nearbyParts.push(pn.pn);
        }

        const nearbyTerminals: number[] = [];
        for (const tn of terminalNumberItems) {
            const dx = Math.abs(tn.x - device.x);
            const dy = Math.abs(tn.y - device.y);
            if (dx < 25 && dy < 20) nearbyTerminals.push(tn.num);
        }
        const terminalCount =
            nearbyTerminals.length > 0
                ? Math.max(...nearbyTerminals)
                : undefined;

        const railDevice: RailDevice = {
            tag: device.tag,
            x: device.x,
            y: device.y,
            partNumbers: nearbyParts,
            terminalCount,
        };

        if (bestRail) {
            bestRail.devices.push(railDevice);
        } else {
            unassignedDevices.push(railDevice);
        }
    }

    // Sort devices left-to-right within each rail
    for (const group of groups) {
        group.devices.sort((a, b) => a.x - b.x);
    }

    // Build result: rails with devices (skip unassigned devices)
    const result: RailGroup[] = groups
        .filter(g => g.devices.length > 0)
        .map(({ railX: _rx, ...rest }) => rest);

    return result;
}

// ============================================================================
// Panduct Extraction
// ============================================================================

/** Patterns for panduct labels in layout drawings.
 *  Panducts are commonly labeled with 3-dimension format: NxNxN (e.g., "2X5X52", "2x4x22")
 *  or with explicit "PANDUCT" / "WIRING DUCT" / "P/D" text. */
/** Labels that mention "panduct" but are NOT actual panducts */
const PANDUCT_EXCLUSIONS = [
    /\bNOTCH\b/i,
    /\bCUT\s*OUT\b/i,
];

const PANDUCT_PATTERNS = [
    // 3-dimension format: WxHxL (e.g., "2X5X52", "2x4x22", "1.5X3X48")
    // This is the most common panduct label format in layout drawings
    /^\d+(?:\.\d+)?\s*[xX×]\s*\d+(?:\.\d+)?\s*[xX×]\s*\d+(?:\.\d+)?$/,
    // Explicit panduct keywords
    /\bPANDUCT\b/i,
    /\bPAN\s*DUCT\b/i,
    /\bWIRING\s*DUCT\b/i,
    /\bWIRE\s*DUCT\b/i,
    /\bP\/D\b/i,
    // Dimension + PANDUCT combinations (e.g., "1.5x3 PANDUCT", "PANDUCT 2x4")
    /[\d.]+["\u201D]?\s*[xX×]\s*[\d.]+["\u201D]?\s*(?:PANDUCT|PAN\s*DUCT|P\/D)/i,
    /(?:PANDUCT|PAN\s*DUCT|P\/D)\s*[\d.]+["\u201D]?\s*[xX×]\s*[\d.]+["\u201D]?/i,
    // Dimension + PD (e.g., "1.5x3 PD")
    /[\d.]+["\u201D]?\s*[xX×]\s*[\d.]+["\u201D]?\s*PD\b/i,
    /\bPD\s+[\d.]+["\u201D]?\s*[xX×]\s*[\d.]+["\u201D]?/i,
];

/**
 * Extract panduct (wiring duct) labels and positions from positioned text items.
 *
 * Panducts are most commonly labeled with a 3-dimension format: NxNxN
 * (e.g., "2X5X52", "2x4x22") representing width × height × length.
 * Also matches explicit "PANDUCT", "WIRING DUCT", "P/D" keywords.
 *
 * Split-label detection combines nearby text items that together form
 * a panduct reference (e.g., "PANDUCT" near a dimension string).
 */
export function extractPanducts(
    items: PositionedTextItem[],
): PanductInfo[] {
    const panducts: PanductInfo[] = [];
    const usedIndices = new Set<number>();

    // Pass 1: Single-item panduct labels (including NxNxN dimension format)
    for (let i = 0; i < items.length; i++) {
        const str = items[i].str.trim();
        // Skip false positives (e.g., "NOTCH PANDUCT")
        if (PANDUCT_EXCLUSIONS.some(p => p.test(str))) continue;
        for (const pattern of PANDUCT_PATTERNS) {
            if (pattern.test(str)) {
                panducts.push({ label: str, y: items[i].y });
                usedIndices.add(i);
                break;
            }
        }
    }

    // Pass 2: Split labels — panduct keyword near a dimension item
    for (let i = 0; i < items.length; i++) {
        if (usedIndices.has(i)) continue;
        if (!/\b(?:PANDUCT|PAN\s*DUCT|WIRING\s*DUCT|WIRE\s*DUCT|P\/D)\b/i.test(items[i].str.trim())) continue;

        // Look for a nearby dimension item (2-dim or 3-dim)
        let foundDim = false;
        for (let j = 0; j < items.length; j++) {
            if (i === j || usedIndices.has(j)) continue;
            const dimStr = items[j].str.trim();
            if (!/[\d.]+\s*[xX×]\s*[\d.]+/.test(dimStr)) continue;

            const dx = Math.abs(items[i].x - items[j].x);
            const dy = Math.abs(items[i].y - items[j].y);
            if (dy < 15 && dx < 200) {
                const label = `${dimStr} PANDUCT`;
                panducts.push({ label, y: items[i].y });
                usedIndices.add(i);
                usedIndices.add(j);
                foundDim = true;
                break;
            }
        }
        if (!foundDim) {
            panducts.push({ label: items[i].str.trim(), y: items[i].y });
            usedIndices.add(i);
        }
    }

    // Pass 3: Split NxNxN — individual dimension numbers near each other
    // Sometimes pdf.js splits "2X5X52" into separate items like "2", "X", "5", "X", "52"
    // Combine nearby items and check if they form a 3-dim pattern
    for (let i = 0; i < items.length; i++) {
        if (usedIndices.has(i)) continue;
        const str = items[i].str.trim();
        // Look for items starting with a digit that could be part of NxNxN
        if (!/^\d/.test(str)) continue;

        // Gather nearby items within a small horizontal/vertical window
        const cluster: { idx: number; str: string; x: number }[] = [{ idx: i, str, x: items[i].x }];
        for (let j = 0; j < items.length; j++) {
            if (i === j || usedIndices.has(j)) continue;
            const dy = Math.abs(items[i].y - items[j].y);
            const dx = Math.abs(items[i].x - items[j].x);
            if (dy < 8 && dx < 120) {
                cluster.push({ idx: j, str: items[j].str.trim(), x: items[j].x });
            }
        }
        if (cluster.length < 2) continue;

        // Sort by x position and concatenate
        cluster.sort((a, b) => a.x - b.x);
        const combined = cluster.map(c => c.str).join('');
        if (/^\d+(?:\.\d+)?[xX×]\d+(?:\.\d+)?[xX×]\d+(?:\.\d+)?$/.test(combined)) {
            panducts.push({ label: combined, y: items[i].y });
            for (const c of cluster) usedIndices.add(c.idx);
        }
    }

    return panducts;
}

// ============================================================================
// PDF Text → Positioned Items
// ============================================================================

interface PDFTextItem {
    str?: string;
    transform?: number[];
    width?: number;
    height?: number;
}

/**
 * Convert raw pdf.js text content items into positioned text items.
 * Returns both a newline-joined string and the positioned array.
 */
export function buildPositionedTextItems(
    pdfItems: PDFTextItem[],
): { text: string; items: PositionedTextItem[] } {
    const items: PositionedTextItem[] = [];

    for (const item of pdfItems) {
        const str = item.str?.trim();
        if (!str) continue;
        items.push({
            str,
            x: item.transform?.[4] ?? 0,
            y: item.transform?.[5] ?? 0,
            width: item.width ?? 0,
            height: item.height ?? 0,
        });
    }

    const text = items.map(i => i.str).join("\n");
    return { text, items };
}
