"use client";

/**
 * Projects List Page - /projects
 * 
 * Modern, dark-themed project dashboard with:
 * - Gradient banner header with advanced filters
 * - Overview section with project description
 * - Sleek Kanban columns with visual hierarchy
 * - Project cards with layout image previews
 * - Click navigation to /projects/[projectID]
 */

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  FileSpreadsheet,
  Trash2,
  ListChecks,
  Calendar,
  Layers,
  LayoutGrid,
  Kanban,
  Search,
  SlidersHorizontal,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import PageLayout from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProjectContext } from "@/contexts/project-context";
import type { ProjectManifest } from "@/types/project-manifest";
import { LWC_TYPE_REGISTRY } from "@/lib/workbook/types";
import { PriorityListView } from "@/components/projects/priority-list-view";
import { DashboardProjectAside } from "@/components/projects/dashboard-project-aside";
import { ProjectUploadFlow } from "@/components/projects/project-upload-flow";
import { ProjectsHeroBanner } from "@/components/projects/projects-hero-banner";

// ============================================================================
// Project List View Components
// ============================================================================

interface ProjectsListViewProps {
  allProjects: ProjectManifest[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

function ProjectsListView({
  allProjects,
  currentProjectId,
  onSelectProject,
  onDeleteProject,
}: ProjectsListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "sheets">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "kanban">("grid");
  const [activeTab, setActiveTab] = useState<"projects" | "priority">("projects");
  const router = useRouter();

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let projects = [...allProjects];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      projects = projects.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.filename.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case "name":
        projects.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "sheets":
        projects.sort((a, b) => b.sheets.length - a.sheets.length);
        break;
      case "recent":
      default:
        projects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return projects;
  }, [allProjects, searchQuery, sortBy]);

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero Banner Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-background to-accent/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                              linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />



        <div className="relative container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 h-[300px] items-center flex">
          <div className="flex flex-col gap-8">
            {/* Header Content */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="flex flex-col gap-4">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Projects
                </h1>
                <p className="text-muted-foreground mt-1 text-xl">
                  Manage wiring and buildup projects
                </p>


              </div>

            </div>
          </div>
          {/* Product type banner slider — bottom right */}
          <ProjectsHeroBanner />
        </div>
      </div>



      {/* Tab Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 overflow-y-auto flex flex-col gap-6">
        <div className="flex flex-wrap justify-between flex-1 items center">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-card/50 p-1 self-start max-w-max">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 rounded-md px-4 ${activeTab === "projects"
                ? "bg-accent text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setActiveTab("projects")}
            >
              <LayoutGrid className="h-4 w-4" />
              Projects
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 rounded-md px-4 ${activeTab === "priority"
                ? "bg-accent text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
              onClick={() => setActiveTab("priority")}
            >
              <ListChecks className="h-4 w-4" />
              Priority List
            </Button>
          </div>

          {/* Search and Filters Bar — only for projects tab */}
          {activeTab === "projects" && <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card/50 border-border/50 focus:bg-card"
              />
            </div>

            <div className="flex gap-2">
              {/* View Mode Toggle */}
              <div className="flex rounded-lg border border-border/50 overflow-hidden bg-card/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-none px-3 ${viewMode === "grid" ? "bg-accent" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-none px-3 ${viewMode === "kanban" ? "bg-accent" : ""}`}
                  onClick={() => setViewMode("kanban")}
                >
                  <Kanban className="h-4 w-4" />
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 bg-card/50 border-border/50">
                    <SlidersHorizontal className="h-4 w-4" />
                    Sort: {sortBy === "recent" ? "Recent" : sortBy === "name" ? "Name" : "Sheets"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortBy("recent")}>
                    <Clock className="mr-2 h-4 w-4" />
                    Most Recent
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("name")}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Project Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("sheets")}>
                    <Layers className="mr-2 h-4 w-4" />
                    Sheet Count
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>}

        </div>

        {activeTab === "priority" ? (
          <PriorityListView />
        ) : (
          filteredProjects.length === 0 && allProjects.length === 0 ? (
            <Card className="border-dashed border-border/50 bg-card/30">
              <CardContent className="flex flex-col items-center justify-center gap-6 py-16">

                <div className="text-center max-w-md">
                  <h3 className="text-xl font-semibold text-foreground">No projects yet</h3>
                  <p className="text-muted-foreground mt-2">
                    Upload an Excel workbook to create your first project and start managing your wiring assignments.
                  </p>
                </div>
                <Link href="/projects/upload">
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No projects match your search.</p>
              <Button variant="link" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            </div>
          ) : viewMode === "kanban" ? (
            /* LWC Kanban View */
            <div className="flex gap-4 overflow-x-auto pb-4" data-tour="project-kanban">
              {Object.values(LWC_TYPE_REGISTRY).map((lwcConfig) => {
                const lwcProjects = filteredProjects.filter(
                  (p) => p.lwcType === lwcConfig.id
                );
                return (
                  <div
                    key={lwcConfig.id}
                    className="flex-shrink-0 w-80 min-h-[400px] rounded-xl border border-border/50 bg-card/30 overflow-hidden"
                  >
                    {/* Column Header */}
                    <div
                      className="px-4 py-3 border-b border-border/50 flex items-center gap-2"
                      style={{ backgroundColor: `${lwcConfig.dotColor}10` }}
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: lwcConfig.dotColor }}
                      />
                      <span className="font-semibold text-sm">{lwcConfig.label}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {lwcProjects.length}
                      </Badge>
                    </div>

                    {/* Column Content */}
                    <div className="p-3 flex flex-col gap-3 max-h-[600px] overflow-y-auto">
                      {lwcProjects.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No projects
                        </div>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {lwcProjects.map((project, index) => (
                            <ModernProjectCard
                              key={project.id}
                              project={project}
                              isActive={project.id === currentProjectId}
                              onSelect={() => handleProjectClick(project.id)}
                              onDelete={() => onDeleteProject(project.id)}
                              index={index}
                              compact
                            />
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Unassigned Column */}
              {(() => {
                const unassignedProjects = filteredProjects.filter(
                  (p) => !p.lwcType
                );
                return unassignedProjects.length > 0 ? (
                  <div className="flex-shrink-0 w-80 min-h-[400px] rounded-xl border border-dashed border-border/50 bg-muted/30 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2 bg-muted/50">
                      <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                      <span className="font-semibold text-sm text-muted-foreground">Unassigned</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {unassignedProjects.length}
                      </Badge>
                    </div>
                    <div className="p-3 flex flex-col gap-3 max-h-[600px] overflow-y-auto">
                      <AnimatePresence mode="popLayout">
                        {unassignedProjects.map((project, index) => (
                          <ModernProjectCard
                            key={project.id}
                            project={project}
                            isActive={project.id === currentProjectId}
                            onSelect={() => handleProjectClick(project.id)}
                            onDelete={() => onDeleteProject(project.id)}
                            index={index}
                            compact
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            /* Grid View */
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-tour="project-cards">
              <AnimatePresence mode="popLayout">
                {filteredProjects.map((project, index) => (
                  <ModernProjectCard
                    key={project.id}
                    project={project}
                    isActive={project.id === currentProjectId}
                    onSelect={() => handleProjectClick(project.id)}
                    onDelete={() => onDeleteProject(project.id)}
                    index={index}
                  />
                ))}
              </AnimatePresence>

            </div>
          )
        )}
      </div>

    </main>
  );
}

// ============================================================================
// Modern Project Card
// ============================================================================

interface ModernProjectCardProps {
  project: ProjectManifest;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  index: number;
  compact?: boolean;
}

function ModernProjectCard({ project, isActive, onSelect, onDelete, index, compact = false }: ModernProjectCardProps) {

  

  // Get project color from user selection during upload (default to Caterpillar/Solar yellow)
  const projectColor = project.color || "#D4A84B";

  // Get LWC config if set
  const lwcConfig = project.lwcType
    ? LWC_TYPE_REGISTRY[project.lwcType]
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className=" relative  rounded-xl "
    >


      <Card
        className={`
          group relative overflow-hidden  transition-all duration-200 cursor-pointer 
          bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm
          hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5
          ${isActive ? "ring-2 ring-offset-0" : ""}
        `}
        style={{
          // Apply user's project color as ring when active
          ...(isActive ? {
            '--tw-ring-color': projectColor,
          } as React.CSSProperties : {})
        }}
        onClick={onSelect}
      >

        <CardHeader className="pb-1 pt-2.5">
          <div className="flex items-start justify-between gap-4 text-card-foreground">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className="rounded-md p-1.5 shrink-0 flex items-center justify-center shadow-sm"
                style={{
                  backgroundColor: `${projectColor}15`,
                  border: `1px solid ${projectColor}30`
                }}
              >
                <FileSpreadsheet
                  className="h-4 w-4"
                  style={{ color: projectColor }}
                  strokeWidth={2}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-[13px] font-semibold truncate text-foreground leading-tight">
                    {project.name}
                  </CardTitle>
                  {lwcConfig && !compact && (
                    <div
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: lwcConfig.dotColor }}
                      title={lwcConfig.label}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CardDescription className="text-[11px] truncate text-muted-foreground">
                    {project.pdNumber && (
                      <span className="font-mono">{project.pdNumber}</span>
                    )}
                    {project.pdNumber && project.unitNumber && " / "}
                    {project.unitNumber && (
                      <span>Unit {project.unitNumber}</span>
                    )}
                    {!project.pdNumber && !project.unitNumber && project.filename}
                  </CardDescription>
                  {project.revision && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 font-mono border-slate-300 dark:border-slate-700">
                      Rev {project.revision}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>

   
      </Card>

      {/* Color accent bar at top - sleek minimal design */}
      <div
        className="h-8 w-1 rounded-xl absolute top-4 left-0"
        style={{ backgroundColor: projectColor }}
      />
    </motion.div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ProjectsPage() {
  const {
    currentProjectId,
    allProjects,
    loadProject,
    deleteProject,
    isLoading,
  } = useProjectContext();

  const [selectedProject, setSelectedProject] = useState<ProjectManifest | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleSelectProject = useCallback((projectId: string) => {
    loadProject(projectId);
    const found = allProjects.find(p => p.id === projectId) ?? null;
    setSelectedProject(found);
  }, [loadProject, allProjects]);

  const handleDeleteProject = useCallback((projectId: string) => {
    deleteProject(projectId);
    if (selectedProject?.id === projectId) setSelectedProject(null);
  }, [deleteProject, selectedProject]);

  // Loading state
  if (isLoading) {
    return (
      <PageLayout title="Projects" showAside={false}>
        <div className="flex flex-col gap-8">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Projects"
      showAside={!!selectedProject}
      asideContent={
        selectedProject ? (
          <DashboardProjectAside project={selectedProject} />
        ) : undefined
      }
      headerActions={
        <Button
          size="sm"
          className="gap-2"
          onClick={() => setUploadOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      }
    >
      <ProjectsListView
        allProjects={allProjects}
        currentProjectId={currentProjectId}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* Upload Flow Dialog */}
      {uploadOpen && (
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-h-[90vh] min-w-6xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Upload an Excel workbook to create a new project.
              </DialogDescription>
            </DialogHeader>
            <ProjectUploadFlow
              mode="create"
              onCancel={() => setUploadOpen(false)}
              onClose={() => setUploadOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </PageLayout>
  );
}
