export interface ScheduleProject {
  id: string;
  name: string;
  customer: string;
  unit: string;
  pd: string;
  legals: string;
  sw: string;
  wo: string;
  proj: string;
  conlay: string;
  conasy: string;
  test: string;
  concus: string;
  pwrchk: string;
  d380Final: string;
  dept380: string;
  daysLate: number;
  commit: string;
  biqComp: string;
  hide: string;
  comments: string;
}

export interface Schedule {
  importedAt: string;
  sourceFile: string;
  projects: Record<string, ScheduleProject>;
}

export const ProjectSchedule: Schedule = {
  "importedAt": "2026-04-13T21:28:11.835Z",
  "sourceFile": "slot10.xlsx",
  "projects": {}
};

export default ProjectSchedule;
