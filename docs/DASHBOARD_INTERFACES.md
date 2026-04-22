# Dashboard — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces, types, and type aliases related to the D380 dashboard system — hero slides, metrics, performers, shift comparisons, and project/assignment previews.

---

## Table of Contents

1. [Type Aliases](#1-type-aliases)
2. [Summary Metrics](#2-summary-metrics)
3. [Performers](#3-performers)
4. [Notifications](#4-notifications)
5. [Shift Snapshots](#5-shift-snapshots)
6. [Project & Assignment Previews](#6-project--assignment-previews)
7. [Hero Slides](#7-hero-slides)
8. [Data Set & View Model](#8-data-set--view-model)

---

## 1. Type Aliases

**File:** `types/d380-dashboard.ts`

```ts
type DashboardHeroSlideType =
  | 'WELCOME'           | 'TOP_PERFORMERS'     | 'TOP_PERFORMER'
  | 'HOLIDAY'           | 'ANNOUNCEMENT'       | 'SHIFT_COMPARISON'
  | 'SCHEDULE_PROGRESS'

type DashboardRiskLevel = 'healthy' | 'watch' | 'late'
type DashboardNotificationSeverity = NotificationSeverity  // re-export from d380-notifications
type DashboardMetricTone = 'neutral' | 'positive' | 'attention'
type DashboardProjectStage = 'Upcoming' | 'Conlay' | 'Conasy' | 'Test' | 'PWR Check' | 'BIQ'
type DashboardAssignmentStatus = 'queued' | 'active' | 'watch'
```

---

## 2. Summary Metrics

**File:** `types/d380-dashboard.ts`

### `DashboardSummaryMetric`

```ts
interface DashboardSummaryMetric {
  id: string
  label: string
  value: string
  detail: string
  tone: DashboardMetricTone
}
```

---

## 3. Performers

**File:** `types/d380-dashboard.ts`

### `DashboardPerformer`

```ts
interface DashboardPerformer {
  id: string
  name: string
  initials: string
  role: string
  shift: ShiftOptionId
  station: string
  completedAssignments: number
  qualityScore: number
  throughputDelta: number
  streakDays: number
  spotlight: string
}
```

---

## 4. Notifications

**File:** `types/d380-dashboard.ts`

### `DashboardNotification`

```ts
interface DashboardNotification {
  id: string
  title: string
  body: string
  severity: DashboardNotificationSeverity
  category: string
  timestampLabel: string
  actionLabel?: string
  projectId?: string
  linkedRoute?: string
}
```

---

## 5. Shift Snapshots

**File:** `types/d380-dashboard.ts`

### `DashboardShiftSnapshot`

```ts
interface DashboardShiftSnapshot {
  shift: ShiftOptionId
  label: string
  activeProjects: number
  completedAssignments: number
  avgCycleHours: number
  utilizationPercent: number
  qualityPercent: number
  handoffReadyPercent: number
}
```

---

## 6. Project & Assignment Previews

**File:** `types/d380-dashboard.ts`

### `DashboardProjectPreview`

```ts
interface DashboardProjectPreview {
  id: string
  pdNumber: string
  name: string
  stage: DashboardProjectStage
  owner: string
  targetDate: string
  progressPercent: number
  units: number
  risk: DashboardRiskLevel
  statusLabel: string
  updatedLabel: string
}
```

### `DashboardAssignmentPreview`

```ts
interface DashboardAssignmentPreview {
  id: string
  projectId: string
  projectName: string
  sheetName: string
  station: string
  assignee: string
  progressPercent: number
  dueLabel: string
  status: DashboardAssignmentStatus
}
```

---

## 7. Hero Slides

**File:** `types/d380-dashboard.ts`

### Base Interface

```ts
interface DashboardHeroSlideBase {
  id: string
  type: DashboardHeroSlideType
  eyebrow: string
  title: string
  description: string
  ctaLabel?: string
}
```

### Discriminated Union Variants

```ts
interface WelcomeHeroSlide extends DashboardHeroSlideBase {
  type: 'WELCOME'
  shiftLabel: string
  operatingDate: string
  readyProjects: number
  restoredAssignments: number
}

interface TopPerformersHeroSlide extends DashboardHeroSlideBase {
  type: 'TOP_PERFORMERS'
  performers: DashboardPerformer[]
}

interface TopPerformerHeroSlide extends DashboardHeroSlideBase {
  type: 'TOP_PERFORMER'
  performer: DashboardPerformer
}

interface HolidayHeroSlide extends DashboardHeroSlideBase {
  type: 'HOLIDAY'
  holidayName: string
  dateLabel: string
  coverageNote: string
}

interface AnnouncementHeroSlide extends DashboardHeroSlideBase {
  type: 'ANNOUNCEMENT'
  announcementTag: string
  emphasis: string
}

interface ShiftComparisonHeroSlide extends DashboardHeroSlideBase {
  type: 'SHIFT_COMPARISON'
  firstShift: DashboardShiftSnapshot
  secondShift: DashboardShiftSnapshot
}

interface ScheduleProgressHeroSlide extends DashboardHeroSlideBase {
  type: 'SCHEDULE_PROGRESS'
  scheduledUnits: number
  completedUnits: number
  lateProjects: number
  completionPercent: number
}
```

### Union Type

```ts
type DashboardHeroSlide =
  | WelcomeHeroSlide
  | TopPerformersHeroSlide
  | TopPerformerHeroSlide
  | HolidayHeroSlide
  | AnnouncementHeroSlide
  | ShiftComparisonHeroSlide
  | ScheduleProgressHeroSlide
```

---

## 8. Data Set & View Model

**File:** `types/d380-dashboard.ts`

### `D380DashboardDataSet`

Raw data payload consumed by the view-model builder.

```ts
interface D380DashboardDataSet {
  operatingDate: string
  activeShift: ShiftOptionId
  summaryMetrics: DashboardSummaryMetric[]
  heroSlides: DashboardHeroSlide[]
  performers: DashboardPerformer[]
  notifications: DashboardNotification[]
  shiftSnapshots: DashboardShiftSnapshot[]
  projects: DashboardProjectPreview[]
  assignments: DashboardAssignmentPreview[]
}
```

### `D380DashboardViewModel`

Derived view model produced by `lib/view-models/d380-dashboard.ts`.

```ts
interface D380DashboardViewModel {
  operatingDateLabel: string
  activeShiftLabel: string
  heroSlides: DashboardHeroSlide[]
  summaryMetrics: DashboardSummaryMetric[]
  topPerformer: DashboardPerformer
  topPerformers: DashboardPerformer[]
  notifications: DashboardNotification[]
  primaryNotifications: DashboardNotification[]
  shiftComparison: {
    firstShift: DashboardShiftSnapshot
    secondShift: DashboardShiftSnapshot
  }
  upcomingProjects: DashboardProjectPreview[]
  inProgressAssignments: DashboardAssignmentPreview[]
  lateProjects: DashboardProjectPreview[]
  recentlyUpdatedProjects: DashboardProjectPreview[]
}
```

---

## Cross-Domain References

| Type | Source | Consumed By |
|---|---|---|
| `ShiftOptionId` | `types/d380-startup.ts` | `DashboardPerformer.shift`, `DashboardShiftSnapshot.shift`, `D380DashboardDataSet.activeShift` |
| `NotificationSeverity` | `types/d380-notifications.ts` | Re-aliased as `DashboardNotificationSeverity` |
| `DashboardRiskLevel` | Local | Matches `ProjectsBoardRiskLevel` pattern (`'healthy'` / `'watch'` / `'late'`) |
| `DashboardProjectPreview` | Local | Dashboard rail components (`upcoming-projects-rail`, `late-projects-rail`, `recently-updated-projects-rail`) |
| `DashboardProjectStage` | Local | TYPE-ONLY — used as `DashboardProjectPreview.stage` field type, never independently imported |
