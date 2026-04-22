export type ProjectScheduleCellValue = string | number;

export interface ProjectScheduleColumn {
    key: string;
    label: string;
    filterable?: boolean;
}

export interface ProjectScheduleRow {
    id: string;
    [key: string]: ProjectScheduleCellValue;
}

export interface ProjectScheduleGroup {
    id: string;
    projectLabel: string;
    rows: ProjectScheduleRow[];
}

export interface ProjectScheduleDocument {
    columns: ProjectScheduleColumn[];
    groups: ProjectScheduleGroup[];
    importedAt: string;
    sourceFile?: string;
}

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
