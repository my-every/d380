import { describe, expect, it } from "vitest";

import type { SemanticWireListRow } from "@/lib/workbook/types";
import {
  buildDefaultBrandingHiddenSections,
  buildPrintPreviewPageCount,
  buildVisiblePreviewSections,
  resolveActiveHiddenSections,
  sortRowsForDeviceGroupedPreview,
  type PrintLocationGroup,
} from "@/lib/wire-list-print/model";

function makeRow(overrides: Partial<SemanticWireListRow>): SemanticWireListRow {
  return {
    __rowIndex: 1,
    __rowId: overrides.__rowId ?? "row-1",
    fromDeviceId: overrides.fromDeviceId ?? "TB1:1",
    wireType: overrides.wireType ?? "WIRE",
    wireNo: overrides.wireNo ?? "1",
    wireId: overrides.wireId ?? "BK",
    gaugeSize: overrides.gaugeSize ?? "16",
    fromLocation: overrides.fromLocation ?? "UNIT1",
    fromPageZone: overrides.fromPageZone ?? "A1",
    toDeviceId: overrides.toDeviceId ?? "TB2:1",
    toLocation: overrides.toLocation ?? "UNIT1",
    toPageZone: overrides.toPageZone ?? "A2",
    location: overrides.location,
  };
}

describe("wire-list print model", () => {
  it("hides non-single-connection sections by default in branding mode", () => {
    const groups: PrintLocationGroup[] = [
      {
        location: "UNIT1",
        isExternal: false,
        totalRows: 4,
        subsections: [
          { label: "Grounds", rows: [makeRow({ __rowId: "g-1" })], sectionKind: "grounds" },
          { label: "Single Connections", rows: [makeRow({ __rowId: "s-1" })], sectionKind: "single_connections" },
          { label: "Cables", rows: [makeRow({ __rowId: "c-1" })], sectionKind: "cables" },
        ],
      },
    ];

    expect(Array.from(buildDefaultBrandingHiddenSections(groups))).toEqual(["0-0", "0-2"]);
  });

  it("resolves branding hidden sections from defaults unless customized", () => {
    const defaultHidden = new Set(["0-0", "0-2"]);

    expect(
      Array.from(
        resolveActiveHiddenSections({
          mode: "branding",
          standardHiddenSections: new Set(["loc-0"]),
          brandingHiddenSections: new Set(["0-1"]),
          brandingHiddenSectionsCustomized: false,
          defaultBrandingHiddenSections: defaultHidden,
        }),
      ),
    ).toEqual(["0-0", "0-2"]);

    expect(
      Array.from(
        resolveActiveHiddenSections({
          mode: "branding",
          standardHiddenSections: new Set(["loc-0"]),
          brandingHiddenSections: new Set(["0-1"]),
          brandingHiddenSectionsCustomized: true,
          defaultBrandingHiddenSections: defaultHidden,
        }),
      ),
    ).toEqual(["0-1"]);
  });

  it("filters hidden sections and keeps visible rows for preview", () => {
    const groups: PrintLocationGroup[] = [
      {
        location: "UNIT1",
        isExternal: false,
        totalRows: 2,
        subsections: [
          { label: "Single Connections", rows: [makeRow({ __rowId: "r-1" })], sectionKind: "single_connections" },
          { label: "Cables", rows: [makeRow({ __rowId: "r-2" })], sectionKind: "cables" },
        ],
      },
    ];

    const visible = buildVisiblePreviewSections(groups, new Set(["0-1"]), {});

    expect(visible).toHaveLength(1);
    expect(visible[0]?.group.location).toBe("UNIT1");
    expect(visible[0]?.subsection.label).toBe("Single Connections");
    expect(visible[0]?.visibleRows.map((row) => row.__rowId)).toEqual(["r-1"]);
  });

  it("calculates print preview page counts from the enabled pages", () => {
    expect(
      buildPrintPreviewPageCount({
        mode: "standardize",
        processedLocationGroups: [{ location: "UNIT1", isExternal: false, totalRows: 61, subsections: [] }],
        showFeedbackSection: true,
        showCoverPage: true,
        showTableOfContents: true,
        showIPVCodes: true,
      }),
    ).toBe(7);

    expect(
      buildPrintPreviewPageCount({
        mode: "branding",
        processedLocationGroups: [],
        showFeedbackSection: false,
        showCoverPage: false,
        showTableOfContents: false,
        showIPVCodes: false,
      }),
    ).toBe(1);
  });

  it("keeps current-sheet single-connection groups ahead of external groups", () => {
    const rows = sortRowsForDeviceGroupedPreview(
      [
        makeRow({ __rowId: "external", fromDeviceId: "KA2:A1", toDeviceId: "TB2:1", fromLocation: "REMOTE", toLocation: "REMOTE", wireNo: "2" }),
        makeRow({ __rowId: "local", fromDeviceId: "KA1:A1", toDeviceId: "TB1:1", fromLocation: "UNIT1", toLocation: "UNIT1", wireNo: "1" }),
      ],
      "UNIT1",
      false,
      new Map([
        ["KA1", { partNumber: "1061979-1", description: "Relay", location: "UNIT1" }],
        ["KA2", { partNumber: "1061979-1", description: "Relay", location: "REMOTE" }],
      ]),
    );

    expect(rows.map((row) => row.__rowId)).toEqual(["local", "external"]);
  });
});
