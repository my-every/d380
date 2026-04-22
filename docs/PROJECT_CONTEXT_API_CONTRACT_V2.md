# Project Context API v2 Contract Draft

## Scope and Constraints

- Goal: reduce route surface area and remove duplicated logic in `app/api/project-context`.
- Backward compatibility: **none**. Legacy endpoints are removed after cutover.
- Major non-goal: no major behavioral changes to wire list sheet state APIs under `app/api/project-storage/[projectId]/sheets/[sheetSlug]`.
- Storage model remains aligned to generated project output (example STOCK2):
  - `state/device-part-numbers.json`
  - `state/layout-pages.json`
  - `state/layout-mapping.json`
  - `state/sheets/*`
  - `state/reference-sheets/*`
  - `state/wire-list-print-schema/*`
  - `state/wiring-execution/*`
  - `exports/units/{unit}/branding/*`
  - `exports/units/{unit}/wire-lists/*`

## Design Decisions

1. Consolidate duplicated route patterns by resource type.
2. Keep project-storage wire-list sheet state route unchanged.
3. Keep file download endpoint semantics unchanged (stream file by path segments).
4. Remove legacy `projectModel` write path from project manifest update.

---

## Old -> New Endpoint Mapping

## Project index and manifest

- OLD: `GET /api/project-context/projects`
- NEW: `GET /api/project-context/projects`
- Status: unchanged

- OLD: `GET /api/project-context/{projectId}`
- NEW: `GET /api/project-context/{projectId}`
- Status: unchanged

- OLD: `PUT /api/project-context/{projectId}`
- NEW: `PUT /api/project-context/{projectId}`
- Change: legacy `projectModel` payload removed; accepts only `ProjectManifest`

- OLD: `DELETE /api/project-context/{projectId}`
- NEW: `DELETE /api/project-context/{projectId}`
- Status: unchanged

## Pipeline and assignment

- OLD: `POST /api/project-context/{projectId}/initialize`
- NEW: `POST /api/project-context/{projectId}/initialize`
- Status: unchanged

- OLD: `GET|PUT|PATCH /api/project-context/{projectId}/assignment-mappings`
- NEW: `GET|PUT|PATCH /api/project-context/{projectId}/assignment-mappings`
- Status: unchanged

## State object consolidation

- OLD: `GET|PUT /api/project-context/{projectId}/layout-pages`
- OLD: `GET|PUT /api/project-context/{projectId}/layout-mapping`
- NEW: `GET|PUT /api/project-context/{projectId}/state/{key}`
- Keys:
  - `layout-pages`
  - `layout-mapping`
- Change: two endpoints merged into one keyed state endpoint

## Device part numbers consolidation

- OLD: `GET /api/project-context/{projectId}/device-part-numbers`
- OLD: `POST /api/project-context/{projectId}/generate-part-numbers`
- NEW: `GET|POST /api/project-context/{projectId}/device-part-numbers`
- Change: generation merged into POST on the same resource endpoint

## Reference sheets

- OLD: `GET /api/project-context/{projectId}/reference-sheet/{slug}`
- OLD: `POST /api/project-context/{projectId}/generate-reference-sheets`
- NEW: `GET /api/project-context/{projectId}/reference-sheets/{slug}`
- NEW: `POST /api/project-context/{projectId}/reference-sheets/generate`
- Change: naming normalized and generation grouped by resource

## Print schema consolidation

- OLD: `GET|POST /api/project-context/{projectId}/wire-list-print-schema`
- OLD: `POST /api/project-context/{projectId}/generate-print-schemas`
- NEW: `GET|POST /api/project-context/{projectId}/wire-list-print-schemas`
- NEW behavior:
  - `GET ?sheet={slug}` => single saved schema
  - `GET` (no `sheet`) => list sheet slugs
  - `POST` single-sheet generation/save by default
  - `POST` with `mode=all` => batch generation (replaces `generate-print-schemas`)

## Wiring execution/document

- OLD: `GET|POST|DELETE /api/project-context/{projectId}/wiring-execution`
- NEW: `GET|POST|DELETE /api/project-context/{projectId}/wiring-execution`
- Status: unchanged

- OLD: `GET /api/project-context/{projectId}/wiring-document`
- NEW: `GET /api/project-context/{projectId}/wiring-document`
- Status: unchanged

## Export manifest + generation consolidation

- OLD: `GET|POST /api/project-context/{projectId}/branding-exports`
- OLD: `GET|POST /api/project-context/{projectId}/wire-list-exports`
- NEW: `GET|POST /api/project-context/{projectId}/exports`
- Query param:
  - `kind=branding`
  - `kind=wire-lists`

- OLD: `GET /api/project-context/{projectId}/exports/{...segments}`
- NEW: `GET /api/project-context/{projectId}/exports/files/{...segments}`
- Note: response semantics unchanged (inline or attachment via `download=1`)

## Sheets

- OLD: `GET|PUT /api/project-context/{projectId}/sheets/{sheetSlug}`
- NEW: `GET|PUT /api/project-context/{projectId}/sheets/{sheetSlug}`
- Status: unchanged

---

## Removed Endpoints in v2

- `/api/project-context/{projectId}/layout-pages`
- `/api/project-context/{projectId}/layout-mapping`
- `/api/project-context/{projectId}/generate-part-numbers`
- `/api/project-context/{projectId}/generate-reference-sheets`
- `/api/project-context/{projectId}/generate-print-schemas`
- `/api/project-context/{projectId}/branding-exports`
- `/api/project-context/{projectId}/wire-list-exports`
- `/api/project-context/{projectId}/reference-sheet/{slug}`

---

## Request/Response Schemas (Exact Contract)

## 1) PUT /api/project-context/{projectId}

Request body:
- `ProjectManifest`

Validation:
- `manifest.id` must equal route `projectId`

Response 200:
- `{ manifest: ProjectManifest }`

Errors:
- 400 `{ error: "Project id mismatch" }`

## 2) GET|PUT /api/project-context/{projectId}/state/{key}

Path params:
- `key`: `layout-pages | layout-mapping`

### GET response
- key=`layout-pages`:
  - 200 `{ key: "layout-pages", data: { pages: SlimLayoutPage[] } }`
- key=`layout-mapping`:
  - 200 `{ key: "layout-mapping", data: { mapping: unknown | null } }`

Errors:
- 404 `{ error: "Project not found" }`
- 404 `{ error: "State object not found" }`

### PUT request
- key=`layout-pages`:
  - `{ pdNumber?: string | null, projectName?: string | null, pages: Record<string, unknown>[] }`
- key=`layout-mapping`:
  - `{ pdNumber?: string | null, projectName?: string | null, mapping: unknown }`

### PUT response
- 200 `{ ok: true, key: "layout-pages" | "layout-mapping" }`

Errors:
- 400 `{ error: "Could not resolve project directory" }`
- 400 `{ error: "Invalid payload for state key" }`

## 3) GET|POST /api/project-context/{projectId}/device-part-numbers

### GET response
- 200 `{ devices: Record<string, unknown>, generatedAt?: string }`

### POST request
- Empty body allowed

### POST response
- 200
  - `{
      success: true,
      deviceCount: number,
      generatedAt: string,
      message: "Device part numbers generated successfully"
    }`

Errors:
- 404 `{ success: false, error: "Project not found" }`
- 500 `{ success: false, error: string, details?: string }`

## 4) GET /api/project-context/{projectId}/reference-sheets/{slug}

Response 200:
- `{
    sheet: {
      originalName: string,
      slug: string,
      headers: string[],
      rows: unknown[],
      rowCount: number,
      columnCount: number,
      sheetIndex: number,
      warnings: string[]
    }
  }`

Errors:
- 404 `{ error: "Reference sheet not found" }`

## 5) POST /api/project-context/{projectId}/reference-sheets/generate

Request body:
- Empty body allowed

Response 200:
- `{
    success: true,
    generatedAt: string,
    sheetCount: number,
    sheets: Array<unknown>,
    message: string
  }`

Errors:
- 404 `{ success: false, error: "Project not found" }`
- 500 `{ success: false, error: string, details?: string }`

## 6) GET|POST /api/project-context/{projectId}/wire-list-print-schemas

### GET query
- Optional `sheet={slug}`

### GET response
- with `sheet`:
  - 200 `<SavedWireListPrintSchema JSON>`
- without `sheet`:
  - 200 `{ sheets: string[] }`

Errors:
- 404 `{ error: "No saved print schema found for sheet: {slug}" }`

### POST request
Common fields:
- `mode?: "single" | "all"` default `single`

For `mode=single`:
- `rows: SemanticWireListRow[]`
- `currentSheetName: string`
- `sheetSlug?: string`
- `settings?: Partial<PrintSettings>`
- `projectInfo?: ProjectInfo`
- `sheetTitle?: string`
- `hiddenSections?: string[]`
- `hiddenRows?: string[]`
- `crossWireSections?: string[]`
- `save?: boolean` default true

For `mode=all`:
- no additional payload required

### POST response
- `mode=single`:
  - 200 `{ schema: unknown, savedPath?: string }`
- `mode=all`:
  - 200 `<generateAllPrintSchemas result>`

Errors:
- 400 invalid single mode payload
- 500 generation failure

## 7) GET|POST /api/project-context/{projectId}/exports

Query:
- required `kind=branding|wire-lists`

### GET response
- 200 manifest for requested kind:
  - `{
      projectId: string,
      projectName: string,
      generatedAt: string,
      sheetExports: unknown[]
    }`

### POST response
- 200 generation result for requested kind (shape returned by generator)

Errors:
- 400 `{ error: "Missing or invalid kind" }`
- 404 `{ error: "Export manifest not found" }`
- 500 `{ error: string }`

## 8) GET /api/project-context/{projectId}/exports/files/{...segments}

Query:
- optional `download=1` for attachment mode

Response:
- Streams file bytes with content-type inferred by extension

Errors:
- 404 `{ error: "Export file not found" }`

---

## Contract Notes for Unchanged Endpoints

The following contracts are preserved as-is from current implementation:

- `/api/project-context/{projectId}/initialize` POST
- `/api/project-context/{projectId}/assignment-mappings` GET/PUT/PATCH
- `/api/project-context/{projectId}/wiring-execution` GET/POST/DELETE
- `/api/project-context/{projectId}/wiring-document` GET
- `/api/project-context/{projectId}/sheets/{sheetSlug}` GET/PUT
- `/api/project-context/projects` GET
- `/api/project-context/{projectId}` GET/DELETE

---

## Wire List Sheet State Stability Guarantee

No major changes in this draft to:

- `app/api/project-storage/[projectId]/sheets/[sheetSlug]/route.ts`

Specifically unchanged:
- methods: GET, PUT, DELETE
- payload validation behavior
- section-scoped deletion (`?scope=`)
- response envelope `{ state }` and default-record-on-404 behavior

---

## Legacy Removal and Cutover Plan

1. Implement v2 routes and remove mapped legacy routes in same release branch.
2. Update all internal callers to new endpoints before merge.
3. Remove legacy route files listed in Removed Endpoints.
4. Keep project-storage sheet-state route untouched.
5. Run integration tests against STOCK2 fixture paths for:
   - state writes
   - export generation and file retrieval
   - print schema single and batch modes

No fallback compatibility layer is included by design.
