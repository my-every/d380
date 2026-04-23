# D380 Architecture Gap Analysis

## Overview

This document provides a structured analysis of the current D380 codebase architecture, identifying gaps between the existing implementation and the target state for the Assignment Dependency Graph system.

**Analysis Date:** Generated during Pass 1 implementation, updated after Pass 2  
**Scope:** Assignment management, stage progression, dependency tracking, cross-wire readiness

---

## Change Log

| Date | Change |
|------|--------|
| Initial | Pass 1 - Created dependency graph types, engine, and minimal UI components |
| Current | Pass 2 - Integrated dependency graph into kanban, project details, and assignment details |

---

## 1. What Exists Today

### 1.1 Assignment Types & Stage System

| Component | Location | Status |
|-----------|----------|--------|
| `AssignmentStage` enum | `types/d380-assignment.ts` | Complete - 14 stages defined |
| `AssignmentRecord` interface | `types/d380-assignment.ts` | Complete - includes detection summary |
| `STAGE_COLUMNS` definitions | `types/d380-assignment.ts` | Complete - labels, colors, descriptions |
| `WorkbookSheetKind` classification | `types/d380-assignment.ts` | Complete - assignment/reference/other |

### 1.2 Stage Lifecycle System

| Component | Location | Status |
|-----------|----------|--------|
| `StageFlowType` | `lib/assignment/stage-lifecycle.ts` | Complete - BUILD_ONLY, BUILD_AND_WIRE, CROSS_WIRE_ONLY |
| `STAGE_TRANSITIONS` rules | `lib/assignment/stage-lifecycle.ts` | Complete - all transitions defined |
| `getValidNextStages()` | `lib/assignment/stage-lifecycle.ts` | Complete |
| `isCrossWireAvailable()` | `lib/assignment/stage-lifecycle.ts` | Complete - threshold checks |
| `getStageProgressionSummary()` | `lib/assignment/stage-lifecycle.ts` | Complete |

### 1.3 SWS Detection System

| Component | Location | Status |
|-----------|----------|--------|
| `SwsTypeId` enum | `lib/assignment/sws-detection.ts` | Complete - 12 SWS types |
| `SWS_TYPE_REGISTRY` | `lib/assignment/sws-detection.ts` | Complete - metadata for all types |
| `detectSwsType()` | `lib/assignment/sws-detection.ts` | Complete - context-aware detection |
| Detection patterns | `lib/assignment/sws-detection.ts` | Complete - RAIL, COMPONENT, BOX, PANEL, etc. |

### 1.4 Cross-Wire Classification

| Component | Location | Status |
|-----------|----------|--------|
| `StructuralZoneId` types | `types/d380-cross-wire.ts` | Complete |
| `WiringBoundaryType` types | `types/d380-cross-wire.ts` | Complete |
| `CrossWireClassification` | `types/d380-cross-wire.ts` | Complete |
| `STRUCTURAL_ZONE_PATTERNS` | `types/d380-cross-wire.ts` | Complete |
| Zone detection functions | `types/d380-cross-wire.ts` | Complete |

### 1.5 Dependency Graph Engine

| Component | Location | Status |
|-----------|----------|--------|
| `AssignmentDependencyKind` | `types/d380-dependency-graph.ts` | Complete - 8 dependency kinds |
| `AssignmentDependency` | `types/d380-dependency-graph.ts` | Complete |
| `AssignmentDependencyNode` | `types/d380-dependency-graph.ts` | Complete |
| `AssignmentDependencyGraph` | `types/d380-dependency-graph.ts` | Complete |
| `CrossWireProjectReadiness` | `types/d380-dependency-graph.ts` | Complete |
| `ProjectLifecycleSnapshot` | `types/d380-dependency-graph.ts` | Complete |
| `buildAssignmentDependencyGraph()` | `lib/assignment/dependency-graph.ts` | Complete |
| `deriveAssignmentReadiness()` | `lib/assignment/dependency-graph.ts` | Complete |
| `getAutoNextStage()` | `lib/assignment/dependency-graph.ts` | Complete |
| `getCrossWireProjectReadiness()` | `lib/assignment/dependency-graph.ts` | Complete |
| `getProjectLifecycleSnapshot()` | `lib/assignment/dependency-graph.ts` | Complete |

### 1.6 UI Components

| Component | Location | Status |
|-----------|----------|--------|
| `AssignmentKanbanBoard` | `components/projects/assignment-kanban-board.tsx` | **Updated** - now uses dependency graph, shows blocked/ready badges |
| `ProjectAssignmentMappingModal` | `components/projects/project-assignment-mapping-modal.tsx` | Complete |
| `SummarySection` | `components/projects/summary-section.tsx` | Complete - reusable |
| `ProjectLifecycleSnapshotCard` | `components/projects/project-lifecycle-snapshot.tsx` | **NEW** - integrated into /projects page |
| `CrossWireReadinessPanel` | `components/projects/cross-wire-readiness-panel.tsx` | **NEW** - integrated into /projects page |
| `AssignmentReadinessBadge` | `components/projects/assignment-readiness-badge.tsx` | **NEW** |
| `AssignmentDependencyPanel` | `components/projects/assignment-dependency-panel.tsx` | **NEW** - integrated into assignment details page |

### 1.7 React Hooks

| Hook | Location | Status |
|------|----------|--------|
| `useAssignmentDependencyGraph` | `hooks/use-assignment-dependency-graph.ts` | **NEW** |
| `useAssignmentContext` | `hooks/use-assignment-context.ts` | Exists |
| `useAssignmentStageWorkflow` | `hooks/use-assignment-stage-workflow.ts` | Exists |

---

## 2. Identified Gaps

### 2.1 High Priority Gaps

#### Gap 1: Assignment State Persistence
**Current State:** Assignment mappings stored in localStorage via `ProjectContext`  
**Gap:** No database persistence, no multi-user sync  
**Impact:** State lost on browser clear, no collaboration support  
**Resolution Path:**
1. Add Supabase integration for `assignments` table
2. Create `assignment-state-service.ts` provider implementation
3. Add real-time subscription for collaborative updates

#### Gap 2: Stage Progression Events
**Current State:** No event emission when assignments progress stages  
**Gap:** Cannot trigger notifications, update leaderboard, or sync state  
**Impact:** No reactive UI updates, no audit trail  
**Resolution Path:**
1. Implement `AssignmentUnlockedEvent` emission
2. Implement `ProjectMilestoneEvent` emission
3. Create event bus or use context for propagation

#### Gap 3: Due Date / Late Detection
**Current State:** `isLate` field exists but always returns `false`  
**Gap:** No due date assignment or calculation  
**Impact:** Cannot show "Late" badge or prioritize work  
**Resolution Path:**
1. Add `dueDate` field to `MappedAssignment`
2. Implement due date calculation from project schedule
3. Add late detection in dependency graph builder

#### Gap 4: Kanban Board Dependency Integration - **RESOLVED**
**Current State:** Kanban board now uses dependency graph via `useAssignmentDependencyGraph` hook  
**Resolution Applied:**
1. [x] Pass dependency graph to `AssignmentKanbanBoard`
2. [x] Add blocked/ready badges to `AssignmentCard`
3. [x] Add "show blocked only" filter (uses `blockedAssignments` from graph)
4. [x] Show next suggested stage on ready cards
5. [x] Show blocking reasons on blocked cards

### 2.2 Medium Priority Gaps

#### Gap 5: Auto-Progression Confirmation UI
**Current State:** `requiresConfirmation` flag computed but not surfaced  
**Gap:** No modal/dialog for confirming stage transitions  
**Impact:** Critical stage gates (CROSS_WIRE, TEST) have no confirmation flow  
**Resolution Path:**
1. Create `StageProgressionConfirmDialog` component
2. Hook into "Move to Next Stage" button
3. Show confirmation for `requiresConfirmation: true` stages

#### Gap 6: Cross-Wire Classification Engine
**Current State:** Types defined, patterns defined, but no runtime classifier  
**Gap:** Cannot auto-classify wire connections as WIRING vs CROSS_WIRING  
**Impact:** Manual classification required  
**Resolution Path:**
1. Implement `classifyCrossWireConnection()` function
2. Parse location strings using `STRUCTURAL_ZONE_PATTERNS`
3. Apply `CrossWireClassificationRule` logic

#### Gap 7: Project-Level Gate Notifications
**Current State:** Milestones computed but not surfaced  
**Gap:** No notification when CROSS_WIRE_READY, TEST_READY, etc.  
**Impact:** Team leads don't know when project reaches milestones  
**Resolution Path:**
1. Implement `notification-service.ts` provider
2. Emit `ProjectMilestoneEvent` when gates change state
3. Show toast/badge in UI

### 2.3 Lower Priority Gaps

#### Gap 8: Box Build Progress Tracking
**Current State:** BOX_BUILD stage exists but progress not tracked independently  
**Gap:** Box build progress for cross-wire gate is approximated  
**Impact:** Inaccurate cross-wire gate threshold calculation  
**Resolution Path:**
1. Add explicit box build tracking to assignment model
2. Track actual box assembly progress percentage
3. Update `CROSS_WIRE_BOX_BUILD_THRESHOLD` logic

#### Gap 9: Leaderboard Integration
**Current State:** Leaderboard service contract exists, simulated implementation  
**Gap:** Stage completions not contributing to leaderboard  
**Impact:** No gamification of stage progression  
**Resolution Path:**
1. Connect stage completion events to leaderboard service
2. Award points for stage completions
3. Track streaks for continuous progress

#### Gap 10: Audit Trail
**Current State:** No history of stage changes  
**Gap:** Cannot see who changed what, when  
**Impact:** No accountability, no debugging of state issues  
**Resolution Path:**
1. Add `stage_history` table with timestamp, user, transition
2. Log all `AssignmentUnlockedEvent` occurrences
3. Add UI to view assignment history

---

## 3. Service Contract Analysis

### 3.1 Defined Contracts (in `lib/services/contracts/`)

| Contract | Purpose | Implementation Status |
|----------|---------|----------------------|
| `assignment-state-service.ts` | Stage state, readiness | Contract defined, no implementation |
| `stage-state-service.ts` | Stage transitions | Contract defined, no implementation |
| `file-catalog-service.ts` | File management | Contract defined, simulated impl |
| `leaderboard-service.ts` | Points, streaks | Contract defined, simulated impl |
| `notification-service.ts` | Alerts, milestones | Contract defined, simulated impl |
| `project-discovery-service.ts` | Project listing | Contract defined, simulated impl |
| `session-service.ts` | User session | Contract defined, simulated impl |
| `team-roster-service.ts` | Team members | Contract defined, simulated impl |
| `work-area-service.ts` | Work area context | Contract defined, simulated impl |
| `workspace-service.ts` | Workspace state | Contract defined, simulated impl |

### 3.2 Missing Contracts

| Contract Needed | Purpose |
|-----------------|---------|
| `dependency-graph-service.ts` | Build/cache/invalidate dependency graphs |
| `auto-progression-service.ts` | Handle stage transitions with validation |
| `cross-wire-classification-service.ts` | Classify wire connections |
| `audit-trail-service.ts` | Log state changes |

---

## 4. Recommended Implementation Order

### Phase 1: Foundation (Current Sprint)
1. [x] Dependency graph types and model
2. [x] Auto-progression rules engine
3. [x] Project lifecycle snapshot component
4. [x] Cross-wire readiness panel
5. [x] Minimal UI surfacing (readiness badge)
6. [x] Architecture gap analysis document

### Phase 2: UI Integration - **COMPLETE**
1. [x] Integrate dependency graph with kanban board
2. [x] Add readiness badges to assignment cards
3. [x] Implement "Blocked" filter using dependency graph
4. [x] Add blocked assignment explanations (blocking reasons shown on cards)
5. [x] Add `ProjectLifecycleSnapshotCard` to project details page
6. [x] Add `CrossWireReadinessPanel` to project details page
7. [x] Add `AssignmentDependencyPanel` to assignment details page
8. [x] Update assignment details page with real readiness state from dependency graph

### Phase 3: Stage Progression
1. [ ] Stage progression confirmation dialog
2. [ ] Auto-progression suggestion banner
3. [ ] Stage change event emission
4. [ ] Milestone notifications

### Phase 4: Persistence & Sync
1. [ ] Database schema for assignments
2. [ ] Assignment state service implementation
3. [ ] Real-time subscription for updates
4. [ ] Audit trail logging

### Phase 5: Cross-Wire Classification
1. [ ] Cross-wire classification engine
2. [ ] Review queue UI
3. [ ] Override management

---

## 5. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              D380 Assignment System                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐                 │
│  │  Workbook   │───>│  Sheet       │───>│  MappedAssignment│                │
│  │  Parser     │    │ Classification│    │  (with SWS)     │                │
│  └─────────────┘    └──────────────┘    └────────┬────────┘                 │
│                                                  │                          │
│                                                  ▼                          │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │                   Dependency Graph Engine                      │         │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │         │
│  │  │ Build        │  │ Compute      │  │ Derive             │  │         │
│  │  │ Dependencies │──│ Blocked/Ready│──│ Project Snapshot   │  │         │
│  │  └──────────────┘  └──────────────┘  └────────────────────┘  │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                           │                                                 │
│        ┌──────────────────┼──────────────────┐                             │
│        ▼                  ▼                  ▼                             │
│  ┌───────────┐    ┌───────────────┐    ┌────────────────────┐              │
│  │ Kanban    │    │ Lifecycle     │    │ Cross-Wire         │              │
│  │ Board     │    │ Snapshot      │    │ Readiness Panel    │              │
│  └───────────┘    └───────────────┘    └────────────────────┘              │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │                    React Hook Layer                            │         │
│  │  useAssignmentDependencyGraph()  useAssignmentStageWorkflow() │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │                    Service Contracts                           │         │
│  │  AssignmentStateService  StageStateService  NotificationService│         │
│  └───────────────────────────────────────────────────────────────┘         │
│                           │                                                 │
│                           ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │                    Persistence Layer                           │         │
│  │  LocalStorage (current)  ───>  Supabase (target)              │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Summary

The D380 codebase has a solid foundation for assignment management with comprehensive type definitions, stage lifecycle rules, and dependency graph computation logic. 

### Completed (Pass 1 + Pass 2)

1. **Dependency Graph Engine** - Complete graph building, readiness computation, auto-progression
2. **UI Integration** - Kanban board, project details, and assignment details all now use dependency graph
3. **Visual Feedback** - Blocked/ready badges, blocking reasons, next stage suggestions
4. **Project Lifecycle** - Lifecycle snapshot card showing overall progress and stage gates
5. **Cross-Wire Readiness** - Dedicated panel showing panel progress and cross-wire gate status

### Remaining Gaps

1. **Persistence** - State stored in localStorage, no database or sync
2. **Events** - Stage changes don't emit events for notifications/leaderboard
3. **Stage Progression UI** - Confirmation dialogs for critical stage transitions
4. **Cross-Wire Classification** - Types exist but no runtime classifier
5. **Due Dates** - `isLate` field always returns false (no due date tracking)

### Next Steps (Phase 3)

1. Implement stage progression confirmation dialog
2. Add auto-progression suggestion banner
3. Wire up stage change event emission
4. Add milestone notifications when project reaches gates
