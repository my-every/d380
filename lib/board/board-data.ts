import 'server-only'

import { listStoredProjects } from '@/lib/project-state/share-project-state-handlers'
import { readBoardAssignments } from '@/lib/board/board-store'
import { listBoardMemberProfiles } from '@/lib/board/team-members'
import { getAssignmentRoleLabel, mapStageToAssignmentRole } from '@/lib/board/stage-workspaces'
import { estimateMinutesForAssignment } from '@/lib/board/assignment-flow'
import type { ManifestAssignment, ProjectManifest } from '@/types/project-manifest'
import type { AssignmentStage } from '@/lib/services/contracts/assignment-state-service'
import type { BoardAssignmentView, BoardDataResponse, BoardMemberView, BoardProjectView } from '@/lib/board/types'

function mapManifestStage(value: ManifestAssignment['stage']): AssignmentStage {
  switch (value) {
    case 'BUILD_UP':
    case 'WIRING':
    case 'BOX_BUILD':
    case 'CROSS_WIRING':
    case 'BIQ':
      return value
    case 'WIRING_IPV':
      return 'IPV2'
    case 'TEST_1ST_PASS':
      return 'TEST'
    case 'POWER_CHECK':
      return 'POWER_CHECK'
    case 'READY_TO_TEST':
      return 'TEST_READY'
    case 'READY_FOR_BIQ':
    case 'FINISHED_BIQ':
      return 'BIQ'
    default:
      return 'KITTED'
  }
}

function deriveProjectStatus(project: ProjectManifest) {
  const aggregates = project.aggregates

  if (!aggregates || aggregates.totalAssignments === 0) {
    return 'Ready'
  }

  if (aggregates.completedAssignments >= aggregates.totalAssignments) {
    return 'Complete'
  }

  if (aggregates.blockedAssignments > 0) {
    return 'Blocked'
  }

  if (aggregates.inProgressAssignments > 0) {
    return 'In Progress'
  }

  return 'Not Started'
}

function buildProjectAssignments(project: ProjectManifest): BoardAssignmentView[] {
  const persistedAssignments = readBoardAssignments()

  return Object.values(project.assignments)
    .filter(assignment => assignment.kind === 'operational')
    .map((assignment) => {
      const manifestBoardAssignment = assignment.boardAssignment
      const record = persistedAssignments[manifestBoardAssignment?.assignmentId ?? ''] ?? persistedAssignments[assignment.sheetSlug] ?? persistedAssignments[`${project.id}:${assignment.sheetSlug}`]
      const stage = mapManifestStage(assignment.stage)
      return {
        assignmentId: record?.assignmentId ?? manifestBoardAssignment?.assignmentId ?? `${project.id}:${assignment.sheetSlug}`,
        projectId: project.id,
        pdNumber: project.pdNumber,
        projectName: project.name,
        sheetSlug: assignment.sheetSlug,
        sheetName: assignment.sheetName,
        stage,
        stageRole: getAssignmentRoleLabel(mapStageToAssignmentRole(stage)),
        status: assignment.status,
        partNumbers: assignment.partNumbers ?? [],
        estimatedMinutes: record?.partNumbers?.length || manifestBoardAssignment?.estimatedMinutes
          ? manifestBoardAssignment?.estimatedMinutes ?? estimateMinutesForAssignment({
            stageRole: getAssignmentRoleLabel(mapStageToAssignmentRole(stage)),
            partNumbers: assignment.partNumbers ?? [],
          })
          : estimateMinutesForAssignment({
          stageRole: getAssignmentRoleLabel(mapStageToAssignmentRole(stage)),
          partNumbers: assignment.partNumbers ?? [],
        }),
        assignedBadge: record?.assignedBadge ?? manifestBoardAssignment?.assignedBadge ?? null,
        assignedAt: record?.assignedAt ?? manifestBoardAssignment?.assignedAt ?? null,
        workspaceHref: record?.workspaceHref ?? null,
        workAreaId: record?.workAreaId ?? manifestBoardAssignment?.workAreaId ?? null,
        workAreaLabel: record?.workAreaLabel ?? manifestBoardAssignment?.workAreaLabel ?? null,
        floorArea: record?.floorArea ?? manifestBoardAssignment?.floorArea ?? null,
        shiftId: record?.shiftId ?? manifestBoardAssignment?.shiftId ?? null,
        scheduledDate: record?.scheduledDate ?? manifestBoardAssignment?.scheduledDate ?? null,
        startTime: record?.startTime ?? manifestBoardAssignment?.startTime ?? null,
        endTime: record?.endTime ?? manifestBoardAssignment?.endTime ?? null,
        queueIndex: record?.queueIndex ?? manifestBoardAssignment?.queueIndex ?? null,
        assignmentGroupId: record?.assignmentGroupId ?? manifestBoardAssignment?.assignmentGroupId ?? null,
        source: record?.source ?? manifestBoardAssignment?.source ?? null,
        workflowStatus: record?.workflowStatus ?? manifestBoardAssignment?.workflowStatus ?? ((record?.workAreaId ?? manifestBoardAssignment?.workAreaId) ? 'scheduled' : 'pending'),
        actualStartTime: record?.actualStartTime ?? manifestBoardAssignment?.actualStartTime ?? null,
        actualEndTime: record?.actualEndTime ?? manifestBoardAssignment?.actualEndTime ?? null,
      }
    })
}

export async function buildBoardData(): Promise<BoardDataResponse> {
  const manifests = await listStoredProjects()
  const members = listBoardMemberProfiles()

  const projects: BoardProjectView[] = manifests.map(project => ({
    id: project.id,
    pdNumber: project.pdNumber,
    name: project.name,
    lwcType: String(project.lwcType ?? ''),
    unitNumber: project.unitNumber,
    status: deriveProjectStatus(project),
    assignments: buildProjectAssignments(project),
  }))

  const boardMembers: BoardMemberView[] = members.map(member => ({
    badge: member.badge,
    fullName: member.fullName,
    preferredName: member.preferredName,
    initials: member.initials,
    role: member.role,
    shift: member.shift,
    primaryLwc: member.primaryLwc,
    yearsExperience: member.yearsExperience ?? 0,
    skills: member.skills ?? {},
    activeAssignments: ((member as Record<string, unknown>).activeAssignments as BoardMemberView['activeAssignments'] | undefined) ?? [],
    assignmentCompetency: ((member as Record<string, unknown>).assignmentCompetency as BoardMemberView['assignmentCompetency'] | undefined) ?? null,
    availabilityStatus: (((member as Record<string, unknown>).boardAvailability as Record<string, unknown> | undefined)?.status as BoardMemberView['availabilityStatus'] | undefined) ?? 'OFF_SHIFT',
    availabilityShiftId: (((member as Record<string, unknown>).boardAvailability as Record<string, unknown> | undefined)?.shiftId as BoardMemberView['availabilityShiftId'] | undefined) ?? null,
    availabilityUpdatedAt: (((member as Record<string, unknown>).boardAvailability as Record<string, unknown> | undefined)?.updatedAt as string | undefined) ?? null,
    availabilityClockedInAt: (((member as Record<string, unknown>).boardAvailability as Record<string, unknown> | undefined)?.clockedInAt as string | undefined) ?? null,
    availabilityClockedOutAt: (((member as Record<string, unknown>).boardAvailability as Record<string, unknown> | undefined)?.clockedOutAt as string | undefined) ?? null,
    activeAssignmentId: (((member as Record<string, unknown>).boardAvailability as Record<string, unknown> | undefined)?.activeAssignmentId as string | undefined) ?? null,
  }))

  return {
    projects,
    members: boardMembers,
    summary: {
      projectCount: projects.length,
      assignmentCount: projects.reduce((total, project) => total + project.assignments.length, 0),
      assignedCount: projects.reduce((total, project) => total + project.assignments.filter(assignment => assignment.assignedBadge).length, 0),
      memberCount: boardMembers.length,
    },
  }
}
