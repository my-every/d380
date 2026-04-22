import { getElectronBridge, isElectronRuntimeAvailable } from './bridge'
import { getElectronAssignmentStateService } from './assignment-state-service'
import { ElectronWorkspaceService } from './workspace-service'
import { ElectronNotificationService } from './notification-service'
import { LeaderboardServiceImpl } from '../share-380-simulated/leaderboard-service'
import { ProjectDiscoveryServiceImpl } from '../share-380-simulated/project-discovery-service'
import { ProjectDetailsV2ServiceImpl } from '../share-380-simulated/project-details-v2-service'
import { TeamRosterServiceImpl } from '../share-380-simulated/team-roster-service'
import { WorkAreaServiceImpl } from '../share-380-simulated/work-area-service'
import { getElectronSessionService } from './session-service'

import type { Share380Provider } from '@/lib/services/provider-types'

/**
 * Phase 10 Electron Provider.
 *
 * IPC-backed services:
 *   - workspace:       ElectronWorkspaceService  (session state → JSON)
 *   - assignmentState: ElectronAssignmentState    (mutations → JSON)
 *   - notification:    ElectronNotificationService (persist → JSON)
 *   - session:         ElectronSessionService      (extends simulated)
 *
 * Simulated fallbacks (no directory-listing IPC yet):
 *   - projectDiscovery, projectDetailsV2, teamRoster, workArea, leaderboard
 */

let providerInstance: Share380Provider | null = null

export interface ElectronProviderStatus {
  hasBridge: boolean
  bridgeMethods: Array<keyof NonNullable<ReturnType<typeof getElectronBridge>>>
}

export function getElectronProviderStatus(): ElectronProviderStatus {
  const bridge = getElectronBridge()

  return {
    hasBridge: isElectronRuntimeAvailable(),
    bridgeMethods: bridge ? Object.keys(bridge) as ElectronProviderStatus['bridgeMethods'] : [],
  }
}

export function getElectronShare380Provider(): Share380Provider {
  if (!providerInstance) {
    const session = getElectronSessionService()
    providerInstance = {
      workspace: new ElectronWorkspaceService(),
      projectDiscovery: new ProjectDiscoveryServiceImpl() as any,
      projectDetailsV2: new ProjectDetailsV2ServiceImpl({ session }),
      teamRoster: new TeamRosterServiceImpl(),
      workArea: new WorkAreaServiceImpl(),
      assignmentState: getElectronAssignmentStateService(),
      notification: new ElectronNotificationService() as any,
      leaderboard: new LeaderboardServiceImpl(),
      session,
    }
  }

  return providerInstance as Share380Provider
}

export function resetElectronShare380Provider(): void {
  providerInstance = null
}

export { getElectronBridge, isElectronRuntimeAvailable } from './bridge'