# User Session — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces, types, constants, and utility functions related to user sessions, authentication, roles, secure actions, and timestamping in D380.

---

## Table of Contents

1. [User Roles](#1-user-roles)
2. [Execution Mode](#2-execution-mode)
3. [User Identity](#3-user-identity)
4. [Session State](#4-session-state)
5. [Secure Actions](#5-secure-actions)
6. [Credential Verification](#6-credential-verification)
7. [Timestamp Events](#7-timestamp-events)
8. [Role-Based Dashboard Configuration](#8-role-based-dashboard-configuration)
9. [Utility Functions](#9-utility-functions)

---

## 1. User Roles

**File:** `types/d380-user-session.ts`

### `UserRole`

```ts
type UserRole =
  | 'DEVELOPER'
  | 'MANAGER'
  | 'SUPERVISOR'
  | 'TEAM_LEAD'
  | 'QA'
  | 'BRANDER'
  | 'ASSEMBLER'
```

### Constants

```ts
const USER_ROLE_LABELS: Record<UserRole, string>
// 'DEVELOPER' → 'Developer', 'MANAGER' → 'Manager', etc.

const USER_ROLE_HIERARCHY: Record<UserRole, number>
// DEVELOPER: 200, MANAGER: 100, SUPERVISOR: 80, TEAM_LEAD: 60,
// QA: 50, BRANDER: 40, ASSEMBLER: 20
```

---

## 2. Execution Mode

**File:** `types/d380-user-session.ts`

```ts
type ExecutionMode = 'PRINT_MANUAL' | 'TABLET_INTERACTIVE'

const EXECUTION_MODE_LABELS: Record<ExecutionMode, string>
// 'PRINT_MANUAL' → 'Print Manual', 'TABLET_INTERACTIVE' → 'Tablet Interactive'
```

---

## 3. User Identity

**File:** `types/d380-user-session.ts`

### `D380User`

Simplified user type for authentication contexts.

```ts
interface D380User {
  id: string
  badgeNumber: string
  fullName: string
  initials: string
  avatarUrl?: string
  role: UserRole
}
```

### `UserIdentity`

Full user identity record with skills, preferences, and lifecycle fields.

```ts
interface UserIdentity {
  badge: string
  pinHash: string
  legalName: string
  preferredName: string
  initials: string
  role: UserRole
  avatarPath: string | null
  primaryLwc: string
  currentShift: string
  email: string | null
  phone: string | null
  isActive: boolean
  requiresPinChange: boolean
  createdAt: string
  updatedAt: string
  skills?: {
    brandList: number
    branding: number
    buildUp: number
    wiring: number
    wiringIpv: number
    boxBuild: number
    crossWire: number
    test: number
    pwrCheck: number
    biq: number
    greenChange: number
  }
  yearsExperience?: number
  hireDate?: string
}
```

### `UserActivitySummary`

```ts
interface UserActivitySummary {
  totalAssignmentsCompleted: number
  totalWiresCompleted: number
  averageQualityScore: number
  hoursThisWeek: number
  currentStreak: number
  activeAssignments: number
  lastActiveAt: string | null
}
```

---

## 4. Session State

**File:** `types/d380-user-session.ts`

### `UserSession`

```ts
type SessionStatus = 'active' | 'idle' | 'expired' | 'locked'

interface UserSession {
  id: string
  badge: string
  user: UserIdentity
  status: SessionStatus
  executionMode: ExecutionMode
  currentLwc: string
  currentWorkAreaId: string | null
  startedAt: string
  lastActivityAt: string
  expiresAt: string
  deviceInfo: DeviceInfo
}
```

### `DeviceInfo`

```ts
interface DeviceInfo {
  type: 'desktop' | 'tablet' | 'mobile'
  userAgent: string
  screenSize: { width: number; height: number }
  touchCapable: boolean
}
```

---

## 5. Secure Actions

**File:** `types/d380-user-session.ts`

### `SecureActionType`

```ts
type SecureActionType =
  | 'START_ASSIGNMENT'   | 'PAUSE_ASSIGNMENT'   | 'RESUME_ASSIGNMENT'
  | 'COMPLETE_ASSIGNMENT'| 'HANDOFF_ASSIGNMENT'
  | 'VERIFY_STAGE'       | 'APPROVE_STAGE'      | 'REJECT_STAGE'
  | 'ASSIGN_MEMBER'      | 'UNASSIGN_MEMBER'     | 'REOPEN_STAGE'
  | 'BLOCK_ASSIGNMENT'   | 'UNBLOCK_ASSIGNMENT'  | 'UPDATE_PROGRESS'
  | 'UPLOAD_PROJECT'     | 'SIGN_IN'             | 'SIGN_OUT'
  | 'START_STAGE'        | 'IPV_VERIFY'
```

### Constants

```ts
const SECURE_ACTION_LABELS: Record<SecureActionType, string>
const SECURE_ACTION_PERMISSIONS: Record<SecureActionType, UserRole[]>
```

### `SecureActionContext`

```ts
interface SecureActionContext {
  action: SecureActionType
  assignmentId?: string
  workAreaId?: string
  targetBadge?: string
  metadata?: Record<string, unknown>
}
```

### `SecureActionRequest`

```ts
interface SecureActionRequest {
  badge: string
  pin: string
  context: SecureActionContext
}
```

### `SecureActionResult`

```ts
interface SecureActionResult {
  success: boolean
  error?: string
  errorCode?: 'INVALID_BADGE' | 'INVALID_PIN' | 'PERMISSION_DENIED' | 'SESSION_EXPIRED' | 'ACTION_FAILED'
  session?: UserSession
  timestampEvent?: TimestampEvent
}
```

---

## 6. Credential Verification

**File:** `types/d380-user-session.ts`

### `SessionErrorCode`

```ts
type SessionErrorCode =
  | 'INVALID_BADGE'       | 'INVALID_PIN'        | 'ACCOUNT_INACTIVE'
  | 'PERMISSION_DENIED'   | 'SESSION_EXPIRED'     | 'ACTION_FAILED'
  | 'PIN_CHANGE_REQUIRED' | 'PIN_CHANGE_FAILED'   | 'SIGN_IN_FAILED'
  | 'VERIFICATION_FAILED' | 'ACCOUNT_LOCKED'      | 'ALREADY_SIGNED_IN'
```

### `SessionFeedback`

```ts
interface SessionFeedback {
  code: SessionErrorCode
  title: string
  message: string
}
```

### `CredentialVerificationResult`

```ts
interface CredentialVerificationResult {
  success: boolean
  user?: UserIdentity
  error?: string
  errorCode?: SessionErrorCode
  feedback?: SessionFeedback
  requiresPinChange?: boolean
}
```

### `PinChangeResult`

```ts
interface PinChangeResult {
  success: boolean
  user?: UserIdentity
  error?: string
  errorCode?: SessionErrorCode
  feedback?: SessionFeedback
}
```

---

## 7. Timestamp Events

**File:** `types/d380-user-session.ts`

### `TimestampEventType`

```ts
type TimestampEventType =
  | 'SESSION_START'       | 'SESSION_END'
  | 'ASSIGNMENT_START'    | 'ASSIGNMENT_PAUSE'    | 'ASSIGNMENT_RESUME'
  | 'ASSIGNMENT_COMPLETE' | 'ASSIGNMENT_HANDOFF'
  | 'STAGE_VERIFY'        | 'STAGE_APPROVE'       | 'STAGE_REJECT'    | 'STAGE_REOPEN'
  | 'MEMBER_ASSIGN'       | 'MEMBER_UNASSIGN'
  | 'PROGRESS_UPDATE'     | 'PROJECT_UPLOAD'
  | 'BLOCK'               | 'UNBLOCK'
```

### `TimestampEvent`

```ts
interface TimestampEvent {
  id: string
  type: TimestampEventType
  timestamp: string
  actorBadge: string
  actorName: string
  actorRole: UserRole
  sessionId: string
  assignmentId: string | null
  workAreaId: string | null
  targetBadge: string | null
  previousValue: string | null
  newValue: string | null
  metadata: Record<string, unknown>
}
```

---

## 8. Role-Based Dashboard Configuration

**File:** `types/d380-user-session.ts`

### `DashboardWidgetType`

```ts
type DashboardWidgetType =
  | 'my_assignments'   | 'team_overview'      | 'project_board'
  | 'work_area_map'    | 'shift_summary'      | 'quality_metrics'
  | 'leaderboard'      | 'notifications'      | 'recent_activity'
  | 'blocked_items'    | 'carryover_items'     | 'stage_distribution'
  | 'member_roster'
```

### `DashboardWidget`

```ts
interface DashboardWidget {
  type: DashboardWidgetType
  title?: string
  colSpan?: 1 | 2 | 3 | 4
  rowSpan?: 1 | 2
  props?: Record<string, unknown>
}
```

### `RoleDashboardConfig`

```ts
interface RoleDashboardConfig {
  title: string
  subtitle?: string
  widgets: DashboardWidget[]
  quickActions: SecureActionType[]
  showProjectBoard: boolean
  showTeamRoster: boolean
}
```

### Constant

```ts
const ROLE_DASHBOARD_CONFIGS: Record<UserRole, RoleDashboardConfig>
```

Per-role widget layouts are configured here (e.g. DEVELOPER gets `project_board` at full width, ASSEMBLER gets `my_assignments` only).

---

## 9. Utility Functions

**File:** `types/d380-user-session.ts`

```ts
function canPerformAction(role: UserRole, action: SecureActionType): boolean
function getRoleLevel(role: UserRole): number
function hasHigherRole(role: UserRole, than: UserRole): boolean
function isLeadershipRole(role: UserRole): boolean
function isVerificationRole(role: UserRole): boolean
function canSwitchRoles(role: UserRole): boolean
```

---

## Cross-Domain References

| Type | Consumed By |
|---|---|
| `UserRole` | Profile (`types/profile.ts` — lowercase variant), assignments, team roster, dependency graph |
| `ShiftOptionId` | Dashboard, Projects Board, Project Board, Startup, Build-Up |
| `SecureActionType` | `use-secure-action` hook, `RoleDashboardConfig.quickActions` |
| `UserSession` | `SecureActionResult.session`, session service contract |
| `UserIdentity` | Session state, credential verification, PIN change |
| `TimestampEvent` | `SecureActionResult.timestampEvent`, audit trail |

> **Note:** `types/profile.ts` defines a separate lowercase `UserRole` type (`'developer'` | `'manager'` | ...) for the profile UI domain. See [PROFILE_INTERFACES.md](PROFILE_INTERFACES.md) for details.
