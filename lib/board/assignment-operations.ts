import { getDefaultScheduleDateForShift, getDefaultStartTimeForShift, addMinutesToTime } from '@/lib/board/assignment-flow'
import { buildBoardData } from '@/lib/board/board-data'
import { findBoardAssignmentsForBadge, upsertBoardAssignment, readBoardAssignments, updateBoardAssignmentRecord } from '@/lib/board/board-store'
import { recordAssignmentCompetency, removeActiveAssignmentFromProfile } from '@/lib/board/skill-ledger'
import { readProfileFromShare, writeProfileToShare } from '@/lib/profile/share-profile-store'
import { verifyPinForRuntime } from '@/lib/session/runtime-user-store'
import { updateManifestBoardAssignment } from '@/lib/project-state/share-project-state-handlers'
import { getAllStations } from '@/types/floor-layout'
import type { BoardAssignmentSelectionInput, BoardAssignmentSource, BoardDataResponse } from '@/lib/board/types'
import type { ShiftId } from '@/types/shifts'

const ALLOWED_ASSIGNER_ROLES = new Set(['TEAM_LEAD', 'DEVELOPER'])

function buildBoardAvailabilityUpdate(params: {
  status: 'OFF_SHIFT' | 'AVAILABLE' | 'ON_ASSIGNMENT'
  shiftId: ShiftId | null
  activeAssignmentId?: string | null
  clockedInAt?: string | null
  clockedOutAt?: string | null
}) {
  return {
    boardAvailability: {
      status: params.status,
      shiftId: params.shiftId,
      updatedAt: new Date().toISOString(),
      clockedInAt: params.clockedInAt ?? null,
      clockedOutAt: params.clockedOutAt ?? null,
      activeAssignmentId: params.activeAssignmentId ?? null,
    },
  }
}

export async function verifyBoardAssigner(actorBadge: string, actorPin: string) {
  const auth = await verifyPinForRuntime(actorBadge, actorPin)
  if (!auth.valid || !auth.user) {
    return { ok: false as const, status: 401, error: 'Invalid scheduling badge credentials.' }
  }

  if (!ALLOWED_ASSIGNER_ROLES.has(auth.user.role)) {
    return { ok: false as const, status: 403, error: 'Only team leads and developers can assign projects from the board.' }
  }

  return { ok: true as const, user: auth.user }
}

function resolveAssignments(data: BoardDataResponse, items: BoardAssignmentSelectionInput[]) {
  const assignments = data.projects.flatMap(project => project.assignments)
  return items.map(item => ({
    item,
    assignment: assignments.find(candidate => candidate.assignmentId === item.assignmentId) ?? null,
  }))
}

function findEstimatedMinutes(data: BoardDataResponse, assignmentId: string) {
  return data.projects
    .flatMap(project => project.assignments)
    .find(assignment => assignment.assignmentId === assignmentId)
    ?.estimatedMinutes
}

export async function assignBoardAssignments(params: {
  actorBadge: string
  actorPin: string
  memberBadge: string
  items: BoardAssignmentSelectionInput[]
  shiftId?: ShiftId | null
  scheduledDate?: string | null
  startTime?: string | null
  source?: BoardAssignmentSource | null
  assignmentGroupId?: string | null
}) {
  const actorBadge = params.actorBadge.trim().replace(/\D/g, '')
  const actorPin = params.actorPin.trim().replace(/\D/g, '')
  const memberBadge = params.memberBadge.trim().replace(/\D/g, '')

  if (!actorBadge || !actorPin || !memberBadge || params.items.length === 0) {
    return { ok: false as const, status: 400, error: 'Missing actor badge, PIN, member badge, or assignment items.' }
  }

  const auth = await verifyBoardAssigner(actorBadge, actorPin)
  if (!auth.ok) {
    return auth
  }

  const data = await buildBoardData()
  const resolved = resolveAssignments(data, params.items)
  if (resolved.some(entry => !entry.assignment)) {
    return { ok: false as const, status: 404, error: 'One or more assignments were not found on the current board.' }
  }

  const assignmentGroupId = params.assignmentGroupId ?? `grp-${Date.now()}`
  const previousAssignments = readBoardAssignments()
  const stations = getAllStations()
  const scheduledDate = params.scheduledDate ?? (params.shiftId ? getDefaultScheduleDateForShift(params.shiftId) : null)
  const startTime = params.startTime ?? (params.shiftId ? getDefaultStartTimeForShift(params.shiftId) : null)

  const records = []

  for (const [index, entry] of resolved.entries()) {
    if (!entry.assignment) {
      continue
    }

    const selectedStationId = entry.item.workAreaId ?? entry.assignment.workAreaId ?? null
    const station = selectedStationId ? stations.find(candidate => candidate.id === selectedStationId) : null
    const nextStartTime = entry.item.startTime ?? startTime
    const estimatedMinutes = entry.assignment.estimatedMinutes
    const nextEndTime = entry.item.endTime ?? (nextStartTime ? addMinutesToTime(nextStartTime, estimatedMinutes) : null)
    const queueIndex = entry.item.queueIndex ?? index
    const previousRecord = previousAssignments[entry.assignment.assignmentId]

    const record = upsertBoardAssignment({
      assignmentId: entry.assignment.assignmentId,
      projectId: entry.assignment.projectId,
      projectName: entry.assignment.projectName,
      pdNumber: entry.assignment.pdNumber,
      sheetSlug: entry.assignment.sheetSlug,
      sheetName: entry.assignment.sheetName,
      stage: entry.assignment.stage,
      assignedBadge: memberBadge,
      assignedByBadge: actorBadge,
      partNumbers: entry.assignment.partNumbers,
      workAreaId: station?.id ?? selectedStationId,
      workAreaLabel: station?.shortLabel ?? station?.label ?? null,
      floorArea: station?.floorArea ?? null,
      shiftId: params.shiftId ?? entry.assignment.shiftId ?? null,
      scheduledDate,
      startTime: nextStartTime,
      endTime: nextEndTime,
      queueIndex,
      assignmentGroupId: params.items.length > 1 ? assignmentGroupId : null,
      source: params.source ?? null,
      workflowStatus: station?.id ? 'scheduled' : 'pending',
    })

    if (previousRecord?.assignedBadge && previousRecord.assignedBadge !== memberBadge) {
      await removeActiveAssignmentFromProfile(previousRecord.assignedBadge, previousRecord.assignmentId)
    }

    await recordAssignmentCompetency({
      badge: memberBadge,
      assignmentId: record.assignmentId,
      projectId: record.projectId,
      projectName: record.projectName,
      pdNumber: record.pdNumber,
      sheetName: record.sheetName,
      sheetSlug: record.sheetSlug,
      stage: record.stage,
      partNumbers: record.partNumbers,
      assignedAt: record.assignedAt,
      assignedByBadge: actorBadge,
      workspaceHref: record.workspaceHref,
    })

    await updateManifestBoardAssignment(record.projectId, record.sheetSlug, {
      assignmentId: record.assignmentId,
      estimatedMinutes,
      assignedBadge: record.assignedBadge,
      assignedAt: record.assignedAt,
      workAreaId: record.workAreaId,
      workAreaLabel: record.workAreaLabel,
      floorArea: record.floorArea,
      shiftId: record.shiftId,
      scheduledDate: record.scheduledDate,
      startTime: record.startTime,
      endTime: record.endTime,
      queueIndex: record.queueIndex,
      assignmentGroupId: record.assignmentGroupId,
      source: record.source,
      workflowStatus: record.workflowStatus,
    })

    records.push(record)
  }

  return { ok: true as const, records }
}

export async function persistBoardTimelineUpdate(params: {
  assignmentId: string
  resourceId: string
  startTime: string
  endTime?: string | null
  shiftId: ShiftId
  scheduledDate?: string | null
}) {
  const data = await buildBoardData()
  const assignment = data.projects.flatMap(project => project.assignments).find(item => item.assignmentId === params.assignmentId)
  if (!assignment) {
    return { ok: false as const, status: 404, error: 'Assignment not found.' }
  }

  const station = getAllStations().find(candidate => candidate.id === params.resourceId)
  if (!station) {
    return { ok: false as const, status: 404, error: 'Work area not found.' }
  }

  const existingRecord = readBoardAssignments()[params.assignmentId]
  const nextEndTime = params.endTime ?? existingRecord?.endTime ?? assignment.endTime ?? null

  const record = existingRecord
    ? updateBoardAssignmentRecord(params.assignmentId, {
      workAreaId: station.id,
      workAreaLabel: station.shortLabel,
      floorArea: station.floorArea,
      shiftId: params.shiftId,
      scheduledDate: params.scheduledDate ?? existingRecord.scheduledDate ?? assignment.scheduledDate,
      startTime: params.startTime,
      endTime: nextEndTime,
      source: existingRecord.source ?? 'timeline',
      workflowStatus: 'scheduled',
    })
    : assignment.assignedBadge
      ? upsertBoardAssignment({
        assignmentId: assignment.assignmentId,
        projectId: assignment.projectId,
        projectName: assignment.projectName,
        pdNumber: assignment.pdNumber,
        sheetSlug: assignment.sheetSlug,
        sheetName: assignment.sheetName,
        stage: assignment.stage,
        assignedBadge: assignment.assignedBadge,
        assignedByBadge: assignment.assignedBadge,
        partNumbers: assignment.partNumbers,
        workAreaId: station.id,
        workAreaLabel: station.shortLabel,
        floorArea: station.floorArea,
        shiftId: params.shiftId,
        scheduledDate: params.scheduledDate ?? assignment.scheduledDate,
        startTime: params.startTime,
        endTime: nextEndTime,
        source: 'timeline',
        workflowStatus: 'scheduled',
      })
      : null

  if (!record) {
    return { ok: false as const, status: 400, error: 'Cannot persist a timeline update for an unassigned board item.' }
  }

  await updateManifestBoardAssignment(record.projectId, record.sheetSlug, {
    assignmentId: record.assignmentId,
    estimatedMinutes: assignment.estimatedMinutes,
    assignedBadge: record.assignedBadge,
    assignedAt: record.assignedAt,
    workAreaId: record.workAreaId,
    workAreaLabel: record.workAreaLabel,
    floorArea: record.floorArea,
    shiftId: record.shiftId,
    scheduledDate: record.scheduledDate,
    startTime: record.startTime,
    endTime: record.endTime,
    queueIndex: record.queueIndex,
    assignmentGroupId: record.assignmentGroupId,
    source: record.source,
    workflowStatus: record.workflowStatus,
  })

  return { ok: true as const, record }
}

export async function badgeInBoardMember(params: {
  badge: string
  pin: string
  shiftId: ShiftId
}) {
  const badge = params.badge.trim().replace(/\D/g, '')
  const pin = params.pin.trim().replace(/\D/g, '')
  const auth = await verifyPinForRuntime(badge, pin)
  if (!auth.valid || !auth.user) {
    return { ok: false as const, status: 401, error: 'Invalid badge credentials.' }
  }

  const profile = await readProfileFromShare(badge)
  if (!profile) {
    return { ok: false as const, status: 404, error: 'Member profile not found.' }
  }

  const scheduledAssignment = findBoardAssignmentsForBadge(badge)
    .find(record => record.shiftId === params.shiftId && record.workflowStatus === 'scheduled')

  if (scheduledAssignment) {
    const started = await startBoardAssignment({
      badge,
      pin,
      assignmentId: scheduledAssignment.assignmentId,
    })

    if (!started.ok) {
      return started
    }

    return {
      ok: true as const,
      message: `Clocked into ${scheduledAssignment.pdNumber} · ${scheduledAssignment.sheetName}. Actual assignment time is now running.`,
      assignment: started.assignment,
    }
  }

  const updated = await writeProfileToShare(badge, buildBoardAvailabilityUpdate({
    status: 'AVAILABLE',
    shiftId: params.shiftId,
    clockedInAt: new Date().toISOString(),
    clockedOutAt: null,
    activeAssignmentId: null,
  }))

  if (!updated) {
    return { ok: false as const, status: 500, error: 'Failed to badge in member.' }
  }

  return {
    ok: true as const,
    message: `Badge in complete. No scheduled assignment was started, so this member is now available for ${params.shiftId} shift scheduling.`,
    assignment: null,
  }
}

export async function startBoardAssignment(params: {
  badge: string
  pin: string
  assignmentId: string
}) {
  const badge = params.badge.trim().replace(/\D/g, '')
  const pin = params.pin.trim().replace(/\D/g, '')
  const assignmentId = params.assignmentId.trim()
  const auth = await verifyPinForRuntime(badge, pin)
  if (!auth.valid || !auth.user) {
    return { ok: false as const, status: 401, error: 'Invalid badge credentials.' }
  }

  const record = readBoardAssignments()[assignmentId]
  if (!record || record.assignedBadge !== badge) {
    return { ok: false as const, status: 404, error: 'Assigned board work was not found for this badge.' }
  }
  const data = await buildBoardData()
  const estimatedMinutes = findEstimatedMinutes(data, assignmentId) ?? record.partNumbers.length

  const actualStartTime = record.actualStartTime ?? new Date().toISOString()
  const updatedRecord = updateBoardAssignmentRecord(assignmentId, {
    workflowStatus: 'in-progress',
    actualStartTime,
    actualEndTime: null,
  })

  if (!updatedRecord) {
    return { ok: false as const, status: 500, error: 'Failed to start assignment.' }
  }

  await updateManifestBoardAssignment(updatedRecord.projectId, updatedRecord.sheetSlug, {
    assignmentId: updatedRecord.assignmentId,
    estimatedMinutes,
    assignedBadge: updatedRecord.assignedBadge,
    assignedAt: updatedRecord.assignedAt,
    workAreaId: updatedRecord.workAreaId,
    workAreaLabel: updatedRecord.workAreaLabel,
    floorArea: updatedRecord.floorArea,
    shiftId: updatedRecord.shiftId,
    scheduledDate: updatedRecord.scheduledDate,
    startTime: updatedRecord.startTime,
    endTime: updatedRecord.endTime,
    queueIndex: updatedRecord.queueIndex,
    assignmentGroupId: updatedRecord.assignmentGroupId,
    source: updatedRecord.source,
    workflowStatus: updatedRecord.workflowStatus,
    actualStartTime: updatedRecord.actualStartTime,
    actualEndTime: updatedRecord.actualEndTime,
  })

  const updated = await writeProfileToShare(badge, buildBoardAvailabilityUpdate({
    status: 'ON_ASSIGNMENT',
    shiftId: updatedRecord.shiftId ?? null,
    activeAssignmentId: updatedRecord.assignmentId,
    clockedInAt: new Date().toISOString(),
    clockedOutAt: null,
  }))

  if (!updated) {
    return { ok: false as const, status: 500, error: 'Failed to update member availability.' }
  }

  return { ok: true as const, assignment: updatedRecord }
}

export async function badgeOutBoardMember(params: {
  badge: string
  pin: string
}) {
  const badge = params.badge.trim().replace(/\D/g, '')
  const pin = params.pin.trim().replace(/\D/g, '')
  const auth = await verifyPinForRuntime(badge, pin)
  if (!auth.valid || !auth.user) {
    return { ok: false as const, status: 401, error: 'Invalid badge credentials.' }
  }

  const profile = await readProfileFromShare(badge)
  if (!profile) {
    return { ok: false as const, status: 404, error: 'Member profile not found.' }
  }

  const currentAvailability = profile.boardAvailability ?? null
  const activeAssignmentId = currentAvailability?.activeAssignmentId ?? null
  let message = 'Badge out complete. Member is now off shift.'
  if (activeAssignmentId) {
    const data = await buildBoardData()
    const activeRecord = findBoardAssignmentsForBadge(badge).find(record => record.assignmentId === activeAssignmentId)
    if (activeRecord) {
      const estimatedMinutes = findEstimatedMinutes(data, activeAssignmentId) ?? activeRecord.partNumbers.length
      const endedRecord = updateBoardAssignmentRecord(activeAssignmentId, {
        workflowStatus: 'scheduled',
        actualEndTime: new Date().toISOString(),
      })

      if (endedRecord) {
        await updateManifestBoardAssignment(endedRecord.projectId, endedRecord.sheetSlug, {
          assignmentId: endedRecord.assignmentId,
          estimatedMinutes,
          assignedBadge: endedRecord.assignedBadge,
          assignedAt: endedRecord.assignedAt,
          workAreaId: endedRecord.workAreaId,
          workAreaLabel: endedRecord.workAreaLabel,
          floorArea: endedRecord.floorArea,
          shiftId: endedRecord.shiftId,
          scheduledDate: endedRecord.scheduledDate,
          startTime: endedRecord.startTime,
          endTime: endedRecord.endTime,
          queueIndex: endedRecord.queueIndex,
          assignmentGroupId: endedRecord.assignmentGroupId,
          source: endedRecord.source,
          workflowStatus: endedRecord.workflowStatus,
          actualStartTime: endedRecord.actualStartTime,
          actualEndTime: endedRecord.actualEndTime,
        })
        message = `Clocked out of ${endedRecord.pdNumber} · ${endedRecord.sheetName}. Actual assignment time was captured and the work remains scheduled for continuation.`
      }
    }
  }

  const updated = await writeProfileToShare(badge, buildBoardAvailabilityUpdate({
    status: 'OFF_SHIFT',
    shiftId: currentAvailability?.shiftId ?? null,
    activeAssignmentId: null,
    clockedInAt: currentAvailability?.clockedInAt ?? null,
    clockedOutAt: new Date().toISOString(),
  }))

  if (!updated) {
    return { ok: false as const, status: 500, error: 'Failed to badge out member.' }
  }

  return { ok: true as const, message }
}
