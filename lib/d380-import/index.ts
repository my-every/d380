/**
 * D380 Import Module
 * 
 * Handles scanning Legal Drawings and syncing to Share/Projects.
 * 
 * Usage:
 *   POST /api/project-context/projects/sync - Trigger sync from Legal Drawings
 *   GET /api/project-context/projects/sync  - List synced project folders
 */

export {
  importProjectsFromShare,
  buildShareProjectsBoardDataSet,
  buildShareProjectWorkspaceDataSet,
  buildShareStartupWorkspaceSummary,
  extractScheduleProjectNumbers,
} from './share-project-import'

export {
  syncProjectsFromLegalDrawings,
  getProjectFolders,
  isProjectSynced,
  type ProjectSyncResult,
} from './project-sync-service'
