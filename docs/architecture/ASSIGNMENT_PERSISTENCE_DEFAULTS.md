# Assignment Persistence Defaults (Items 2-10)

This document locks the default implementation policy set for filesystem-backed assignment persistence under Share paths.

## 2. Canonical ID and path normalization

- Shift path segment: `1ST` or `2ND`
- Domain shift values: `1st` or `2nd`
- Badge path segment: uppercase alphanumeric (`[^A-Z0-9]` removed)
- Project state folder key: `<PD>_<PROJECT_NAME>` uppercase with invalid characters collapsed to `_`
- Normalization is non-blocking; writes continue.

## 3. Schema authority

- Strict, versioned schemas are required on persisted JSON documents.
- `schemaVersion: 1` is required for:
  - user assignments ledger
  - assignment history
  - canonical project assignment state snapshot

## 4. Event taxonomy

Default event taxonomy:

- ASSIGNED
- REASSIGNED
- STARTED
- BLOCKED
- UNBLOCKED
- STAGE_JUMP_REQUESTED
- STAGE_JUMP_APPROVED
- STAGE_CHANGED
- COMPLETED
- REOPENED
- SLA_RECALCULATED
- WRITE_FAILED

## 5. Sequence strategy

- Per-assignment sequence is authoritative (`assignmentSequences[assignmentId]`).
- Global sequence is tracked for diagnostics and ordering analytics (`lastGlobalSequence`).
- Writes fail when sequence state is inconsistent with append history.

## 6. Atomic write strategy

- Temporary write + rename commit per target file.
- Multi-file writes are coordinated under a transaction boundary.
- Direct in-place multi-file mutation is not allowed.

## 7. Rollback and recovery

- No partial success is allowed.
- If any commit step fails, committed files are rolled back to pre-transaction content.
- Failure returns hard error code and message.

## 8. SLA calendar policy

- Start SLA: 8 working hours (480 minutes).
- Completion SLA:
  - small: 2 days
  - medium: 3 days
  - large: 5 days
  - xlarge: project-driven due date
- Current implementation uses baseline minute calculation and enforces xlarge due-date requirement.

## 9. XLarge completion source

- Uses assignment/project due date (`dueAt`) as required source.
- Missing due date on xlarge transition is rejected with hard error code.

## 10. Hard-fail UX contract

- Persistence errors return stable codes and block mutation success.
- Caller receives non-success result with error details.
- No mutation is committed to filesystem when persistence fails.
