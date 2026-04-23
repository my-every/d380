import { redirect } from 'next/navigation'

import { getAppModeSettings } from '@/lib/runtime/share-directory'

export const dynamic = 'force-dynamic'

function getPostLaunchRouteForMode(mode: 'DEPARTMENT' | 'WORKSPACE' | 'STANDALONE_TOOL'): string {
  if (mode === 'DEPARTMENT') {
    return '/projects'
  }

  if (mode === 'WORKSPACE') {
    return '/projects/upload'
  }

  return '/projects'
}

function getDefaultRoute(settings: {
  appMode: 'DEPARTMENT' | 'WORKSPACE' | 'STANDALONE_TOOL'
  firstLaunchCompleted: boolean
}): string {
  if (!settings.firstLaunchCompleted) {
    return '/startup'
  }

  return getPostLaunchRouteForMode(settings.appMode)
}

/**
 * Root page redirects based on selected launch mode.
 */
export default async function HomePage() {
  const settings = await getAppModeSettings()
  redirect(getDefaultRoute(settings))
}
