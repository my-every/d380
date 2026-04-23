/**
 * Projects Components
 * 
 * Components for the /projects route and assignment system.
 */

// Assignment components
export { ProjectAssignmentMappingModal } from './project-assignment-mapping-modal'
export type { MappedAssignment, ProjectAssignmentMappingModalProps } from './project-assignment-mapping-modal'
export { AssignmentKanbanBoard } from './assignment-kanban-board'
export { AssignmentContextHeader } from './assignment-context-header'

// Metadata display components
export { MetadataCard, MetadataCardGrid } from './metadata-card'
export { SummarySection } from './summary-section'

// Stage navigation components
export {
  StageLinearStepper,
  StageVerticalTimeline,
  StagePillTabs,
  StagePhaseGroups,
  StageBreadcrumb,
  StageProgressBar,
  StageMiniStatus,
} from './stage-navigation'
