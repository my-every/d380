import type {
  D380DashboardDataSet,
  D380DashboardViewModel,
  DashboardNotification,
  DashboardHeroSlide,
  DashboardProjectPreview,
} from '@/types/d380-dashboard'
import type { D380NotificationsDataSet } from '@/types/d380-notifications'

const dashboardTimestampFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

const dashboardNotificationSeverityMap = {
  info: 'info',
  success: 'info',
  warning: 'attention',
  error: 'critical',
} as const

function sortProjectsByRisk(projects: DashboardProjectPreview[]) {
  const riskWeight = {
    late: 0,
    watch: 1,
    healthy: 2,
  } as const

  return [...projects].sort((left, right) => {
    const riskDelta = riskWeight[left.risk] - riskWeight[right.risk]
    if (riskDelta !== 0) {
      return riskDelta
    }

    return right.progressPercent - left.progressPercent
  })
}

function hydrateHeroSlides(slides: DashboardHeroSlide[], performers: D380DashboardDataSet['performers']): DashboardHeroSlide[] {
  return slides.map(slide => {
    if (slide.type !== 'TOP_PERFORMERS') {
      return slide
    }

    return {
      ...slide,
      performers: performers.slice(0, 3),
    }
  })
}

function buildDashboardNotifications(notificationsDataSet?: D380NotificationsDataSet): DashboardNotification[] {
  if (!notificationsDataSet || notificationsDataSet.notifications.length === 0) {
    return []
  }

  return notificationsDataSet.notifications
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(notification => ({
      id: notification.id,
      title: notification.sheetName
        ? `${notification.eventType.replace(/_/g, ' ')} · ${notification.sheetName}`
        : `${notification.eventType.replace(/_/g, ' ')} · ${notification.pdNumber}`,
      body: notification.message,
      severity: dashboardNotificationSeverityMap[notification.severity],
      category: notification.eventType.replace(/_/g, ' '),
      timestampLabel: dashboardTimestampFormatter.format(new Date(notification.createdAt)),
      actionLabel: notification.linkedActionLabel,
      projectId: notification.projectId,
      linkedRoute: notification.linkedRoute,
    }))
}

const EMPTY_DASHBOARD_VIEW_MODEL: D380DashboardViewModel = {
  operatingDateLabel: new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  activeShiftLabel: '1st Shift',
  heroSlides: [],
  summaryMetrics: {
    activeProjects: 0,
    totalAssignments: 0,
    membersToday: 0,
    completedToday: 0,
  },
  topPerformer: {
    id: '',
    name: 'No data',
    initials: '--',
    role: '--',
    shiftLabel: '--',
    assignmentCount: 0,
    score: 0,
  },
  topPerformers: [],
  notifications: [],
  primaryNotifications: [],
  shiftComparison: {
    firstShift: { shift: 'FIRST', label: '1st Shift', assignmentsActive: 0, membersStaffed: 0, completedToday: 0 },
    secondShift: { shift: 'SECOND', label: '2nd Shift', assignmentsActive: 0, membersStaffed: 0, completedToday: 0 },
  },
  upcomingProjects: [],
  inProgressAssignments: [],
  lateProjects: [],
  recentlyUpdatedProjects: [],
}

export function getD380DashboardViewModel(dashboardDataSet?: D380DashboardDataSet, notificationsDataSet?: D380NotificationsDataSet): D380DashboardViewModel {
  if (!dashboardDataSet) {
    return EMPTY_DASHBOARD_VIEW_MODEL
  }

  const firstShift = dashboardDataSet.shiftSnapshots.find(snapshot => snapshot.shift === 'FIRST')
  const secondShift = dashboardDataSet.shiftSnapshots.find(snapshot => snapshot.shift === 'SECOND')

  if (!firstShift || !secondShift) {
    return EMPTY_DASHBOARD_VIEW_MODEL
  }

  const topPerformer = dashboardDataSet.performers[0]
  const dashboardNotifications = buildDashboardNotifications(notificationsDataSet)

  if (!topPerformer) {
    return EMPTY_DASHBOARD_VIEW_MODEL
  }

  const projects = dashboardDataSet.projects
  const upcomingProjects = projects.filter(project => project.stage === 'Upcoming')
  const lateProjects = sortProjectsByRisk(projects.filter(project => project.risk === 'late'))
  const recentlyUpdatedProjects = [...projects].sort((left, right) => left.updatedLabel.localeCompare(right.updatedLabel))

  return {
    operatingDateLabel: dashboardDataSet.operatingDate,
    activeShiftLabel: dashboardDataSet.activeShift === 'FIRST' ? '1st Shift' : '2nd Shift',
    heroSlides: hydrateHeroSlides(dashboardDataSet.heroSlides, dashboardDataSet.performers),
    summaryMetrics: dashboardDataSet.summaryMetrics,
    topPerformer,
    topPerformers: dashboardDataSet.performers,
    notifications: dashboardNotifications,
    primaryNotifications: dashboardNotifications.slice(0, 3),
    shiftComparison: {
      firstShift,
      secondShift,
    },
    upcomingProjects,
    inProgressAssignments: dashboardDataSet.assignments,
    lateProjects,
    recentlyUpdatedProjects,
  }
}
