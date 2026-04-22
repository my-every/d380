/**
 * ActivityTimeline Component
 *
 * Reusable, flexible component for rendering activity feeds
 * Supports filtering, search, pagination, nested activities, and commenting
 */

'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CurvedArrow } from '@/components/dialog/curved-arrow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PhotoUploadGallery, type PhotoGalleryItem } from '@/components/activity/photo-upload-gallery'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import type { ActivityEntry, ActivityAction, ActivityTimelineFilterOptions, ActivityComment } from '@/types/activity'
import {
    MessageSquare,
    CheckCircle,
    Clock,
    AlertCircle,
    Zap,
    User,
    Filter,
    Search,
    ChevronDown,
    ChevronRight,
    Reply,
    Send,
    Heart,
    ThumbsUp,
    Trash2,
} from 'lucide-react'

interface ActivityTimelineProps {
    activities: ActivityEntry[]
    loading?: boolean
    error?: string | null
    maxItems?: number
    compact?: boolean
    showStats?: boolean
    allowFiltering?: boolean
    allowSearch?: boolean
    showComments?: boolean
    showNestedActivities?: boolean
    onRefresh?: () => Promise<void>
    onFilterChange?: (filters: ActivityTimelineFilterOptions) => void
    onActivityClick?: (activity: ActivityEntry) => void
    onCommentAdd?: (activityId: string, comment: string) => Promise<void>
    onCommentDelete?: (activityId: string, commentId: string) => Promise<void>
    currentBadge?: string
    className?: string
    containerClassName?: string
}

interface CommentInteractionState {
    liked: boolean
    likedCount: number
    thumbsUp: boolean
    thumbsUpCount: number
}

interface ActivityUserPreview {
    badge: string
    name: string
    title?: string
    role?: string
    department?: string
    shift?: string
    avatarUrl?: string
}

/**
 * Get icon and color for activity action type with border styling
 */
function getActivityIcon(action: ActivityAction) {
    switch (action) {
        case 'COMPLETED':
            return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-300' }
        case 'ASSIGNED':
        case 'STARTED':
            return { icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-300' }
        case 'BLOCKED':
            return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-300' }
        case 'UNBLOCKED':
        case 'REOPENED':
            return { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-300' }
        case 'REASSIGNED':
            return { icon: User, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-300' }
        case 'STAGE_CHANGED':
            return { icon: Clock, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-300' }
        case 'CANCELLED':
            return { icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-300' }
        case 'SETTINGS_CHANGED':
            return { icon: User, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-300' }
        default:
            return { icon: User, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-300' }
    }
}

/**
 * Get human-readable label for action
 */
function getActionLabel(action: ActivityAction, _metadata?: Record<string, unknown>): string {
    const labels: Record<ActivityAction, string> = {
        ASSIGNED: 'Assigned',
        REASSIGNED: 'Reassigned',
        STARTED: 'Started',
        BLOCKED: 'Blocked',
        UNBLOCKED: 'Unblocked',
        STAGE_CHANGED: 'Stage Changed',
        COMPLETED: 'Completed',
        REOPENED: 'Reopened',
        CANCELLED: 'Cancelled',
        SETTINGS_CHANGED: 'Settings Changed',
    }
    return labels[action] ?? action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w+/g, w => w.toLowerCase())
}

/**
 * Get detailed description for action based on metadata
 */
function getActionDescription(action: ActivityAction, metadata?: Record<string, unknown>): string | null {
    if (!metadata) return null

    switch (action) {
        case 'ASSIGNED':
        case 'REASSIGNED':
            return typeof metadata.assigneeName === 'string' ? `Assigned to ${metadata.assigneeName}` : null
        case 'COMPLETED':
            return typeof metadata.durationSeconds === 'number' ? `Completed in ${Math.round(metadata.durationSeconds / 60)}m` : null
        case 'BLOCKED':
            return typeof metadata.reason === 'string' ? metadata.reason : typeof metadata.blockReason === 'string' ? metadata.blockReason : null
        case 'STAGE_CHANGED':
            return typeof metadata.toStage === 'string'
                ? `→ ${metadata.toStage}`
                : null
        case 'SETTINGS_CHANGED':
            return typeof metadata.description === 'string' ? metadata.description : null
        default:
            return null
    }
}

/**
 * Get result badge styling
 */
function getResultBadge(result?: 'success' | 'failure' | 'pending') {
    if (!result) return null
    const styles = {
        success: 'bg-green-100 text-green-800',
        failure: 'bg-red-100 text-red-800',
        pending: 'bg-yellow-100 text-yellow-800',
    }
    return (
        <Badge variant="outline" className={cn('text-xs px-2 py-0.5', styles[result])}>
            {result}
        </Badge>
    )
}

function extractPhotoItems(metadata?: Record<string, any>): PhotoGalleryItem[] {
    if (!metadata) return []

    const candidates = [
        ...(Array.isArray(metadata.photos) ? metadata.photos : []),
        ...(Array.isArray(metadata.photoUrls) ? metadata.photoUrls : []),
        ...(Array.isArray(metadata.images) ? metadata.images : []),
        ...(metadata.photoUrl ? [metadata.photoUrl] : []),
    ]

    const parsed: PhotoGalleryItem[] = []

    candidates.forEach((entry, index) => {
        if (typeof entry === 'string') {
            parsed.push({
                id: `photo-${index}-${entry}`,
                url: entry,
                uploadedAt: new Date().toISOString(),
                tags: [],
            })
            return
        }

        if (!entry || typeof entry !== 'object') return

        const url = entry.url || entry.src || entry.path || entry.photoUrl
        if (!url || typeof url !== 'string') return

        const rawTags = Array.isArray(entry.tags) ? entry.tags.filter((tag: unknown): tag is string => typeof tag === 'string') : []

        parsed.push({
            id: entry.id || `photo-${index}-${url}`,
            url,
            name: typeof entry.name === 'string' ? entry.name : typeof entry.fileName === 'string' ? entry.fileName : undefined,
            uploadedAt:
                typeof entry.uploadedAt === 'string'
                    ? entry.uploadedAt
                    : typeof entry.timestamp === 'string'
                        ? entry.timestamp
                        : typeof entry.createdAt === 'string'
                            ? entry.createdAt
                            : new Date().toISOString(),
            tags: rawTags,
        })
    })

    return parsed
}

export function ActivityTimeline({
    activities,
    loading = false,
    error = null,
    maxItems = 50,
    compact = false,
    showStats = true,
    allowFiltering = false,
    allowSearch = false,
    showComments = true,
    showNestedActivities = true,
    onRefresh,
    onFilterChange,
    onActivityClick,
    onCommentAdd,
    onCommentDelete,
    currentBadge,
    className,
    containerClassName,
}: ActivityTimelineProps) {
    const EXPAND_SPRING = {
        type: 'spring' as const,
        stiffness: 340,
        damping: 28,
        mass: 0.7,
    }

    const [searchTerm, setSearchTerm] = useState('')
    const [filterMode, setFilterMode] = useState<ActivityAction | 'all'>('all')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set())
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
    const [commentingActivityId, setCommentingActivityId] = useState<string | null>(null)
    const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set())
    const [deletingComments, setDeletingComments] = useState<Set<string>>(new Set())
    const [commentInteractions, setCommentInteractions] = useState<Record<string, CommentInteractionState>>({})
    const [userPreviews, setUserPreviews] = useState<Record<string, ActivityUserPreview>>({})
    const [activityPhotos, setActivityPhotos] = useState<Record<string, PhotoGalleryItem[]>>({})

    useEffect(() => {
        const badges = Array.from(
            new Set(
                activities
                    .map((a) => a.performedBy)
                    .filter((badge): badge is string => Boolean(badge))
            )
        )

        const missing = badges.filter((badge) => !userPreviews[badge])
        if (missing.length === 0) return

        void (async () => {
            const loadedEntries = await Promise.all(
                missing.map(async (badge) => {
                    try {
                        const response = await fetch(`/api/users/${badge}/profile`)
                        if (!response.ok) return null
                        const payload = await response.json()
                        const p = payload?.profile
                        if (!p) return null

                        const preview: ActivityUserPreview = {
                            badge,
                            name: p.preferredName || p.legalName || `Badge #${badge}`,
                            title: p.title || undefined,
                            role: p.role || undefined,
                            department: p.department || undefined,
                            shift: p.currentShift || undefined,
                            avatarUrl: p.avatarPath || p.avatarUrl || undefined,
                        }
                        return [badge, preview] as const
                    } catch {
                        return null
                    }
                })
            )

            const next: Record<string, ActivityUserPreview> = {}
            for (const entry of loadedEntries) {
                if (!entry) continue
                next[entry[0]] = entry[1]
            }

            if (Object.keys(next).length > 0) {
                setUserPreviews((prev) => ({ ...prev, ...next }))
            }
        })()
    }, [activities, userPreviews])

    useEffect(() => {
        setActivityPhotos((prev) => {
            const next = { ...prev }
            for (const activity of activities) {
                if (!next[activity.id]) {
                    next[activity.id] = extractPhotoItems(activity.metadata)
                }
            }
            return next
        })
    }, [activities])

    const getAvatarInitials = useCallback((name?: string, badge?: string) => {
        if (!name) return badge?.slice(-2) ?? '?'
        return name
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }, [])

    const normalizePreviewValue = useCallback((value?: string) => {
        if (!value) return undefined
        const cleaned = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
        if (!cleaned) return undefined
        return cleaned.replace(/\b\w/g, (char) => char.toUpperCase())
    }, [])

    const toggleActivityExpanded = useCallback((activityId: string) => {
        setExpandedActivities(prev => {
            const next = new Set(prev)
            if (next.has(activityId)) {
                next.delete(activityId)
            } else {
                next.add(activityId)
            }
            return next
        })
    }, [])

    const handleCommentSubmit = useCallback(async (activityId: string) => {
        const commentText = commentInputs[activityId]?.trim()
        if (!commentText || !onCommentAdd) return

        setLoadingComments(prev => new Set([...prev, activityId]))
        try {
            await onCommentAdd(activityId, commentText)
            setCommentInputs(prev => {
                const next = { ...prev }
                delete next[activityId]
                return next
            })
            setCommentingActivityId(null)
        } catch (err) {
            console.error('Failed to add comment:', err)
        } finally {
            setLoadingComments(prev => {
                const next = new Set(prev)
                next.delete(activityId)
                return next
            })
        }
    }, [commentInputs, onCommentAdd])

    const handleCommentDelete = useCallback(async (activityId: string, commentId: string) => {
        if (!onCommentDelete) return

        setDeletingComments(prev => new Set([...prev, commentId]))
        try {
            await onCommentDelete(activityId, commentId)
        } catch (err) {
            console.error('Failed to delete comment:', err)
        } finally {
            setDeletingComments(prev => {
                const next = new Set(prev)
                next.delete(commentId)
                return next
            })
        }
    }, [onCommentDelete])

    const handleToggleLike = useCallback((commentId: string) => {
        setCommentInteractions(prev => {
            const current = prev[commentId] ?? {
                liked: false,
                likedCount: 0,
                thumbsUp: false,
                thumbsUpCount: 0,
            }

            const nextLiked = !current.liked
            return {
                ...prev,
                [commentId]: {
                    ...current,
                    liked: nextLiked,
                    likedCount: Math.max(0, current.likedCount + (nextLiked ? 1 : -1)),
                },
            }
        })
    }, [])

    const handleToggleThumbsUp = useCallback((commentId: string) => {
        setCommentInteractions(prev => {
            const current = prev[commentId] ?? {
                liked: false,
                likedCount: 0,
                thumbsUp: false,
                thumbsUpCount: 0,
            }

            const nextThumbsUp = !current.thumbsUp
            return {
                ...prev,
                [commentId]: {
                    ...current,
                    thumbsUp: nextThumbsUp,
                    thumbsUpCount: Math.max(0, current.thumbsUpCount + (nextThumbsUp ? 1 : -1)),
                },
            }
        })
    }, [])

    const filteredActivities = useMemo(() => {
        let results = [...activities]

        if (filterMode !== 'all') {
            results = results.filter(a => a.action === filterMode)
        }

        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase()
            results = results.filter(
                a =>
                    a.comment?.toLowerCase().includes(search) ||
                    getActionLabel(a.action).toLowerCase().includes(search) ||
                    a.assignmentId?.toLowerCase().includes(search) ||
                    a.targetBadge?.includes(search)
            )
        }

        if (sortOrder === 'asc') {
            results.reverse()
        }

        return results.slice(0, maxItems)
    }, [activities, filterMode, searchTerm, sortOrder, maxItems])

    const stats = useMemo(() => {
        if (!showStats) return null
        const actionCounts: Record<string, number> = {}
        activities.forEach(a => {
            actionCounts[a.action] = (actionCounts[a.action] || 0) + 1
        })
        return {
            total: activities.length,
            topAction: Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0],
        }
    }, [activities, showStats])

    const actionTypes = useMemo(() => {
        const types = new Set(activities.map(a => a.action))
        return Array.from(types).sort()
    }, [activities])

    return (
        <div className={cn('flex flex-col  space-y-4 sm:space-y-5 p-4 ', className)}>
            {/* Header with controls */}
            <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start justify-between gap-2 sm:items-center">
                    <h3 className="text-base font-semibold sm:text-lg">Activity Timeline</h3>
                    {onRefresh && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRefresh}
                            disabled={loading}
                            className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
                        >
                            {loading ? 'Loading...' : 'Refresh'}
                        </Button>
                    )}
                </div>

                {showStats && stats && (
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground sm:gap-3 sm:text-sm">
                        <span>{stats.total} total</span>
                        {stats.topAction && (
                            <span>
                                Most: <span className="font-medium">{getActionLabel(stats.topAction[0] as ActivityAction)}</span> ({stats.topAction[1]})
                            </span>
                        )}
                    </div>
                )}

                {(allowSearch || allowFiltering) && (
                    <div className="flex flex-wrap items-center gap-2">
                        {allowSearch && (
                            <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search activities..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="h-9 pl-9 text-sm"
                                />
                            </div>
                        )}

                        {allowFiltering && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-9 gap-1.5 px-3 text-sm shrink-0">
                                        <Filter className="h-3.5 w-3.5" />
                                        {filterMode === 'all' ? 'All' : getActionLabel(filterMode)}
                                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    <DropdownMenuLabel className="text-sm">Filter by action</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setFilterMode('all')
                                            onFilterChange?.({ actionTypes: undefined })
                                        }}
                                        className={cn('text-sm', filterMode === 'all' && 'bg-background')}
                                    >
                                        All Actions
                                    </DropdownMenuItem>
                                    {actionTypes.map(type => {
                                        const { icon: TypeIcon, color } = getActivityIcon(type as ActivityAction)
                                        return (
                                            <DropdownMenuItem
                                                key={type}
                                                onClick={() => {
                                                    setFilterMode(type as ActivityAction)
                                                    onFilterChange?.({ actionTypes: [type as ActivityAction] })
                                                }}
                                                className={cn('text-sm gap-2', filterMode === type && 'bg-background')}
                                            >
                                                <TypeIcon className={cn('h-3.5 w-3.5', color)} />
                                                {getActionLabel(type as ActivityAction)}
                                            </DropdownMenuItem>
                                        )
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        <ToggleGroup
                            type="single"
                            value={sortOrder}
                            onValueChange={(value) => {
                                if (value === 'asc' || value === 'desc') {
                                    setSortOrder(value)
                                }
                            }}
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            aria-label="Sort activities"
                        >
                            <ToggleGroupItem value="desc" className="text-xs px-2.5 h-9">
                                Newest
                            </ToggleGroupItem>
                            <ToggleGroupItem value="asc" className="text-xs px-2.5 h-9">
                                Oldest
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                )}
            </div>

            {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                    {error}
                </div>
            )}

            {!loading && filteredActivities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="rounded-full bg-muted/60 p-4 mb-4">
                        {searchTerm || filterMode !== 'all' ? (
                            <Search className="h-6 w-6 text-muted-foreground/60" />
                        ) : (
                            <Clock className="h-6 w-6 text-muted-foreground/60" />
                        )}
                    </div>
                    <h4 className="text-sm font-medium text-foreground mb-1">
                        {searchTerm || filterMode !== 'all' ? 'No matching activities' : 'No activity yet'}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-[220px]">
                        {searchTerm
                            ? 'Try adjusting your search or removing filters.'
                            : filterMode !== 'all'
                                ? `No ${getActionLabel(filterMode).toLowerCase()} activities found.`
                                : 'Activities will appear here as actions are performed.'}
                    </p>
                    {(searchTerm || filterMode !== 'all') && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3 text-xs h-7"
                            onClick={() => { setSearchTerm(''); setFilterMode('all'); onFilterChange?.({ actionTypes: undefined }) }}
                        >
                            Clear filters
                        </Button>
                    )}
                </div>
            )}

            {/* Timeline */}
            <div className={cn('flex flex-col space-y-3 p-3 sm:p-5 ', containerClassName)}>
                {filteredActivities.map((activity, idx) => {
                    const { icon: Icon, color, bg, border } = getActivityIcon(activity.action)
                    const isLast = idx === filteredActivities.length - 1
                    const isExpanded = expandedActivities.has(activity.id)
                    const hasRelated = showNestedActivities && activity.relatedActivityIds && activity.relatedActivityIds.length > 0
                    const hasComments = showComments && (activity.comments || onCommentAdd)
                    const isExpandable = Boolean(hasRelated || hasComments)
                    const performer = activity.performedBy ? userPreviews[activity.performedBy] : undefined
                    const performerName = performer?.name ?? (activity.performedBy ? `Badge #${activity.performedBy}` : undefined)
                    const performerTitle = normalizePreviewValue(performer?.title)
                    const performerRole = normalizePreviewValue(performer?.role)
                    const performerDepartment = normalizePreviewValue(performer?.department)
                    const performerShift = normalizePreviewValue(performer?.shift)
                    const photos = activityPhotos[activity.id] ?? []
                    const showPhotoGallery = photos.length > 0

                    return (
                        <div key={activity.id} className="relative space-y-2">
                            <div
                                className={cn(
                                    'group relative -ml-1 cursor-pointer rounded-lg bg-background p-2.5 pl-7 transition-colors hover:bg-accent/60 sm:-ml-2 sm:p-3 sm:pl-4 border border-border',
                                    onActivityClick && 'hover:bg-accent/60'
                                )}
                                onClick={() => {
                                    if (isExpandable) {
                                        toggleActivityExpanded(activity.id)
                                    }
                                    onActivityClick?.(activity)
                                }}
                            >

                                <div className={cn('absolute -left-5 top-1.5 rounded-full border-2 p-1 sm:-left-5.5 sm:p-1.5', bg, border)}>
                                    <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', color)} />

                                </div>


                                <div className="flex min-w-0 flex-col space-y-1 pl-1 sm:pl-2">
                                    {/* Primary line with title, description, and expand button */}
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex-1 min-w-0 gap-2 flex-col flex">
                                            <div className="flex items-center gap-1 flex-wrap">


                                                {/* Badges row */}
                                                <div className="flex flex-wrap items-center gap-2">

                                                    <span className={cn('text-sm font-medium sm:text-base min-w-max', compact ? 'line-clamp-1' : '')}>
                                                        {getActionLabel(activity.action, activity.metadata)}
                                                    </span>
                                                    {activity.assignmentId && (
                                                        <div className="text-xs text-muted-foreground border border-1-muted-foreground/70  rounded-md text-center font-mono px-1.5 py-0.5">
                                                            {activity.assignmentId}
                                                        </div>
                                                    )}
                                                    {activity.durationSeconds && activity.durationSeconds > 60 && (
                                                        <span className="text-[11px] italic text-muted-foreground sm:text-xs">
                                                            {Math.round(activity.durationSeconds / 60)}m
                                                        </span>
                                                    )}
                                                </div>

                                                {getActionDescription(activity.action, activity.metadata) && (
                                                    <span className="text-[11px] italic text-muted-foreground sm:text-xs">
                                                        {getActionDescription(activity.action, activity.metadata)}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Secondary info: time + badge mentions */}
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm min-w-max">
                                                <time dateTime={activity.timestamp}>
                                                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                                </time>

                                                {activity.performedBy && activity.performedBy !== (activity as any).badge && (
                                                    <TooltipProvider delayDuration={150}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="inline-flex max-w-[12rem] items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-1.5 py-0.5 transition-colors hover:bg-background"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Avatar className="h-5 w-5">
                                                                        <AvatarImage src={performer?.avatarUrl} alt={performerName} />
                                                                        <AvatarFallback className="text-[10px] font-semibold">
                                                                            {getAvatarInitials(performer?.name, activity.performedBy)}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="truncate opacity-85">{performer?.name ?? `#${activity.performedBy}`}</span>
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" sideOffset={8} align="start" className="w-72 max-w-[90vw] p-3">
                                                                <div className="space-y-2">
                                                                    <div className="space-y-0.5">
                                                                        <div className="text-sm font-semibold leading-none text-foreground">
                                                                            {performerName}
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground">Badge #{activity.performedBy}</div>
                                                                    </div>
                                                                    {performerTitle && (
                                                                        <div className="text-xs text-muted-foreground">{performerTitle}</div>
                                                                    )}
                                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                                        {performerRole && (
                                                                            <Badge variant="outline" className="text-[10px]">
                                                                                {performerRole}
                                                                            </Badge>
                                                                        )}
                                                                        {performerDepartment && (
                                                                            <Badge variant="outline" className="text-[10px]">
                                                                                {performerDepartment}
                                                                            </Badge>
                                                                        )}
                                                                        {performerShift && (
                                                                            <Badge variant="outline" className="text-[10px]">
                                                                                {performerShift}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>

                                            {showPhotoGallery && (
                                                <PhotoUploadGallery
                                                    images={photos}
                                                    onChange={(nextPhotos) => {
                                                        setActivityPhotos((prev) => ({
                                                            ...prev,
                                                            [activity.id]: nextPhotos,
                                                        }))
                                                    }}
                                                    className="pt-1"
                                                />
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 self-end sm:self-auto">
                                            {activity.result && getResultBadge(activity.result)}

                                            {(hasRelated || hasComments) && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 flex-shrink-0 p-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        toggleActivityExpanded(activity.id)
                                                    }}
                                                >
                                                    <ChevronRight
                                                        className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')}
                                                    />
                                                </Button>
                                            )}


                                        </div>


                                    </div>


                                    {/* Comment text if present */}
                                    {activity.comment && !compact && (
                                        <p className="line-clamp-2 rounded-lg bg-card/80 p-3 text-sm text-foreground sm:p-4 flex 
                                        ">{activity.comment}</p>
                                    )}

                                </div>
                            </div>


                            {/* Expanded content */}
                            <AnimatePresence initial={false}>
                                {isExpanded && (
                                    <>
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                                            exit={{ opacity: 0, y: -6, height: 0 }}
                                            transition={EXPAND_SPRING}
                                            className="mb-2 flex flex-col space-y-3 overflow-hidden rounded-xl border pr-2 sm:pr-4"
                                        >
                                            {/* Related Activities */}
                                            {hasRelated && (
                                                <div className="rounded bg-muted/30 py-2 pl-3 sm:pl-4 border-l-2 border-dashed border-muted-foreground/30">
                                                    <h4 className="mb-2 text-xs font-medium text-muted-foreground">🔗 Related Processes:</h4>
                                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                                        {activity.relatedActivityIds!.map(relatedId => {
                                                            const relatedActivity = activities.find(a => a.id === relatedId)
                                                            if (!relatedActivity) return null
                                                            return (
                                                                <div key={relatedId} className="rounded border border-border/50 bg-background p-2 text-xs transition-colors hover:border-border">
                                                                    <div className="font-medium">{getActionLabel(relatedActivity.action)}</div>
                                                                    <div className="text-muted-foreground">
                                                                        {formatDistanceToNow(new Date(relatedActivity.timestamp), { addSuffix: true })}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>

                                                </div>
                                            )}




                                            {/* Comments & Responses Section */}
                                            {hasComments && (
                                                <div className="relative">
                                                    <div className="absolute -left-8 top-0 flex items-center sm:-left-9" aria-hidden="true">

                                                        <div className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground sm:h-7 sm:w-7">
                                                            <Reply className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                        </div>
                                                    </div>
                                                    <div className="rounded py-3 pl-3 sm:pl-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="text-xs font-semibold text-foreground">Comments & Responses</h4>
                                                            {commentingActivityId === activity.id && (
                                                                <Badge variant="secondary" className="text-[10px] animate-pulse">
                                                                    ✍️ Replying...
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Existing comments */}
                                                        {activity.comments && activity.comments.length > 0 && (
                                                            <div className="mb-4 max-h-48 space-y-2 overflow-y-auto pr-1 sm:pr-2">
                                                                {activity.comments.map((comment) => (
                                                                    <div key={comment.id} className="rounded-lg border border-border/60 bg-background p-2.5 text-xs transition-colors hover:border-border sm:p-3">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="font-semibold text-foreground">Badge #{comment.author}</div>
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="text-[10px] text-muted-foreground">
                                                                                    {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                                                                                </span>
                                                                                {onCommentDelete && currentBadge === comment.author && (
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                                                                                        title="Delete comment"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            void handleCommentDelete(activity.id, comment.id)
                                                                                        }}
                                                                                        disabled={deletingComments.has(comment.id)}
                                                                                    >
                                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-foreground/90 leading-relaxed">{comment.text}</div>
                                                                        <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                                                                            <motion.button
                                                                                type="button"
                                                                                whileTap={{ scale: 0.9 }}
                                                                                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] transition-colors hover:bg-muted"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    handleToggleLike(comment.id)
                                                                                }}
                                                                            >
                                                                                <motion.div
                                                                                    animate={{
                                                                                        scale: commentInteractions[comment.id]?.liked ? [1, 1.25, 1] : 1,
                                                                                    }}
                                                                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                                                >
                                                                                    <Heart
                                                                                        className={cn(
                                                                                            'h-3.5 w-3.5 transition-colors',
                                                                                            commentInteractions[comment.id]?.liked
                                                                                                ? 'fill-red-500 text-red-500'
                                                                                                : 'text-muted-foreground'
                                                                                        )}
                                                                                    />
                                                                                </motion.div>
                                                                                <span className="text-muted-foreground">{commentInteractions[comment.id]?.likedCount ?? 0}</span>
                                                                            </motion.button>

                                                                            <motion.button
                                                                                type="button"
                                                                                whileTap={{ scale: 0.9 }}
                                                                                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] transition-colors hover:bg-muted"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    handleToggleThumbsUp(comment.id)
                                                                                }}
                                                                            >
                                                                                <motion.div
                                                                                    animate={{
                                                                                        scale: commentInteractions[comment.id]?.thumbsUp ? [1, 1.2, 1] : 1,
                                                                                    }}
                                                                                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                                                                                >
                                                                                    <ThumbsUp
                                                                                        className={cn(
                                                                                            'h-3.5 w-3.5 transition-colors',
                                                                                            commentInteractions[comment.id]?.thumbsUp
                                                                                                ? 'fill-blue-500 text-blue-500'
                                                                                                : 'text-muted-foreground'
                                                                                        )}
                                                                                    />
                                                                                </motion.div>
                                                                                <span className="text-muted-foreground">{commentInteractions[comment.id]?.thumbsUpCount ?? 0}</span>
                                                                            </motion.button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Response/Add Comment Section */}
                                                        {onCommentAdd && (
                                                            <div className="space-y-2 border-t border-dashed border-muted-foreground/20 pt-2">
                                                                <div className="text-xs text-muted-foreground font-medium">
                                                                    {commentingActivityId === activity.id ? '✍️ Reply' : '↳ Add Response'}
                                                                </div>
                                                                <div className={cn(
                                                                    'flex gap-1.5 rounded-xl border p-2 transition-colors',
                                                                    commentingActivityId === activity.id
                                                                        ? 'border-blue-300 bg-blue-50/30'
                                                                        : 'border-border/50 bg-background hover:border-border'
                                                                )}
                                                                    onClick={() => setCommentingActivityId(activity.id)}>
                                                                    <Input
                                                                        placeholder="Type your response..."
                                                                        value={commentInputs[activity.id] || ''}
                                                                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [activity.id]: e.target.value }))}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && e.ctrlKey) {
                                                                                handleCommentSubmit(activity.id)
                                                                            }
                                                                            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
                                                                                e.preventDefault()
                                                                                handleCommentSubmit(activity.id)
                                                                            }
                                                                        }}
                                                                        className="h-9 flex-1 text-xs"
                                                                        disabled={loadingComments.has(activity.id)}
                                                                        onFocus={() => setCommentingActivityId(activity.id)}
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleCommentSubmit(activity.id)}
                                                                        disabled={!commentInputs[activity.id]?.trim() || loadingComments.has(activity.id)}
                                                                        className="h-9 px-2"
                                                                        variant={commentInputs[activity.id]?.trim() ? 'default' : 'outline'}
                                                                    >
                                                                        {loadingComments.has(activity.id) ? (
                                                                            <span className="animate-spin">⏳</span>
                                                                        ) : (
                                                                            <Send className="h-3.5 w-3.5" />
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                                {commentingActivityId === activity.id && !loadingComments.has(activity.id) && (
                                                                    <div className="text-[10px] text-muted-foreground">
                                                                        Press Enter to send, Ctrl+Enter for new line
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    )
                })}
            </div>

            {filteredActivities.length >= maxItems && (
                <div className="text-sm text-muted-foreground text-center py-2 border-t">
                    Showing {filteredActivities.length} of {activities.length} activities
                </div>
            )}
        </div>
    )
}

export default ActivityTimeline
