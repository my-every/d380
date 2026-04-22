import type { AssignmentStage } from '@/lib/services/contracts/assignment-state-service'

export type AssignmentStageRole =
  | 'KITTING'
  | 'BRANDING'
  | 'BUILD_UP'
  | 'WIRING'
  | 'BOX_BUILD'
  | 'CROSS_WIRING'
  | 'TEST'
  | 'BIQ'

export interface AssignmentWorkspaceTarget {
  stageRole: AssignmentStageRole
  label: string
  href: string
}

function encodeSheetSlug(value: string) {
  return encodeURIComponent(value)
}

export function mapStageToAssignmentRole(stage: AssignmentStage): AssignmentStageRole {
  switch (stage) {
    case 'KITTED':
      return 'KITTING'
    case 'BUILD_UP':
    case 'IPV1':
      return 'BUILD_UP'
    case 'WIRING':
    case 'IPV2':
      return 'WIRING'
    case 'BOX_BUILD':
    case 'IPV3':
      return 'BOX_BUILD'
    case 'CROSS_WIRING':
    case 'IPV4':
      return 'CROSS_WIRING'
    case 'TEST_READY':
    case 'TEST':
    case 'POWER_CHECK':
      return 'TEST'
    case 'BIQ':
    case 'COMPLETE':
      return 'BIQ'
    default:
      return 'KITTING'
  }
}

export function getAssignmentRoleLabel(role: AssignmentStageRole): string {
  switch (role) {
    case 'KITTING':
      return 'Kitting'
    case 'BRANDING':
      return 'Branding'
    case 'BUILD_UP':
      return 'Build Up'
    case 'WIRING':
      return 'Wiring'
    case 'BOX_BUILD':
      return 'Box Build'
    case 'CROSS_WIRING':
      return 'Cross Wiring'
    case 'TEST':
      return 'Test'
    case 'BIQ':
      return 'BIQ'
  }
}

export function getAssignmentWorkspaceTarget(params: {
  projectId: string
  sheetSlug: string
  stage: AssignmentStage
}): AssignmentWorkspaceTarget {
  const { projectId, sheetSlug, stage } = params
  const stageRole = mapStageToAssignmentRole(stage)
  const encodedSlug = encodeSheetSlug(sheetSlug)

  if (stageRole === 'BUILD_UP' || stageRole === 'BOX_BUILD') {
    return {
      stageRole,
      label: getAssignmentRoleLabel(stageRole),
      href: `/projects/${encodeURIComponent(projectId)}/assignments/${encodedSlug}/build-up`,
    }
  }

  return {
    stageRole,
    label: getAssignmentRoleLabel(stageRole),
    href: `/projects/${encodeURIComponent(projectId)}/assignments/${encodedSlug}`,
  }
}
