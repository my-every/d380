/**
 * Electron Workspace Service
 *
 * Persists workspace session state to:
 *   Share/380/State/current-session.json
 *
 * Falls back to in-memory state when the bridge is unavailable
 * or the file doesn't exist yet.
 */

import type {
    IWorkspaceService,
    WorkspaceSession,
    WorkspaceSummaryMetrics,
    ShiftSnapshot,
} from '../../contracts/workspace-service'
import type { ServiceResult, ShiftId } from '../../contracts'
import { getWorkspaceFs } from './workspace-fs'

const SESSION_PATH = '380/State/current-session.json'
const SNAPSHOTS_DIR = '380/State/shift-snapshots'

function createResult<T>(data: T): ServiceResult<T> {
    return { data, error: null, source: 'electron', timestamp: new Date().toISOString() }
}

function defaultSession(): WorkspaceSession {
    return {
        operatingDate: new Date().toISOString().split('T')[0],
        activeShift: 'FIRST',
        userBadge: null,
        userName: null,
        sessionStartedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        dataMode: 'electron',
    }
}

export class ElectronWorkspaceService implements IWorkspaceService {
    private sessionCache: WorkspaceSession | null = null
    private fs = getWorkspaceFs()

    private async readSession(): Promise<WorkspaceSession> {
        if (this.sessionCache) return this.sessionCache

        try {
            const raw = await this.fs.readText(SESSION_PATH)
            if (raw) {
                this.sessionCache = { ...JSON.parse(raw), dataMode: 'electron' }
                return this.sessionCache!
            }
        } catch {
            // File doesn't exist or is malformed — use default
        }

        this.sessionCache = defaultSession()
        return this.sessionCache
    }

    private async persistSession(session: WorkspaceSession): Promise<void> {
        this.sessionCache = session
        try {
            await this.fs.ensureDir('380/State')
            await this.fs.writeText(SESSION_PATH, JSON.stringify(session, null, 2))
        } catch {
            // Persist failure is non-fatal — session is still in memory
        }
    }

    async getSession(): Promise<ServiceResult<WorkspaceSession>> {
        const session = await this.readSession()
        return createResult({ ...session })
    }

    async setOperatingDate(date: string): Promise<ServiceResult<WorkspaceSession>> {
        const session = await this.readSession()
        const updated: WorkspaceSession = {
            ...session,
            operatingDate: date,
            lastActivityAt: new Date().toISOString(),
        }
        await this.persistSession(updated)
        return createResult({ ...updated })
    }

    async setActiveShift(shift: ShiftId): Promise<ServiceResult<WorkspaceSession>> {
        const session = await this.readSession()
        const updated: WorkspaceSession = {
            ...session,
            activeShift: shift,
            lastActivityAt: new Date().toISOString(),
        }
        await this.persistSession(updated)
        return createResult({ ...updated })
    }

    async setSessionUser(badge: string): Promise<ServiceResult<WorkspaceSession>> {
        const session = await this.readSession()
        const updated: WorkspaceSession = {
            ...session,
            userBadge: badge,
            userName: `User ${badge}`,
            lastActivityAt: new Date().toISOString(),
        }
        await this.persistSession(updated)
        return createResult({ ...updated })
    }

    async getSummaryMetrics(): Promise<ServiceResult<WorkspaceSummaryMetrics>> {
        // Metrics are aggregated from other services — for now return zeros.
        // Real aggregation will be added when cross-service queries are supported.
        return createResult({
            activeProjectCount: 0,
            inProgressSheetCount: 0,
            blockedAssignmentCount: 0,
            wiresCompletedToday: 0,
            staffedWorkAreaCount: 0,
            teamMembersOnShift: 0,
        })
    }

    async getShiftSnapshots(date: string): Promise<ServiceResult<ShiftSnapshot[]>> {
        try {
            const path = `${SNAPSHOTS_DIR}/${date}.json`
            const raw = await this.fs.readText(path)
            if (raw) {
                return createResult(JSON.parse(raw) as ShiftSnapshot[])
            }
        } catch {
            // No snapshots for this date
        }

        const session = await this.readSession()
        return createResult([
            { shift: 'FIRST' as ShiftId, shiftLabel: '1st Shift', operatingDate: session.operatingDate, memberCount: 0, completedSheets: 0, wiresCompleted: 0, averageEfficiency: 0, blockedCount: 0 },
            { shift: 'SECOND' as ShiftId, shiftLabel: '2nd Shift', operatingDate: session.operatingDate, memberCount: 0, completedSheets: 0, wiresCompleted: 0, averageEfficiency: 0, blockedCount: 0 },
        ])
    }

    async clearSession(): Promise<ServiceResult<void>> {
        this.sessionCache = null
        try {
            await this.fs.delete(SESSION_PATH)
        } catch {
            // Delete failure is non-fatal
        }
        return createResult(undefined)
    }
}
