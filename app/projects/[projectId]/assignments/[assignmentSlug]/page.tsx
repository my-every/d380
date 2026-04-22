'use client'

/**
 * Assignment Details Page - Integrated Stage Workflow
 * 
 * Redesigned with:
 * - Dynamic SWS type rendering based on sheet type
 * - Conditional stage progression based on SWS type
 * - Build Up IPV after Build Up stage
 * - Milestones (READY_TO_*) for Team Lead approval
 * - Save/blocked functionality for incomplete work
 */

import { useParams, useRouter } from 'next/navigation'
import { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  Printer,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Home,
  Shield,
  Users,
  Lock,
  Settings,
  Save,
  AlertTriangle,
  Pause,
  Package,
  Hammer,
  Cable,
  Eye,
  Move,
  Box,
  GitMerge,
  ClipboardCheck,
  Zap,
  Power,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useProjectContext } from '@/contexts/project-context'
import type { SwsType } from '@/types/d380-assignment'
import type { AssignmentStageId } from '@/types/d380-assignment-stages'
import { getStageDefinition } from '@/types/d380-assignment-stages'
import { SWS_TYPE_REGISTRY } from '@/lib/assignment/sws-detection'
import { useAssignmentDependencyGraph } from '@/hooks/use-assignment-dependency-graph'
import { useSession } from '@/hooks/use-session'

import { AssignmentWorkLog, type WorkLogEntry } from '@/components/d380/assignment/assignment-work-log'
import { SecureActionModal } from '@/components/profile/secure-action-modal'
import { SwsWorkElementTable, type StepCompletion, type SwsSection } from '@/components/d380/sws/sws-work-element-table'
import { SwsBlockedReasonModal, SwsBlockedStatusBadge, type BlockedItem } from '@/components/d380/sws/sws-blocked-reason-modal'
import { SwsSaveProgressModal, SwsResumeSessionBanner, type SaveProgressSummary } from '@/components/d380/sws/sws-save-progress-modal'
import { getSwsDataByType, type SwsDataTemplateType, SWS_DATA_TEMPLATE_METADATA } from '@/lib/sws'
import { WiringStageContent } from '@/components/wire-list/wiring-stage-content'
import { cn } from '@/lib/utils'
import { getPermissionDeniedMessage } from '@/lib/session/session-feedback'

// ============================================================================
// Types
// ============================================================================

interface StageSession {
  stageId: AssignmentStageId
  startedBy: { badge: string; name: string }
  startedAt: string
  isIPVRequired: boolean
}

interface AuthContext {
  action: 'start_stage' | 'complete_stage' | 'ipv_verify' | 'team_lead_approve'
  targetStage: AssignmentStageId
  blockedBadge?: string
}

interface AssignmentBlockedState {
  isBlocked: boolean
  reason?: string
  blockedItems?: BlockedItem[]
  blockedAt?: string
  blockedBy?: { badge: string; name: string }
  requiresTeamLeadApproval?: boolean
}

interface SavedProgress {
  stage: AssignmentStageId
  swsData: SwsSection[]
  savedAt: string
  savedBy: { badge: string; name: string }
  isPaused: boolean
}

// ============================================================================
// Stage Configuration Based on SWS Type
// ============================================================================

/**
 * Map SWS type to SWS data template type
 */
function getSwsTemplateType(swsType: SwsType): SwsDataTemplateType {
  const mapping: Record<SwsType, SwsDataTemplateType> = {
    PANEL: 'PANEL_BUILD_WIRE',
    BOX: 'BOX_BUILD',
    RAIL: 'RAIL_BUILD_WIRE',
    COMPONENT: 'COMPONENT_SUBASSEMBLY',
    BLANK: 'BASIC_BLANK',
    UNDECIDED: 'BASIC_BLANK',
  }
  return mapping[swsType] || 'BASIC_BLANK'
}

/**
 * Stage definition with milestone flag
 */
interface StageDefinition {
  id: AssignmentStageId
  label: string
  description: string
  icon: React.ElementType
  color: string
  isMilestone: boolean // READY_TO_* stages are milestones
  isIPV: boolean // IPV verification stages
  isExecutable: boolean // Has interactive SWS content
}

/**
 * Get applicable stages for an SWS type and sheet properties
 */
function getApplicableStages(
  swsType: SwsType,
  hasWireRows: boolean,
  hasExternalLocations: boolean
): StageDefinition[] {
  const allStages: StageDefinition[] = [
    { id: 'KITTED', label: 'Kitted', description: 'Kitted / ready for build up', icon: Package, color: 'blue', isMilestone: true, isIPV: false, isExecutable: false },
    { id: 'BUILD_UP', label: 'Build Up', description: 'Active Build Up execution', icon: Hammer, color: 'amber', isMilestone: false, isIPV: false, isExecutable: true },
    { id: 'IPV1', label: 'IPV1', description: 'Build Up verification required', icon: Eye, color: 'orange', isMilestone: true, isIPV: true, isExecutable: false },
    { id: 'WIRING', label: 'Wiring', description: 'Active Wiring execution', icon: Cable, color: 'purple', isMilestone: false, isIPV: false, isExecutable: true },
    { id: 'IPV2', label: 'IPV2', description: 'Wire verification stage', icon: Eye, color: 'sky', isMilestone: true, isIPV: true, isExecutable: false },
    { id: 'BOX_BUILD', label: 'Box Build', description: 'Active Box Build execution', icon: Box, color: 'fuchsia', isMilestone: false, isIPV: false, isExecutable: true },
    { id: 'IPV3', label: 'IPV3', description: 'Box Build verification stage', icon: Eye, color: 'indigo', isMilestone: true, isIPV: true, isExecutable: false },
    { id: 'CROSS_WIRING', label: 'Cross Wiring', description: 'Cross Wiring execution', icon: GitMerge, color: 'pink', isMilestone: false, isIPV: false, isExecutable: true },
    { id: 'IPV4', label: 'IPV4', description: 'Cross Wiring verification stage', icon: Eye, color: 'cyan', isMilestone: true, isIPV: true, isExecutable: false },
    { id: 'TEST_READY', label: 'Test Ready', description: 'Ready for testing', icon: ClipboardCheck, color: 'teal', isMilestone: true, isIPV: false, isExecutable: false },
    { id: 'TEST', label: 'Test', description: 'Functional test pass', icon: Zap, color: 'teal', isMilestone: false, isIPV: false, isExecutable: true },
    { id: 'POWER_CHECK', label: 'Power Check', description: 'Power check in progress', icon: Power, color: 'green', isMilestone: false, isIPV: false, isExecutable: true },
    { id: 'BIQ', label: 'BIQ', description: 'Final built-in quality review', icon: Award, color: 'emerald', isMilestone: false, isIPV: false, isExecutable: true },
  ]

  // Filter stages based on SWS type and sheet properties
  let applicableStages: AssignmentStageId[] = []

  if (swsType === 'BOX') {
    // Box type: BUILD_UP -> BUILD_UP_IPV -> BOX_BUILD -> READY_TO_TEST -> TEST -> FINISHED
    applicableStages = [
      'KITTED', 'BUILD_UP', 'IPV1', 'BOX_BUILD', 'IPV3', 'TEST_READY', 'TEST', 'POWER_CHECK', 'BIQ'
    ]
  } else if (!hasWireRows) {
    // No wire rows: BUILD_UP -> BUILD_UP_IPV -> READY_TO_HANG (end)
    applicableStages = [
      'KITTED', 'BUILD_UP', 'IPV1', 'BOX_BUILD', 'IPV3', 'TEST_READY', 'TEST', 'POWER_CHECK', 'BIQ'
    ]
  } else if (hasExternalLocations) {
    // Has external locations: Full flow with cross-wire
    applicableStages = [
      'KITTED', 'BUILD_UP', 'IPV1', 'WIRING', 'IPV2', 'BOX_BUILD', 'IPV3', 'CROSS_WIRING', 'IPV4', 'TEST_READY', 'TEST', 'POWER_CHECK', 'BIQ'
    ]
  } else {
    // Standard panel with wiring, no cross-wire
    applicableStages = [
      'KITTED', 'BUILD_UP', 'IPV1', 'WIRING', 'IPV2', 'BOX_BUILD', 'IPV3', 'TEST_READY', 'TEST', 'POWER_CHECK', 'BIQ'
    ]
  }

  return allStages.filter(s => applicableStages.includes(s.id))
}

// ============================================================================
// Stage Content Components
// ============================================================================

interface StageContentProps {
  stage: StageDefinition
  projectId: string
  sheetSlug: string
  sheetName: string
  session: StageSession | null
  swsData: SwsSection[]
  rowCount: number
  swsType: SwsType
  onStartSession: () => void
  onCompleteStage: () => void
  onSaveProgress: () => void
  onMarkBlocked: () => void
  onSwsDataChange: (data: SwsSection[]) => void
  hasExternalLocations?: boolean
  assignmentWorkers?: string[]
  ipvVerifiers?: string[]
  blockedState?: AssignmentBlockedState
  hasBeenStarted?: boolean // true if any work has been done on this assignment
}

function MilestoneStageContent({
  stage,
  session,
  onStartSession,
  onCompleteStage,
  assignmentWorkers = [],
  blockedState,
}: StageContentProps) {
  const Icon = stage.icon
  const isIPV = stage.isIPV

  if (blockedState?.requiresTeamLeadApproval) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Team Lead Approval Required</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          This assignment was marked as blocked and requires Team Lead sign-off before proceeding.
        </p>
        <SwsBlockedStatusBadge
          reason={blockedState.reason || 'MISSING_PARTS'}
          className="mb-6"
        />
        <Button size="lg" onClick={onStartSession} className="gap-2">
          <Shield className="h-5 w-5" />
          Team Lead Sign-Off
        </Button>
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <div className={cn(
        "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full",
        isIPV ? "bg-amber-100 dark:bg-amber-900/30" : "bg-blue-100 dark:bg-blue-900/30"
      )}>
        <Icon className={cn(
          "h-10 w-10",
          isIPV ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
        )} />
      </div>
      <h3 className="text-xl font-semibold mb-2">{stage.label}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {isIPV
          ? "A different user must verify the previous stage work. The person who completed the previous stage cannot perform this verification."
          : stage.description
        }
      </p>
      {isIPV && assignmentWorkers.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">
          Blocked badges: {assignmentWorkers.join(', ')}
        </p>
      )}
      <Button size="lg" onClick={onStartSession} className="gap-2">
        <Shield className="h-5 w-5" />
        {isIPV ? 'Sign In to Verify' : 'Approve & Proceed'}
      </Button>
    </div>
  )
}

function ExecutableStageContent({
  stage,
  session,
  swsData,
  onStartSession,
  onCompleteStage,
  onSaveProgress,
  onMarkBlocked,
  onSwsDataChange,
  projectId,
  sheetSlug,
  sheetName,
  rowCount,
  swsType,
  assignmentWorkers = [],
  hasBeenStarted = false,
}: StageContentProps) {
  const Icon = stage.icon

  // Calculate progress
  const totalSteps = swsData.flatMap(s => s.elements.flatMap(e => e.subSteps)).length
  const completedSteps = swsData.flatMap(s => s.elements.flatMap(e => e.subSteps.filter(step => step.completion || step.notApplicable))).length
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const isComplete = completedSteps === totalSteps && totalSteps > 0

  // Handle step completion
  const handleStepComplete = useCallback((elementId: string, stepId: string, completion: StepCompletion) => {
    onSwsDataChange(swsData.map(section => ({
      ...section,
      elements: section.elements.map(element => {
        if (element.id !== elementId) return element
        return {
          ...element,
          subSteps: element.subSteps.map(step => {
            if (step.id !== stepId) return step
            return { ...step, completion }
          })
        }
      })
    })))
  }, [swsData, onSwsDataChange])

  // Handle step uncomplete (uncheck)
  const handleStepUncomplete = useCallback((elementId: string, stepId: string) => {
    onSwsDataChange(swsData.map(section => ({
      ...section,
      elements: section.elements.map(element => {
        if (element.id !== elementId) return element
        return {
          ...element,
          subSteps: element.subSteps.map(step => {
            if (step.id !== stepId) return step
            return { ...step, completion: undefined }
          })
        }
      })
    })))
  }, [swsData, onSwsDataChange])

  // Handle auditor stamp
  const handleAuditorStamp = useCallback((elementId: string, stepId: string, completion: StepCompletion) => {
    onSwsDataChange(swsData.map(section => ({
      ...section,
      elements: section.elements.map(element => {
        if (element.id !== elementId) return element
        return {
          ...element,
          subSteps: element.subSteps.map(step => {
            if (step.id !== stepId) return step
            return { ...step, auditorCompletion: completion }
          })
        }
      })
    })))
  }, [swsData, onSwsDataChange])

  // Handle N/A
  const handleNotApplicable = useCallback((elementId: string, stepId: string, notApplicable: boolean) => {
    onSwsDataChange(swsData.map(section => ({
      ...section,
      elements: section.elements.map(element => {
        if (element.id !== elementId) return element
        return {
          ...element,
          subSteps: element.subSteps.map(step => {
            if (step.id !== stepId) return step
            return { ...step, notApplicable }
          })
        }
      })
    })))
  }, [swsData, onSwsDataChange])

  if (!session) {
    const actionLabel = hasBeenStarted ? 'Continue' : 'Start'

    return (
      <div className="text-center py-12">
        <div className={cn(
          "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full",
          `bg-${stage.color}-100 dark:bg-${stage.color}-900/30`
        )}>
          <Icon className={cn("h-10 w-10", `text-${stage.color}-600 dark:text-${stage.color}-400`)} />
        </div>
        <h3 className="text-xl font-semibold mb-2">{actionLabel} {stage.label}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {hasBeenStarted
            ? 'This stage has been started. Authenticate to continue where you left off.'
            : `Authenticate with your badge and PIN to begin.${rowCount > 0 ? ` This sheet contains ${rowCount} items.` : ''}`
          }
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" onClick={onStartSession} className="gap-2">
            <Shield className="h-5 w-5" />
            Sign In to {actionLabel}
          </Button>
          <Button variant="outline" size="lg" asChild className="gap-2">
            <Link href={`/projects/${projectId}/assignments/${sheetSlug}/${stage.id.toLowerCase()}?print=true`}>
              <Printer className="h-5 w-5" />
              Print Worksheet
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Session Badge */}
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border",
        `bg-${stage.color}-50 dark:bg-${stage.color}-950/30 border-${stage.color}-200 dark:border-${stage.color}-800`
      )}>
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", `bg-${stage.color}-500`)}>
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-medium">{session.startedBy.name}</div>
            <div className="text-sm text-muted-foreground">Badge: {session.startedBy.badge}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn(`bg-${stage.color}-100 text-${stage.color}-700 dark:bg-${stage.color}-900 dark:text-${stage.color}-300`)}>
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
          <Badge variant="outline">{progress}%</Badge>
        </div>
      </div>

      {/* SWS Work Element Table */}
      <SwsWorkElementTable
        sections={swsData}
        projectInfo={{
          pdNumber: sheetName,
          projectName: sheetName,
          date: new Date().toLocaleDateString(),
        }}
        currentSessionUser={session.startedBy}
        onStepComplete={handleStepComplete}
        onStepUncomplete={handleStepUncomplete}
        onAuditorStamp={handleAuditorStamp}
        onNotApplicable={handleNotApplicable}
        startTime={session.startedAt ? new Date(session.startedAt) : undefined}
        assignmentWorkers={assignmentWorkers.length > 0 ? assignmentWorkers : [session.startedBy.badge]}
        onSave={async () => {
          await new Promise(resolve => setTimeout(resolve, 500))
        }}
      />

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onSaveProgress} className="gap-2">
            <Save className="h-4 w-4" />
            Save Progress
          </Button>
          <Button variant="outline" onClick={onMarkBlocked} className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            Report Blocked
          </Button>
        </div>
        <Button
          onClick={onCompleteStage}
          disabled={!isComplete}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Complete {stage.label}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function AssignmentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const assignmentSlug = params.assignmentSlug as string

  const { currentProject, assignmentMappings } = useProjectContext()
  const { verifyCredentials, changePin } = useSession()

  // Stage navigation state
  const [viewingStageIndex, setViewingStageIndex] = useState<number>(0)
  const [activeSession, setActiveSession] = useState<StageSession | null>(null)

  // SWS data per stage
  const [swsDataByStage, setSwsDataByStage] = useState<Record<string, SwsSection[]>>({})

  // Blocked state
  const [blockedState, setBlockedState] = useState<AssignmentBlockedState>({ isBlocked: false })
  const [showBlockedModal, setShowBlockedModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)

  // Track all workers who contributed to this assignment (for IPV blocking)
  const [assignmentWorkers, setAssignmentWorkers] = useState<string[]>([])
  const [ipvVerifiers, setIpvVerifiers] = useState<string[]>([])

  // Work log entries for this assignment
  const [workLogEntries, setWorkLogEntries] = useState<WorkLogEntry[]>([])

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authContext, setAuthContext] = useState<AuthContext | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pinChangeRequired, setPinChangeRequired] = useState(false)

  // Horizontal scroll for stage timeline
  const timelineRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Dependency graph for this assignment
  const { getNodeStatus, crossWireReadiness } = useAssignmentDependencyGraph(
    projectId,
    assignmentMappings
  )

  // Find the assignment
  const assignment = useMemo(() => {
    return assignmentMappings.find(a => a.sheetSlug === assignmentSlug)
  }, [assignmentMappings, assignmentSlug])

  // Get sheet data
  const sheet = useMemo(() => {
    if (!currentProject) return null
    return currentProject.sheets.find(s => s.slug === assignmentSlug)
  }, [currentProject, assignmentSlug])

  // Determine applicable stages based on SWS type
  const swsType = (assignment?.selectedSwsType || 'PANEL') as SwsType
  const hasWireRows = (assignment?.rowCount || 0) > 0
  const hasExternalLocations = crossWireReadiness?.candidateAssignments.includes(assignmentSlug) ?? false

  const applicableStages = useMemo(() => {
    return getApplicableStages(swsType, hasWireRows, hasExternalLocations)
  }, [swsType, hasWireRows, hasExternalLocations])

  // Current stage from assignment
  const currentStageId = assignment?.selectedStage || 'UNASSIGNED'
  const currentStageIndex = applicableStages.findIndex(s => s.id === currentStageId)

  // Active viewing stage
  const activeStage = applicableStages[viewingStageIndex] || applicableStages[0]

  // Initialize SWS data for the current stage
  useEffect(() => {
    if (activeStage && !swsDataByStage[activeStage.id]) {
      const templateType = getSwsTemplateType(swsType)
      const allData = getSwsDataByType(templateType)

      // Filter sections based on stage
      let stageData: SwsSection[]
      if (activeStage.id === 'BUILD_UP' || activeStage.id === 'BOX_BUILD') {
        stageData = allData.filter(s => s.phase === 'build-up')
      } else if (activeStage.id === 'WIRING' || activeStage.id === 'CROSS_WIRING') {
        stageData = allData.filter(s => s.phase === 'wiring')
      } else {
        stageData = allData
      }

      setSwsDataByStage(prev => ({ ...prev, [activeStage.id]: stageData }))
    }
  }, [activeStage, swsType, swsDataByStage])

  const currentSwsData = swsDataByStage[activeStage?.id] || []

  // Check scroll state
  const checkScrollState = useCallback(() => {
    if (timelineRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = timelineRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }, [])

  // Auto-scroll to current stage on mount
  useEffect(() => {
    if (timelineRef.current && currentStageIndex >= 0) {
      const stageWidth = 100
      const scrollPosition = Math.max(0, (currentStageIndex * stageWidth) - (timelineRef.current.clientWidth / 2) + (stageWidth / 2))
      timelineRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' })
    }
    checkScrollState()
  }, [currentStageIndex, checkScrollState])

  useEffect(() => {
    setViewingStageIndex(Math.max(0, currentStageIndex))
  }, [currentStageIndex])

  const scrollTimeline = (direction: 'left' | 'right') => {
    if (timelineRef.current) {
      const scrollAmount = 200
      timelineRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  // Handle stage click
  const handleStageClick = useCallback((index: number) => {
    if (index <= currentStageIndex + 1) {
      setViewingStageIndex(index)
      if (applicableStages[index]?.id !== activeSession?.stageId) {
        setActiveSession(null)
      }
    }
  }, [currentStageIndex, activeSession, applicableStages])

  // Handle start session
  const handleStartSession = useCallback(() => {
    const isIPV = activeStage?.isIPV
    const isMilestone = activeStage?.isMilestone && !isIPV

    setAuthContext({
      action: isIPV ? 'ipv_verify' : isMilestone ? 'team_lead_approve' : 'start_stage',
      targetStage: activeStage?.id || 'UNASSIGNED',
      blockedBadge: isIPV && assignmentWorkers.length > 0 ? assignmentWorkers[0] : undefined,
    })
    setAuthError(null)
    setPinChangeRequired(false)
    setAuthModalOpen(true)
  }, [activeStage, assignmentWorkers])

  // Handle complete stage
  const handleCompleteStage = useCallback(() => {
    // Close any active work log entry
    if (activeSession) {
      const now = new Date()
      setWorkLogEntries(prev => prev.map(entry => {
        if (entry.badge === activeSession.startedBy.badge && entry.clockOutAt === null) {
          const clockInTime = new Date(entry.clockInAt)
          const durationMinutes = Math.round((now.getTime() - clockInTime.getTime()) / 60000)
          return {
            ...entry,
            clockOutAt: now.toISOString(),
            durationMinutes,
            action: 'COMPLETE' as const,
          }
        }
        return entry
      }))
    }

    const nextIndex = viewingStageIndex + 1
    if (nextIndex < applicableStages.length) {
      setViewingStageIndex(nextIndex)
    }
    setActiveSession(null)
    setBlockedState({ isBlocked: false })
  }, [viewingStageIndex, applicableStages.length, activeSession])

  // Handle save progress
  const handleSaveProgress = useCallback(() => {
    setShowSaveModal(true)
  }, [])

  // Handle mark blocked
  const handleMarkBlocked = useCallback(() => {
    setShowBlockedModal(true)
  }, [])

  // Handle blocked submission
  const handleBlockedSubmit = useCallback((items: BlockedItem[], reason: string) => {
    setBlockedState({
      isBlocked: true,
      reason,
      blockedItems: items,
      blockedAt: new Date().toISOString(),
      blockedBy: activeSession?.startedBy,
      requiresTeamLeadApproval: true,
    })
    setShowBlockedModal(false)

    // Move to next milestone for Team Lead approval
    const nextIndex = viewingStageIndex + 1
    if (nextIndex < applicableStages.length && applicableStages[nextIndex].isMilestone) {
      setViewingStageIndex(nextIndex)
    }
    setActiveSession(null)
  }, [activeSession, viewingStageIndex, applicableStages])

  // Handle save modal submit
  const handleSaveModalSubmit = useCallback((type: 'save_continue' | 'pause' | 'blocked') => {
    if (type === 'blocked') {
      setShowSaveModal(false)
      setShowBlockedModal(true)
    } else if (type === 'pause') {
      // Close work log entry with PAUSE action
      if (activeSession) {
        const now = new Date()
        setWorkLogEntries(prev => prev.map(entry => {
          if (entry.badge === activeSession.startedBy.badge && entry.clockOutAt === null) {
            const clockInTime = new Date(entry.clockInAt)
            const durationMinutes = Math.round((now.getTime() - clockInTime.getTime()) / 60000)
            return {
              ...entry,
              clockOutAt: now.toISOString(),
              durationMinutes,
              action: 'PAUSE' as const,
            }
          }
          return entry
        }))
      }
      setShowSaveModal(false)
      setActiveSession(null)
    } else {
      setShowSaveModal(false)
    }
  }, [activeSession])

  // Handle SWS data change
  const handleSwsDataChange = useCallback((data: SwsSection[]) => {
    if (activeStage) {
      setSwsDataByStage(prev => ({ ...prev, [activeStage.id]: data }))
    }
  }, [activeStage])

  // Handle auth submit
  const handleAuthSubmit = useCallback(async (badge: string, pin: string) => {
    setIsSubmitting(true)
    setAuthError(null)
    setPinChangeRequired(false)

    if (authContext?.action === 'ipv_verify' && assignmentWorkers.includes(badge)) {
      setAuthError('You cannot verify your own work. A different user must perform IPV.')
      setIsSubmitting(false)
      return
    }

    try {
      const result = await verifyCredentials(badge, pin)
      if (!result.success || !result.user) {
        setPinChangeRequired(Boolean(result.requiresPinChange))
        setAuthError(result.error || 'Authentication failed.')
        return
      }

      const requiredRoles = authContext?.action === 'team_lead_approve'
        ? ['DEVELOPER', 'TEAM_LEAD'] as const
        : authContext?.action === 'ipv_verify'
          ? ['DEVELOPER', 'MANAGER', 'SUPERVISOR', 'TEAM_LEAD', 'QA'] as const
          : null

      if (requiredRoles && !requiredRoles.includes(result.user.role)) {
        setAuthError(
          getPermissionDeniedMessage(
            [...requiredRoles],
            authContext?.action === 'ipv_verify' ? 'VERIFY_STAGE' : undefined,
          ),
        )
        return
      }

      const userName = result.user.preferredName || result.user.legalName || `User ${badge}`
      const isIPV = activeStage?.isIPV

      if (isIPV) {
        setIpvVerifiers(prev => prev.includes(badge) ? prev : [...prev, badge])
      } else {
        setAssignmentWorkers(prev => prev.includes(badge) ? prev : [...prev, badge])
      }

      const workLogEntry: WorkLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        assignmentId: assignmentSlug,
        badge,
        userName,
        userInitials: result.user.initials,
        userRole: result.user.role,
        shift: result.user.currentShift,
        stage: activeStage?.id || 'UNASSIGNED',
        action: 'CLOCK_IN',
        clockInAt: new Date().toISOString(),
        clockOutAt: null,
        durationMinutes: null,
        notes: isIPV ? 'IPV Verification' : null,
      }
      setWorkLogEntries(prev => [...prev, workLogEntry])

      if (activeStage?.isMilestone && !activeStage.isExecutable) {
        if (blockedState.requiresTeamLeadApproval) {
          setBlockedState({ isBlocked: false })
        }

        setWorkLogEntries(prev => prev.map(entry =>
          entry.id === workLogEntry.id
            ? { ...entry, clockOutAt: new Date().toISOString(), durationMinutes: 0, action: 'COMPLETE' as const }
            : entry,
        ))

        handleCompleteStage()
      } else {
        setActiveSession({
          stageId: activeStage?.id || 'UNASSIGNED',
          startedBy: { badge, name: userName },
          startedAt: new Date().toISOString(),
          isIPVRequired: isIPV || false,
        })
      }

      setAuthModalOpen(false)
      setAuthContext(null)
    } finally {
      setIsSubmitting(false)
    }
  }, [activeStage, assignmentSlug, assignmentWorkers, authContext, blockedState.requiresTeamLeadApproval, handleCompleteStage, verifyCredentials])

  const handlePinChangeSubmit = useCallback(async (badge: string, currentPin: string, nextPin: string) => {
    setIsSubmitting(true)
    setAuthError(null)

    try {
      const result = await changePin(badge, currentPin, nextPin)
      if (!result.success) {
        setAuthError(result.error || 'PIN update failed.')
        return
      }

      setPinChangeRequired(false)
      setAuthError(null)
    } finally {
      setIsSubmitting(false)
    }
  }, [changePin])

  // Calculate save progress summary
  const saveProgressSummary: SaveProgressSummary = useMemo(() => {
    const totalSteps = currentSwsData.flatMap(s => s.elements.flatMap(e => e.subSteps)).length
    const completedSteps = currentSwsData.flatMap(s => s.elements.flatMap(e => e.subSteps.filter(step => step.completion || step.notApplicable))).length
    const blockedSteps = blockedState.blockedItems?.length || 0

    return {
      totalSteps,
      completedSteps,
      remainingSteps: totalSteps - completedSteps,
      blockedSteps,
      progress: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      canComplete: completedSteps === totalSteps,
      hasBlockedItems: blockedSteps > 0,
    }
  }, [currentSwsData, blockedState])

  // Loading/Not found states
  if (!currentProject) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Project not loaded</h2>
          <p className="text-muted-foreground mb-4">Please select a project first</p>
          <Link href="/projects">
            <Button>Go to Projects</Button>
          </Link>
        </div>
      </main>
    )
  }

  if (!assignment || !sheet) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Assignment not found</h2>
          <p className="text-muted-foreground mb-4">The requested assignment does not exist</p>
          <Link href="/projects">
            <Button>Back to Projects</Button>
          </Link>
        </div>
      </main>
    )
  }

  const swsInfo = SWS_TYPE_REGISTRY[assignment.selectedSwsType]
  const nodeStatus = getNodeStatus(assignmentSlug)
  const progress = Math.round((Math.max(0, currentStageIndex) / (applicableStages.length - 1)) * 100)

  // Render stage content based on active viewing stage
  const renderStageContent = () => {
    if (!activeStage) return null

    const commonProps: StageContentProps = {
      stage: activeStage,
      projectId,
      sheetSlug: assignmentSlug,
      sheetName: assignment.sheetName,
      session: activeSession,
      swsData: currentSwsData,
      rowCount: assignment.rowCount,
      swsType,
      onStartSession: handleStartSession,
      onCompleteStage: handleCompleteStage,
      onSaveProgress: handleSaveProgress,
      onMarkBlocked: handleMarkBlocked,
      onSwsDataChange: handleSwsDataChange,
      hasExternalLocations,
      assignmentWorkers,
      ipvVerifiers,
      blockedState,
      hasBeenStarted: assignmentWorkers.length > 0 || currentStageIndex > 0,
    }

    if (activeStage.isMilestone || activeStage.isIPV) {
      return <MilestoneStageContent {...commonProps} />
    }

    // Wiring / Cross Wiring — use wire-by-wire execution when session is active
    if ((activeStage.id === 'WIRING' || activeStage.id === 'CROSS_WIRING') && activeSession) {
      return (
        <WiringStageContent
          projectId={projectId}
          sheetSlug={assignmentSlug}
          sheetName={assignment.sheetName}
          swsType={assignment.selectedSwsType || 'PANEL'}
          badge={activeSession.startedBy.badge}
          shift="1st"
          onClose={() => {
            handleCompleteStage()
          }}
        />
      )
    }

    if (activeStage.isExecutable) {
      return <ExecutableStageContent {...commonProps} />
    }

    // Terminal or non-executable stages
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{activeStage.label}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          {activeStage.description}
        </p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Breadcrumb Bar */}
      <div className="bg-background border-b">
        <div className="container mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/projects" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <Link
              href={`/projects/${projectId}`}
              className="text-muted-foreground hover:text-foreground transition-colors max-w-[200px] truncate"
            >
              {currentProject.name}
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{assignment.sheetName}</span>
          </nav>
        </div>
      </div>

      {/* Navy Blue Subheader */}
      <div className="bg-[#1e3a5f] text-white">
        <div className="container mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-white/10 p-3 hidden sm:flex">
                <FileSpreadsheet className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{assignment.sheetName}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    {swsInfo?.shortLabel || assignment.selectedSwsType}
                  </Badge>
                  {hasWireRows && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                      {assignment.rowCount} wires
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "border-0 text-xs",
                      blockedState.isBlocked ? "bg-amber-500/30 text-amber-100" :
                        nodeStatus.isBlocked ? "bg-red-500/30 text-red-100" :
                          nodeStatus.isReady ? "bg-green-500/30 text-green-100" :
                            "bg-blue-500/30 text-blue-100"
                    )}
                  >
                    {blockedState.isBlocked ? 'Blocked' : nodeStatus.isBlocked ? 'Dependency Blocked' : nodeStatus.isReady ? 'Ready' : 'In Progress'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeSession && (
                <Badge variant="secondary" className="bg-white/20 text-white border-0 gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {activeSession.startedBy.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Navigation Timeline */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-2 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => scrollTimeline('left')}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div
              ref={timelineRef}
              className="flex-1 overflow-x-auto scrollbar-none"
              onScroll={checkScrollState}
            >
              <div className="flex items-center min-w-max px-2 py-1">
                {applicableStages.map((stage, index) => {
                  const isCurrent = index === currentStageIndex
                  const isViewing = index === viewingStageIndex
                  const isPast = index < currentStageIndex
                  const isFuture = index > currentStageIndex + 1
                  const Icon = stage.icon

                  return (
                    <div key={stage.id} className="flex items-center">
                      {/* Connector line */}
                      {index > 0 && (
                        <div className={cn(
                          "w-8 h-0.5 -mx-1",
                          isPast ? "bg-emerald-500" : "bg-muted"
                        )} />
                      )}

                      {/* Stage node */}
                      <button
                        onClick={() => handleStageClick(index)}
                        disabled={isFuture}
                        className={cn(
                          "relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[80px]",
                          isViewing && "bg-muted ring-2 ring-primary",
                          isCurrent && !isViewing && "bg-amber-50 dark:bg-amber-950/30",
                          isPast && "opacity-70",
                          isFuture && "opacity-40 cursor-not-allowed",
                          !isFuture && !isViewing && "hover:bg-muted/50 cursor-pointer"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium",
                          isPast ? "bg-emerald-500" :
                            isCurrent ? "bg-amber-500" :
                              stage.isMilestone ? "bg-blue-500" :
                                "bg-muted-foreground/30"
                        )}>
                          {isPast ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <span className={cn(
                          "text-xs font-medium text-center whitespace-nowrap",
                          isViewing ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {stage.label}
                        </span>
                        {stage.isMilestone && !stage.isIPV && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                            Milestone
                          </Badge>
                        )}
                        {stage.isIPV && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-300 text-amber-600">
                            IPV
                          </Badge>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => scrollTimeline('right')}
              disabled={!canScrollRight}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Resume Banner */}
      {activeSession === null && swsDataByStage[activeStage?.id]?.some(s =>
        s.elements.some(e => e.subSteps.some(step => step.completion))
      ) && (
          <SwsResumeSessionBanner
            savedAt={new Date().toISOString()}
            savedBy={{ badge: assignmentWorkers[0] || '00000', name: 'Previous User' }}
            completedSteps={saveProgressSummary.completedSteps}
            totalSteps={saveProgressSummary.totalSteps}
            onResume={handleStartSession}
            onStartFresh={() => {
              if (activeStage) {
                const templateType = getSwsTemplateType(swsType)
                const allData = getSwsDataByType(templateType)
                let stageData: SwsSection[]
                if (activeStage.id === 'BUILD_UP' || activeStage.id === 'BOX_BUILD') {
                  stageData = allData.filter(s => s.phase === 'build-up')
                } else if (activeStage.id === 'WIRING' || activeStage.id === 'CROSS_WIRING') {
                  stageData = allData.filter(s => s.phase === 'wiring')
                } else {
                  stageData = allData
                }
                setSwsDataByStage(prev => ({ ...prev, [activeStage.id]: stageData }))
              }
            }}
          />
        )}

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stage Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {activeStage && (
                      <>
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          `bg-${activeStage.color}-100 dark:bg-${activeStage.color}-900/30`
                        )}>
                          <activeStage.icon className={cn("h-5 w-5", `text-${activeStage.color}-600`)} />
                        </div>
                        <div>
                          <CardTitle>{activeStage.label}</CardTitle>
                          <CardDescription>{activeStage.description}</CardDescription>
                        </div>
                      </>
                    )}
                  </div>
                  {activeStage?.isExecutable && (
                    <Badge variant="outline">
                      {SWS_DATA_TEMPLATE_METADATA[getSwsTemplateType(swsType)]?.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStage?.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStageContent()}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Overall</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Stage</span>
                      <span>{applicableStages[currentStageIndex]?.label || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining</span>
                      <span>{applicableStages.length - currentStageIndex - 1} stages</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Blocked Status Card */}
            {blockedState.isBlocked && (
              <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    Blocked Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SwsBlockedStatusBadge reason={blockedState.reason || 'MISSING_PARTS'} />
                  {blockedState.blockedItems && blockedState.blockedItems.length > 0 && (
                    <div className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                      {blockedState.blockedItems.length} items reported
                    </div>
                  )}
                  {blockedState.requiresTeamLeadApproval && (
                    <Badge className="mt-3 bg-amber-200 text-amber-800">
                      Awaiting Team Lead Approval
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Assignment Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assignment Info</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">SWS Type</dt>
                    <dd className="font-medium">{swsInfo?.label || swsType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Wire Count</dt>
                    <dd className="font-medium">{assignment.rowCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Has External</dt>
                    <dd className="font-medium">{hasExternalLocations ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Workers</dt>
                    <dd className="font-medium">{assignmentWorkers.length || 0}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>



            {/* Work Log */}
            <AssignmentWorkLog
              assignmentId={assignmentSlug}
              entries={workLogEntries}
              currentStage={activeStage?.id}
            />
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {authModalOpen && (
        <SecureActionModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          action={authContext?.action === 'ipv_verify' ? 'IPV_VERIFY' :
            authContext?.action === 'team_lead_approve' ? 'APPROVE_ASSIGNMENT' :
              'UPDATE_PROGRESS'}
          title={authContext?.action === 'ipv_verify' ? 'IPV Verification' :
            authContext?.action === 'team_lead_approve' ? 'Team Lead Approval' :
              `${assignmentWorkers.length > 0 || currentStageIndex > 0 ? 'Continue' : 'Start'} ${activeStage?.label}`}
          description={authContext?.action === 'ipv_verify'
            ? 'A different user must verify the previous stage work.'
            : authContext?.action === 'team_lead_approve'
              ? 'Team Lead sign-off required to proceed with blocked assignment.'
              : assignmentWorkers.length > 0 || currentStageIndex > 0
                ? 'Authenticate to continue where you left off.'
                : 'Authenticate with your badge and PIN to begin.'
          }
          onSubmit={handleAuthSubmit}
          blockedBadges={authContext?.action === 'ipv_verify' ? assignmentWorkers : undefined}
          blockedMessage="You cannot verify your own work."
          isSubmitting={isSubmitting}
          error={authError}
          pinChangeRequired={pinChangeRequired}
          onChangePin={handlePinChangeSubmit}
        />
      )}

      {/* Blocked Reason Modal */}
      <SwsBlockedReasonModal
        open={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
        onSubmit={handleBlockedSubmit}
        assignmentName={assignment.sheetName}
        currentStage={activeStage?.label || ''}
      />

      {/* Save Progress Modal */}
      <SwsSaveProgressModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSubmit={handleSaveModalSubmit}
        summary={saveProgressSummary}
        assignmentName={assignment.sheetName}
        currentStage={activeStage?.label || ''}
      />
    </main>
  )
}
