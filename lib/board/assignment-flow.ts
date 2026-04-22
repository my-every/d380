import type { BoardAssignmentView, BoardMemberView } from '@/lib/board/types'
import type { AssignmentStageRole } from '@/lib/board/stage-workspaces'
import type { ShiftId } from '@/types/shifts'
import { SHIFT_SCHEDULES } from '@/types/shifts'

function normalizePartNumber(value: string) {
  return value.trim().toUpperCase()
}

function toSkillKey(stageRoleLabel: string) {
  switch (stageRoleLabel) {
    case 'Kitting':
      return 'kitting'
    case 'Branding':
      return 'branding'
    case 'Build Up':
      return 'buildUp'
    case 'Wiring':
      return 'wiring'
    case 'Box Build':
      return 'boxBuild'
    case 'Cross Wiring':
      return 'crossWire'
    case 'Test':
      return 'test'
    case 'BIQ':
      return 'biq'
    default:
      return stageRoleLabel.toLowerCase().replace(/\s+/g, '')
  }
}

export function estimateMinutesForAssignment(assignment: Pick<BoardAssignmentView, 'stageRole' | 'partNumbers'>) {
  const partCount = Math.max(assignment.partNumbers.length, 1)

  switch (assignment.stageRole) {
    case 'Kitting':
      return 30 + partCount * 4
    case 'Branding':
      return 45 + partCount * 5
    case 'Build Up':
      return 90 + partCount * 8
    case 'Wiring':
      return 150 + partCount * 10
    case 'Box Build':
      return 120 + partCount * 8
    case 'Cross Wiring':
      return 150 + partCount * 9
    case 'Test':
      return 75 + partCount * 6
    case 'BIQ':
      return 60 + partCount * 5
    default:
      return 60 + partCount * 5
  }
}

export function getFollowingShiftId(now = new Date()): ShiftId {
  const minutes = now.getHours() * 60 + now.getMinutes()
  const firstShiftEnd = 14 * 60 + 30
  return minutes < firstShiftEnd ? '2nd' : '1st'
}

export function getDefaultScheduleDateForShift(shiftId: ShiftId, now = new Date()) {
  const scheduled = new Date(now)
  const followingShift = getFollowingShiftId(now)

  if (followingShift === '1st' && shiftId === '1st') {
    scheduled.setDate(scheduled.getDate() + 1)
  }

  return scheduled.toISOString().slice(0, 10)
}

export function getDefaultStartTimeForShift(shiftId: ShiftId) {
  return SHIFT_SCHEDULES[shiftId].standardStart
}

export function addMinutesToTime(startTime: string, minutesToAdd: number) {
  const [hours, minutes] = startTime.split(':').map(Number)
  const total = hours * 60 + minutes + minutesToAdd
  const normalized = ((total % (24 * 60)) + (24 * 60)) % (24 * 60)
  const nextHours = Math.floor(normalized / 60)
  const nextMinutes = normalized % 60
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`
}

export function getMemberStageSkill(member: BoardMemberView, stageRoleLabel: string) {
  return member.skills[toSkillKey(stageRoleLabel)] ?? 0
}

export function getMemberRolePartCount(
  member: BoardMemberView,
  stageRole: AssignmentStageRole,
  partNumber: string,
) {
  const ledger = member.assignmentCompetency
  const roleCounts = ledger?.stagePartNumberCounts?.[stageRole]
  return roleCounts?.[normalizePartNumber(partNumber)] ?? 0
}
