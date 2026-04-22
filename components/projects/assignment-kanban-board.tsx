'use client'

/**
 * Assignment Kanban Board
 * 
 * Displays assignments in a kanban board layout grouped by stage.
 * Supports filtering by SWS type, stage, late status, and readiness state.
 * 
 * Each column represents a stage in the workflow:
 * Unassigned → Ready to Lay → Build Up → Ready for Visual → Wiring → 
 * Ready to Hang → Box Build → Cross Wiring → Test Ready → Test → 
 * Power Check → BIQ → Completed
 */

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Filter,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  Circle,
  AlertCircle,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { MappedAssignment } from './project-assignment-mapping-modal'
import type { AssignmentReadinessState } from '@/types/d380-assignment'
import type { AssignmentStageId } from '@/types/d380-assignment-stages'
import { getStageDefinition } from '@/types/d380-assignment-stages'
import { SWS_TYPE_REGISTRY, type SwsTypeId } from '@/lib/assignment/sws-detection'
import { useAssignmentDependencyGraph } from '@/hooks/use-assignment-dependency-graph'
import { AssignmentReadinessBadge } from './assignment-readiness-badge'
import type { AssignmentDependencyNode } from '@/types/d380-dependency-graph'

// ============================================================================
// Types
// ============================================================================

interface AssignmentKanbanBoardProps {
  assignments: MappedAssignment[]
  projectId: string
  projectName: string
  onAssignmentClick?: (assignment: MappedAssignment) => void
}

interface KanbanFilters {
  swsTypes: SwsTypeId[]
  stages: AssignmentStageId[]
  showLateOnly: boolean
  showBlockedOnly: boolean
}

// Stage order for board columns
const STAGE_ORDER: AssignmentStageId[] = [
  'UNASSIGNED',
  'READY_TO_LAY',
  'BUILD_UP',
  'READY_FOR_VISUAL',
  'WIRING',
  'READY_TO_HANG',
  'BOX_BUILD',
  'CROSS_WIRING',
  'TEST_READY',
  'TEST',
  'POWER_CHECK',
  'BIQ',
  'COMPLETED',
]

// Stage colors - Modern muted palette with better visual hierarchy
const STAGE_COLORS: Record<AssignmentStageId, {
  header: string
  body: string
  text: string
  accent: string
}> = {
  UNASSIGNED: {
    header: 'bg-slate-100 dark:bg-slate-800/60',
    body: 'bg-slate-50/50 dark:bg-slate-900/30',
    text: 'text-slate-600 dark:text-slate-300',
    accent: 'bg-slate-400'
  },
  READY_TO_LAY: {
    header: 'bg-sky-100 dark:bg-sky-900/40',
    body: 'bg-sky-50/30 dark:bg-sky-950/20',
    text: 'text-sky-700 dark:text-sky-300',
    accent: 'bg-sky-500'
  },
  BUILD_UP: {
    header: 'bg-amber-100/80 dark:bg-amber-900/30',
    body: 'bg-amber-50/30 dark:bg-amber-950/20',
    text: 'text-amber-700 dark:text-amber-400',
    accent: 'bg-amber-500'
  },

  WIRING: {
    header: 'bg-sky-100 dark:bg-sky-900/40',
    body: 'bg-sky-50/30 dark:bg-sky-950/20',
    text: 'text-sky-700 dark:text-sky-300',
    accent: 'bg-sky-500'
  },

  BOX_BUILD: {
    header: 'bg-purple-100 dark:bg-purple-900/40',
    body: 'bg-purple-50/30 dark:bg-purple-950/20',
    text: 'text-purple-700 dark:text-purple-300',
    accent: 'bg-purple-500'
  },
  CROSS_WIRING: {
    header: 'bg-fuchsia-100/80 dark:bg-fuchsia-900/30',
    body: 'bg-fuchsia-50/30 dark:bg-fuchsia-950/20',
    text: 'text-fuchsia-700 dark:text-fuchsia-400',
    accent: 'bg-fuchsia-500'
  },
  TEST_READY: {
    header: 'bg-cyan-100 dark:bg-cyan-900/40',
    body: 'bg-cyan-50/30 dark:bg-cyan-950/20',
    text: 'text-cyan-700 dark:text-cyan-300',
    accent: 'bg-cyan-500'
  },
  TEST: {
    header: 'bg-teal-100 dark:bg-teal-900/40',
    body: 'bg-teal-50/30 dark:bg-teal-950/20',
    text: 'text-teal-700 dark:text-teal-300',
    accent: 'bg-teal-500'
  },
  POWER_CHECK: {
    header: 'bg-emerald-100 dark:bg-emerald-900/40',
    body: 'bg-emerald-50/30 dark:bg-emerald-950/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    accent: 'bg-emerald-500'
  },
  BIQ: {
    header: 'bg-green-100 dark:bg-green-900/40',
    body: 'bg-green-50/30 dark:bg-green-950/20',
    text: 'text-green-700 dark:text-green-300',
    accent: 'bg-green-500'
  },

}

// ============================================================================
// Filter Controls Component
// ============================================================================

interface FilterControlsProps {
  filters: KanbanFilters
  onFilterChange: (filters: KanbanFilters) => void
  availableSwsTypes: SwsTypeId[]
  assignmentCount: number
  filteredCount: number
}

function FilterControls({
  filters,
  onFilterChange,
  availableSwsTypes,
  assignmentCount,
  filteredCount,
}: FilterControlsProps) {
  const hasActiveFilters =
    filters.swsTypes.length > 0 ||
    filters.stages.length > 0 ||
    filters.showLateOnly ||
    filters.showBlockedOnly

  const clearFilters = () => {
    onFilterChange({
      swsTypes: [],
      stages: [],
      showLateOnly: false,
      showBlockedOnly: false,
    })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* SWS Type Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-8 bg-card/50 border-border/50 hover:bg-card">
            <Layers className="h-3.5 w-3.5" />
            SWS Type
            {filters.swsTypes.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {filters.swsTypes.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Filter by SWS Type
            </div>
            {availableSwsTypes.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <Checkbox
                  id={`sws-${type}`}
                  checked={filters.swsTypes.includes(type)}
                  onCheckedChange={(checked) => {
                    onFilterChange({
                      ...filters,
                      swsTypes: checked
                        ? [...filters.swsTypes, type]
                        : filters.swsTypes.filter(t => t !== type)
                    })
                  }}
                />
                <Label htmlFor={`sws-${type}`} className="text-xs cursor-pointer">
                  {SWS_TYPE_REGISTRY[type]?.shortLabel || type}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Stage Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-8 bg-card/50 border-border/50 hover:bg-card">
            <Circle className="h-3.5 w-3.5" />
            Stage
            {filters.stages.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {filters.stages.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3 max-h-80 overflow-auto" align="start">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Filter by Stage
            </div>
            {STAGE_ORDER.map((stage) => (
              <div key={stage} className="flex items-center gap-2">
                <Checkbox
                  id={`stage-${stage}`}
                  checked={filters.stages.includes(stage)}
                  onCheckedChange={(checked) => {
                    onFilterChange({
                      ...filters,
                      stages: checked
                        ? [...filters.stages, stage]
                        : filters.stages.filter(s => s !== stage)
                    })
                  }}
                />
                <Label htmlFor={`stage-${stage}`} className="text-xs cursor-pointer">
                  {getStageDefinition(stage)?.label ?? stage}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Status Toggles */}
      <div className="flex items-center gap-2">
        <Button
          variant={filters.showLateOnly ? "default" : "outline"}
          size="sm"
          className="gap-2 h-8"
          onClick={() => onFilterChange({ ...filters, showLateOnly: !filters.showLateOnly })}
        >
          <Clock className="h-3.5 w-3.5" />
          Late
        </Button>
        <Button
          variant={filters.showBlockedOnly ? "default" : "outline"}
          size="sm"
          className="gap-2 h-8"
          onClick={() => onFilterChange({ ...filters, showBlockedOnly: !filters.showBlockedOnly })}
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Blocked
        </Button>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}

      {/* Count Display */}
      <div className="text-xs text-muted-foreground ml-auto">
        {filteredCount === assignmentCount
          ? `${assignmentCount} assignments`
          : `${filteredCount} of ${assignmentCount} assignments`
        }
      </div>
    </div>
  )
}

// ============================================================================
// Assignment Card Component
// ============================================================================

interface AssignmentCardProps {
  assignment: MappedAssignment
  nodeStatus?: {
    isBlocked: boolean
    isReady: boolean
    blockedReasons: string[]
    nextStage?: string
    unlocks: string[]
  }
  onClick?: () => void
}

function AssignmentCard({ assignment, nodeStatus, onClick }: AssignmentCardProps) {
  const swsInfo = SWS_TYPE_REGISTRY[assignment.selectedSwsType]
  const confidencePercent = assignment.detectedConfidence

  // Use real dependency graph state
  const isLate = false // TODO: Would come from due date comparison
  const isBlocked = nodeStatus?.isBlocked ?? false
  const isReady = nodeStatus?.isReady ?? false
  const nextStage = nodeStatus?.nextStage
  const blockedReasons = nodeStatus?.blockedReasons ?? []

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="px-2"
    >
      <Card
        className="cursor-pointer bg-card border border-border/40 shadow-sm py-2 hover:shadow-md max-w-[280px] hover:border-border/60 transition-all duration-200 group overflow-hidden"
        onClick={onClick}
      >
        {/* Color accent strip at left edge */}

        <CardContent className="p-3 flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-col items-start gap-2 min-w-0">
               {/* SWS Type Badge - more subtle */}
          <div className="mb-2.5">
            <Badge
              variant="secondary"
              className="text-[10px] h-5 font-medium bg-muted/60 text-muted-foreground border-0"
            >
              {swsInfo?.shortLabel || assignment.selectedSwsType}
            </Badge>
          </div>
              <span className="font-semibold text-sm truncate text-foreground" title={assignment.sheetName}>
                {assignment.sheetName}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isLate && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-medium">
                  Late
                </Badge>
              )}
              {isBlocked && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
                  Blocked
                </Badge>
              )}
              {isReady && !isBlocked && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                  Ready
                </Badge>
              )}
            </div>
          </div>

        

          {/* Next Stage Suggestion - softer styling */}
          {nextStage && !isBlocked && (
            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium">Next: {getStageDefinition(nextStage as AssignmentStageId)?.label ?? nextStage}</span>
            </div>
          )}

          {/* Blocked indicator with reasons */}
          {isBlocked && blockedReasons.length > 0 && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span className="line-clamp-2" title={blockedReasons.join('; ')}>
                  {blockedReasons[0]}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============================================================================
// Kanban Column Component
// ============================================================================

interface KanbanColumnProps {
  stage: AssignmentStageId
  assignments: MappedAssignment[]
  getNodeStatus: (assignmentId: string) => {
    isBlocked: boolean
    isReady: boolean
    blockedReasons: string[]
    nextStage?: string
    unlocks: string[]
  }
  onAssignmentClick?: (assignment: MappedAssignment) => void
}

function KanbanColumn({ stage, assignments, getNodeStatus, onAssignmentClick }: KanbanColumnProps) {
  const stageInfo = getStageDefinition(stage)
  const colors = STAGE_COLORS[stage] || STAGE_COLORS.UNASSIGNED

  // Early return if stage info is not found
  if (!stageInfo) {
    return null
  }

  return (
    <div className="flex flex-col h-full min-w-[300px] max-w-[300px]">
      {/* Column Header - Modern design with accent bar */}
      <div className={`relative overflow-hidden rounded-t-xl ${colors.header}`}>
        {/* Accent bar at top */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${colors.accent}`} />

        <div className="flex items-center justify-between px-4 py-3 pt-4">
          <div className="flex items-center gap-2.5">
            <h3 className={`font-semibold text-sm tracking-tight ${colors.text}`}>
              {stageInfo.label}
            </h3>
          </div>
          <span className={`text-xs font-medium tabular-nums ${colors.text} opacity-70`}>
            {assignments.length}
          </span>
        </div>
      </div>

      {/* Column Body */}
      <div className={`flex-1 rounded-b-xl border-x border-b border-border/20 p-2.5 overflow-hidden ${colors.body}`}>
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2.5 pr-2">
            <AnimatePresence mode="popLayout">
              {assignments.length === 0 ? (
                <div className="text-xs text-muted-foreground/60 text-center py-10 italic">
                  No assignments
                </div>
              ) : (
                assignments.map((assignment) => {
                  const nodeStatus = getNodeStatus(assignment.sheetSlug)
                  return (
                    <AssignmentCard
                      key={assignment.sheetSlug}
                      assignment={assignment}
                      nodeStatus={{
                        isBlocked: nodeStatus.isBlocked,
                        isReady: nodeStatus.isReady,
                        blockedReasons: nodeStatus.blockedReasons,
                        nextStage: nodeStatus.nextStage,
                        unlocks: nodeStatus.unlocks,
                      }}
                      onClick={() => onAssignmentClick?.(assignment)}
                    />
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

// ============================================================================
// Main Kanban Board Component
// ============================================================================

export function AssignmentKanbanBoard({
  assignments,
  projectId,
  projectName,
  onAssignmentClick,
}: AssignmentKanbanBoardProps) {
  const [filters, setFilters] = useState<KanbanFilters>({
    swsTypes: [],
    stages: [],
    showLateOnly: false,
    showBlockedOnly: false,
  })

  // Use the dependency graph hook
  const {
    graph,
    snapshot,
    crossWireReadiness,
    getNodeStatus,
    blockedAssignments,
    readyAssignments,
    crossWireAvailable,
    overallProgress,
  } = useAssignmentDependencyGraph(projectId, assignments)

  // Get unique SWS types from assignments
  const availableSwsTypes = useMemo(() => {
    const types = new Set(assignments.map(a => a.selectedSwsType))
    return Array.from(types)
  }, [assignments])

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
      // SWS type filter
      if (filters.swsTypes.length > 0 && !filters.swsTypes.includes(assignment.selectedSwsType)) {
        return false
      }

      // Stage filter
      if (filters.stages.length > 0 && !filters.stages.includes(assignment.selectedStage)) {
        return false
      }

      // Late filter (TODO: check against real due dates)
      // if (filters.showLateOnly && !assignment.isLate) return false

      // Blocked filter - now uses real dependency graph
      if (filters.showBlockedOnly && !blockedAssignments.includes(assignment.sheetSlug)) {
        return false
      }

      return true
    })
  }, [assignments, filters])

  // Group assignments by stage
  const assignmentsByStage = useMemo(() => {
    const grouped: Record<AssignmentStageId, MappedAssignment[]> = {
      UNASSIGNED: [],
      READY_TO_LAY: [],
      BUILD_UP: [],
      READY_FOR_VISUAL: [],
      WIRING: [],
      READY_TO_HANG: [],
      BOX_BUILD: [],
      CROSS_WIRING: [],
      TEST_READY: [],
      TEST: [],
      POWER_CHECK: [],
      BIQ: [],
      COMPLETED: [],
    }

    for (const assignment of filteredAssignments) {
      const stage = assignment.selectedStage ?? 'KITTED'
      grouped[stage].push(assignment)
    }

    return grouped
  }, [filteredAssignments])

  // Determine which columns to show (only show columns that have assignments or are in filter)
  const visibleStages = useMemo(() => {
    if (filters.stages.length > 0) {
      return filters.stages
    }

    // Show all stages that have assignments, plus always show core stages
    const coreStages: AssignmentStageId[] = ['UNASSIGNED', 'READY_TO_LAY', 'BUILD_UP', 'WIRING', 'COMPLETED']
    const stagesWithAssignments = STAGE_ORDER.filter(stage => assignmentsByStage[stage].length > 0)

    return Array.from(new Set([...coreStages, ...stagesWithAssignments])).sort(
      (a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b)
    )
  }, [filters.stages, assignmentsByStage])

  return (
    <div className="flex flex-col h-full">
      {/* Header with Filters */}
      <div className="mb-4">
        <FilterControls
          filters={filters}
          onFilterChange={setFilters}
          availableSwsTypes={availableSwsTypes}
          assignmentCount={assignments.length}
          filteredCount={filteredAssignments.length}
        />
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex gap-4 pb-4" style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
            {visibleStages.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                assignments={assignmentsByStage[stage]}
                getNodeStatus={(assignmentId) => {
                  const status = getNodeStatus(assignmentId)
                  return {
                    isBlocked: status.isBlocked,
                    isReady: status.isReady,
                    blockedReasons: status.blockedReasons,
                    nextStage: status.nextStage,
                    unlocks: status.unlocks,
                  }
                }}
                onAssignmentClick={onAssignmentClick}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  )
}
