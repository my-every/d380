import type { ShiftOptionId } from '@/types/d380-startup'
import type { ProjectAssignmentStatus } from '@/types/d380-shared'

export type ProjectsBoardLifecycleColumnId =
  | 'UPCOMING'
  | 'KITTED'
  | 'CONLAY'
  | 'CONASY'
  | 'TEST'
  | 'PWR_CHECK'
  | 'BIQ'
  | 'COMPLETED'

export type ProjectsBoardRiskLevel = 'healthy' | 'watch' | 'late'
export type ProjectsBoardAssignmentStage =
  | 'KIT'
  | 'BUILD_UP'
  | 'READY_TO_WIRE'
  | 'WIRING'
  | 'CROSS_WIRE'
  | 'READY_TO_TEST'
  | 'TEST_1ST_PASS'
  | 'PWR_CHECK'
  | 'BIQ'

/** @deprecated Use `ProjectAssignmentStatus` from `@/types/d380-shared` */
export type ProjectsBoardAssignmentStatus = ProjectAssignmentStatus

export interface ProjectsBoardAssignmentSnapshot {
  id: string
  sheetName: string
  assignee: string
  station: string
  stage: ProjectsBoardAssignmentStage
  status: ProjectsBoardAssignmentStatus
}

export interface ProjectsBoardMilestones {
  kitReady: boolean
  buildUpCompletionPercent: number
  readyToWirePercent: number
  crossWireComplete: boolean
  testReady: boolean
  testPassed: boolean
  powerCheckPassed: boolean
  biqComplete: boolean
  completedAt?: string | null
}

export interface D380ProjectsBoardProjectRecord {
  id: string
  pdNumber: string
  name: string
  owner: string
  shift: ShiftOptionId
  units: number
  targetDate: string
  layoutCoverLabel?: string
  coverTone: 'obsidian' | 'amber' | 'cream'
  statusNote: string
  assignments: ProjectsBoardAssignmentSnapshot[]
  milestones: ProjectsBoardMilestones
}

export interface D380ProjectsBoardDataSet {
  operatingDate: string
  projects: D380ProjectsBoardProjectRecord[]
}

export interface ProjectsBoardFilterState {
  search: string
  shift: ShiftOptionId | 'ALL'
  risk: ProjectsBoardRiskLevel | 'ALL'
  lifecycle: ProjectsBoardLifecycleColumnId | 'ALL'
  lateOnly: boolean
}

export interface ProjectsBoardOption {
  value: string
  label: string
}

export interface ProjectsBoardProjectCardViewModel {
  id: string
  pdNumber: string
  name: string
  owner: string
  shiftLabel: string
  units: number
  lifecycleStage: ProjectsBoardLifecycleColumnId
  lifecycleLabel: string
  risk: ProjectsBoardRiskLevel
  isLate: boolean
  lateReason?: string
  targetDateLabel: string
  statusNote: string
  progressPercent: number
  assignmentCounts: {
    total: number
    complete: number
    active: number
    blocked: number
  }
  layoutCoverLabel?: string
  coverTone: 'obsidian' | 'amber' | 'cream'
}

export interface ProjectsBoardColumnViewModel {
  id: ProjectsBoardLifecycleColumnId
  label: string
  description: string
  projects: ProjectsBoardProjectCardViewModel[]
}

export interface D380ProjectsBoardViewModel {
  operatingDateLabel: string
  totalProjects: number
  filteredProjectCount: number
  lateProjectCount: number
  completedProjectCount: number
  watchProjectCount: number
  hasActiveFilters: boolean
  shiftOptions: ProjectsBoardOption[]
  riskOptions: ProjectsBoardOption[]
  lifecycleOptions: ProjectsBoardOption[]
  columns: ProjectsBoardColumnViewModel[]
  emptyState: {
    title: string
    description: string
  }
}