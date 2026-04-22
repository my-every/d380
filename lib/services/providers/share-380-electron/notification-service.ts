/**
 * Electron Notification Service
 *
 * Persists notifications to:
 *   Share/380/State/notifications.json
 *
 * Falls back to simulated seed data when the file doesn't exist yet.
 */

import { getNotificationsDataSet } from '@/lib/view-models/d380-notifications'
import type {
    INotificationService,
    Notification,
    NotificationFilter,
    NotificationStats,
    NotificationSeverity,
    NotificationCategory,
} from '../../contracts/notification-service'
import type { ServiceResult, PaginatedResult } from '../../contracts'
import { getWorkspaceFs } from './workspace-fs'

const NOTIFICATIONS_PATH = '380/State/notifications.json'

function createResult<T>(data: T): ServiceResult<T> {
    return { data, error: null, source: 'electron', timestamp: new Date().toISOString() }
}

function seedNotification(record: ReturnType<typeof getNotificationsDataSet>['notifications'][number]): Notification {
    return {
        id: record.id,
        title: record.sheetName
            ? `${record.eventType.replace(/_/g, ' ')} - ${record.sheetName}`
            : `${record.eventType.replace(/_/g, ' ')} - ${record.pdNumber}`,
        message: record.message,
        severity: record.severity as NotificationSeverity,
        category: record.eventType as NotificationCategory,
        projectId: record.projectId,
        pdNumber: record.pdNumber,
        sheetName: record.sheetName,
        memberBadge: null,
        linkedRoute: record.linkedRoute,
        linkedActionLabel: record.linkedActionLabel,
        read: record.isRead,
        dismissed: false,
        createdAt: record.createdAt,
        readAt: record.isRead ? record.createdAt : null,
        dataMode: 'electron',
    }
}

export class ElectronNotificationService implements INotificationService {
    private cache: Notification[] | null = null
    private dirty = false
    private fs = getWorkspaceFs()

    private async load(): Promise<Notification[]> {
        if (this.cache) return this.cache

        try {
            const raw = await this.fs.readText(NOTIFICATIONS_PATH)
            if (raw) {
                this.cache = JSON.parse(raw) as Notification[]
                return this.cache
            }
        } catch {
            // File missing or malformed — seed from view-model
        }

        this.cache = getNotificationsDataSet().notifications.map(seedNotification)
        this.dirty = true
        await this.persist()
        return this.cache
    }

    private async persist(): Promise<void> {
        if (!this.dirty || !this.cache) return
        try {
            await this.fs.ensureDir('380/State')
            await this.fs.writeText(NOTIFICATIONS_PATH, JSON.stringify(this.cache, null, 2))
            this.dirty = false
        } catch {
            // Persist failure is non-fatal
        }
    }

    async getNotifications(): Promise<ServiceResult<Notification[]>> {
        return createResult(await this.load())
    }

    async getFilteredNotifications(
        filter?: NotificationFilter,
        page = 1,
        pageSize = 20,
    ): Promise<ServiceResult<PaginatedResult<Notification>>> {
        let items = await this.load()

        if (filter) {
            if (filter.severity) {
                const sev = Array.isArray(filter.severity) ? filter.severity : [filter.severity]
                items = items.filter(n => sev.includes(n.severity))
            }
            if (filter.category) {
                const cats = Array.isArray(filter.category) ? filter.category : [filter.category]
                items = items.filter(n => cats.includes(n.category))
            }
            if (filter.projectId) items = items.filter(n => n.projectId === filter.projectId)
            if (filter.unreadOnly) items = items.filter(n => !n.read)
            if (filter.activOnly) items = items.filter(n => !n.dismissed)
            if (filter.since) items = items.filter(n => n.createdAt >= filter.since!)
        }

        items = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        const total = items.length
        const start = (page - 1) * pageSize
        const page_items = items.slice(start, start + pageSize)

        return createResult({ items: page_items, total, page, pageSize, hasMore: start + page_items.length < total })
    }

    async getNotificationById(id: string): Promise<ServiceResult<Notification | null>> {
        const all = await this.load()
        return createResult(all.find(n => n.id === id) ?? null)
    }

    async getRecentNotifications(limit = 5): Promise<ServiceResult<Notification[]>> {
        const all = await this.load()
        const recent = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
        return createResult(recent)
    }

    async getStats(): Promise<ServiceResult<NotificationStats>> {
        const all = await this.load()
        return createResult({
            total: all.length,
            unread: all.filter(n => !n.read).length,
            bySeverity: {
                info: all.filter(n => n.severity === 'info').length,
                success: all.filter(n => n.severity === 'success').length,
                warning: all.filter(n => n.severity === 'warning').length,
                error: all.filter(n => n.severity === 'error').length,
            },
            byCategory: all.reduce((acc, n) => {
                acc[n.category] = (acc[n.category] || 0) + 1
                return acc
            }, {} as Record<NotificationCategory, number>),
        })
    }

    async markAsRead(id: string): Promise<ServiceResult<Notification>> {
        const all = await this.load()
        const idx = all.findIndex(n => n.id === id)
        if (idx === -1) return { data: null, error: 'Notification not found', source: 'electron', timestamp: new Date().toISOString() }
        all[idx] = { ...all[idx], read: true, readAt: new Date().toISOString() }
        this.dirty = true
        await this.persist()
        return createResult(all[idx])
    }

    async markAllAsRead(): Promise<ServiceResult<void>> {
        const all = await this.load()
        const now = new Date().toISOString()
        all.forEach((n, i) => { all[i] = { ...n, read: true, readAt: now } })
        this.dirty = true
        await this.persist()
        return createResult(undefined)
    }

    async dismiss(id: string): Promise<ServiceResult<Notification>> {
        const all = await this.load()
        const idx = all.findIndex(n => n.id === id)
        if (idx === -1) return { data: null, error: 'Notification not found', source: 'electron', timestamp: new Date().toISOString() }
        all[idx] = { ...all[idx], dismissed: true }
        this.dirty = true
        await this.persist()
        return createResult(all[idx])
    }

    async dismissAll(): Promise<ServiceResult<void>> {
        const all = await this.load()
        all.forEach((n, i) => { all[i] = { ...n, dismissed: true } })
        this.dirty = true
        await this.persist()
        return createResult(undefined)
    }

    async create(notification: Omit<Notification, 'id' | 'createdAt' | 'read' | 'dismissed' | 'readAt' | 'dataMode'>): Promise<ServiceResult<Notification>> {
        const all = await this.load()
        const newNotification: Notification = {
            ...notification,
            id: `notif-${Date.now()}`,
            createdAt: new Date().toISOString(),
            read: false,
            dismissed: false,
            readAt: null,
            dataMode: 'electron',
        }
        all.unshift(newNotification)
        this.dirty = true
        await this.persist()
        return createResult(newNotification)
    }
}
