# Revision Management — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces, types, and utilities related to file revision tracking and comparison in D380.

---

## Table of Contents

1. [Revision Info](#1-revision-info) — `lib/revision/types.ts`
2. [File Revisions](#2-file-revisions)
3. [Project Revision History](#3-project-revision-history)
4. [Revision Comparison](#4-revision-comparison)

---

## 1. Revision Info

**File:** `lib/revision/types.ts`

```ts
interface RevisionInfo {
  revision: string            // Raw string e.g. "A.2", "0.5"
  isModified: boolean         // Has _M.x suffix
  modificationNumber?: string // e.g. "1" from _M.1
  displayVersion: string      // e.g. "A.2 M.1"
  sortScore: number           // Numeric score for ordering
}
```

---

## 2. File Revisions

**File:** `lib/revision/types.ts`

```ts
interface FileRevision {
  filename: string
  filePath: string
  revisionInfo: RevisionInfo
  category: 'LAYOUT' | 'WIRE_LIST' | 'REFERENCE' | 'OTHER'
  lastModified?: string
  fileSize?: number
}
```

---

## 3. Project Revision History

**File:** `lib/revision/types.ts`

```ts
interface ProjectRevisionHistory {
  projectId: string
  folderName: string
  pdNumber: string
  wireListRevisions: FileRevision[]
  layoutRevisions: FileRevision[]
  currentWireList: FileRevision | null
  currentLayout: FileRevision | null
  previousWireList: FileRevision | null
  previousLayout: FileRevision | null
}
```

---

## 4. Revision Comparison

**File:** `lib/revision/types.ts`

```ts
type RowChangeType = 'added' | 'removed' | 'modified' | 'unchanged'

interface WireRowDiff {
  sourceRowId?: string
  targetRowId?: string
  changeType: RowChangeType
  changedFields?: string[]
  sourceRow?: Record<string, unknown>
  targetRow?: Record<string, unknown>
}

interface RevisionComparison {
  sourceRevision: RevisionInfo
  targetRevision: RevisionInfo
  sheetName: string
  summary: {
    totalRows: { source: number; target: number }
    added: number
    removed: number
    modified: number
    unchanged: number
  }
  diffs: WireRowDiff[]
}
```

---

## Utility Function

**File:** `lib/revision/types.ts`

```ts
function parseRevisionFromFilename(filename: string): RevisionInfo
// Handles: _A.2.xlsx → { revision: "A.2", isModified: false }
//          _A.2_M.1.xlsx → { revision: "A.2", isModified: true, modificationNumber: "1" }
```

---

## Cross-Domain References

| Type | Source | Consumed By |
|---|---|---|
| `RevisionInfo` | Local | `FileRevision`, `RevisionComparison`, revision panel components |
| `FileRevision` | Local | `ProjectRevisionHistory`, revision sidebar component |
| `ProjectRevisionHistory` | Local | `hooks/use-project-revisions.ts`, revision catalog |
| `RevisionComparison` | Local | Revision diff viewer components |
