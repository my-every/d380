import type {
    Assignment,
    AssignmentFilter,
    AssignmentPlacement,
    AssignmentStatus,
    IAssignmentStateService,
} from '@/lib/services/contracts/assignment-state-service'
import type { PaginatedResult, ServiceResult } from '@/lib/services/contracts'

import { ASSIGNMENT_STAGES } from '@/types/d380-assignment-stages'

import { evaluateSla } from '@/lib/services/assignment-persistence/sla'
import {
    ASSIGNMENT_STATE_SCHEMA_VERSION,
    PERSISTENCE_ERROR_CODES,
    assertValidStageJumpNote,
    normalizeBadgeForPath,
    normalizeProjectFolderKey,
    normalizeShiftForPath,
    normalizeShiftToDomain,
    type AssignmentPolicyEventType,
} from '@/lib/services/assignment-persistence/policy'
import { resolveAssignmentByPrecedence } from '@/lib/services/assignment-persistence/resolver'
import { projectStateSnapshotSchema, userAssignmentHistorySchema, userAssignmentsLedgerSchema } from '@/lib/services/assignment-persistence/schemas'
import { WorkspaceTransactionCoordinator, toPosixRelativePath } from '@/lib/services/assignment-persistence/transaction'
import { SimulatedAssignmentStateService } from '@/lib/services/providers/share-380-simulated'
import { getWorkspaceFs } from './workspace-fs'

interface PersistedWorkflowMetadata {
    schemaVersion: number
    updatedAt: string
    lastGlobalSequence: number
    assignmentSequences: Record<string, number>
}

interface PersistedShiftLogEntry {
    occurredAt: string
    assignmentId: string
    eventType: AssignmentPolicyEventType
    actorBadge: string
    actorShift: string
    note?: string
}

function createResult<T>(data: T | null, error: string | null = null): ServiceResult<T> {
    return {
        data,
        error,
        source: 'electron',
        timestamp: new Date().toISOString(),
    }
}

function errorResult<T>(code: string, message: string): ServiceResult<T> {
    return createResult<T>(null, `[${code}] ${message}`)
}

async function safeReadJson<T>(relativePath: string): Promise<T | null> {
    const fs = getWorkspaceFs()
    const text = await fs.readText(relativePath)
    if (!text) {
        return null
    }

    try {
        return JSON.parse(text) as T
    } catch {
        return null
    }
}

function parseSizeTier(sizeTier: Assignment['sizeTier']): 'small' | 'medium' | 'large' | 'xlarge' {
    return sizeTier.toLowerCase() as 'small' | 'medium' | 'large' | 'xlarge'
}

function toMonthBucket(iso: string): string {
    return iso.slice(0, 7)
}

export class ElectronAssignmentStateService implements IAssignmentStateService {
    private readonly simulated = new SimulatedAssignmentStateService()
    private readonly overrides = new Map<string, Assignment>()

    private overlayAssignment(assignment: Assignment): Assignment {
        return this.overrides.get(assignment.id) ?? assignment
    }

    private overlayList(assignments: Assignment[]): Assignment[] {
        return assignments.map(item => this.overlayAssignment(item))
    }

    private async readWorkflowMetadata(relativePath: string): Promise<PersistedWorkflowMetadata> {
        const existing = await safeReadJson<PersistedWorkflowMetadata>(relativePath)
        if (existing) {
            return existing
        }

        return {
            schemaVersion: ASSIGNMENT_STATE_SCHEMA_VERSION,
            updatedAt: new Date().toISOString(),
            lastGlobalSequence: 0,
            assignmentSequences: {},
        }
    }

    private detectEventType(
        action: 'place' | 'status' | 'stage' | 'progress',
        previous: Assignment,
        next: Assignment,
    ): AssignmentPolicyEventType {
        if (action === 'place') {
            const previousAssignee = previous.currentMemberBadges[0] ?? ''
            const nextAssignee = next.currentMemberBadges[0] ?? ''
            return previousAssignee && previousAssignee !== nextAssignee ? 'REASSIGNED' : 'ASSIGNED'
        }

        if (action === 'stage') {
            return 'STAGE_CHANGED'
        }

        if (action === 'progress') {
            return next.progressPercent >= 100 ? 'COMPLETED' : 'SLA_RECALCULATED'
        }

        if (next.status === 'BLOCKED') {
            return 'BLOCKED'
        }
        if (next.status === 'ASSIGNED' && previous.status === 'BLOCKED') {
            return 'UNBLOCKED'
        }
        if (next.status === 'IN_PROGRESS') {
            return 'STARTED'
        }

        return 'SLA_RECALCULATED'
    }

    private async persistMutation(
        action: 'place' | 'status' | 'stage' | 'progress',
        previous: Assignment,
        next: Assignment,
        note?: string,
    ): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
        const fs = getWorkspaceFs()
        const now = new Date().toISOString()

        const actorBadge = normalizeBadgeForPath(next.currentMemberBadges[0] ?? previous.currentMemberBadges[0] ?? 'SYSTEM')
        const actorShiftPath = normalizeShiftForPath(next.shift)
        const actorShiftDomain = normalizeShiftToDomain(next.shift)
        const month = toMonthBucket(now)

        const userBase = toPosixRelativePath('Share', 'users', actorShiftPath, actorBadge)
        const assignmentsRelativePath = toPosixRelativePath(userBase, 'assignments.json')
        const historyRelativePath = toPosixRelativePath(userBase, 'assignment-history.json')

        const projectKey = normalizeProjectFolderKey(next.pdNumber, next.projectName)
        const projectStateDir = toPosixRelativePath('Share', 'Projects', projectKey, 'state')
        const projectAssignmentStatePath = toPosixRelativePath(projectStateDir, 'assignment-state.json')
        const projectShiftLogPath = toPosixRelativePath(projectStateDir, 'shift-log.json')
        const projectWorkflowMetadataPath = toPosixRelativePath(projectStateDir, 'workflow-metadata.json')

        await fs.ensureDir(userBase)
        await fs.ensureDir(projectStateDir)

        const jumpError = assertValidStageJumpNote(previous.stage as any, next.stage as any, note)
        if (jumpError) {
            return {
                ok: false,
                code: jumpError,
                message: 'Stage jumps require a validation note with at least 8 characters.',
            }
        }

        const sla = evaluateSla(next)
        if (sla.errorCode) {
            return {
                ok: false,
                code: sla.errorCode,
                message: 'XLARGE assignments require a project-driven due date before transition.',
            }
        }

        const eventType = this.detectEventType(action, previous, next)

        const existingLedgerRaw = await safeReadJson<unknown>(assignmentsRelativePath)
        const existingHistoryRaw = await safeReadJson<unknown>(historyRelativePath)
        const existingProjectState = await safeReadJson<any>(projectAssignmentStatePath)
        const existingShiftLog = (await safeReadJson<PersistedShiftLogEntry[]>(projectShiftLogPath)) ?? []
        const existingWorkflow = await this.readWorkflowMetadata(projectWorkflowMetadataPath)

        const parsedLedger = userAssignmentsLedgerSchema.safeParse(existingLedgerRaw)
        const parsedHistory = userAssignmentHistorySchema.safeParse(existingHistoryRaw)

        const ledger: any = parsedLedger.success
            ? parsedLedger.data
            : {
                schemaVersion: ASSIGNMENT_STATE_SCHEMA_VERSION,
                badge: actorBadge,
                shift: actorShiftDomain,
                lastUpdatedAt: now,
                months: {},
            }

        const history: any = parsedHistory.success
            ? parsedHistory.data
            : {
                schemaVersion: ASSIGNMENT_STATE_SCHEMA_VERSION,
                badge: actorBadge,
                shift: actorShiftDomain,
                activeWindow: month,
                lastAppendedAt: now,
                events: [],
            }

        const workflow = {
            ...existingWorkflow,
            assignmentSequences: existingWorkflow.assignmentSequences ?? {},
        }

        const currentAssignmentSequence = workflow.assignmentSequences[next.id] ?? 0
        const expectedFromHistory = history.events
            .filter((event: any) => String(event.assignmentId) === next.id)
            .reduce((max: number, event: any) => Math.max(max, Number(event.assignmentEventSequence ?? 0)), 0)

        if (currentAssignmentSequence !== expectedFromHistory) {
            return {
                ok: false,
                code: PERSISTENCE_ERROR_CODES.OUT_OF_ORDER_EVENT,
                message: 'Assignment event ordering check failed; stale sequence state detected.',
            }
        }

        const assignmentSequence = currentAssignmentSequence + 1
        const globalSequence = (workflow.lastGlobalSequence ?? 0) + 1

        const monthBucket = ledger.months[month] ?? {
            month,
            counters: {
                openedAssignments: 0,
                startedAssignments: 0,
                completedAssignments: 0,
                blockedAssignments: 0,
                unblockedAssignments: 0,
                reassignedAssignments: 0,
                carriedOverAssignments: 0,
                onTimeCompletedAssignments: 0,
                overdueAssignments: 0,
                totalWorkedMinutes: 0,
                avgCycleTimeMinutes: 0,
                avgStartLagMinutes: 0,
                avgCompletionLagMinutes: 0,
            },
            assignments: [],
        }

        const assignmentIndex = monthBucket.assignments.findIndex((item: any) => item.assignmentId === next.id)
        const ledgerEntry = {
            assignmentId: next.id,
            pdNumber: next.pdNumber,
            projectName: next.projectName,
            projectId: next.projectId,
            sheetSlug: next.sheetSlug,
            sheetName: next.sheetName,
            currentAssigneeBadge: actorBadge,
            currentAssigneeShift: actorShiftDomain,
            initialAssigneeBadge:
                assignmentIndex >= 0
                    ? monthBucket.assignments[assignmentIndex].initialAssigneeBadge
                    : actorBadge,
            initialAssigneeShift:
                assignmentIndex >= 0
                    ? monthBucket.assignments[assignmentIndex].initialAssigneeShift
                    : actorShiftDomain,
            reassignmentCount:
                assignmentIndex >= 0
                    ? monthBucket.assignments[assignmentIndex].reassignmentCount + (eventType === 'REASSIGNED' ? 1 : 0)
                    : eventType === 'REASSIGNED'
                        ? 1
                        : 0,
            handoffCount: assignmentIndex >= 0 ? monthBucket.assignments[assignmentIndex].handoffCount : 0,
            currentStage: next.stage,
            status: next.status,
            estimatedMinutes: next.estimatedMinutes,
            sizeTier: parseSizeTier(next.sizeTier),
            assignedAt: next.assignedAt ?? now,
            startedAt: next.startedAt,
            completedAt: next.completedAt,
            blockedAt: next.blockedAt,
            dueAt: next.dueAt,
            activeWorkMinutes: Math.round((next.progressPercent / 100) * next.estimatedMinutes),
            priorAssigneeWorkedMinutes:
                assignmentIndex >= 0
                    ? monthBucket.assignments[assignmentIndex].priorAssigneeWorkedMinutes
                    : 0,
            blockedMinutes: next.status === 'BLOCKED' ? 1 : 0,
            carriedOver: next.carriedFromPriorShift,
            carriedOverFromMonth: undefined,
            startSlaBreached: sla.startSlaBreached,
            completionSlaBreached: sla.completionSlaBreached,
            overdue: sla.overdue,
            overdueByMinutes: sla.overdueByMinutes,
            onTimeCompletion: next.status === 'COMPLETE' ? !sla.completionSlaBreached : null,
        }

        if (assignmentIndex >= 0) {
            monthBucket.assignments[assignmentIndex] = ledgerEntry
        } else {
            monthBucket.assignments.push(ledgerEntry)
        }

        monthBucket.counters.startedAssignments = monthBucket.assignments.filter((item: any) => !!item.startedAt).length
        monthBucket.counters.completedAssignments = monthBucket.assignments.filter((item: any) => !!item.completedAt).length
        monthBucket.counters.blockedAssignments = monthBucket.assignments.filter((item: any) => item.status === 'BLOCKED').length
        monthBucket.counters.reassignedAssignments = monthBucket.assignments.reduce((sum: number, item: any) => sum + item.reassignmentCount, 0)
        monthBucket.counters.overdueAssignments = monthBucket.assignments.filter((item: any) => item.overdue).length
        monthBucket.counters.onTimeCompletedAssignments = monthBucket.assignments.filter((item: any) => item.onTimeCompletion === true).length
        monthBucket.counters.totalWorkedMinutes = monthBucket.assignments.reduce((sum: number, item: any) => sum + item.activeWorkMinutes, 0)

        ledger.months[month] = monthBucket
        ledger.lastUpdatedAt = now

        const historyEvent = {
            eventId: crypto.randomUUID(),
            correlationId: crypto.randomUUID(),
            assignmentEventSequence: assignmentSequence,
            globalSequence,
            type: eventType,
            occurredAt: now,
            assignmentId: next.id,
            note: note ?? null,
            actor: {
                badge: actorBadge,
                shift: actorShiftDomain,
                displayName: actorBadge,
            },
            previousSnapshot: {
                stage: previous.stage,
                status: previous.status,
                assigneeBadge: previous.currentMemberBadges[0] ?? null,
                progressPercent: previous.progressPercent,
                estimatedMinutes: previous.estimatedMinutes,
                activeWorkMinutes: Math.round((previous.progressPercent / 100) * previous.estimatedMinutes),
                blockedMinutes: previous.status === 'BLOCKED' ? 1 : 0,
            },
            nextSnapshot: {
                stage: next.stage,
                status: next.status,
                assigneeBadge: next.currentMemberBadges[0] ?? null,
                progressPercent: next.progressPercent,
                estimatedMinutes: next.estimatedMinutes,
                activeWorkMinutes: Math.round((next.progressPercent / 100) * next.estimatedMinutes),
                blockedMinutes: next.status === 'BLOCKED' ? 1 : 0,
            },
        }

        history.events.push(historyEvent as any)
        history.activeWindow = month
        history.lastAppendedAt = now

        const projectState = existingProjectState ?? {
            schemaVersion: ASSIGNMENT_STATE_SCHEMA_VERSION,
            projectId: next.projectId,
            pdNumber: next.pdNumber,
            projectName: next.projectName,
            updatedAt: now,
            assignments: {},
            workflowMetadata: {
                lastGlobalSequence: 0,
                updatedAt: now,
            },
        }

        projectState.assignments[next.id] = next
        projectState.updatedAt = now
        projectState.workflowMetadata = {
            lastGlobalSequence: globalSequence,
            updatedAt: now,
        }

        const parsedProjectState = projectStateSnapshotSchema.safeParse(projectState)
        if (!parsedProjectState.success) {
            return {
                ok: false,
                code: PERSISTENCE_ERROR_CODES.SCHEMA_INVALID,
                message: 'Project state schema validation failed before commit.',
            }
        }

        const shiftLog = [
            ...existingShiftLog,
            {
                occurredAt: now,
                assignmentId: next.id,
                eventType,
                actorBadge,
                actorShift: actorShiftDomain,
                note,
            },
        ]

        const workflowMetadata: PersistedWorkflowMetadata = {
            schemaVersion: ASSIGNMENT_STATE_SCHEMA_VERSION,
            updatedAt: now,
            lastGlobalSequence: globalSequence,
            assignmentSequences: {
                ...workflow.assignmentSequences,
                [next.id]: assignmentSequence,
            },
        }

        const coordinator = new WorkspaceTransactionCoordinator(fs)
        const transaction = await coordinator.applyWrites([
            { relativePath: assignmentsRelativePath, content: JSON.stringify(ledger, null, 2) },
            { relativePath: historyRelativePath, content: JSON.stringify(history, null, 2) },
            { relativePath: projectAssignmentStatePath, content: JSON.stringify(projectState, null, 2) },
            { relativePath: projectShiftLogPath, content: JSON.stringify(shiftLog, null, 2) },
            { relativePath: projectWorkflowMetadataPath, content: JSON.stringify(workflowMetadata, null, 2) },
        ])

        if (!transaction.success) {
            return {
                ok: false,
                code: transaction.errorCode ?? PERSISTENCE_ERROR_CODES.TXN_WRITE_FAILED,
                message: transaction.errorMessage ?? 'Failed to persist assignment mutation.',
            }
        }

        return { ok: true }
    }

    private async getCurrentAssignment(id: string): Promise<Assignment | null> {
        if (this.overrides.has(id)) {
            return this.overrides.get(id) ?? null
        }
        const result = await this.simulated.getAssignmentById(id)
        if (!result.data) {
            return null
        }

        return this.resolveWithPersistencePrecedence(result.data)
    }

    private async resolveWithPersistencePrecedence(base: Assignment): Promise<Assignment> {
        const projectKey = normalizeProjectFolderKey(base.pdNumber, base.projectName)
        const projectStatePath = toPosixRelativePath('Share', 'Projects', projectKey, 'state', 'assignment-state.json')
        const projectState = await safeReadJson<any>(projectStatePath)
        const projectRecord = projectState?.assignments?.[base.id]

        const actorBadge = normalizeBadgeForPath(base.currentMemberBadges[0] ?? 'SYSTEM')
        const actorShift = normalizeShiftForPath(base.shift)
        const currentMonth = toMonthBucket(new Date().toISOString())
        const ledgerPath = toPosixRelativePath('Share', 'users', actorShift, actorBadge, 'assignments.json')
        const historyPath = toPosixRelativePath('Share', 'users', actorShift, actorBadge, 'assignment-history.json')

        const ledger = await safeReadJson<any>(ledgerPath)
        const monthBucket = ledger?.months?.[currentMonth]
        const ledgerEntry = Array.isArray(monthBucket?.assignments)
            ? monthBucket.assignments.find((item: any) => item.assignmentId === base.id)
            : null

        const history = await safeReadJson<any>(historyPath)
        const historyEvent = Array.isArray(history?.events)
            ? [...history.events]
                .reverse()
                .find((item: any) => item.assignmentId === base.id)
            : null

        const resolution = resolveAssignmentByPrecedence({
            projectState: projectRecord
                ? {
                    stage: projectRecord.stage,
                    status: projectRecord.status,
                    progressPercent: projectRecord.progressPercent,
                    statusNote: projectRecord.statusNote,
                    updatedAt: projectRecord.updatedAt,
                }
                : undefined,
            assignmentState: ledgerEntry
                ? {
                    stage: ledgerEntry.currentStage,
                    status: ledgerEntry.status,
                    dueAt: ledgerEntry.dueAt,
                    blockedAt: ledgerEntry.blockedAt,
                }
                : undefined,
            derivedSnapshot: this.overrides.get(base.id),
            activityFeed: historyEvent
                ? {
                    stage: historyEvent?.nextSnapshot?.stage,
                    status: historyEvent?.nextSnapshot?.status,
                }
                : undefined,
        })

        return {
            ...base,
            ...(resolution.assignment ?? {}),
        }
    }

    async getActiveAssignments(): Promise<ServiceResult<Assignment[]>> {
        const result = await this.simulated.getActiveAssignments()
        if (!result.data) {
            return createResult([], result.error)
        }
        return createResult(this.overlayList(result.data), result.error)
    }

    async getAssignments(
        filter?: AssignmentFilter,
        page?: number,
        pageSize?: number,
    ): Promise<ServiceResult<PaginatedResult<Assignment>>> {
        const result = await (this.simulated as any).getAssignments(filter, page, pageSize)
        if (!result.data) {
            return createResult<PaginatedResult<Assignment>>(null, result.error)
        }

        return createResult({
            ...result.data,
            items: this.overlayList(result.data.items),
        })
    }

    async getAssignmentById(id: string): Promise<ServiceResult<Assignment | null>> {
        const assignment = await this.getCurrentAssignment(id)
        return createResult(assignment)
    }

    async getAssignmentsByProject(projectId: string): Promise<ServiceResult<Assignment[]>> {
        const result = await this.simulated.getAssignmentsByProject(projectId)
        if (!result.data) {
            return createResult([], result.error)
        }
        return createResult(this.overlayList(result.data), result.error)
    }

    async getAssignmentsByWorkArea(workAreaId: string): Promise<ServiceResult<Assignment[]>> {
        const result = await this.simulated.getAssignmentsByWorkArea(workAreaId)
        if (!result.data) {
            return createResult([], result.error)
        }
        return createResult(this.overlayList(result.data), result.error)
    }

    async getAssignmentsByMember(badge: string): Promise<ServiceResult<Assignment[]>> {
        const result = await this.simulated.getAssignmentsByMember(badge)
        if (!result.data) {
            return createResult([], result.error)
        }
        return createResult(this.overlayList(result.data), result.error)
    }

    async getBacklog(): Promise<ServiceResult<{ unassigned: Assignment[]; blocked: Assignment[]; carryover: Assignment[] }>> {
        const result = await this.simulated.getBacklog()
        if (!result.data) {
            return createResult<{ unassigned: Assignment[]; blocked: Assignment[]; carryover: Assignment[] }>(null, result.error)
        }
        return createResult({
            unassigned: this.overlayList(result.data.unassigned),
            blocked: this.overlayList(result.data.blocked),
            carryover: this.overlayList(result.data.carryover),
        }, result.error)
    }

    async getRecommendedAssignments(workAreaId: string, limit?: number): Promise<ServiceResult<Assignment[]>> {
        const result = await this.simulated.getRecommendedAssignments(workAreaId, limit)
        if (!result.data) {
            return createResult([], result.error)
        }
        return createResult(this.overlayList(result.data), result.error)
    }

    async placeAssignment(placement: AssignmentPlacement): Promise<ServiceResult<Assignment>> {
        const current = await this.getCurrentAssignment(placement.assignmentId)
        if (!current) {
            return errorResult(PERSISTENCE_ERROR_CODES.SCHEMA_INVALID, 'Assignment not found.')
        }

        const next: Assignment = {
            ...current,
            currentWorkAreaId: placement.workAreaId,
            currentMemberBadges: placement.memberBadges,
            status: placement.mode === 'takeover' ? 'IN_PROGRESS' : 'ASSIGNED',
            statusNote: placement.traineePairing ? 'Trainee pairing staged' : 'Assignment placed',
            updatedAt: new Date().toISOString(),
        }

        const persisted = await this.persistMutation('place', current, next)
        if (!persisted.ok) {
            return errorResult(persisted.code, persisted.message)
        }

        this.overrides.set(next.id, next)
        return createResult(next)
    }

    async updateStatus(id: string, status: AssignmentStatus, note?: string): Promise<ServiceResult<Assignment>> {
        const current = await this.getCurrentAssignment(id)
        if (!current) {
            return errorResult(PERSISTENCE_ERROR_CODES.SCHEMA_INVALID, 'Assignment not found.')
        }

        const now = new Date().toISOString()
        const next: Assignment = {
            ...current,
            status,
            statusNote: note ?? current.statusNote,
            blockedAt: status === 'BLOCKED' ? now : current.blockedAt,
            startedAt: status === 'IN_PROGRESS' && !current.startedAt ? now : current.startedAt,
            completedAt: status === 'COMPLETE' && !current.completedAt ? now : current.completedAt,
            updatedAt: now,
        }

        const persisted = await this.persistMutation('status', current, next, note)
        if (!persisted.ok) {
            return errorResult(persisted.code, persisted.message)
        }

        this.overrides.set(next.id, next)
        return createResult(next)
    }

    async advanceStage(id: string): Promise<ServiceResult<Assignment>> {
        const current = await this.getCurrentAssignment(id)
        if (!current) {
            return errorResult(PERSISTENCE_ERROR_CODES.SCHEMA_INVALID, 'Assignment not found.')
        }

        const currentIndex = ASSIGNMENT_STAGES.findIndex(stage => stage.id === current.stage)
        if (currentIndex < 0 || currentIndex >= ASSIGNMENT_STAGES.length - 1) {
            return createResult(current)
        }

        const next: Assignment = {
            ...current,
            stage: ASSIGNMENT_STAGES[currentIndex + 1].id as Assignment['stage'],
            startedAt: current.startedAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }

        const persisted = await this.persistMutation('stage', current, next)
        if (!persisted.ok) {
            return errorResult(persisted.code, persisted.message)
        }

        this.overrides.set(next.id, next)
        return createResult(next)
    }

    async blockAssignment(id: string, reason: string): Promise<ServiceResult<Assignment>> {
        return this.updateStatus(id, 'BLOCKED', reason)
    }

    async unblockAssignment(id: string): Promise<ServiceResult<Assignment>> {
        return this.updateStatus(id, 'ASSIGNED', 'Unblocked')
    }

    async updateProgress(id: string, progressPercent: number, completedWires?: number): Promise<ServiceResult<Assignment>> {
        const current = await this.getCurrentAssignment(id)
        if (!current) {
            return errorResult(PERSISTENCE_ERROR_CODES.SCHEMA_INVALID, 'Assignment not found.')
        }

        const now = new Date().toISOString()
        const nextStatus = progressPercent >= 100 ? 'COMPLETE' : current.status
        const next: Assignment = {
            ...current,
            progressPercent,
            completedWires: completedWires ?? current.completedWires,
            status: nextStatus,
            completedAt: nextStatus === 'COMPLETE' && !current.completedAt ? now : current.completedAt,
            startedAt: current.startedAt ?? now,
            updatedAt: now,
        }

        const persisted = await this.persistMutation('progress', current, next)
        if (!persisted.ok) {
            return errorResult(persisted.code, persisted.message)
        }

        this.overrides.set(next.id, next)
        return createResult(next)
    }
}

let serviceInstance: IAssignmentStateService | null = null

export function getElectronAssignmentStateService(): IAssignmentStateService {
    if (!serviceInstance) {
        serviceInstance = new ElectronAssignmentStateService()
    }
    return serviceInstance
}
