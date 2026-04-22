# Project Context API v2 Implementation Checklist

Status: completed

## Phase 1: Add consolidated routes (before deletions)

1. Add keyed state endpoint
- Added [app/api/project-context/[projectId]/state/[key]/route.ts](app/api/project-context/[projectId]/state/[key]/route.ts)
- Covers old `layout-pages` and `layout-mapping`
- Supports `GET` and `PUT`

2. Add reference sheets routes
- Added [app/api/project-context/[projectId]/reference-sheets/[slug]/route.ts](app/api/project-context/[projectId]/reference-sheets/[slug]/route.ts)
- Added [app/api/project-context/[projectId]/reference-sheets/generate/route.ts](app/api/project-context/[projectId]/reference-sheets/generate/route.ts)

3. Add consolidated print schema route
- Added [app/api/project-context/[projectId]/wire-list-print-schemas/route.ts](app/api/project-context/[projectId]/wire-list-print-schemas/route.ts)
- Supports single-sheet read/write and `mode=all` batch generation

4. Add consolidated exports routes
- Added [app/api/project-context/[projectId]/exports/route.ts](app/api/project-context/[projectId]/exports/route.ts) for manifest/read generate by `kind`
- Added [app/api/project-context/[projectId]/exports/files/[...segments]/route.ts](app/api/project-context/[projectId]/exports/files/[...segments]/route.ts) for file streaming

## Phase 2: Update existing retained routes

5. Merge part-number generation into canonical endpoint
- Updated [app/api/project-context/[projectId]/device-part-numbers/route.ts](app/api/project-context/[projectId]/device-part-numbers/route.ts)
- Added `POST` generation path
- Removed need for separate `generate-part-numbers` route

6. Remove legacy projectModel write path
- Updated [app/api/project-context/[projectId]/route.ts](app/api/project-context/[projectId]/route.ts)
- `PUT` now accepts manifest-only contract

## Phase 3: Update client/server callers to new routes

7. Reference sheet lookups
- Updated [hooks/use-project-lookups.ts](hooks/use-project-lookups.ts)
- Old: `/reference-sheet/{slug}`
- New: `/reference-sheets/{slug}`

8. Layout state callers
- Updated [lib/storage/layout-storage.ts](lib/storage/layout-storage.ts)
- Updated [app/projects/[projectId]/page.tsx](app/projects/[projectId]/page.tsx)
- Old: `/layout-pages`
- New: `/state/layout-pages`

9. Print schema callers
- Updated [components/wire-list/print-modal.tsx](components/wire-list/print-modal.tsx)
- Old: `/wire-list-print-schema`
- New: `/wire-list-print-schemas`

10. Project upload flow
- Updated [components/projects/project-upload-flow.tsx](components/projects/project-upload-flow.tsx)
- Writes manifest with `PUT /[projectId]`
- Writes all sheet schemas via `PUT /[projectId]/sheets/[sheetSlug]`
- Export generation switched to `/exports?kind=`
- Batch print schema generation switched to `/wire-list-print-schemas` with `{ mode: "all" }`

11. Project exports panel
- Updated [components/projects/project-exports-panel.tsx](components/projects/project-exports-panel.tsx)
- Old: `/branding-exports`, `/wire-list-exports`
- New: `/exports?kind=branding|wire-lists`
- Download URL old: `/exports/{...segments}`
- Download URL new: `/exports/files/{...segments}`
- Part number generate old: `/generate-part-numbers`
- Part number generate new: `/device-part-numbers` `POST`
- Reference sheets generate old: `/generate-reference-sheets`
- Reference sheets generate new: `/reference-sheets/generate`

## Phase 4: Remove outdated route files (deletion order executed)

12. Deleted old state routes
- Deleted [app/api/project-context/[projectId]/layout-pages/route.ts](app/api/project-context/[projectId]/layout-pages/route.ts)
- Deleted [app/api/project-context/[projectId]/layout-mapping/route.ts](app/api/project-context/[projectId]/layout-mapping/route.ts)

13. Deleted old generators
- Deleted [app/api/project-context/[projectId]/generate-part-numbers/route.ts](app/api/project-context/[projectId]/generate-part-numbers/route.ts)
- Deleted [app/api/project-context/[projectId]/generate-reference-sheets/route.ts](app/api/project-context/[projectId]/generate-reference-sheets/route.ts)
- Deleted [app/api/project-context/[projectId]/generate-print-schemas/route.ts](app/api/project-context/[projectId]/generate-print-schemas/route.ts)

14. Deleted old export routes
- Deleted [app/api/project-context/[projectId]/branding-exports/route.ts](app/api/project-context/[projectId]/branding-exports/route.ts)
- Deleted [app/api/project-context/[projectId]/wire-list-exports/route.ts](app/api/project-context/[projectId]/wire-list-exports/route.ts)

15. Deleted old print/reference routes
- Deleted [app/api/project-context/[projectId]/wire-list-print-schema/route.ts](app/api/project-context/[projectId]/wire-list-print-schema/route.ts)
- Deleted [app/api/project-context/[projectId]/reference-sheet/[slug]/route.ts](app/api/project-context/[projectId]/reference-sheet/[slug]/route.ts)

16. Deleted old export file stream route
- Deleted [app/api/project-context/[projectId]/exports/[...segments]/route.ts](app/api/project-context/[projectId]/exports/[...segments]/route.ts)

## Phase 5: Verify

17. Verify route references
- Searched repository for removed route paths
- Updated all active callers found in app/components/hooks/lib storage files

18. Verify diagnostics
- Ran diagnostics across changed files and route folder
