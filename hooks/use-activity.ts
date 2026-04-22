/**
 * useActivity Hook
 *
 * Provides access to activity service with automatic fetching and caching
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import type {
    ActivityAction,
    ActivityEntry,
    ActivityMetadata,
    ActivityTimelineFilterOptions,
    ActivityStats,
} from '@/types/activity'
import { activityService } from '@/lib/services/activity-service'

interface UseActivityOptions {
    badge: string
    shift: string
    autoFetch?: boolean
    filters?: ActivityTimelineFilterOptions
}

interface UseActivityReturn {
    activities: ActivityEntry[]
    loading: boolean
    error: string | null
    stats: ActivityStats | null
    refresh: () => Promise<void>
    addComment: (comment: string, targetBadge?: string, assignmentId?: string) => Promise<void>
    logActivity: (payload: {
        action: ActivityAction
        metadata?: ActivityMetadata
        assignmentId?: string
        projectId?: string
        stage?: string
        comment?: string
        targetBadge?: string
        durationSeconds?: number
        result?: 'success' | 'failure' | 'pending'
        error?: string
        performedBy?: string
    }) => Promise<void>
}

export function useActivity({
    badge,
    shift,
    autoFetch = true,
    filters,
}: UseActivityOptions): UseActivityReturn {
    const [activities, setActivities] = useState<ActivityEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [stats, setStats] = useState<ActivityStats | null>(null)

    const refresh = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const [activityList, activityStats] = await Promise.all([
                activityService.getActivity(badge, shift, filters),
                activityService.getActivityStats(badge, shift),
            ])
            setActivities(activityList)
            setStats(activityStats)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load activity')
        } finally {
            setLoading(false)
        }
    }, [badge, shift, filters])

    const addComment = useCallback(
        async (comment: string, targetBadge?: string, assignmentId?: string) => {
            try {
                await activityService.addComment(badge, shift, comment, targetBadge, assignmentId)
                await refresh()
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to add comment')
            }
        },
        [badge, shift, refresh]
    )

    const logActivity = useCallback(
        async (payload: {
            action: ActivityAction
            metadata?: ActivityMetadata
            assignmentId?: string
            projectId?: string
            stage?: string
            comment?: string
            targetBadge?: string
            durationSeconds?: number
            result?: 'success' | 'failure' | 'pending'
            error?: string
            performedBy?: string
        }) => {
            try {
                await activityService.logAction(badge, shift, payload)
                await refresh()
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to log activity')
            }
        },
        [badge, shift, refresh]
    )

    useEffect(() => {
        if (autoFetch) {
            void refresh()
        }
    }, [autoFetch, refresh])

    return { activities, loading, error, stats, refresh, addComment, logActivity }
}
