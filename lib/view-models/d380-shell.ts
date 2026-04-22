import type { D380ShellCommandActionViewModel, D380ShellNavItem, D380ShellViewModel } from '@/types/d380-shell'

const navItems: D380ShellNavItem[] = [
  { id: 'home', label: 'Home', href: '/projects' },
  { id: 'board', label: 'Board', href: '/projects/board' },
  { id: 'tools', label: 'Tools', href: '/projects/tools' },
  { id: 'leader-board', label: 'Leaders', href: '/projects/leader-board' },

]

export function getD380ShellNavItems() {
  return navItems
}

export function buildD380ShellViewModel(): D380ShellViewModel {
  // Build shell view model with minimal data - no mock dependencies
  const routeActions: D380ShellCommandActionViewModel[] = [
    ...navItems.map(item => ({
      id: `route-${item.id}`,
      label: item.label,
      description: `Open ${item.label.toLowerCase()} workspace`,
      href: item.href,
      group: 'Routes' as const,
      kind: 'route' as const,
      shortcut: item.id === 'tools' ? 'G T' : undefined,
    })),
    {
      id: 'route-notifications',
      label: 'Notifications',
      description: 'Open notification center and unread feed',
      href: '/380/notifications',
      group: 'Routes',
      kind: 'route',
      shortcut: 'G N',
    },
  ]

  return {
    navItems,
    commandActions: routeActions,
    projectCards: [],
    assignmentGroups: [],
    summary: {
      operatingDateLabel: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalProjects: 0,
      totalAssignments: 0,
      unreadNotifications: 0,
    },
  }
}
