"use client";

import { BookMarked, BriefcaseBusiness, FolderKanban, GraduationCap, Library, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PageLayout from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useProjectContext } from "@/contexts/project-context";
import type { PartsRootManifest } from "@/types/parts-library";
import type { TrainingSummary } from "@/types/training";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function WorkspaceHomePage() {
  const { allProjects, currentProject } = useProjectContext();
  const [partsManifest, setPartsManifest] = useState<PartsRootManifest | null>(null);
  const [trainingModules, setTrainingModules] = useState<TrainingSummary[]>([]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const [partsResponse, trainingResponse] = await Promise.all([
          fetch("/api/parts?manifest=true", { cache: "no-store" }),
          fetch("/api/training", { cache: "no-store" }),
        ]);

        if (!isMounted) {
          return;
        }

        if (partsResponse.ok) {
          const payload = await partsResponse.json() as { manifest?: PartsRootManifest };
          setPartsManifest(payload.manifest ?? null);
        }

        if (trainingResponse.ok) {
          const payload = await trainingResponse.json() as { trainings?: TrainingSummary[] };
          setTrainingModules(payload.trainings ?? []);
        }
      } catch (error) {
        console.error("Failed to load workspace home metrics:", error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const publishedTrainingCount = useMemo(
    () => trainingModules.filter((module) => module.status === "published").length,
    [trainingModules],
  );

  const routeCards = [
    {
      title: "Board",
      description: "Assign projects to users, review competency, and route stage workspaces.",
      href: "/board",
      icon: BriefcaseBusiness,
      metric: formatCount(allProjects.reduce((total, project) => total + Object.keys(project.assignments ?? {}).length, 0)),
      meta: "Stage-based assignment routing",
    },
    {
      title: "Projects",
      description: "Manage workbook intake, wiring progress, and active assignments.",
      href: "/projects",
      icon: FolderKanban,
      metric: formatCount(allProjects.length),
      meta: currentProject ? `Current: ${currentProject.name}` : "No active project selected",
    },
    {
      title: "Parts",
      description: "Track part categories, review coverage, and library readiness.",
      href: "/parts",
      icon: Library,
      metric: formatCount(partsManifest?.totalParts ?? 0),
      meta: `${Object.keys(partsManifest?.categories ?? {}).length} categories`,
    },
    {
      title: "Training",
      description: "Browse published modules, drafts, and floor-facing training content.",
      href: "/training",
      icon: GraduationCap,
      metric: formatCount(trainingModules.length),
      meta: `${publishedTrainingCount} published`,
    },
  ];

  return (
    <PageLayout
      title="D380"
      subtitle="Command center for projects, parts, and training"
      activeRootId="home"
      showAside={false}
      showHeading={false}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-2 py-4 sm:px-4">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.2),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] px-6 py-8 shadow-sm dark:bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.12),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.88))] sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:44px_44px] opacity-40 dark:opacity-15" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <Badge variant="outline" className="rounded-full border-primary/25 bg-background/80 px-3 py-1">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                380
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Welcome!
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
               A dedicated home for accessing project workbooks, browsing the parts library, and reviewing training materials all in one place. 
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full">
                <Link href="/board">Open Board</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/projects">Open Projects</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/parts">Review Parts</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {routeCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link key={card.title} href={card.href} className="block">
                <Card className="h-full rounded-[1.75rem] border-border/70 py-0 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="px-6 pt-6">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-2xl font-semibold tracking-tight text-foreground">{card.metric}</span>
                    </div>
                    <CardTitle className="text-xl">{card.title}</CardTitle>
                    <CardDescription className="text-sm leading-6">{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 pt-0">
                    <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
                      {card.meta}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="rounded-[1.75rem] border-border/70 py-0">
            <CardHeader className="px-6 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <BookMarked className="h-4 w-4" />
                Route strategy
              </div>
              <CardTitle className="text-xl">Primary app paths</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 px-6 pb-6 pt-0">
              {["/380", "/board", "/projects", "/parts", "/training"].map((route) => (
                <div
                  key={route}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm"
                >
                  <span className="font-medium text-foreground">{route}</span>
                  <Badge variant="outline" className="rounded-full">
                    Active
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem] border-border/70 py-0">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-xl">Workspace snapshot</CardTitle>
              <CardDescription>
                Quick status pulled from the same project, parts, and training sources used by the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-6 pb-6 pt-0">
              <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Projects</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatCount(allProjects.length)}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Parts</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">
                  {formatCount(partsManifest?.totalParts ?? 0)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Training</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{formatCount(trainingModules.length)}</div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </PageLayout>
  );
}
