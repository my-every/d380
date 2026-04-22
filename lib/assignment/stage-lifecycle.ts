/**
 * Stage Lifecycle System
 *
 * Implements the SWS-type-driven stage progression:
 *
 * PANEL (full sequence):
 *   READY_TO_LAY → BUILD_UP → READY_TO_WIRE → WIRING → READY_FOR_VISUAL
 *   → WIRING_IPV → READY_TO_HANG → BOX_BUILD → CROSS_WIRE → CROSS_WIRE_IPV
 *   → READY_TO_TEST → TEST_1ST_PASS → POWER_CHECK → READY_FOR_BIQ → BIQ → FINISHED_BIQ
 *
 * BLANK_PANEL / RAIL_BUILD / COMPONENT_BUILD:
 *   READY_TO_LAY → BUILD_UP → READY_FOR_BIQ → BIQ → FINISHED_BIQ
 *
 * BOX_BUILD:
 *   READY_TO_LAY → BUILD_UP → READY_TO_HANG → BOX_BUILD → CROSS_WIRE* → CROSS_WIRE_IPV*
 *   → READY_TO_TEST → TEST_1ST_PASS → POWER_CHECK → READY_FOR_BIQ → BIQ → FINISHED_BIQ
 *
 * WIRING_ONLY:
 *   READY_TO_WIRE → WIRING → READY_FOR_VISUAL → WIRING_IPV → READY_TO_HANG
 *   → CROSS_WIRE* → CROSS_WIRE_IPV* → READY_TO_TEST → TEST_1ST_PASS
 *   → POWER_CHECK → READY_FOR_BIQ → BIQ → FINISHED_BIQ
 *
 * Stage Rules:
 * 1. SWS type determines applicable stages (see SWS_STAGE_PROFILES)
 * 2. CROSS_WIRE / CROSS_WIRE_IPV are conditional on requiresCrossWireSws
 * 3. Progression requires supervisor/team-lead manual approval
 * 4. Queue stages (READY_TO_*) are readiness gates, not work stages
 */

import type { AssignmentStageId, SwsTypeId } from '@/types/d380-assignment-stages'
import { ASSIGNMENT_STAGES, SWS_STAGE_PROFILES, getApplicableStages } from '@/types/d380-assignment-stages'

// ============================================================================
// STAGE FLOW TYPES
// ============================================================================

/**
 * Stage flow type derived from the SWS classification.
 */
export type StageFlowType =
  | 'PANEL'
  | 'BLANK_PANEL'
  | 'RAIL_BUILD'
  | 'COMPONENT_BUILD'
  | 'BOX_BUILD'
  | 'WIRING_ONLY'

/**
 * Stage transition rule with prerequisites.
 */
export interface StageTransitionRule {
  from: AssignmentStageId
  to: AssignmentStageId
  prerequisite?: string
}

// ============================================================================
// STAGE FLOW DEFINITIONS
// ============================================================================

/**
 * Build-Only flow stages (BLANK_PANEL, RAIL_BUILD, COMPONENT_BUILD).
 */
export const BUILD_ONLY_STAGES: AssignmentStageId[] = [
  'READY_TO_LAY',
  'BUILD_UP',
  'READY_FOR_BIQ',
  'BIQ',
  'FINISHED_BIQ',
]

/**
 * Full Build + Wire flow stages (PANEL).
 */
export const BUILD_AND_WIRE_STAGES: AssignmentStageId[] = [
  'READY_TO_LAY',
  'BUILD_UP',
  'READY_TO_WIRE',
  'WIRING',
  'READY_FOR_VISUAL',
  'WIRING_IPV',
  'READY_TO_HANG',
  'BOX_BUILD',
  'CROSS_WIRE',
  'CROSS_WIRE_IPV',
  'READY_TO_TEST',
  'TEST_1ST_PASS',
  'POWER_CHECK',
  'READY_FOR_BIQ',
  'BIQ',
  'FINISHED_BIQ',
]

/**
 * Box build flow stages (BOX_BUILD SWS type).
 */
export const BOX_BUILD_STAGES: AssignmentStageId[] = [
  'READY_TO_LAY',
  'BUILD_UP',
  'READY_TO_HANG',
  'BOX_BUILD',
  'CROSS_WIRE',
  'CROSS_WIRE_IPV',
  'READY_TO_TEST',
  'TEST_1ST_PASS',
  'POWER_CHECK',
  'READY_FOR_BIQ',
  'BIQ',
  'FINISHED_BIQ',
]

/**
 * Wiring-only flow stages.
 */
export const WIRING_ONLY_STAGES: AssignmentStageId[] = [
  'READY_TO_WIRE',
  'WIRING',
  'READY_FOR_VISUAL',
  'WIRING_IPV',
  'READY_TO_HANG',
  'CROSS_WIRE',
  'CROSS_WIRE_IPV',
  'READY_TO_TEST',
  'TEST_1ST_PASS',
  'POWER_CHECK',
  'READY_FOR_BIQ',
  'BIQ',
  'FINISHED_BIQ',
]

/**
 * Test flow stages (shared tail).
 */
export const TEST_FLOW_STAGES: AssignmentStageId[] = [
  'READY_TO_TEST',
  'TEST_1ST_PASS',
  'POWER_CHECK',
  'READY_FOR_BIQ',
  'BIQ',
  'FINISHED_BIQ',
]

/**
 * All stage transitions for the full PANEL sequence.
 * Other SWS types use a filtered subset.
 */
export const STAGE_TRANSITIONS: StageTransitionRule[] = [
  { from: 'READY_TO_LAY', to: 'BUILD_UP', prerequisite: 'Layout prepared' },
  { from: 'BUILD_UP', to: 'READY_TO_WIRE', prerequisite: 'Build-up complete' },
  { from: 'BUILD_UP', to: 'READY_FOR_BIQ', prerequisite: 'Build-up complete (build-only path)' },
  { from: 'BUILD_UP', to: 'READY_TO_HANG', prerequisite: 'Build-up complete (box path)' },
  { from: 'READY_TO_WIRE', to: 'WIRING', prerequisite: 'Wiring station ready' },
  { from: 'WIRING', to: 'READY_FOR_VISUAL', prerequisite: 'Wiring complete' },
  { from: 'READY_FOR_VISUAL', to: 'WIRING_IPV', prerequisite: 'Visual inspection started' },
  { from: 'WIRING_IPV', to: 'READY_TO_HANG', prerequisite: 'Wiring verified' },
  { from: 'READY_TO_HANG', to: 'BOX_BUILD', prerequisite: 'Panel ready for box install' },
  { from: 'BOX_BUILD', to: 'CROSS_WIRE', prerequisite: 'Box build complete, cross-wire needed' },
  { from: 'BOX_BUILD', to: 'READY_TO_TEST', prerequisite: 'Box build complete, no cross-wire' },
  { from: 'CROSS_WIRE', to: 'CROSS_WIRE_IPV', prerequisite: 'Cross wiring complete' },
  { from: 'CROSS_WIRE_IPV', to: 'READY_TO_TEST', prerequisite: 'Cross wiring verified' },
  { from: 'READY_TO_TEST', to: 'TEST_1ST_PASS', prerequisite: 'Test station available' },
  { from: 'TEST_1ST_PASS', to: 'POWER_CHECK', prerequisite: 'Test complete' },
  { from: 'POWER_CHECK', to: 'READY_FOR_BIQ', prerequisite: 'Power check complete' },
  { from: 'READY_FOR_BIQ', to: 'BIQ', prerequisite: 'BIQ inspector available' },
  { from: 'BIQ', to: 'FINISHED_BIQ', prerequisite: 'BIQ review complete' },
]

// ============================================================================
// LIFECYCLE FUNCTIONS
// ============================================================================

/**
 * Determine the stage flow type for an assignment based on its SWS type.
 */
export function getStageFlowType(
  swsType?: SwsTypeId | string,
  _hasWireRows?: boolean,
  _requiresCrossWireSws?: boolean,
): StageFlowType {
  switch (swsType) {
    case 'PANEL':
    case 'UNDECIDED':
      return 'PANEL'
    case 'BLANK_PANEL':
    case 'BLANK':
      return 'BLANK_PANEL'
    case 'RAIL_BUILD':
    case 'RAIL':
      return 'RAIL_BUILD'
    case 'COMPONENT_BUILD':
    case 'COMPONENT':
      return 'COMPONENT_BUILD'
    case 'BOX_BUILD':
    case 'BOX':
      return 'BOX_BUILD'
    case 'WIRING_ONLY':
      return 'WIRING_ONLY'
    default:
      return 'PANEL'
  }
}

/**
 * Get the ordered stage list for a given SWS type.
 */
export function getStagesForSwsType(
  swsType: SwsTypeId | string,
  hasCrossWire: boolean = true
): AssignmentStageId[] {
  const swsId = (swsType === 'BLANK' ? 'BLANK_PANEL'
    : swsType === 'RAIL' ? 'RAIL_BUILD'
      : swsType === 'BOX' ? 'BOX_BUILD'
        : swsType === 'COMPONENT' ? 'COMPONENT_BUILD'
          : swsType) as SwsTypeId

  return getApplicableStages(swsId, hasCrossWire)
}

/**
 * Get valid next stages for an assignment based on current stage and SWS type.
 */
export function getValidNextStages(
  currentStage: AssignmentStageId,
  _flowType: StageFlowType | SwsTypeId,
  requiresCrossWireSws: boolean = false
): AssignmentStageId[] {
  const validTransitions = STAGE_TRANSITIONS.filter(t => t.from === currentStage)
  let nextStages = validTransitions.map(t => t.to)
  if (!requiresCrossWireSws) {
    nextStages = nextStages.filter(s => s !== 'CROSS_WIRE' && s !== 'CROSS_WIRE_IPV')
  }
  return nextStages
}

/**
 * Check if a stage transition is valid.
 */
export function isValidTransition(
  from: AssignmentStageId,
  to: AssignmentStageId,
  _flowType: StageFlowType | SwsTypeId,
  requiresCrossWireSws: boolean = false
): boolean {
  const validNext = getValidNextStages(from, _flowType, requiresCrossWireSws)
  return validNext.includes(to)
}

/**
 * Get the stage order index for sorting.
 */
export function getStageOrderIndex(stage: AssignmentStageId): number {
  return ASSIGNMENT_STAGES.find(s => s.id === stage)?.order ?? -1
}

/**
 * Check if a stage is a terminal stage (lifecycle complete).
 */
export function isTerminalStage(stage: AssignmentStageId): boolean {
  return stage === 'FINISHED_BIQ'
}

/**
 * Check if cross-wire stage is available based on panel progress.
 * Cross-wire becomes available when sufficient panels reach READY_TO_HANG.
 */
export function isCrossWireAvailable(
  panelsAtReadyToHang: number,
  totalPanelsInBox: number,
  boxBuildProgress: number // 0-100
): boolean {
  const panelProgressPercentage = totalPanelsInBox > 0
    ? (panelsAtReadyToHang / totalPanelsInBox) * 100
    : 0
  return panelProgressPercentage >= 50 && boxBuildProgress >= 25
}

/**
 * Get stage progression summary for an assignment.
 */
export function getStageProgressionSummary(
  currentStage: AssignmentStageId,
  flowType: StageFlowType | SwsTypeId,
  hasCrossWire: boolean = true,
): {
  currentIndex: number
  totalStages: number
  percentComplete: number
  remainingStages: AssignmentStageId[]
  isComplete: boolean
} {
  const swsType = typeof flowType === 'string' ? flowType : flowType
  const stageList = getStagesForSwsType(swsType as SwsTypeId, hasCrossWire)

  const currentIndex = stageList.indexOf(currentStage)
  const totalStages = stageList.length
  const percentComplete = currentIndex >= 0
    ? Math.round((currentIndex / (totalStages - 1)) * 100)
    : 0
  const remainingStages = currentIndex >= 0 ? stageList.slice(currentIndex + 1) : stageList

  return {
    currentIndex,
    totalStages,
    percentComplete,
    remainingStages,
    isComplete: currentStage === 'FINISHED_BIQ',
  }
}

/**
 * Get human-readable stage transition description.
 */
export function getTransitionDescription(from: AssignmentStageId, to: AssignmentStageId): string {
  const transition = STAGE_TRANSITIONS.find(t => t.from === from && t.to === to)
  return transition?.prerequisite || `Transition from ${from} to ${to}`
}
