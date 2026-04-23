import fs from 'node:fs'
import path from 'node:path'
import { resolveShareDirectorySync } from '@/lib/runtime/share-directory'

import type {
    ActivityAction,
    ActivityDocument,
    ActivityEntry,
    ActivityStats,
    ActivityTimelineFilterOptions,
} from '@/types/activity'

const MAX_ACTIVITY_ENTRIES = 2000

const SHIFT_DIRS = ['1st-shift', '2nd-shift', '3rd-shift'] as const

function getUsersDir(): string {
    return path.join(resolveShareDirectorySync(), 'users')
}

type ShiftDir = (typeof SHIFT_DIRS)[number]

function normalizeShiftDir(shift: string): ShiftDir | null {
    const raw = shift.trim().toLowerCase()
    if (!raw) return null

    if (raw === '1st' || raw === 'first' || raw === '1' || raw === '1st-shift') return '1st-shift'
    if (raw === '2nd' || raw === 'second' || raw === '2' || raw === '2nd-shift') return '2nd-shift'

    return null
}

function toApiShift(shiftDir: ShiftDir): string {
    return shiftDir.replace('-shift', '')
}

function resolveShiftDirForBadge(badge: string): ShiftDir | null {
    const usersDir = getUsersDir()
    for (const shiftDir of SHIFT_DIRS) {
        const userDir = path.join(usersDir, shiftDir, badge)
        if (fs.existsSync(userDir)) {
            return shiftDir
        }
    }
    return null
}

function resolveActivityPath(badge: string, shift?: string): string | null {
    const shiftDir = shift ? normalizeShiftDir(shift) : resolveShiftDirForBadge(badge)
    if (!shiftDir) return null
    return path.join(getUsersDir(), shiftDir, badge, 'activity.json')
}

function computeStats(activities: ActivityEntry[]): ActivityStats {
    const countByAction = {} as Record<ActivityAction, number>
    const countByResult: Record<string, number> = {}

    for (const entry of activities) {
        countByAction[entry.action] = (countByAction[entry.action] ?? 0) + 1
        const result = entry.result ?? 'pending'
        countByResult[result] = (countByResult[result] ?? 0) + 1
    }

    return {
        totalCount: activities.length,
        countByAction,
        countByResult,
        newestEntry: activities[0],
        oldestEntry: activities[activities.length - 1],
    }
}

export function buildEmptyActivityDocument(badge: string, shift: string): ActivityDocument {
    return {
        badge,
        shift,
        lastUpdated: new Date().toISOString(),
        activities: [],
        stats: {
            totalActions: 0,
            actionsToday: 0,
        },
    }
}

export async function readActivityDocumentFromShare(
    badge: string,
    shift?: string,
): Promise<ActivityDocument | null> {
    const activityPath = resolveActivityPath(badge, shift)
    if (!activityPath || !fs.existsSync(activityPath)) {
        return null
    }

    try {
        const raw = fs.readFileSync(activityPath, 'utf-8')
        return JSON.parse(raw) as ActivityDocument
    } catch {
        return null
    }
}

export async function upsertActivityDocumentInShare(
    badge: string,
    shift: string,
): Promise<ActivityDocument | null> {
    const shiftDir = normalizeShiftDir(shift)
    if (!shiftDir) return null

    const userDir = path.join(getUsersDir(), shiftDir, badge)
    const activityPath = path.join(userDir, 'activity.json')

    try {
        fs.mkdirSync(userDir, { recursive: true })

        if (fs.existsSync(activityPath)) {
            const raw = fs.readFileSync(activityPath, 'utf-8')
            return JSON.parse(raw) as ActivityDocument
        }

        const empty = buildEmptyActivityDocument(badge, toApiShift(shiftDir))
        fs.writeFileSync(activityPath, JSON.stringify(empty, null, 2) + '\n', 'utf-8')
        return empty
    } catch {
        return null
    }
}

export async function addActivityToShare(
    badge: string,
    shift: string,
    payload: {
        action: ActivityAction
        performedBy: string
        metadata?: Record<string, unknown>
        assignmentId?: string
        projectId?: string
        stage?: string
        comment?: string
        targetBadge?: string
        durationSeconds?: number
        result?: 'success' | 'failure' | 'pending'
        error?: string
    },
): Promise<ActivityEntry | null> {
    const doc = await upsertActivityDocumentInShare(badge, shift)
    if (!doc) return null

    const activityPath = resolveActivityPath(badge, shift)
    if (!activityPath) return null

    const entry: ActivityEntry = {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        action: payload.action,
        performedBy: payload.performedBy,
        metadata: payload.metadata ?? {},
        assignmentId: payload.assignmentId,
        projectId: payload.projectId,
        stage: payload.stage,
        comment: payload.comment,
        targetBadge: payload.targetBadge,
        durationSeconds: payload.durationSeconds,
        result: payload.result,
        error: payload.error,
    }

    doc.activities.unshift(entry)
    doc.activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Keep file size manageable for long-lived user histories.
    if (doc.activities.length > MAX_ACTIVITY_ENTRIES) {
        doc.activities = doc.activities.slice(0, MAX_ACTIVITY_ENTRIES)
    }

    doc.lastUpdated = new Date().toISOString()

    const today = new Date().toDateString()
    const actionsToday = doc.activities.filter((a) => new Date(a.timestamp).toDateString() === today).length

    doc.stats = {
        totalActions: doc.activities.length,
        actionsToday,
        lastActionTime: entry.timestamp,
    }

    try {
        fs.writeFileSync(activityPath, JSON.stringify(doc, null, 2) + '\n', 'utf-8')
        return entry
    } catch {
        return null
    }
}

export function applyActivityFilters(
    activities: ActivityEntry[],
    filters?: ActivityTimelineFilterOptions,
): ActivityEntry[] {
    if (!filters) return activities

    let output = [...activities]

    if (filters.actionTypes?.length) {
        output = output.filter((x) => filters.actionTypes!.includes(x.action))
    }

    if (filters.targetBadges?.length) {
        output = output.filter((x) => x.targetBadge && filters.targetBadges!.includes(x.targetBadge))
    }

    if (filters.assignmentIds?.length) {
        output = output.filter((x) => x.assignmentId && filters.assignmentIds!.includes(x.assignmentId))
    }

    if (filters.projectIds?.length) {
        output = output.filter((x) => x.projectId && filters.projectIds!.includes(x.projectId))
    }

    if (filters.resultStatus?.length) {
        output = output.filter((x) => filters.resultStatus!.includes(x.result ?? 'pending'))
    }

    if (filters.dateFrom) {
        const from = new Date(filters.dateFrom).getTime()
        output = output.filter((x) => new Date(x.timestamp).getTime() >= from)
    }

    if (filters.dateTo) {
        const to = new Date(filters.dateTo).getTime()
        output = output.filter((x) => new Date(x.timestamp).getTime() <= to)
    }

    if (filters.searchText) {
        const q = filters.searchText.toLowerCase()
        output = output.filter((x) => {
            const commentMatch = (x.comment ?? '').toLowerCase().includes(q)
            const metadataMatch = JSON.stringify(x.metadata ?? {}).toLowerCase().includes(q)
            return commentMatch || metadataMatch
        })
    }

    if (filters.reversed) {
        output = [...output].reverse()
    }

    if (typeof filters.offset === 'number' && filters.offset > 0) {
        output = output.slice(filters.offset)
    }

    if (typeof filters.limit === 'number' && filters.limit > 0) {
        output = output.slice(0, filters.limit)
    }

    return output
}

export async function getActivityStatsFromShare(
    badge: string,
    shift?: string,
): Promise<ActivityStats> {
    const doc = await readActivityDocumentFromShare(badge, shift)
    if (!doc || !doc.activities.length) {
        return {
            totalCount: 0,
            countByAction: {} as Record<ActivityAction, number>,
            countByResult: {},
        }
    }

    return computeStats(doc.activities)
}

/**
 * Delete a single activity entry by ID.
 * Returns true if found and removed, false otherwise.
 */
export async function deleteActivityEntryFromShare(
    badge: string,
    shift: string,
    activityId: string,
): Promise<boolean> {
    const activityPath = resolveActivityPath(badge, shift)
    if (!activityPath) return false

    const doc = await readActivityDocumentFromShare(badge, shift)
    if (!doc) return false

    const index = doc.activities.findIndex((a) => a.id === activityId)
    if (index === -1) return false

    doc.activities.splice(index, 1)
    doc.lastUpdated = new Date().toISOString()
    doc.stats = {
        totalActions: doc.activities.length,
        actionsToday: doc.activities.filter(
            (a) => new Date(a.timestamp).toDateString() === new Date().toDateString(),
        ).length,
        lastActionTime: doc.activities[0]?.timestamp ?? null,
    }

    try {
        fs.writeFileSync(activityPath, JSON.stringify(doc, null, 2) + '\n', 'utf-8')
        return true
    } catch {
        return false
    }
}
