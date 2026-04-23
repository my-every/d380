/**
 * Auto-Progression Rules Engine
 *
 * Implements the SWS-type-driven lifecycle rules for stage progression.
 * All transitions require supervisor/team-lead manual approval.
 *
 * PANEL (full sequence):
 *   READY_TO_LAY → BUILD_UP → READY_TO_WIRE → WIRING → READY_FOR_VISUAL
 *   → WIRING_IPV → READY_TO_HANG → BOX_BUILD → CROSS_WIRE → CROSS_WIRE_IPV
 *   → READY_TO_TEST → TEST_1ST_PASS → POWER_CHECK → READY_FOR_BIQ → BIQ → FINISHED_BIQ
 *
 * BLANK_PANEL / RAIL_BUILD / COMPONENT_BUILD:
 *   READY_TO_LAY → BUILD_UP → READY_FOR_BIQ → BIQ → FINISHED_BIQ
 *
 * BOX_BUILD (SWS):
 *   READY_TO_LAY → BUILD_UP → READY_TO_HANG → BOX_BUILD → CROSS_WIRE* → CROSS_WIRE_IPV*
 *   → READY_TO_TEST → TEST_1ST_PASS → POWER_CHECK → READY_FOR_BIQ → BIQ → FINISHED_BIQ
 *
 * WIRING_ONLY:
 *   READY_TO_WIRE → WIRING → READY_FOR_VISUAL → WIRING_IPV → READY_TO_HANG
 *   → CROSS_WIRE* → CROSS_WIRE_IPV* → READY_TO_TEST → TEST_1ST_PASS
 *   → POWER_CHECK → READY_FOR_BIQ → BIQ → FINISHED_BIQ
 */

import type { AssignmentStageId, SwsTypeId } from '@/types/d380-assignment-stages'
import type { StageFlowType } from './stage-lifecycle'
import { getStageOrderIndex } from './stage-lifecycle'

// ============================================================================
// RULE TYPES
// ============================================================================

/**
 * Trigger condition for auto-progression.
 */
export type ProgressionTrigger =
  | 'WORK_STARTED'     // Work has started on this stage
  | 'WORK_COMPLETE'    // Work is complete on this stage
  | 'IPV_COMPLETE'     // In-Process Verification complete
  | 'VISUAL_COMPLETE'  // Visual inspection complete
  | 'TEST_PASS'        // Test passed
  | 'MANUAL_ADVANCE'   // Manual advancement by Team Lead

/**
 * A single progression rule.
 */
export interface ProgressionRule {
  id: string
  name: string
  fromStage: AssignmentStageId
  toStage: AssignmentStageId
  trigger: ProgressionTrigger
  requiresIpv: boolean
  isAutomatic: boolean
  description: string
  prerequisites: ProgressionPrerequisite[]
}

/**
 * A prerequisite for a progression rule.
 */
export interface ProgressionPrerequisite {
  type: 'SELF_IPV' | 'PROJECT_GATE' | 'ASSIGNMENT_GATE' | 'MANUAL_CHECK'
  description: string
  checkFn?: (context: ProgressionContext) => boolean
}

/**
 * Context for evaluating progression rules.
 */
export interface ProgressionContext {
  currentStage: AssignmentStageId
  hasWireRows: boolean
  requiresCrossWireSws: boolean
  swsType: string
  ipvComplete: boolean
  projectCrossWireReady: boolean
  projectMetrics?: {
    readyToHangPercent: number
    boxBuildPercent: number
    crossWireComplete: boolean
    testComplete: boolean
  }
}

// ============================================================================
// PROGRESSION RULES REGISTRY
// ============================================================================

export const PROGRESSION_RULES: ProgressionRule[] = [
  // READY_TO_LAY → BUILD_UP
  {
    id: 'ready-to-lay-to-build-up',
    name: 'Start Build Up',
    fromStage: 'READY_TO_LAY',
    toStage: 'BUILD_UP',
    trigger: 'WORK_STARTED',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Assignment ready for layout, build-up work starts',
    prerequisites: [],
  },

  // BUILD_UP → READY_TO_WIRE (panel/full flow)
  {
    id: 'build-up-to-ready-to-wire',
    name: 'Build Up Complete → Ready to Wire',
    fromStage: 'BUILD_UP',
    toStage: 'READY_TO_WIRE',
    trigger: 'WORK_COMPLETE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Build-up complete, assignment queued for wiring',
    prerequisites: [],
  },

  // BUILD_UP → READY_TO_HANG (box build SWS)
  {
    id: 'build-up-to-ready-to-hang',
    name: 'Build Up Complete → Ready to Hang',
    fromStage: 'BUILD_UP',
    toStage: 'READY_TO_HANG',
    trigger: 'WORK_COMPLETE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Build-up complete (box SWS), panel ready for box install',
    prerequisites: [],
  },

  // BUILD_UP → READY_FOR_BIQ (build-only: BLANK_PANEL, RAIL, COMPONENT)
  {
    id: 'build-up-to-ready-for-biq',
    name: 'Build Up Complete → Ready for BIQ',
    fromStage: 'BUILD_UP',
    toStage: 'READY_FOR_BIQ',
    trigger: 'WORK_COMPLETE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Build-up complete (build-only), proceed to BIQ',
    prerequisites: [],
  },

  // READY_TO_WIRE → WIRING
  {
    id: 'ready-to-wire-to-wiring',
    name: 'Start Wiring',
    fromStage: 'READY_TO_WIRE',
    toStage: 'WIRING',
    trigger: 'WORK_STARTED',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Wiring station ready, wiring work starts',
    prerequisites: [],
  },

  // WIRING → READY_FOR_VISUAL
  {
    id: 'wiring-to-ready-for-visual',
    name: 'Wiring Complete → Ready for Visual',
    fromStage: 'WIRING',
    toStage: 'READY_FOR_VISUAL',
    trigger: 'WORK_COMPLETE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Wiring complete, queued for visual verification',
    prerequisites: [],
  },

  // READY_FOR_VISUAL → WIRING_IPV
  {
    id: 'ready-for-visual-to-wiring-ipv',
    name: 'Start Wiring IPV',
    fromStage: 'READY_FOR_VISUAL',
    toStage: 'WIRING_IPV',
    trigger: 'VISUAL_COMPLETE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Visual inspection started',
    prerequisites: [],
  },

  // WIRING_IPV → READY_TO_HANG
  {
    id: 'wiring-ipv-to-ready-to-hang',
    name: 'Wiring IPV Complete → Ready to Hang',
    fromStage: 'WIRING_IPV',
    toStage: 'READY_TO_HANG',
    trigger: 'IPV_COMPLETE',
    requiresIpv: true,
    isAutomatic: false,
    description: 'Wiring verified, panel ready for box install',
    prerequisites: [{ type: 'SELF_IPV', description: 'Wiring IPV must be complete' }],
  },

  // READY_TO_HANG → BOX_BUILD
  {
    id: 'ready-to-hang-to-box-build',
    name: 'Start Box Build',
    fromStage: 'READY_TO_HANG',
    toStage: 'BOX_BUILD',
    trigger: 'WORK_STARTED',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Panel installed in enclosure, box build starts',
    prerequisites: [],
  },

  // BOX_BUILD → CROSS_WIRE (conditional)
  {
    id: 'box-build-to-cross-wire',
    name: 'Box Build Complete → Cross Wire',
    fromStage: 'BOX_BUILD',
    toStage: 'CROSS_WIRE',
    trigger: 'MANUAL_ADVANCE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Box build complete, cross-wiring starts',
    prerequisites: [
      {
        type: 'PROJECT_GATE',
        description: '50% of panels must be at or past READY_TO_HANG',
        checkFn: (ctx) => (ctx.projectMetrics?.readyToHangPercent ?? 0) >= 50,
      },
      {
        type: 'ASSIGNMENT_GATE',
        description: 'Assignment must require cross-wire SWS',
        checkFn: (ctx) => ctx.requiresCrossWireSws,
      },
    ],
  },

  // BOX_BUILD → READY_TO_TEST (no cross-wire)
  {
    id: 'box-build-to-ready-to-test',
    name: 'Box Build Complete → Ready to Test',
    fromStage: 'BOX_BUILD',
    toStage: 'READY_TO_TEST',
    trigger: 'MANUAL_ADVANCE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Box build complete, no cross-wire required',
    prerequisites: [
      {
        type: 'ASSIGNMENT_GATE',
        description: 'Only for assignments without cross-wire',
        checkFn: (ctx) => !ctx.requiresCrossWireSws,
      },
    ],
  },

  // CROSS_WIRE → CROSS_WIRE_IPV
  {
    id: 'cross-wire-to-cross-wire-ipv',
    name: 'Cross Wire Complete → Cross Wire IPV',
    fromStage: 'CROSS_WIRE',
    toStage: 'CROSS_WIRE_IPV',
    trigger: 'WORK_COMPLETE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Cross wiring complete, proceed to verification',
    prerequisites: [],
  },

  // CROSS_WIRE_IPV → READY_TO_TEST
  {
    id: 'cross-wire-ipv-to-ready-to-test',
    name: 'Cross Wire IPV Complete → Ready to Test',
    fromStage: 'CROSS_WIRE_IPV',
    toStage: 'READY_TO_TEST',
    trigger: 'IPV_COMPLETE',
    requiresIpv: true,
    isAutomatic: false,
    description: 'Cross wiring verified, ready for test',
    prerequisites: [{ type: 'SELF_IPV', description: 'Cross Wire IPV must be complete' }],
  },

  // READY_TO_TEST → TEST_1ST_PASS
  {
    id: 'ready-to-test-to-test-1st-pass',
    name: 'Start Test',
    fromStage: 'READY_TO_TEST',
    toStage: 'TEST_1ST_PASS',
    trigger: 'TEST_PASS',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Functional test started',
    prerequisites: [],
  },

  // TEST_1ST_PASS → POWER_CHECK
  {
    id: 'test-1st-pass-to-power-check',
    name: 'Test Complete → Power Check',
    fromStage: 'TEST_1ST_PASS',
    toStage: 'POWER_CHECK',
    trigger: 'WORK_COMPLETE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Test complete, power validation starts',
    prerequisites: [],
  },

  // POWER_CHECK → READY_FOR_BIQ
  {
    id: 'power-check-to-ready-for-biq',
    name: 'Power Check Complete → Ready for BIQ',
    fromStage: 'POWER_CHECK',
    toStage: 'READY_FOR_BIQ',
    trigger: 'WORK_COMPLETE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'Power check complete, queued for final BIQ',
    prerequisites: [],
  },

  // READY_FOR_BIQ → BIQ
  {
    id: 'ready-for-biq-to-biq',
    name: 'Start BIQ',
    fromStage: 'READY_FOR_BIQ',
    toStage: 'BIQ',
    trigger: 'MANUAL_ADVANCE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'BIQ inspector available, final review starts',
    prerequisites: [],
  },

  // BIQ → FINISHED_BIQ
  {
    id: 'biq-to-finished-biq',
    name: 'BIQ Complete',
    fromStage: 'BIQ',
    toStage: 'FINISHED_BIQ',
    trigger: 'WORK_COMPLETE',
    requiresIpv: false,
    isAutomatic: false,
    description: 'BIQ review complete, assignment finished',
    prerequisites: [],
  },
]

// ============================================================================
// RULE LOOKUP AND EVALUATION
// ============================================================================

export function findApplicableRules(
  fromStage: AssignmentStageId,
  _flowType?: StageFlowType | SwsTypeId,
): ProgressionRule[] {
  return PROGRESSION_RULES.filter(rule => rule.fromStage === fromStage)
}

export function getNextPossibleStages(
  context: ProgressionContext,
  _flowType?: StageFlowType | SwsTypeId,
): { stage: AssignmentStageId; rule: ProgressionRule; canProgress: boolean; reason: string }[] {
  const rules = findApplicableRules(context.currentStage)
  return rules.map(rule => {
    const { canProgress, reason } = evaluateRule(rule, context)
    return { stage: rule.toStage, rule, canProgress, reason }
  })
}

export function evaluateRule(
  rule: ProgressionRule,
  context: ProgressionContext
): { canProgress: boolean; reason: string } {
  for (const prereq of rule.prerequisites) {
    if (prereq.checkFn && !prereq.checkFn(context)) {
      return { canProgress: false, reason: prereq.description }
    }
    if (prereq.type === 'SELF_IPV' && !context.ipvComplete) {
      return { canProgress: false, reason: prereq.description }
    }
    if (prereq.type === 'PROJECT_GATE' && rule.toStage === 'CROSS_WIRE') {
      if (!context.projectCrossWireReady) {
        return { canProgress: false, reason: 'Project cross-wire prerequisites not met' }
      }
    }
  }
  return { canProgress: true, reason: rule.description }
}

export function getRecommendedNextStage(
  context: ProgressionContext,
  flowType?: StageFlowType | SwsTypeId,
): { stage: AssignmentStageId | null; rule: ProgressionRule | null; reasons: string[] } {
  const possibleStages = getNextPossibleStages(context, flowType)

  const automaticMatch = possibleStages.find(s => s.canProgress && s.rule.isAutomatic)
  if (automaticMatch) {
    return { stage: automaticMatch.stage, rule: automaticMatch.rule, reasons: [automaticMatch.reason] }
  }

  const manualMatch = possibleStages.find(s => s.canProgress)
  if (manualMatch) {
    return { stage: manualMatch.stage, rule: manualMatch.rule, reasons: [manualMatch.reason] }
  }

  const blockedReasons = possibleStages.filter(s => !s.canProgress).map(s => s.reason)
  return {
    stage: null,
    rule: null,
    reasons: blockedReasons.length > 0 ? blockedReasons : ['No valid transitions from current stage'],
  }
}

export function determineFlowType(
  _hasWireRows: boolean,
  _requiresCrossWireSws: boolean,
  swsType: string
): StageFlowType {
  switch (swsType) {
    case 'BLANK_PANEL':
    case 'BLANK': return 'BLANK_PANEL'
    case 'RAIL_BUILD':
    case 'RAIL': return 'RAIL_BUILD'
    case 'COMPONENT_BUILD':
    case 'COMPONENT': return 'COMPONENT_BUILD'
    case 'BOX_BUILD':
    case 'BOX': return 'BOX_BUILD'
    case 'WIRING_ONLY': return 'WIRING_ONLY'
    default: return 'PANEL'
  }
}

// ============================================================================
// IPV TRACKING
// ============================================================================

export const STAGES_REQUIRING_IPV: AssignmentStageId[] = [
  'WIRING_IPV',
  'CROSS_WIRE_IPV',
]

export function stageRequiresIpv(stage: AssignmentStageId): boolean {
  return STAGES_REQUIRING_IPV.includes(stage)
}

export function getIpvTypeForStage(stage: AssignmentStageId): string | null {
  switch (stage) {
    case 'WIRING_IPV': return 'Wiring IPV'
    case 'CROSS_WIRE_IPV': return 'Cross Wiring IPV'
    default: return null
  }
}
