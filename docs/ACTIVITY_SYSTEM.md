# Activity Tracking System - Implementation Strategy

## Overview

The activity tracking system is a **file-system first, local-first** approach to tracking all user actions in D380. Every action — assignments, completions, comments, status changes — is recorded as an `ActivityEntry` in JSON files stored at:

```
Share/users/{shift}/{badge}/activity.json
```

This ensures:
- ✅ All activity is auditable and human-readable
- ✅ Activity survives across shifts and sessions
- ✅ No database dependency
- ✅ Shift-isolated data storage
- ✅ Easy integration with Electron file-system APIs later

---

## Data Structure

### Activity File Location

```
Share/users/
  1st-shift/
    75241/
      profile.json       (existing)
      activity.json      (NEW - all activities for this user this shift)
    75242/
      profile.json
      activity.json
  2nd-shift/
    ... (same structure)
```

### activity.json Schema

```json
{
  "badge": "75241",
  "shift": "1st",
  "lastUpdated": "2026-04-12T14:23:45.123Z",
  "activities": [
    {
      "id": "act_1712962625123_abc23",
      "timestamp": "2026-04-12T14:23:45.123Z",
      "action": "comment_added",
      "comment": "Completed wire list review",
      "targetBadge": "75242",
      "performedBy": "75241",
      "metadata": {
        "assignmentId": "ASG-001",
        "projectId": "PRJ-2024-001"
      }
    },
    {
      "id": "act_1712962500000_xyz99",
      "timestamp": "2026-04-12T14:08:20.000Z",
      "action": "assignment_completed",
      "assignmentId": "ASG-001",
      "performedBy": "75241",
      "durationSeconds": 1200,
      "result": "success",
      "metadata": {
        "projectId": "PRJ-2024-001",
        "stage": "wire_list_review"
      }
    }
  ],
  "stats": {
    "totalActions": 45,
    "actionsToday": 12,
    "lastActionTime": "2026-04-12T14:23:45.123Z"
  }
}
```

---

## Types & Interfaces

### ActivityAction Types

```typescript
type ActivityAction =
  | 'assignment_created'
  | 'assignment_started'
  | 'assignment_paused'
  | 'assignment_resumed'
  | 'assignment_completed'
  | 'assignment_blocked'
  | 'stage_completed'
  | 'comment_added'
  | 'status_changed'
  | 'handoff_initiated'
  | 'handoff_received'
  | 'photo_uploaded'
  | 'document_scanned'
  | 'quality_checked'
  | 'issue_reported'
  | 'skill_performed'
  | 'shift_started'
  | 'shift_ended'
  | 'break_started'
  | 'break_ended'
```

All types are defined in [`types/activity.ts`](../../types/activity.ts)

---

## Architecture

### Layers

1. **Types Layer** (`types/activity.ts`)
   - `ActivityEntry` — single activity record
   - `ActivityDocument` — the full .json file structure
   - `ActivityAction` — enum of all action types
   - `ActivityTimelineFilterOptions` — filtering/search interface

2. **Service Layer** (`lib/services/activity-service.ts`)
   - `IActivityService` — interface contract
   - `MockActivityService` — UI-first mock implementation
   - Later replaced with Electron/file-system backend

3. **Hook Layer** (`hooks/use-activity.ts`)
   - `useActivity()` — React hook for data fetching + state management
   - Handles auto-refresh, filtering, caching

4. **Component Layer** (`components/activity/`)
   - `ActivityTimeline` — core reusable display component
   - `ActivityTimelineFilter` — container with data fetching
   - `ActivityTimelineWidget`, `ActivityTimelinePanel`, `ActivityTimelinePageView` — context-specific wrappers

---

## Usage Patterns

### 1. **Recording Activity (From Anywhere)**

Activity should be logged **right where it happens**. Example: in an assignment completion handler:

```typescript
// components/assignment/assignment-executor.tsx
import { mockActivityService } from '@/lib/services/activity-service'

async function handleAssignmentComplete(assignmentId: string) {
  const startTime = Date.now()
  
  try {
    // ... perform assignment work ...
    await saveAssignment(assignmentId)
    
    // Log the completion
    await mockActivityService.addActivity(
      user.badge,
      user.currentShift,
      'assignment_completed',
      {
        assignmentId,
        projectId: assignment.projectId,
        stage: assignment.stage,
        durationSeconds: Math.floor((Date.now() - startTime) / 1000),
      }
    )
  } catch (err) {
    await mockActivityService.addActivity(
      user.badge,
      user.currentShift,
      'assignment_blocked',
      {
        assignmentId,
        error: err.message,
      }
    )
  }
}
```

### 2. **Adding Comments**

```typescript
// components/assignment/assignment-detail.tsx
import { useActivity } from '@/hooks/use-activity'

function AssignmentDetail({ assignmentId }) {
  const { addComment } = useActivity({
    badge: user.badge,
    shift: user.currentShift,
  })
  
  async function handleCommentSubmit(text: string, targetBadge?: string) {
    await addComment(text, targetBadge, assignmentId)
  }
  
  return (
    <CommentForm onSubmit={handleCommentSubmit} />
  )
}
```

### 3. **Displaying Activity as Widget**

For dashboards, profiles, or sidebar panels:

```typescript
// components/profile/profile-activity-widget.tsx
import { ActivityTimelineWidget } from '@/components/activity/activity-timeline-filter'

export function ProfileActivityWidget({ badge, shift }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Recent Activity</h3>
      <ActivityTimelineWidget badge={badge} shift={shift} />
    </div>
  )
}
```

### 4. **Displaying Activity as Panel**

For use in aside sidebars:

```typescript
// components/layout/activity-aside.tsx
import { ActivityTimelinePanel } from '@/components/activity/activity-timeline-filter'

export function ActivityAside({ badge, shift }) {
  return (
    <aside className="w-80 border-l p-4 bg-muted/20">
      <ActivityTimelinePanel badge={badge} shift={shift} />
    </aside>
  )
}
```

### 5. **Full Page Activity View**

```typescript
// app/activity/[badge]/page.tsx
'use client'

import { use } from 'react'
import { ActivityTimelinePageView } from '@/components/activity/activity-timeline-filter'

export default function ActivityPage({ params }) {
  const { badge } = use(params)
  const user = useSession()
  
  return (
    <PageLayout title={`Activity for Badge #${badge}`}>
      <ActivityTimelinePageView badge={badge} shift={user.currentShift} />
    </PageLayout>
  )
}
```

### 6. **Filtering Activities**

```typescript
// Hook with filters
const { activities } = useActivity({
  badge: '75241',
  shift: '1st',
  filters: {
    actionTypes: ['comment_added', 'assignment_completed'],
    dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // last 24h
    limit: 20,
  },
})

// Or using the component with interactive filtering
<ActivityTimelineFilter
  badge="75241"
  shift="1st"
  allowFiltering={true}
  allowSearch={true}
  maxItems={50}
/>
```

---

## Integration Checklist

### Immediate (UI-First Phase)

- [x] Define `ActivityEntry`, `ActivityDocument`, `ActivityAction` types in `types/activity.ts`
- [x] Create `MockActivityService` with sample data in `lib/services/activity-service.ts`
- [x] Create `useActivity()` hook with fetching, filtering, caching
- [x] Create `ActivityTimeline` core display component
- [x] Create `ActivityTimelineFilter` container with hooks
- [x] Create context-specific variants: Widget, Panel, PageView
- [ ] Integrate into profile page: show recent activity
- [ ] Integrate into dashboard: activity widget per role
- [ ] Integrate into assignment flows: log completion/blocking
- [ ] Integrate into comment system: log comments with mentions
- [ ] Test with sample data

### Phase: Electron Integration

- [ ] Replace `MockActivityService` with `ElectronActivityService`
- [ ] Implement file-system read/write to `Share/users/{shift}/{badge}/activity.json`
- [ ] Add file watcher for real-time activity sync
- [ ] Implement batch writes (debounce activity writes)
- [ ] Add validation/schema enforcement on write

### Phase: Advanced Features

- [ ] Activity export (CSV, JSON per user/date range)
- [ ] Activity analytics dashboard (trends, patterns)
- [ ] Bulk activity search across all users/shifts
- [ ] Activity notifications (real-time for mentions, completions)
- [ ] Activity audit log with retention policies

---

## Example: Integration into Profile Dashboard

```typescript
// components/profile/dashboards/assembler-dashboard.tsx
'use client'

import { ProfileHeader } from '@/components/profile/profile-header'
import { ActivityTimelineWidget } from '@/components/activity/activity-timeline-filter'

interface AssemblerDashboardProps {
  badgeNumber: string
}

export function AssemblerDashboard({ badgeNumber }: AssemblerDashboardProps) {
  return (
    <div className="space-y-6">
      <ProfileHeader badgeNumber={badgeNumber} isEditable={false} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main workspace */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">Current Assignment</h3>
            {/* Assignment details here */}
          </div>
        </div>

        {/* Activity sidebar */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-semibold mb-4">Your Activity</h3>
          <ActivityTimelineWidget badge={badgeNumber} shift="1st" maxItems={8} />
        </div>
      </div>
    </div>
  )
}
```

---

## Key Design Decisions

1. **File-Based Storage**: Each user/shift has one `activity.json` file
   - Rationale: Easy to back up, version control, and integrate with Electron

2. **Shift-Isolated**: Activities separated by shift (1st, 2nd)
   - Rationale: Maintains data hygiene, clear audit trails per shift

3. **Mock Service Now, Real Impl Later**: Start with mock, swap for Electron backend
   - Rationale: Allows UI-first development, no infrastructure bloat

4. **Flexible Actions**: Enum-based action types covers common ops + extensible
   - Rationale: Can add new action types to enum without breaking existing data

5. **Reusable Component Pattern**: `ActivityTimeline` + filter wrapper + contextual variants
   - Rationale: DRY, adaptable to pages/widgets/panels/popups

---

## File Paths Reference

| File | Purpose |
| --- | --- |
| `types/activity.ts` | Type definitions |
| `lib/services/activity-service.ts` | Service layer (mock + interface) |
| `hooks/use-activity.ts` | React hook |
| `components/activity/activity-timeline.tsx` | Core timeline component |
| `components/activity/activity-timeline-filter.tsx` | Container + variants |
| `Share/users/{shift}/{badge}/activity.json` | Data file location |

---

## Next Steps

1. Export ActivityTimeline + variants from component index
2. Integrate demo into profile page or dashboard
3. Test with mock data
4. Add activity logging to real workflows (assignments, comments)
5. Monitor performance with large activity lists
6. Design Electron file-system backend when ready
