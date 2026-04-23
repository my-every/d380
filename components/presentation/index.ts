/**
 * Presentation Components
 * 
 * Reusable components for creating architecture review presentations.
 */

export { ArchitectureSlideShell } from './architecture-slide-shell'
export type { SlideConfig } from './architecture-slide-shell'

export {
  StatusBadge,
  MetricCard,
  ComponentCard,
  ArchitectureLayer,
  PipelineStage,
  GapMatrix,
  RoadmapTimeline,
  KeyPoints,
  SourceInputCard,
  FlowConnector,
} from './slide-components'
export type { ImplementationStatus } from './slide-components'

export {
  ArchitectureFlowDiagram,
  StageLifecycleDiagram,
  SwsTypeCard,
  SwsTypeGrid,
  EstimatingFlowDiagram,
  DependencyGraphVisual,
} from './architecture-diagrams'
