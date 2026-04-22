/**
 * ActivityTimelineFilter Component
 *
 * Container component that wraps ActivityTimeline with hooks and filter management
 * Can be used in multiple contexts: page, widget, aside panel, popup
 * Handles the data fetching and filter state
 */

'use client'

import React, { useState, useCallback } from 'react'
import { useActivity } from '@/hooks/use-activity'
import { ActivityTimeline } from './activity-timeline'
import type { ActivityTimelineFilterOptions, ActivityEntry } from '@/types/activity'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface ActivityTimelineFilterProps {
    /** Badge number to load activities for */
    badge: string

    /** Shift (usually 1st or 2nd) */
    shift: string

    /** Maximum items to display */
    maxItems?: number

    /** Use compact display (minimal details) */
    compact?: boolean

    /** Show statistics */
    showStats?: boolean

    /** Enable filtering UI */
    allowFiltering?: boolean

    /** Enable search UI */
    allowSearch?: boolean

    /** Initial filters */
    initialFilters?: ActivityTimelineFilterOptions

    /** Callback when activity is clicked */
    onActivityClick?: (activity: ActivityEntry) => void

    /** Custom classifier */
    className?: string
}

/**
 * Wrapper component that manages activity fetching and display
 * Provides built-in filtering, search, and refresh capabilities
 */
export function ActivityTimelineFilter({
    badge,
    shift,
    maxItems = 50,
    compact = false,
    showStats = true,
    allowFiltering = true,
    allowSearch = true,
    initialFilters,
    onActivityClick,
    className,
}: ActivityTimelineFilterProps) {
    const [filters, setFilters] = useState<ActivityTimelineFilterOptions | undefined>(initialFilters)

    const { activities, loading, error, refresh } = useActivity({
        badge,
        shift,
        autoFetch: true,
        filters,
    })

    const handleFilterChange = useCallback((newFilters: ActivityTimelineFilterOptions) => {
        setFilters(newFilters)
    }, [])

    const handleCommentAdd = useCallback(async (activityId: string, comment: string) => {
        try {
            const response = await fetch(`/api/activity/${badge}/details`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activityId,
                    shift,
                    comment,
                    author: badge,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to add comment')
            }

            // Refresh to get updated activity with new comment
            await refresh()
        } catch (err) {
            console.error('Failed to add comment:', err)
            throw err
        }
    }, [badge, shift, refresh])

    const handleCommentDelete = useCallback(async (activityId: string, commentId: string) => {
        try {
            const response = await fetch(`/api/activity/${badge}/details`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activityId,
                    shift,
                    commentId,
                    requester: badge,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to delete comment')
            }

            await refresh()
        } catch (err) {
            console.error('Failed to delete comment:', err)
            throw err
        }
    }, [badge, shift, refresh])

    return (
        <div className={className}>
            <ActivityTimeline
                activities={activities}
                loading={loading}
                error={error}
                maxItems={maxItems}
                compact={compact}
                showStats={showStats}
                allowFiltering={allowFiltering}
                allowSearch={allowSearch}
                showComments={true}
                showNestedActivities={true}
                onRefresh={refresh}
                onFilterChange={handleFilterChange}
                onActivityClick={onActivityClick}
                onCommentAdd={handleCommentAdd}
                onCommentDelete={handleCommentDelete}
                currentBadge={badge}
            />
        </div>
    )
}

/**
 * Widget variant: compact display for dashboards/panels
 * Fixed height, scrollable, minimal details
 */
export function ActivityTimelineWidget({
    badge,
    shift,
    maxItems = 10,
    onActivityClick,
}: {
    badge: string
    shift: string
    maxItems?: number
    onActivityClick?: (activity: ActivityEntry) => void
}) {
    return (
        <ActivityTimelineFilter
            badge={badge}
            shift={shift}
            maxItems={maxItems}
            compact={true}
            showStats={false}
            allowFiltering={false}
            allowSearch={false}
            onActivityClick={onActivityClick}
            className="h-64 overflow-y-auto border rounded-lg p-3 bg-card"
        />
    )
}

/**
 * Panel variant: for use in aside panels or sidebars
 * Vertical layout optimized for narrow widths
 */
export function ActivityTimelinePanel({
    badge,
    shift,
    onActivityClick,
}: Pick<ActivityTimelineFilterProps, 'badge' | 'shift' | 'onActivityClick'>) {
    return (
        <ActivityTimelineFilter
            badge={badge}
            shift={shift}
            maxItems={20}
            compact={false}
            showStats={true}
            allowFiltering={true}
            allowSearch={true}
            onActivityClick={onActivityClick}
            className="space-y-4 p-4 max-h-screen overflow-y-auto"
        />
    )
}

/**
 * Page variant: full-featured display for dedicated activity pages
 * All features enabled, responsive grid layout
 */
export function ActivityTimelinePageView({
    badge,
    shift,
    onActivityClick,
}: Pick<ActivityTimelineFilterProps, 'badge' | 'shift' | 'onActivityClick'>) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Activity Timeline</h2>
                <p className="text-sm text-muted-foreground">
                    All actions and comments for Badge #{badge}
                </p>
            </div>

            <ActivityTimelineFilter
                badge={badge}
                shift={shift}
                maxItems={100}
                compact={false}
                showStats={true}
                allowFiltering={true}
                allowSearch={true}
                onActivityClick={onActivityClick}
                className="space-y-4"
            />
        </div>
    )
}

export default ActivityTimelineFilter
