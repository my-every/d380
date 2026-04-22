# Shell & Startup — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces and types related to the D380 app shell navigation, command palette, and startup wizard flow.

---

## Table of Contents

1. [Shell Navigation](#1-shell-navigation)
2. [Shell Command Actions](#2-shell-command-actions)
3. [Shell View Model](#3-shell-view-model)
4. [Startup — Shift Configuration](#4-startup--shift-configuration)
5. [Startup — Setup Steps](#5-startup--setup-steps)
6. [Startup — Processing Steps](#6-startup--processing-steps)
7. [Startup — Preview & Summary](#7-startup--preview--summary)
8. [Startup — Workflow Controller](#8-startup--workflow-controller)

---

## 1. Shell Navigation

**File:** `types/d380-shell.ts`

### `D380ShellNavItem`

```ts
interface D380ShellNavItem {
  id: 'home' | 'projects' | 'board' | 'leader-board' | 'tools'
  label: string
  href: string
}
```

---

## 2. Shell Command Actions

**File:** `types/d380-shell.ts`

### `D380ShellCommandActionViewModel`

```ts
interface D380ShellCommandActionViewModel {
  id: string
  label: string
  description: string
  href: string
  group: 'Routes' | 'Projects' | 'Assignments'
  kind: 'route' | 'project' | 'assignment'
  shortcut?: string
}
```

### `D380ShellAssignmentGroupViewModel`

```ts
interface D380ShellAssignmentGroupViewModel {
  id: string
  pdNumber: string
  projectName: string
  owner: string
  href: string
  assignments: ProjectWorkspaceAssignmentItemViewModel[]
}
```

---

## 3. Shell View Model

**File:** `types/d380-shell.ts`

### `D380ShellViewModel`

```ts
interface D380ShellViewModel {
  navItems: D380ShellNavItem[]
  commandActions: D380ShellCommandActionViewModel[]
  projectCards: ProjectsBoardProjectCardViewModel[]
  assignmentGroups: D380ShellAssignmentGroupViewModel[]
  summary: {
    operatingDateLabel: string
    totalProjects: number
    totalAssignments: number
    unreadNotifications: number
  }
}
```

---

## 4. Startup — Shift Configuration

**File:** `types/d380-startup.ts`

### `ShiftOptionId`

```ts
type ShiftOptionId = 'FIRST' | 'SECOND'
```

### `ShiftOptionConfig`

```ts
interface ShiftOptionConfig {
  id: ShiftOptionId
  label: string
  hours: string
  teamName: string
  description: string
}
```

---

## 5. Startup — Setup Steps

**File:** `types/d380-startup.ts`

### `StartupSetupStepId`

```ts
type StartupSetupStepId = 'SHIFT' | 'DATE' | 'REVIEW'
```

### `StartupSetupStepDefinition`

```ts
interface StartupSetupStepDefinition {
  id: StartupSetupStepId
  title: string
  description: string
}
```

### `StartupStepStatus`

```ts
type StartupStepStatus = 'pending' | 'current' | 'complete'
```

---

## 6. Startup — Processing Steps

**File:** `types/d380-startup.ts`

### `StartupProcessingStepId`

```ts
type StartupProcessingStepId =
  | 'SCHEDULE_IMPORT'  | 'SCHEDULE_PARSE'    | 'PROJECT_DISCOVERY'
  | 'LAYOUT_MATCHING'  | 'ROSTER_LOAD'       | 'STATE_RESTORE'
  | 'WORKSPACE_BUILD'
```

### `StartupProcessingStepDefinition`

```ts
interface StartupProcessingStepDefinition {
  id: StartupProcessingStepId
  title: string
  description: string
  loaderMessage: string
  durationMs: number
}
```

---

## 7. Startup — Preview & Summary

**File:** `types/d380-startup.ts`

### `StartupProjectPreview`

```ts
interface StartupProjectPreview {
  id: string
  pdNumber: string
  name: string
  priority: number
  units: number
  targetDate: string
  risk: 'healthy' | 'watch' | 'late'
  preferredShift: ShiftOptionId
}
```

### `StartupRosterMember`

```ts
interface StartupRosterMember {
  id: string
  name: string
  role: string
  station: string
  shift: ShiftOptionId
}
```

### `StartupWorkspaceSummary`

```ts
interface StartupWorkspaceSummary {
  operatingDate: string
  prioritizedProjects: StartupProjectPreview[]
  roster: StartupRosterMember[]
  restoredAssignments: number
  startupNotes: string[]
  importSourceLabel?: string
}
```

---

## 8. Startup — Workflow Controller

**File:** `types/d380-startup.ts`

### `StartupCurrentStep`

```ts
interface StartupCurrentStep {
  title: string
  description: string
}
```

### `StartupWorkflowController`

```ts
interface StartupWorkflowController {
  selectedShift: ShiftOptionId
  operatingDate: string
  currentStep: StartupCurrentStep
  setupStageIndex: number
  setupSteps: StartupSetupStepDefinition[]
  processingSteps: StartupProcessingStepDefinition[]
  currentProcessingIndex: number
  progressMessages: string[]
  progressPercent: number
  canContinue: boolean
  isEditing: boolean
  isRunning: boolean
  isReady: boolean
  workspaceSummary: StartupWorkspaceSummary
  usesImportedSummary: boolean
  setSelectedShift: (shift: ShiftOptionId) => void
  setOperatingDate: (value: string) => void
  next: () => void
  back: () => void
  reset: () => void
  submit: () => void
}
```

---

## Cross-Domain References

| Type | Source | Consumed By |
|---|---|---|
| `ShiftOptionId` | `types/d380-startup.ts` | Dashboard, Projects Board, Project Board, Build-Up, Workspace — widely used as the global shift identifier |
| `ProjectWorkspaceAssignmentItemViewModel` | `types/d380-project-workspace.ts` | `D380ShellAssignmentGroupViewModel.assignments` |
| `ProjectsBoardProjectCardViewModel` | `types/d380-projects-board.ts` | `D380ShellViewModel.projectCards` |
| `StartupProjectPreview` | Local | Import service (`share-project-import.ts`), Project Model cross-domain ref |
| `StartupRosterMember` | Local | `StartupWorkspaceSummary.roster` only |
