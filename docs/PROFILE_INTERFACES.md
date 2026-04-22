# Profile — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces, types, and display constants related to user profiles, widgets, quick actions, and status display in D380.

---

## Table of Contents

1. [User Profile](#1-user-profile)
2. [Profile Stats](#2-profile-stats)
3. [Widget System](#3-widget-system)
4. [Quick Actions](#4-quick-actions)
5. [Profile Header Props](#5-profile-header-props)
6. [Role Display Config](#6-role-display-config)
7. [Status Display Config](#7-status-display-config)
8. [Cross-Domain References](#8-cross-domain-references)

---

## 1. User Profile

**File:** `types/profile.ts`

### `UserRole` (Profile-Scoped)

```ts
type UserRole =
  | 'developer'
  | 'manager'
  | 'supervisor'
  | 'team_lead'
  | 'qa'
  | 'brander'
  | 'assembler'
```

> **Note:** This is a **lowercase variant** scoped to the profile UI domain. The session-level `UserRole` type in `types/d380-user-session.ts` uses UPPERCASE values (`'DEVELOPER'`, `'MANAGER'`, etc.). See [USER_SESSION_INTERFACES.md](USER_SESSION_INTERFACES.md).

### `UserStatus`

```ts
type UserStatus = 'active' | 'offline' | 'busy' | 'available'
```

### `ShiftType`

```ts
type ShiftType = '1st' | '2nd' | 'overtime'
```

### `UserProfile`

```ts
interface UserProfile {
  id: string
  preferredName?: string
  fullName: string
  badgeId: string
  email?: string
  role: UserRole
  avatarUrl?: string
  coverImageUrl?: string
  coverImagePositionY?: number          // 0–100%, default 50
  shift?: ShiftType
  lwc?: string[]
  department?: string
  title?: string
  location?: string
  bio?: string
  joinedAt?: string
  status?: UserStatus
}
```

---

## 2. Profile Stats

**File:** `types/profile.ts`

### `ProfileStat`

```ts
interface ProfileStat {
  id: string
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: string
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}
```

### `RoleStatConfig`

```ts
type RoleStatConfig = {
  [key in UserRole]: ProfileStat[]
}
```

---

## 3. Widget System

**File:** `types/profile.ts`

### `ProfileWidgetType`

```ts
type ProfileWidgetType =
  | 'stats'              | 'list'               | 'timeline'
  | 'status'             | 'assignments'         | 'performance'
  | 'qa_summary'         | 'team_overview'       | 'shift_summary'
  | 'project_health'     | 'validation_queue'    | 'label_tasks'
  | 'current_assignment' | 'custom'
```

### `ProfileWidgetSize`

```ts
type ProfileWidgetSize = 'sm' | 'md' | 'lg' | 'xl'
```

### `ProfileWidgetConfig`

```ts
interface ProfileWidgetConfig {
  id: string
  title: string
  roleVisibility: UserRole[]
  type: ProfileWidgetType
  size?: ProfileWidgetSize
  colSpan?: 1 | 2 | 3 | 4
  rowSpan?: 1 | 2
}
```

---

## 4. Quick Actions

**File:** `types/profile.ts`

### `ProfileQuickAction`

```ts
interface ProfileQuickAction {
  id: string
  label: string
  icon: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  roleVisibility?: UserRole[]
  onClick?: () => void
}
```

---

## 5. Profile Header Props

**File:** `types/profile.ts`

### `ProfileHeaderProps`

```ts
interface ProfileHeaderProps {
  profile: UserProfile
  stats?: ProfileStat[]
  isEditable?: boolean
  onAvatarChange?: (file: File) => void
  onCoverChange?: (file: File) => void
  onProfileUpdate?: (profile: Partial<UserProfile>) => void
  className?: string
}
```

---

## 6. Role Display Config

**File:** `types/profile.ts`

### Constant

```ts
const ROLE_DISPLAY_CONFIG: Record<UserRole, {
  label: string
  color: string        // Tailwind text color classes
  bgColor: string      // Tailwind background classes
  borderColor: string  // Tailwind border classes
}>
```

Maps each role to themed display tokens for badges and labels:

| Role | Label | Theme |
|---|---|---|
| `developer` | Developer | Cyan |
| `manager` | Manager | Purple |
| `supervisor` | Supervisor | Blue |
| `team_lead` | Team Lead | Amber |
| `qa` | QA | Emerald |
| `brander` | Brander | Rose |
| `assembler` | Assembler | Slate |

---

## 7. Status Display Config

**File:** `types/profile.ts`

### Constant

```ts
const STATUS_DISPLAY_CONFIG: Record<UserStatus, {
  label: string
  color: string      // Tailwind text color classes
  dotColor: string   // Tailwind background class for status dot
}>
```

| Status | Label | Dot Color |
|---|---|---|
| `active` | Active | Emerald |
| `available` | Available | Blue |
| `busy` | Busy | Amber |
| `offline` | Offline | Slate |

---

## 8. Cross-Domain References

| Type | Referenced By |
|---|---|
| `UserProfile` | `ProfileHeaderProps`, `components/profile/profile-header.tsx`, `components/profile/profile-settings.tsx` |
| `ProfileStat` | `ProfileHeaderProps.stats`, `RoleStatConfig` |
| `ProfileWidgetConfig` | Profile widget registry (`components/profile/`) |
| `UserRole` (lowercase) | All profile display config, widget visibility, quick action visibility |
| `UserStatus` | `UserProfile.status`, `STATUS_DISPLAY_CONFIG`, status dot rendering |
| `ShiftType` | `UserProfile.shift` |

> **Dual `UserRole` warning:** The session domain (`types/d380-user-session.ts`) uses UPPERCASE `UserRole`, while the profile domain (`types/profile.ts`) uses lowercase. These are separate types and are not interchangeable without normalization.
