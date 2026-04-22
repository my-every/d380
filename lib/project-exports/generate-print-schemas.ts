import "server-only";

import {
    readProjectManifest,
    readSheetSchema,
} from "@/lib/project-state/share-project-state-handlers";
import { readProjectSheetState } from "@/lib/project-state/share-sheet-state-handlers";
import {
    saveWireListPrintSchema,
    saveWireBrandListSchema,
} from "@/lib/project-state/share-print-schema-handlers";
import { buildWireListPrintSchema } from "@/lib/wire-list-print/schema";
import { buildProjectSheetPrintDocument } from "@/lib/wire-list-print/build-project-sheet-print-document";
import { buildBrandListExportSchema } from "@/lib/wire-brand-list/schema";
import {
    createDefaultPrintSettings,
    createDefaultProjectInfo,
} from "@/lib/wire-list-print/defaults";
import { deserializeSheetPatches, applyPatchesToRows } from "@/lib/row-patches";

export interface GeneratePrintSchemasResult {
    projectId: string;
    generatedAt: string;
    sheets: Array<{
        sheetSlug: string;
        sheetName: string;
        wireListPrintSchema: boolean;
        wireBrandListSchema: boolean;
    }>;
    skippedSheets: Array<{
        sheetSlug: string;
        sheetName: string;
        reason: string;
    }>;
}

/**
 * Generate wire-list-print-schema (standardize mode) and wire-brand-list schema
 * (branding mode) for every operational sheet in the project.
 *
 * Reads rows from the persisted sheet schemas, applies any row patches,
 * builds print schemas in both modes, and saves them to the state directory.
 */
export async function generateAllPrintSchemas(
    projectId: string,
): Promise<GeneratePrintSchemasResult> {
    const manifest = await readProjectManifest(projectId);
    if (!manifest) {
        throw new Error("Project not found");
    }

    const projectInfo = createDefaultProjectInfo({
        projectNumber: manifest.pdNumber,
        projectName: manifest.name,
        revision: manifest.revision,
        pdNumber: manifest.pdNumber,
        unitNumber: manifest.unitNumber,
    });

    const result: GeneratePrintSchemasResult = {
        projectId,
        generatedAt: new Date().toISOString(),
        sheets: [],
        skippedSheets: [],
    };

    const operationalSheets = manifest.sheets.filter(
        (sheet) => sheet.kind === "operational",
    );

    for (const sheet of operationalSheets) {
        const schema = await readSheetSchema(projectId, sheet.slug);
        if (!schema) {
            result.skippedSheets.push({
                sheetSlug: sheet.slug,
                sheetName: sheet.name,
                reason: "Sheet schema not found",
            });
            continue;
        }

        const semanticRows = schema.rows ?? [];
        if (semanticRows.length === 0) {
            result.skippedSheets.push({
                sheetSlug: sheet.slug,
                sheetName: sheet.name,
                reason: "No rows in sheet schema",
            });
            continue;
        }

        const defaultSettings = createDefaultPrintSettings();
        const sheetState = await readProjectSheetState(projectId, sheet.slug);
        const patchedRows = applyPatchesToRows(
            semanticRows,
            deserializeSheetPatches(sheetState?.rowPatches ?? []),
            { computedLengths: new Map() },
        );

        let savedStandardize = false;
        let savedBranding = false;

        // Generate wire-list-print-schema (standardize mode)
        try {
            const standardizeDocument = await buildProjectSheetPrintDocument({
                projectId,
                sheetSlug: sheet.slug,
                settings: {
                    ...defaultSettings,
                    mode: "standardize",
                },
            });

            if (!standardizeDocument) {
                throw new Error("Unable to build print document");
            }

            const standardizeSchema = buildWireListPrintSchema({
                rows: patchedRows,
                currentSheetName: schema.name,
                settings: { ...defaultSettings, mode: "standardize" },
                projectInfo,
                sheetTitle: schema.name,
                getLengthForRow: (rowId) => standardizeDocument.rowLengthsById?.[rowId] ?? null,
            });
            await saveWireListPrintSchema(projectId, sheet.slug, standardizeSchema);
            savedStandardize = true;
        } catch (err) {
            console.error(
                `Failed to generate wire-list-print-schema for sheet ${sheet.slug}:`,
                err,
            );
        }

        // Generate wire-brand-list schema (branding mode)
        try {
            const brandingDocument = await buildProjectSheetPrintDocument({
                projectId,
                sheetSlug: sheet.slug,
                settings: {
                    mode: "branding",
                    showCoverPage: false,
                    showTableOfContents: false,
                    showIPVCodes: false,
                },
            });

            if (!brandingDocument) {
                throw new Error("Unable to build branding document");
            }

            const brandingSchema = buildBrandListExportSchema({
                sheetSlug: sheet.slug,
                sheetName: schema.name,
                brandingVisibleSections: brandingDocument.brandingVisibleSections ?? [],
                sectionColumnVisibility: brandingDocument.settings.sectionColumnVisibility,
                brandingSortMode: brandingDocument.settings.brandingSortMode,
                projectInfo: {
                    projectNumber: manifest.pdNumber,
                    projectName: manifest.name,
                    revision: manifest.revision,
                    controlsDE: schema.metadata?.controlsDE,
                    controlsME: schema.metadata?.controlsME,
                },
            });

            await saveWireBrandListSchema(projectId, sheet.slug, brandingSchema);
            savedBranding = true;
        } catch (err) {
            console.error(
                `Failed to generate wire-brand-list schema for sheet ${sheet.slug}:`,
                err,
            );
        }

        result.sheets.push({
            sheetSlug: sheet.slug,
            sheetName: sheet.name,
            wireListPrintSchema: savedStandardize,
            wireBrandListSchema: savedBranding,
        });
    }

    return result;
}
