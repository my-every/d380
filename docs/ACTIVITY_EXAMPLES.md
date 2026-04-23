/**
 * ACTIVITY SYSTEM - INTEGRATION EXAMPLES
 *
 * This file demonstrates how to integrate activity tracking throughout the app.
 * Use these patterns as templates for actual implementation.
 */

// ============================================================================
// EXAMPLE 1: Logging Activity in Assignment Workflow
// ============================================================================

// components/assignment/assignment-executor.tsx
import { mockActivityService } from '@/lib/services/activity-service'
import type { ActivityMetadata } from '@/types/activity'

async function handleAssignmentStart(
  assignmentId: string,
  projectId: string,
  userBadge: string,
  userShift: string
) {
  try {
    // Do actual assignment work
    const startTime = Date.now()
    
    // Log activity right after starting
    await mockActivityService.addActivity(
      userBadge,
      userShift,
      'assignment_started',
      {
        assignmentId,
        projectId,
        timestamp: new Date().toISOString(),
      }
    )
  } catch (err) {
    console.error('Failed to log assignment start:', err)
  }
}

async function handleAssignmentComplete(
  assignmentId: string,
  projectId: string,
  stage: string,
  userBadge: string,
  userShift: string,
  durationSeconds: number
) {
  try {
    // Perform validation, save to file system, etc.
    const result = await validateAndSaveAssignment(assignmentId)

    // Log completion with metadata
    const metadata: ActivityMetadata = {
      projectId,
      stage,
      durationSeconds,
      completionTime: new Date().toISOString(),
    }

    if (result.hasIssues) {
      metadata.warnings = result.issues
    }

    await mockActivityService.addActivity(
      userBadge,
      userShift,
      'assignment_completed',
      metadata
    )
  } catch (err) {
    // Log failure
    await mockActivityService.addActivity(
      userBadge,
      userShift,
      'assignment_blocked',
      {
        assignmentId,
        projectId,
        error: err.message,
        errorCode: err.code,
      }
    )
  }
}

// ============================================================================
// EXAMPLE 2: Logging Comments with Mentions
// ============================================================================

// components/assignment/comment-form.tsx
import { useActivity } from '@/hooks/use-activity'

interface CommentFormProps {
  assignmentId: string
  userBadge: string
  userShift: string
}

export function CommentForm({ assignmentId, userBadge, userShift }: CommentFormProps) {
  const { addComment } = useActivity({
    badge: userBadge,
    shift: userShift,
    autoFetch: false, // Component just logs, doesn't fetch
  })

  async function handleCommentSubmit(text: string, mentionedBadge?: string) {
    // Submit comment to system
    const comment = await saveComment({
      text,
      assignmentId,
      mentionedBadge,
    })

    // Log activity
    await addComment(text, mentionedBadge, assignmentId)
  }

  return (
    <form onSubmit={e => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      const text = formData.get('comment') as string
      const mentioned = formData.get('mention') as string | undefined
      handleCommentSubmit(text, mentioned)
    }}>
      <textarea name="comment" placeholder="Add comment..." />
      <input name="mention" placeholder="Mention badge (optional)" />
      <button type="submit">Post Comment</button>
    </form>
  )
}

// ============================================================================
// EXAMPLE 3: Activity Widget in Dashboard
// ============================================================================

// components/profile/dashboards/assembler-dashboard.tsx
import { ActivityTimelineWidget } from '@/components/activity'

export function AssemblerDashboard({ badgeNumber }: { badgeNumber: string }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Assembler Workspace</h2>
        <p className="text-muted-foreground">Badge #{badgeNumber}</p>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Assignment details */}
        <div className="lg:col-span-2 space-y-4">
          <CurrentAssignmentCard badgeNumber={badgeNumber} />
          <AssignmentMetricsCard badgeNumber={badgeNumber} />
        </div>

        {/* Right: Activity sidebar */}
        <aside className="space-y-4">
          {/* Recent Activity Widget */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <ActivityTimelineWidget
              badge={badgeNumber}
              shift="1st"
              maxItems={10}
            />
          </div>

          {/* Quick stats */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-semibold text-sm mb-2">Today's Stats</h4>
            <div className="space-y-1 text-xs">
              <div>Assignments: 3/5</div>
              <div>Completed: 2</div>
              <div>Time worked: 6h 42m</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ============================================================================
// EXAMPLE 4: Full Activity Page View
// ============================================================================

// app/activity/[badge]/page.tsx
'use client'

import { use } from 'react'
import { ActivityTimelinePageView } from '@/components/activity'
import { useSession } from '@/hooks/use-session'

interface ActivityPageProps {
  params: Promise<{ badge: string }>
}

export default function ActivityPage({ params }: ActivityPageProps) {
  const { badge } = use(params)
  const { user } = useSession()

  if (!user) return <div>Loading...</div>

  return (
    <main className="container py-8">
      <ActivityTimelinePageView
        badge={badge}
        shift={user.currentShift}
        onActivityClick={(activity) => {
          console.log('Clicked activity:', activity)
          // Handle activity clicks: navigate to assignment, show details, etc.
        }}
      />
    </main>
  )
}

// ============================================================================
// EXAMPLE 5: Activity in Aside Panel
// ============================================================================

// components/layout/activity-panel.tsx
import { ActivityTimelinePanel } from '@/components/activity'
import { useSession } from '@/hooks/use-session'

export function ActivityPanel() {
  const { user } = useSession()

  if (!user) return null

  return (
    <aside className="w-80 border-l border-border bg-muted/20 overflow-hidden flex flex-col">
      <ActivityTimelinePanel
        badge={user.badge}
        shift={user.currentShift}
        onActivityClick={(activity) => {
          // Open activity detail or navigate to related assignment
          window.open(`/assignments/${activity.assignmentId}`)
        }}
      />
    </aside>
  )
}

// Usage in page layout:
// <PageLayout aside={<ActivityPanel />}>
//   <div>Main content here</div>
// </PageLayout>

// ============================================================================
// EXAMPLE 6: Advanced Filtering with useActivity Hook
// ============================================================================

// components/activity/activity-report.tsx
import { useActivity } from '@/hooks/use-activity'
import { useMemo } from 'react'

export function ActivityReport({ badge, shift }: { badge: string; shift: string }) {
  // Fetch only completions from last 7 days
  const { activities, stats } = useActivity({
    badge,
    shift,
    filters: {
      actionTypes: ['assignment_completed', 'stage_completed'],
      dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      limit: 100,
    },
  })

  // Calculate productivity metrics
  const metrics = useMemo(() => {
    const totalDuration = activities.reduce((sum, a) => sum + (a.durationSeconds || 0), 0)
    const avgDuration = activities.length > 0 ? totalDuration / activities.length : 0

    return {
      completedCount: activities.length,
      totalHours: Math.round(totalDuration / 3600 * 10) / 10,
      avgMinutes: Math.round(avgDuration / 60),
    }
  }, [activities])

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">7-Day Productivity Report</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Tasks Completed</div>
          <div className="text-2xl font-bold">{metrics.completedCount}</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Total Hours</div>
          <div className="text-2xl font-bold">{metrics.totalHours}h</div>
        </div>
        <div className="p-4 border rounded">
          <div className="text-sm text-muted-foreground">Avg Duration</div>
          <div className="text-2xl font-bold">{metrics.avgMinutes}m</div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EXAMPLE 7: Activity Actions During State Changes
// ============================================================================

// lib/handlers/assignment-handlers.ts

export async function onAssignmentPaused(
  assignmentId: string,
  reason: string,
  userBadge: string,
  userShift: string,
  elapsedSeconds: number
) {
  await mockActivityService.addActivity(
    userBadge,
    userShift,
    'assignment_paused',
    {
      assignmentId,
      reason,
      elapsedSeconds,
    }
  )
}

export async function onAssignmentResumed(
  assignmentId: string,
  userBadge: string,
  userShift: string
) {
  await mockActivityService.addActivity(
    userBadge,
    userShift,
    'assignment_resumed',
    {
      assignmentId,
      resumedAt: new Date().toISOString(),
    }
  )
}

export async function onHandoffInitiated(
  assignmentId: string,
  tobadge: string,
  userBadge: string,
  userShift: string
) {
  await mockActivityService.addActivity(
    userBadge,
    userShift,
    'handoff_initiated',
    {
      assignmentId,
      handoffTo: toBalance,
      timestamp: new Date().toISOString(),
    }
  )
}

export async function onQualityCheckPassed(
  assignmentId: string,
  checkedByBadge: string,
  userShift: string
) {
  await mockActivityService.addActivity(
    checkedByBadge,
    userShift,
    'quality_checked',
    {
      assignmentId,
      result: 'pass',
    }
  )
}

// ============================================================================
// EXAMPLE 8: Exporting Activity Data
// ============================================================================

// lib/services/activity-export.ts
import { mockActivityService } from '@/lib/services/activity-service'

export async function exportActivityAsCSV(badge: string, shift: string) {
  const doc = await mockActivityService.getActivityDocument(badge, shift)
  if (!doc) return null

  const headers = ['ID', 'Timestamp', 'Action', 'Duration', 'Result', 'Notes']
  const rows = doc.activities.map(a => [
    a.id,
    a.timestamp,
    a.action,
    a.durationSeconds ? `${a.durationSeconds}s` : '',
    a.result || '',
    a.comment || JSON.stringify(a.metadata),
  ])

  const csv = [
    headers.join(','),
    ...rows.map(r => r.map(v => `"${v}"`).join(',')),
  ].join('\n')

  return csv
}

// ============================================================================
// EXAMPLE 9: Real-Time Activity Subscription (Future: Electron)
// ============================================================================

// hooks/use-activity-realtime.ts (Pseudo-code for future implementation)
/*
export function useActivityRealtime(badge: string, shift: string) {
  const [activities, setActivities] = useState<ActivityEntry[]>([])
  
  useEffect(() => {
    // Watch Share/users/{shift}/{badge}/activity.json for changes
    const unsubscribe = window.electron.watch(
      `Share/users/${shift}/${badge}/activity.json`,
      () => {
        mockActivityService.getActivity(badge, shift).then(setActivities)
      }
    )
    
    return unsubscribe
  }, [badge, shift])
  
  return { activities }
}
*/

// ============================================================================
// NOTES FOR DEVELOPERS
// ============================================================================

/*
1. WHEN TO LOG ACTIVITY
   - Whenever a user action completes (assignment done, comment posted, etc.)
   - On state changes (paused, resumed, blocked)
   - On workflow transitions (shift started, handoff received)
   - Errors and blockers

2. ACTIVITY PLACEMENT
   - Log at point of action (in handlers, after successful save)
   - Use try/catch; activity failures should not block main flow
   - Include relevant metadata (assignment ID, duration, project, etc.)

3. PERFORMANCE
   - Activity writes are async; don't wait for them
   - In Electron phase: batch writes (debounce ~5 seconds)
   - Mock service is instant; real FS service will have I/O latency

4. TESTING
   - MockActivityService returns sample data; easy to test with
   - Test timeline component with mock activities
   - Verify filters work (date range, action type, search)

5. LATER FEATURES
   - Activity retention policies (archive after 30/90 days?)
   - Bulk export (all users, date range)
   - Real-time sync via file watcher
   - Activity notifications/alerts

6. SECURITY
   - Activities only readable by user + admins
   - No sensitive data in activity.json (passwords, credit cards, etc.)
   - Audit trail is immutable (only appended, never deleted during shift)
*/
