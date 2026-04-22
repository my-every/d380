/**
 * SWS (Standard Work Sheet) Components
 * 
 * Reusable components for rendering SWS worksheets in both print and tablet modes.
 */

// Main renderer
export { SwsWorksheetRenderer } from './sws-worksheet-renderer'

// Worksheet sections
export { SwsWorksheetHeader } from './sws-worksheet-header'
export { SwsWorksheetMetadataGrid } from './sws-worksheet-metadata-grid'
export { SwsWorksheetWorkElements } from './sws-worksheet-work-elements'
export { SwsWorksheetFooter } from './sws-worksheet-footer'

// Print mode
export { SwsPrintSidebar } from './sws-print-sidebar'

// Tablet mode
export { SwsTabletSectionPanel } from './sws-tablet-section-panel'

// Selection
export { SwsTemplatePicker } from './sws-template-picker'

// Work Element Table (interactive execution)
export { SwsWorkElementTable } from './sws-work-element-table'
export type { 
  SwsSection, 
  WorkElement, 
  SubStep, 
  SymbolType,
  StepCompletion,
  ContributingUser 
} from './sws-work-element-table'

// Blocked reason modal and components
export { 
  SwsBlockedReasonModal,
  SwsBlockedStatusBadge,
  SwsBlockedItemsList,
  BLOCKED_REASONS,
} from './sws-blocked-reason-modal'
export type { 
  BlockedReasonCode, 
  BlockedReason, 
  BlockedItem,
} from './sws-blocked-reason-modal'

// Save progress modal and components
export { 
  SwsSaveProgressModal,
  SwsResumeSessionBanner,
} from './sws-save-progress-modal'
export type { 
  SaveProgressType, 
  SaveProgressSummary, 
  SaveProgressResult,
} from './sws-save-progress-modal'
