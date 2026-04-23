import { afterEach, describe, expect, it } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildShareProjectFolderName } from "@/lib/project-state/share-project-state-handlers";
import { buildProjectSheetPrintDocument } from "@/lib/wire-list-print/build-project-sheet-print-document";

const projectId = "vitest-print-project";
const projectName = "Vitest Print Project";
const pdNumber = "P1234";
const sheetSlug = "unit1";
const projectRoot = path.join(process.cwd(), "Share", "Projects", buildShareProjectFolderName(pdNumber, projectName));
const stateRoot = path.join(projectRoot, "state");
const sheetStateRoot = path.join(stateRoot, "sheet-state");

afterEach(async () => {
  await rm(projectRoot, { recursive: true, force: true });
});

describe("buildProjectSheetPrintDocument", () => {
  it("rebuilds a print document from persisted project and sheet state", async () => {
    await mkdir(sheetStateRoot, { recursive: true });

    const semanticRows = [
      {
        __rowIndex: 1,
        __rowId: "row-1",
        fromDeviceId: "TB1:1",
        wireType: "WIRE",
        wireNo: "1",
        wireId: "BK",
        gaugeSize: "16",
        fromLocation: "UNIT1",
        fromPageZone: "A1",
        toDeviceId: "TB2:1",
        toLocation: "UNIT1",
        toPageZone: "A2",
        location: "UNIT1",
      },
    ];

    await writeFile(
      path.join(stateRoot, "project-context.json"),
      JSON.stringify({
        id: projectId,
        name: projectName,
        filename: "demo.xlsx",
        createdAt: new Date().toISOString(),
        projectModel: {
          id: projectId,
          filename: "demo.xlsx",
          name: projectName,
          pdNumber,
          revision: "A",
          unitNumber: "U1",
          createdAt: new Date().toISOString(),
          warnings: [],
          sheets: [
            {
              id: "sheet-1",
              name: "UNIT1",
              slug: sheetSlug,
              kind: "operational",
              rowCount: 1,
              columnCount: 10,
              headers: [],
              sheetIndex: 0,
              hasData: true,
              warnings: [],
            },
          ],
          sheetData: {
            "sheet-1": {
              originalName: "UNIT1",
              slug: sheetSlug,
              headers: [],
              rows: [],
              semanticRows,
              rowCount: 1,
              columnCount: 10,
              sheetIndex: 0,
              warnings: [],
            },
          },
        },
      }, null, 2),
      "utf-8",
    );

    await writeFile(
      path.join(sheetStateRoot, `${encodeURIComponent(sheetSlug)}.json`),
      JSON.stringify({
        projectId,
        sheetSlug,
        updatedAt: new Date().toISOString(),
        rowPatches: [],
        workflow: {
          "row-1": { comment: "verify termination" },
        },
        columnVisibility: {},
        columnOrder: {},
        brandingEdits: {
          "row-1": { length: 42 },
        },
        revisionSelection: { wireListFilename: null, layoutFilename: null },
        patchHistory: { past: [], present: [], future: [] },
      }, null, 2),
      "utf-8",
    );

    const document = await buildProjectSheetPrintDocument({
      projectId,
      sheetSlug,
      settings: {
        mode: "branding",
        showCoverPage: false,
        showTableOfContents: false,
        showIPVCodes: false,
      },
    });

    expect(document).not.toBeNull();
    expect(document?.currentSheetName).toBe("UNIT1");
    expect(document?.projectInfo.projectName).toBe(projectName);
    expect(document?.comments).toEqual({ "row-1": "verify termination" });
    expect(document?.brandingVisibleSections?.flatMap((section) => section.rows).map((row) => row.measurement)).toContain(42);
  });
});
