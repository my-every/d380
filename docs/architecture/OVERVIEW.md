
# **D380 Local-First Production Operations Platform**

## **Project Proposal & Route-Based Architecture Reference**

## **1. Executive Summary**

This application is a **local-first Electron desktop platform** for D380 operations that manages project intake, wire list and layout matching, assignment execution, workstation allocation, shift handoff, notifications, and completed-project exports using a strict **file-system contract** instead of a database.

The app is intentionally designed so that:

* all source-of-truth project data can be managed from the file system
* operational state is persisted as JSON/config files beside each project
* Excel and PDF files remain usable by Solar outside the app
* the system can run entirely on a local machine or shared drive
* the application can later expand to additional departments beyond D380

The guiding principle is:

> the app is not the owner of the data model — the  **folder structure, Excel workbooks, PDFs, and exported config/state files are** **.**

Electron will be used so the application can:

* access and watch the file system
* scan predictable directories
* import/export PDFs, Excel files, JSON state
* persist local operational state safely

---

# **2. Core Architectural Principles**

## **2.1 Local-first, no database**

The application will not depend on a database.

All reads and writes will happen against the local or network file system.

Primary workspace root:

```
S:\#Depts\380\Priority_Schedule
```

Operational root structure:

```
/380
  /Schedule
  /Projects
  /Teams
  /State
  /CompletedProjects
  /Config
```

Additional engineering drawing source:

```
S:\Legal Drawings\Drawings\<PD#>_<PROJECT_NAME>\ELECTRICAL
```

## **2.2 Route shells are not business logic owners**

Routes should only:

* load workspace context
* call file services and domain modules
* render the correct operational view

Business logic should live in:

* file services
* parsers
* domain modules
* recommendation engines
* workflow/state adapters

## **2.3 Assignment-driven execution model**

Every matched wire-list sheet is treated as an **assignment**.

A project unit is no longer tracked as one monolithic item.

Instead, the unit is decomposed into multiple assignments, each tied to:

* a sheet
* a layout page match
* a stage
* members
* workstation placement
* progress and IPV state

## **2.4 File-system contract as state layer**

Operational state is written beside the project in predictable JSON/config files, so that:

* work can resume across shifts
* state is human-auditable
* files can be backed up externally
* some state can be edited or inspected outside the app if necessary

---

# **3. Required Workspace & File Contract**

## **3.1 Root directories**

```
S:\#Depts\380\Priority_Schedule
  /Schedule
  /Projects
  /Teams
  /State
  /CompletedProjects
  /Config
```

## **3.2 Project directory contract**

Each project folder should follow:

```
/Projects/<PD#>-<ProjectName>/
  /lay
  /ucp
  /reference
  /state
  /exports
```

Minimum required:

* layout PDF in **/lay**
* wire list workbook in **/ucp**

Optional:

* reference sheets/assets
* previous shift progress
* branding exports
* length overrides
* layout matches
* docs/config

## **3.3 Engineering source directory pattern**

The app should also support scanning this source pattern:

```
S:\Legal Drawings\Drawings\<PD#>_<PROJECT_NAME>\ELECTRICAL
```

Example available files may include:

```
<PD#>-UCPWiringList_<REV>.xlsx
<PD#>-UCPWiringList_<REV>_M<VERSION#>.xlsx
<PD#>_LAY_<REV>.pdf
<PD#>_LAY_<REV>_M.<VERSION#>.pdf
<PD#>_ELS_<REV>.pdf
<PD#>_ELS_<REV>_M<VERSION#>.pdf
<PD#>-BrandList_<REV>.xlsx
<PD#>-Certification Device List_<REV>.xlsx
<PD#>-ElectricalDeviceIndex(XLS)_<REV>.xlsx
<PD#>-FWL_<REV>.xlsx
<PD#>-InstrumentationList_<REV>.xlsx
<PD#>-PackageWiringList_<REV>.xlsx
<PD#>-TerminalStripReport_<REV>.xlsx
<PD#>-TestCellConnectionList_<REV>.xlsx
<PD#>-TestCellP&IDDeviceList_<REV>.xlsx
<PD#>-Test_Cell_Device_List_<REV>.xlsx
<PD#>_ELEC_Working Cover.xls
<PD#>_UCP_WL_Compare_B.13_<REV>.xlsx
```

The app should be flexible enough to resolve:

* latest valid layout file
* latest valid wire list file
* matching revision pairs
* optional modified versions **M<VERSION#>**

## **3.4 Team files**

```
/Teams/team-1st-shift.xlsx
/Teams/team-2nd-shift.xlsx
```

Optional versioned format:

```
/Teams/2026-03-19-team-1st-shift.xlsx
/Teams/2026-03-19-team-2nd-shift.xlsx
```

## **3.5 Config files**

```
/Config/home-carousel.xlsx
/Config/notifications-config.json
/Config/workstation-layout.json
/Config/floor-layout.json
```

## **3.6 Global state files**

```
/State/current-shift.json
/State/active-projects.json
/State/leaderboard-cache.json
/State/project-board-session.json
```

## **3.7 Per-project state files**

Recommended per-project state path:

```
/Projects/<PD#>-<ProjectName>/state/
```

Recommended files:

```
project-context.json
assignment-progress.json
assignment-history.json
length-overrides.json
branding-overrides.json
layout-matches.json
team-assignments.json
notifications.json
shift-log.json
```

## **3.8 Completed project exports**

Completed projects should export to:

```
/CompletedProjects/<PD#>-<ProjectName>/
```

Recommended export files:

```
completed-2026-03-19T22-15-00.json
wirelist-summary-2026-03-19T22-15-00.csv
assignment-history-2026-03-19T22-15-00.json
ipv-summary-2026-03-19T22-15-00.json
leadership-metrics-2026-03-19T22-15-00.json
```

---

# **4. Core Domain Models**

## **4.1 Team roster row**

```
type TeamMemberRow = {
  badgeNumber: string
  fullName: string
  role: "team_lead" | "builder" | "wirer" | "tester" | "trainee"
  lwc: ("OFFSKID" | "ONSKID" | "NEW" | "FLEX")[]
  assignmentCompletions: {
    buildup: string[]
    wiring: string[]
    boxBuild: string[]
    crossWiring: string[]
    test: string[]
  }
}
```

This model supports:

* direct qualification
* trainee assignment
* stage filtering
* LWC-based placement

## **4.2 Assignment state**

```
type AssignmentState = {
  assignmentId: string
  projectId: string
  sheetName: string
  lwc: "OFFSKID" | "ONSKID" | "NEW" | "FLEX" | null
  workstationType: "BUILDUP_TABLE" | "WIRING_TABLE" | "TEST_STATION" | null
  stage:
    | "BUILDUP"
    | "IPV1"
    | "WIRING"
    | "IPV2"
    | "BOX_BUILD"
    | "CROSS_WIRING"
    | "TEST_READY"
    | "TEST"
    | "PWR_CHECK"
    | "BIQ"
  status: "PENDING" | "IN_PROGRESS" | "BLOCKED" | "COMPLETE"
  estimatedHours: number | null
  averageHours: number | null
  assignedMembers: string[]
  traineeMembers: string[]
  shiftHistory: {
    shift: "1ST" | "2ND"
    badgeNumber: string
    startedAt: string
    endedAt?: string
  }[]
  completedStages: string[]
  comments: string[]
}
```

## **4.3 Work area / station**

```
type WorkArea = {
  id: string
  lwc: "ONSKID" | "OFFSKID" | "NEW_FLEX" | "OFFICE"
  kind: "BUILDUP_TABLE" | "WIRING_TABLE" | "TEST_STATION" | "FLOAT" | "NTB" | "OFFICE_AREA"
  label: string
  capacity: number
  activeAssignments: string[]
  assignedMembers: string[]
}
```

## **4.4 Notifications**

```
type AssignmentNotification = {
  id: string
  projectId: string
  assignmentId: string
  stage: string
  eventType:
    | "STAGE_STARTED"
    | "STAGE_RESUMED"
    | "STAGE_COMPLETED"
    | "STAGE_REJECTED"
    | "HANDOFF_REQUIRED"
    | "ASSIGNMENT_COMPLETED"
  createdAt: string
  createdByBadge: string
  recipients: string[]
  isRead: boolean
  message: string
}
```

---

# **5. Stage Model & Stage Logic**

## **5.1 Authoritative stage sequence**

```
Build Up → IPV1 → Wiring → IPV2 → Box Build → Cross Wiring → Test Ready → Test → Power Check → BIQ
```

## **5.2 Critical dependency rule**

* **Box Build must be complete before Cross Wiring**
* Box Build may start earlier, but Cross Wiring cannot start until Box Build is complete

## **5.3 Practical stage meanings**

### **Build Up**

Mechanical mounting, rails, terminal blocks, base assembly

### **IPV1**

Verification of Build Up

### **Wiring**

Point-to-point and internal panel wiring

### **IPV2**

Verification of Wiring

### **Box Build**

Install into enclosure / prepare box context / panel integration

### **Cross Wiring**

System integration wiring across sections / door / panel relationships

### **Test Ready**

All required wiring complete and validated

### **Test**

Functional test

### **Power Check**

Power validation checkpoint

### **BIQ**

Final built-in quality review

## **5.4 Notification points between stages**

Team leads should be notified when:

* a stage starts
* a stage resumes
* a stage completes
* IPV rejects a stage
* a stage becomes blocked
* an assignment is fully completed

---

# **6. Startup Flow**

## **Step 1. Launch app**

Electron launches and checks configured workspace root.

If missing:

* show setup screen
* allow selecting root directory

## **Step 2. Validate required directories**

Ensure these exist or can be created:

* /Schedule
* /Projects
* /Teams
* /State
* /CompletedProjects
* /Config

## **Step 3. Prompt shift context**

Prompt team lead for:

* shift selection
* operating date
* optional badge/login for audit trail

## **Step 4. Import schedule PDF**

At shift start, require current schedule PDF import.

Parse:

* active priority projects
* target dates
* project order
* unit-level milestones

Normalize into a project priority list.

## **Step 5. Resolve projects**

Take top priority projects, such as 3–5, and resolve matching folders on disk.

Use tolerant matching for:

* spaces
* commas
* hyphens
* case
* revision patterns

## **Step 6. Scan project folders**

For each selected project:

* locate layout PDF
* locate wire list workbook
* load optional references
* load prior state

If layout is missing, wire list still loads.

If state exists, resume from saved progress.

## **Step 7. Load shift roster**

Load matching team workbook and normalize roster into memory.

## **Step 8. Build assignment inventory**

For each project:

* parse workbook
* parse references
* parse layout
* match sheets to layout pages
* create assignment cards
* estimate effort
* attach saved state

## **Step 9. Suggest assignments**

Use:

* stage
* LWC
* role
* prior assignment completions
* trainee eligibility
* shift
* open station capacity

Logic:

* if member has completed similar assignment before, they qualify directly
* otherwise they may still be assigned as trainee
* team lead always overrides

## **Step 10. Begin shift execution**

Write/update:

* team-assignments.json
* assignment-progress.json
* shift start timestamp

Begin live tracking.

## **Step 11. During shift**

Continuously:

* update assignment state
* persist progress frequently
* preserve row-level and stage-level progress
* log who did what and when
* preserve handoff continuity

## **Step 12. End of shift**

At shift end:

* save all state
* generate shift summary
* mark touched assignments
* preserve incomplete work for takeover
* optionally export leadership metrics snapshot

## **Step 13. Project completion**

When all required assignments and stages are complete:

* export completion bundle to **/CompletedProjects**
* archive/freeze active state
* preserve original project folder




## **Route:** ****

## **/projects**

### **Purpose**

Project operations board.

### **Responsibilities**

* browse active prioritized projects
* filter/search quickly
* visualize lifecycle state
* drill into project details

### **Kanban columns**

* Upcoming Projects
* Kitted
* Conlay
* Conasy
* Test
* PWR Check
* BIQ
* Completed

### **Late**

Should be treated as both:

* a filter/badge overlay
* optionally a dedicated swimlane if desired

### **Lifecycle rules**

* Project enters **Conlay** when first assignment starts Build Up
* Project enters **Conasy** when first assignment enters Wiring, or when Build Up/IPV1 threshold passes
* Project enters **Test** when all required assignments complete through Cross Wiring and project is Test Ready
* Project enters **PWR Check** when Test passes
* Project enters **BIQ** when Power Check passes
* Project enters **Completed** when BIQ completes and target is met

### **UX**

* search
* filters
* loading skeletons
* layout cover previews
* target-date risk badges
* assignment counts
* progress bars

---

## **Route:** ****

## **/project-board**

### **Purpose**

Resource allocation and floor orchestration route.

### **Mental model**

* **/projects** = what exists
* **/project-board** = who is doing what, where, right now

### **Responsibilities**

* assign projects, assignments, and stages to:
  * members
  * tables
  * stations
* reflect actual floor layout
* support shift continuity and trainee pairing



### **Top-level sections**

By LWC:

* ONSKID
* OFFSKID
* NEW/FLEX
* OFFICE

### **Work area types**

* Build Up Tables
* Wiring Tables
* Test Stations
* Float
* NTB
* Office-related zones

### **Core interactions**

* select station/table
* see eligible assignments
* see eligible members
* assign members
* mark trainee pairings
* view blocked assignments
* resume prior-shift work
* rebalance work

### **Team filtering rules**

Filter in this order:

1. correct role for stage
2. matching LWC
3. has completed similar assignment before
4. if not, allow trainee assignment
5. prefer continuity for in-progress work, but allow takeover

### **This route is the operational brain of the app**

---

## **Route:** ****

## **/notifications**

### **Purpose**

Central notification inbox for leads and supervisors.

### **Shows**

* stage completed
* IPV rejected
* handoff required
* assignment blocked
* assignment completed
* project completed

### **Data source**

Derived from per-project **notifications.json** and aggregated into current workspace view.

---

## **Route:** ****

## **/leaderboard**

### **Purpose**

Local performance and productivity view.

### **Metrics derived from state files**

* assignments completed
* terminations completed
* rows IPV’d
* first-pass completions
* clean handoffs
* average completion time per stage
* 1st vs 2nd shift comparison

### **Important rule**

These metrics are **derived from saved JSON/state**, never manually entered.

---

## **Route:** ****

## **/projects/[projectId]**

### **Purpose**

Project detail workspace.

### **Sections**

* overview
* assignments
* files
* progress
* team assignments
* exports

### **Purpose**

This is the hub for a single unit/project.

---

## **Route:** ****

## **/projects/[projectId]/[sheetName]**

### **Purpose**

Assignment execution workspace.

### **Main areas**

* Overview tab
* Stages tab
* wire list
* original wire list sidebar comparison
* device details aside
* branding list
* layout preview

### **Stages tab**

Render stage accordion:

* Build Up
* IPV1
* Wiring
* IPV2
* Box Build
* Cross Wiring
* Test Ready
* Test
* Power Check
* BIQ

Each stage accordion supports:

* status
* start/resume button
* assigned members
* elapsed / estimated time
* comments
* checklist
* completion action
* stage-specific detail content
* notifications

---

## **Route:** ****

## **/completed**

### **Purpose**

Archive browser for completed projects.

### **Responsibilities**

* browse historical completions
* inspect exports
* compare completion times
* review assignment histories
* open final summaries

---

# **8. Assignment Workspace Logic**

## **Overview tab**

Shows:

* project / unit / sheet
* matched layout preview
* LWC
* workstation type
* assigned members
* trainee members
* estimated hours
* current stage
* completion percent
* blockers
* shift handoff summary

## **Stages tab**

Accordion-based execution model.

### **Start/resume behavior**

When a user starts or resumes a stage:

* write timestamp
* log badge number
* update shift history
* set stage to in-progress
* optionally notify lead

### **Completion behavior**

When a stage completes:

* validate required checklist
* write stage completion
* unlock next stage if dependencies satisfied
* emit notification
* optionally auto-expand next actionable stage

---

# **9. Assignment Recommendation Engine**

Before manual assignment, the system should recommend members based on:

* current stage
* role
* LWC
* prior completion arrays
* trainee eligibility
* open station capacity
* continuity from previous shift

This recommendation engine is advisory only.

Team leads always override.

---

# **10. Floor Layout & LWC Routing**

The uploaded floor layout should be normalized into a runtime config.

The app should not depend on PDF parsing every session.

Instead:

* PDF becomes source/reference
* **floor-layout.json** becomes runtime configuration

This allows visual rendering of:

* tables
* stations
* float areas
* office/branding areas

And enables valid stage-to-work-area placement logic.

---

# **11. Leadership Board Logic**

Even without a database, the app can compute a leaderboard from local state.

Key metrics:

* assignments completed
* terminations completed
* rows IPV’d
* first-pass completions
* shift handoff continuity
* average stage completion time

This can support:

* Top Performers this month
* Top Performer spotlight
* 1st vs 2nd shift comparisons

And also feed the **/380** homepage carousel.

---

# **12. Technical Architecture Reference**

## **Electron responsibilities**

Electron should provide:

* local file system access
* directory selection
* file watching
* background scanning/import
* local export/write capability
* safe IPC bridge to UI

## **Frontend responsibilities**

UI should:

* render route shells
* display parsed data
* drive stage workflows
* provide assignment and notification interactions

## **File services**

Should handle:

* schedule PDF import/parsing
* project folder scanning
* layout/wire list resolution
* team workbook loading
* per-project state read/write
* completion export
* leaderboard aggregation

## **Domain modules**

Should handle:

* assignment lifecycle
* stage gating
* layout-to-sheet matching
* team recommendation logic
* notification generation
* shift handoff continuity
* leadership metric aggregation

---

# **13. Recommended Phased Delivery**

## **Phase 1**

* workspace root setup
* /startup
* schedule import
* project discovery
* roster loading
* basic **/380** dashboard

## **Phase 2**

* /projects
* project lifecycle Kanban
* project cards
* layout/wire list matching
* state restoration

## **Phase 3**

* /projects/[projectId]/[sheetName]
* assignment workspace
* overview + stages tabs
* stage accordion
* notifications

## **Phase 4**

* /project-board
* floor layout rendering
* workstation assignment
* member recommendation
* trainee pairing
* handoff workflows

## **Phase 5**

* /leaderboard
* /notifications
* /completed
* exports, summaries, historical views

---

# **14. Final Positioning**

This application is not just a wire-list viewer. It is a:

* **local-first project operations platform**
* **assignment execution system**
* **floor/station orchestration tool**
* **shift-handoff tracker**
* **stage-based production workflow engine**
* **auditable file-system-managed operational workspace**

Because it relies on:

* Excel
* PDF
* JSON/config state
* stable directory patterns

…it remains compatible with Solar’s local deployment constraints while still being robust enough to support:

* project prioritization
* assignment execution
* member qualification routing
* floor-aware scheduling
* notifications
* completion exports
* leadership metrics

If you want, the next best step is for me to turn this into a **v0.dev implementation proposal organized by phases and routes**, or a **Copilot-ready technical spec** for the Electron file service layer.
