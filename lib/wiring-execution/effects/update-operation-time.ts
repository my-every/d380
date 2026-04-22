/**
 * Update Operation Time Effect
 *
 * Adds an OperationTimeEntry for each completed section.
 */

import { registerWiringEffect, type WiringEffectContext } from "../effects";
import { addOperationTimeEntry } from "@/lib/project-state/share-operation-time-handlers";

async function execute(ctx: WiringEffectContext): Promise<void> {
    if (!ctx.section || !ctx.section.startedAt) return;

    await addOperationTimeEntry(ctx.projectId, {
        opCode: "WIRING",
        assignmentId: `${ctx.session.sheetSlug}`,
        projectId: ctx.projectId,
        badge: ctx.badge,
        startedAt: ctx.section.startedAt,
        endedAt: ctx.section.completedAt,
        actualMinutes: ctx.section.actualMinutes ?? 0,
        source: "sws_tablet",
        note: `${ctx.section.location} — ${ctx.section.sectionLabel} (${ctx.section.totalRows} wires, est: ${ctx.section.estimatedMinutes}m)`,
    });
}

registerWiringEffect({
    id: "update-operation-time",
    trigger: "section-complete",
    label: "Record operation time entry for section",
    execute,
});
