"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ImageIcon,
  Info,
  Layers3,
  Loader2,
  LogIn,
  Minus,
  Printer,
  Plus,
  Copy,
  Trash2,
  X,
} from "lucide-react";

import { useProjectContext, fetchSheetSchema, fetchWireListPrintSchema } from "@/contexts/project-context";
import { SingleSheetPrintWorkspace } from "@/components/wire-list/print-modal";
import { FileCard } from "@/components/projects/file-card";
import { LoginPopup } from "@/components/dialog/login-popup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/use-session";
import type { LayoutPagePreview, SlimLayoutPage } from "@/lib/layout-matching";
import type { WireListPrintSchema } from "@/lib/wire-list-print/schema";
import type { BrandListExportSchema, BrandListSchemaRow } from "@/lib/wire-brand-list/schema";
import type { SheetSchema } from "@/types/sheet-schema";
import { cn } from "@/lib/utils";
import { resolveLayoutPreviewPage } from "@/lib/layout-matching/resolve-layout-preview";

interface MultiSheetPrintModalProps {
  projectId?: string;
  currentSheetSlug?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  title?: string;
  description?: string;
  combineLabel?: string;
  workspaceMode?: "print" | "wire-list";
}

interface MultiSheetTabItem {
  slug: string;
  name: string;
  rowCount: number;
  pageNumber?: number;
  pageTitle?: string;
  imageUrl?: string;
  resolvedPage?: LayoutPagePreview;
}

interface LoadedSheetResources {
  sheet: SheetSchema | null;
  printSchema: WireListPrintSchema | null;
  brandSchema: BrandListExportSchema | null;
}

interface MultiSheetPrintExportResult {
  projectId: string;
  generatedAt: string;
  approvedSheets: Array<{
    sheetSlug: string;
    sheetName: string;
    brandingRows: number;
    wireRows: number;
  }>;
  skippedSheets: Array<{
    sheetSlug: string;
    reason: string;
  }>;
  brandingWorkbook?: {
    fileName: string;
    relativePath: string;
  };
  wireListSchema?: {
    fileName: string;
    relativePath: string;
  };
  manifestFile?: {
    fileName: string;
    relativePath: string;
  };
}

interface MultiSheetPrintSheetReview {
  sheetSlug: string;
  reviewedAt: string;
  reviewedByBadge: string | null;
  reviewedByName: string | null;
}

interface MultiSheetPrintExportFilesState {
  brandingWorkbookExists: boolean;
  wireListSchemaExists: boolean;
  manifestFileExists: boolean;
}

type FileCardFormat = ComponentProps<typeof FileCard>["formatFile"];
type MultiSheetWorkspaceMode = "print" | "wire-list";

function createManualBrandSchemaRow(options: {
  prefix: string;
  bundleName: string;
  toLocation: string;
  rowIndex: number;
}): BrandListSchemaRow {
  return {
    rowId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    rowIndex: options.rowIndex,
    fromDeviceId: "",
    wireNo: "",
    wireId: "",
    gaugeSize: "",
    length: null,
    toDeviceId: "",
    toLocation: options.toLocation,
    bundleName: options.bundleName,
    bundleDisplay: options.bundleName,
    devicePrefix: options.prefix,
  };
}

function getSwsAccentColor(swsType?: string | null) {
  const value = (swsType ?? "").toUpperCase();
  if (value.includes("PANEL")) return "#16a34a";
  if (value.includes("BOX")) return "#ea580c";
  if (value.includes("RAIL")) return "#2563eb";
  if (value.includes("BLANK")) return "#6b7280";
  return "#64748b";
}

function formatReviewTime(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

async function fetchBrandListSchema(
  projectId: string,
  sheetSlug: string,
): Promise<BrandListExportSchema | null> {
  const response = await fetch(
    `/api/project-context/${encodeURIComponent(projectId)}/wire-brand-list-schemas?sheet=${encodeURIComponent(sheetSlug)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<BrandListExportSchema>;
}

export function MultiSheetPrintModal({
  projectId,
  currentSheetSlug,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
  title = "Multi-Brand List Review",
  description = "Review each sheet, approve it, then combine everything into a single export ready for handoff.",
  combineLabel = "Combine & Export",
  workspaceMode = "print",
}: MultiSheetPrintModalProps) {
  const { currentProject, loadProject } = useProjectContext();
  const { user } = useSession();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [layoutPages, setLayoutPages] = useState<SlimLayoutPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string | null>(currentSheetSlug ?? null);
  const [resourceMap, setResourceMap] = useState<Record<string, LoadedSheetResources>>({});
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [approvedSlugs, setApprovedSlugs] = useState<string[]>([]);
  const [sheetReviews, setSheetReviews] = useState<Record<string, MultiSheetPrintSheetReview>>({});
  const [isCombining, setIsCombining] = useState(false);
  const [exportResult, setExportResult] = useState<MultiSheetPrintExportResult | null>(null);
  const [hasLoadedSession, setHasLoadedSession] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<MultiSheetWorkspaceMode>(workspaceMode);
  const [isSavingBrandSchema, setIsSavingBrandSchema] = useState(false);
  const [layoutPreviewOpen, setLayoutPreviewOpen] = useState(false);
  const [layoutPreviewMinimized, setLayoutPreviewMinimized] = useState(false);
  const [layoutPreviewPosition, setLayoutPreviewPosition] = useState({ x: 72, y: 96 });
  const [selectedBrandRows, setSelectedBrandRows] = useState<Set<string>>(() => new Set());
  const [savedBrandSchemaSlugs, setSavedBrandSchemaSlugs] = useState<string[]>([]);
  const [exportFileState, setExportFileState] = useState<MultiSheetPrintExportFilesState | null>(null);
  const [stateReviewOpen, setStateReviewOpen] = useState(false);

  const isAuthenticated = Boolean(user);
  const isControlled = typeof controlledOpen === "boolean";
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = useCallback((nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }, [isControlled, onOpenChange]);
  const isWireListMode = activeWorkspaceMode === "wire-list";

  useEffect(() => {
    if (isOpen) {
      setActiveWorkspaceMode(workspaceMode);
    }
  }, [isOpen, workspaceMode]);

  useEffect(() => {
    setSelectedBrandRows(new Set());
  }, [activeSlug]);

  useEffect(() => {
    if (!isOpen || !projectId || currentProject?.id === projectId) {
      return;
    }

    loadProject(projectId);
  }, [currentProject?.id, isOpen, loadProject, projectId]);

  const getFileCardFormat = useCallback((fileName: string): FileCardFormat => {
    const extension = fileName.toLowerCase().split(".").pop() ?? "";

    if (extension === "xlsx" || extension === "xls" || extension === "csv" || extension === "json" || extension === "pdf") {
      return extension;
    }

    return "txt";
  }, []);

  const buildExportHref = useCallback((relativePath: string) => {
    if (!projectId) {
      return "#";
    }

    const normalizedRelativePath = relativePath.replace(/^exports\//, "");
    const encodedSegments = normalizedRelativePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `/api/project-context/${encodeURIComponent(projectId)}/exports/files/${encodedSegments}?download=1`;
  }, [projectId]);

  const buildPrintPreviewHref = useCallback((sheetSlug: string) => {
    if (!projectId) {
      return "#";
    }

    return `/print/project-context/${encodeURIComponent(projectId)}/wire-list/${encodeURIComponent(sheetSlug)}`;
  }, [projectId]);

  const tabs = useMemo<MultiSheetTabItem[]>(() => {
    const assignments = currentProject?.assignments ?? {};
    const operationalSheets = currentProject?.sheets.filter((sheet) => sheet.kind === "operational") ?? [];

    const items = operationalSheets.map((sheet) => {
      const assignment = assignments[sheet.slug] as
        | {
            layout?:
              | {
                  primaryPage?: { pageNumber?: number; title?: string; confidence?: string; matchMethod?: string };
                  pages?: Array<{ pageNumber?: number; title?: string; confidence?: string; matchMethod?: string }>;
                }
              | string
              | null;
          }
        | undefined;
      const assignmentLayout =
        assignment?.layout && typeof assignment.layout === "object" ? assignment.layout : undefined;
      const candidatePage = assignmentLayout?.primaryPage ?? assignmentLayout?.pages?.[0];
      const primaryPage = candidatePage && candidatePage.confidence !== "low" && candidatePage.matchMethod !== "fallback"
        ? candidatePage
        : undefined;
      const resolvedPage = resolveLayoutPreviewPage({
        pages: layoutPages,
        matchedPageNumber: primaryPage?.pageNumber,
        matchedPageTitle: primaryPage?.title,
        sheetName: sheet.name,
        sheetSlug: sheet.slug,
      });

      return {
        slug: sheet.slug,
        name: sheet.name,
        rowCount: sheet.rowCount,
        pageNumber: resolvedPage?.pageNumber ?? primaryPage?.pageNumber,
        pageTitle: resolvedPage?.title ?? primaryPage?.title,
        imageUrl: resolvedPage?.imageUrl,
        resolvedPage,
      };
    });

    items.sort((a, b) => {
      if (a.slug === currentSheetSlug) return -1;
      if (b.slug === currentSheetSlug) return 1;
      return a.name.localeCompare(b.name);
    });

    return items;
  }, [currentProject?.assignments, currentProject?.sheets, currentSheetSlug, layoutPages]);

  useEffect(() => {
    if (!tabs.length) {
      setActiveSlug(null);
      return;
    }

    setActiveSlug((prev) => (prev && tabs.some((tab) => tab.slug === prev) ? prev : tabs[0]?.slug ?? null));
    setApprovedSlugs((prev) => prev.filter((slug) => tabs.some((tab) => tab.slug === slug)));
    setSheetReviews((prev) => {
      const validSlugs = new Set(tabs.map((tab) => tab.slug));
      return Object.fromEntries(Object.entries(prev).filter(([slug]) => validSlugs.has(slug)));
    });
  }, [tabs]);

  useEffect(() => {
    if (!isOpen || !projectId) {
      return;
    }

    let cancelled = false;
    setHasLoadedSession(false);

    void fetch(`/api/project-context/${encodeURIComponent(projectId)}/multi-sheet-print/session`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<{
          session?: {
            activeSheetSlug: string | null;
            approvedSheetSlugs: string[];
            sheetReviews?: Record<string, MultiSheetPrintSheetReview>;
            lastCombinedExportResult: MultiSheetPrintExportResult | null;
          } | null;
          exportFiles?: MultiSheetPrintExportFilesState;
        }>;
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        const session = payload.session;
        if (session) {
          setActiveSlug(session.activeSheetSlug ?? null);
          setApprovedSlugs(Array.isArray(session.approvedSheetSlugs) ? session.approvedSheetSlugs : []);
          setSheetReviews(session.sheetReviews ?? {});
          setExportFileState(payload.exportFiles ?? null);
          setExportResult(
            session.lastCombinedExportResult && (payload.exportFiles?.brandingWorkbookExists ?? true)
              ? session.lastCombinedExportResult
              : null,
          );
        } else {
          setApprovedSlugs([]);
          setSheetReviews({});
          setExportResult(null);
          setExportFileState(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSheetReviews({});
          setExportResult(null);
          setExportFileState(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHasLoadedSession(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!isOpen || !projectId) {
      return;
    }

    let cancelled = false;
    setIsLoadingPages(true);

    void fetch(`/api/project-context/${encodeURIComponent(projectId)}/state/layout-pages`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<{ data?: { pages?: SlimLayoutPage[] } }>;
      })
      .then((payload) => {
        if (!cancelled) {
          setLayoutPages(payload.data?.pages ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLayoutPages([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPages(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  useEffect(() => {
    if (!isOpen || !projectId) {
      return;
    }

    let cancelled = false;
    void fetch(`/api/project-context/${encodeURIComponent(projectId)}/wire-brand-list-schemas`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<{ sheets?: string[] }>;
      })
      .then((payload) => {
        if (!cancelled) {
          setSavedBrandSchemaSlugs(Array.isArray(payload.sheets) ? payload.sheets : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSavedBrandSchemaSlugs([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  const loadResourcesForSheet = useCallback(async (sheetSlug: string) => {
    if (!projectId) {
      return;
    }

    if (resourceMap[sheetSlug]) {
      return;
    }

    setLoadingSlug(sheetSlug);
    try {
      const [sheet, printSchema, brandSchema] = await Promise.all([
        fetchSheetSchema(projectId, sheetSlug),
        fetchWireListPrintSchema(projectId, sheetSlug),
        fetchBrandListSchema(projectId, sheetSlug),
      ]);

      setResourceMap((prev) => ({
        ...prev,
        [sheetSlug]: {
          sheet,
          printSchema,
          brandSchema,
        },
      }));
    } finally {
      setLoadingSlug((prev) => (prev === sheetSlug ? null : prev));
    }
  }, [projectId, resourceMap]);

  useEffect(() => {
    if (!isOpen || !activeSlug) {
      return;
    }

    void loadResourcesForSheet(activeSlug);
  }, [activeSlug, isOpen, loadResourcesForSheet]);

  useEffect(() => {
    if (!isOpen || !projectId || !hasLoadedSession) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetch(`/api/project-context/${encodeURIComponent(projectId)}/multi-sheet-print/session`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activeSheetSlug: activeSlug,
          approvedSheetSlugs: approvedSlugs,
          sheetReviews,
          lastCombinedExportResult: exportResult,
        }),
      }).catch(() => null);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeSlug, approvedSlugs, exportResult, hasLoadedSession, isOpen, projectId, sheetReviews]);

  const activeIndex = useMemo(() => tabs.findIndex((tab) => tab.slug === activeSlug), [activeSlug, tabs]);
  const activeTab = activeIndex >= 0 ? tabs[activeIndex] : null;
  const activeResources = activeSlug ? resourceMap[activeSlug] : undefined;
  const activeAssignment = activeSlug && currentProject?.assignments
    ? currentProject.assignments[activeSlug]
    : undefined;
  const activeBrandSchema = activeResources?.brandSchema ?? null;
  const activeBrandRowIds = useMemo(() => {
    if (!activeBrandSchema) {
      return [];
    }

    return activeBrandSchema.prefixGroups.flatMap((group) =>
      group.bundles.flatMap((bundle) => bundle.rows.map((row) => row.rowId)),
    );
  }, [activeBrandSchema]);
  const reviewState = useMemo(() => {
    const savedSet = new Set(savedBrandSchemaSlugs);
    const mappedSheets = tabs.filter((tab) => Boolean(tab.pageNumber)).length;
    const savedSchemas = tabs.filter((tab) => savedSet.has(tab.slug) || Boolean(resourceMap[tab.slug]?.brandSchema)).length;
    const allApproved = tabs.length > 0 && tabs.every((tab) => approvedSlugs.includes(tab.slug));
    const brandingWorkbookReady = Boolean(exportResult?.brandingWorkbook && (exportFileState?.brandingWorkbookExists ?? true));

    return {
      totalSheets: tabs.length,
      mappedSheets,
      savedSchemas,
      approvedSheets: approvedSlugs.length,
      allApproved,
      brandingWorkbookReady,
      wireListSchemaReady: Boolean(exportResult?.wireListSchema && (exportFileState?.wireListSchemaExists ?? true)),
      mappingNeedsReview: tabs.length > 0 && mappedSheets < tabs.length,
    };
  }, [approvedSlugs.length, exportFileState, exportResult, resourceMap, savedBrandSchemaSlugs, tabs]);

  const persistBrandSchema = useCallback((sheetSlug: string, schema: BrandListExportSchema) => {
    if (!projectId) {
      return;
    }

    setIsSavingBrandSchema(true);
    void fetch(`/api/project-context/${encodeURIComponent(projectId)}/wire-brand-list-schemas`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sheetSlug, schema }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(payload.error || `HTTP ${response.status}`);
        }

        return response.json() as Promise<{ schema: BrandListExportSchema }>;
      })
      .then((payload) => {
        setResourceMap((prev) => ({
          ...prev,
          [sheetSlug]: {
            ...(prev[sheetSlug] ?? { sheet: null, printSchema: null, brandSchema: null }),
            brandSchema: payload.schema,
          },
        }));
        setSavedBrandSchemaSlugs((prev) => Array.from(new Set([...prev, sheetSlug])));
      })
      .catch((error) => {
        toast({
          title: "Brand schema save failed",
          description: error instanceof Error ? error.message : "Unable to save brand schema edits",
          duration: 3500,
        });
      })
      .finally(() => {
        setIsSavingBrandSchema(false);
      });
  }, [projectId, toast]);

  const updateActiveBrandSchema = useCallback((mutator: (schema: BrandListExportSchema) => BrandListExportSchema) => {
    if (!activeSlug || !activeBrandSchema) {
      return;
    }

    const nextSchema = mutator(activeBrandSchema);
    const totalRows = nextSchema.prefixGroups.reduce(
      (sum, group) => sum + group.bundles.reduce((bundleSum, bundle) => bundleSum + bundle.rows.length, 0),
      0,
    );
    const normalizedSchema: BrandListExportSchema = {
      ...nextSchema,
      totalRows,
      generatedAt: new Date().toISOString(),
    };

    setResourceMap((prev) => ({
      ...prev,
      [activeSlug]: {
        ...(prev[activeSlug] ?? { sheet: null, printSchema: null, brandSchema: null }),
        brandSchema: normalizedSchema,
      },
    }));
    setApprovedSlugs((prev) => prev.filter((slug) => slug !== activeSlug));
    setSheetReviews((prev) => {
      const next = { ...prev };
      delete next[activeSlug];
      return next;
    });
    setExportResult(null);
    setExportFileState(null);
    setSavedBrandSchemaSlugs((prev) => Array.from(new Set([...prev, activeSlug])));
    persistBrandSchema(activeSlug, normalizedSchema);
  }, [activeBrandSchema, activeSlug, persistBrandSchema]);

  const renameBrandBundle = useCallback((prefixIndex: number, bundleIndex: number, nextName: string) => {
    updateActiveBrandSchema((schema) => ({
      ...schema,
      prefixGroups: schema.prefixGroups.map((group, groupIndex) => groupIndex === prefixIndex ? {
        ...group,
        bundles: group.bundles.map((bundle, currentBundleIndex) => currentBundleIndex === bundleIndex ? {
          ...bundle,
          bundleName: nextName,
          rows: bundle.rows.map((row) => ({
            ...row,
            bundleName: nextName,
            bundleDisplay: row.bundleDisplay === bundle.bundleName || !row.bundleDisplay ? nextName : row.bundleDisplay,
          })),
        } : bundle),
      } : group),
    }));
  }, [updateActiveBrandSchema]);

  const updateBrandSchemaRow = useCallback((
    prefixIndex: number,
    bundleIndex: number,
    rowIndex: number,
    patch: Partial<BrandListSchemaRow>,
  ) => {
    updateActiveBrandSchema((schema) => ({
      ...schema,
      prefixGroups: schema.prefixGroups.map((group, groupIndex) => groupIndex === prefixIndex ? {
        ...group,
        bundles: group.bundles.map((bundle, currentBundleIndex) => currentBundleIndex === bundleIndex ? {
          ...bundle,
          rows: bundle.rows.map((row, currentRowIndex) => currentRowIndex === rowIndex ? {
            ...row,
            ...patch,
          } : row),
        } : bundle),
      } : group),
    }));
  }, [updateActiveBrandSchema]);

  const addBrandSchemaRow = useCallback((prefixIndex: number, bundleIndex: number) => {
    updateActiveBrandSchema((schema) => ({
      ...schema,
      prefixGroups: schema.prefixGroups.map((group, groupIndex) => groupIndex === prefixIndex ? {
        ...group,
        bundles: group.bundles.map((bundle, currentBundleIndex) => currentBundleIndex === bundleIndex ? {
          ...bundle,
          rows: [
            ...bundle.rows,
            createManualBrandSchemaRow({
              prefix: group.prefix,
              bundleName: bundle.bundleName,
              toLocation: bundle.toLocation,
              rowIndex: bundle.rows.length + 1,
            }),
          ],
        } : bundle),
      } : group),
    }));
  }, [updateActiveBrandSchema]);

  const removeBrandSchemaRow = useCallback((prefixIndex: number, bundleIndex: number, rowIndex: number) => {
    updateActiveBrandSchema((schema) => ({
      ...schema,
      prefixGroups: schema.prefixGroups.map((group, groupIndex) => groupIndex === prefixIndex ? {
        ...group,
        bundles: group.bundles.map((bundle, currentBundleIndex) => currentBundleIndex === bundleIndex ? {
          ...bundle,
          rows: bundle.rows.filter((_, currentRowIndex) => currentRowIndex !== rowIndex),
        } : bundle),
      } : group),
    }));
  }, [updateActiveBrandSchema]);

  const updateBrandSchemaProjectInfo = useCallback((patch: Partial<BrandListExportSchema["projectInfo"]>) => {
    updateActiveBrandSchema((schema) => ({
      ...schema,
      projectInfo: {
        ...schema.projectInfo,
        ...patch,
      },
    }));
  }, [updateActiveBrandSchema]);

  const duplicateSelectedBrandRows = useCallback(() => {
    if (selectedBrandRows.size === 0) {
      return;
    }

    updateActiveBrandSchema((schema) => ({
      ...schema,
      prefixGroups: schema.prefixGroups.map((group) => ({
        ...group,
        bundles: group.bundles.map((bundle) => {
          const duplicates = bundle.rows
            .filter((row) => selectedBrandRows.has(row.rowId))
            .map((row, duplicateIndex) => ({
              ...row,
              rowId: `duplicate-${Date.now()}-${duplicateIndex}-${row.rowId}`,
              rowIndex: bundle.rows.length + duplicateIndex + 1,
            }));

          return duplicates.length ? { ...bundle, rows: [...bundle.rows, ...duplicates] } : bundle;
        }),
      })),
    }));
  }, [selectedBrandRows, updateActiveBrandSchema]);

  const incrementSelectedBrandLengths = useCallback((delta: number) => {
    if (selectedBrandRows.size === 0) {
      return;
    }

    updateActiveBrandSchema((schema) => ({
      ...schema,
      prefixGroups: schema.prefixGroups.map((group) => ({
        ...group,
        bundles: group.bundles.map((bundle) => ({
          ...bundle,
          rows: bundle.rows.map((row) => selectedBrandRows.has(row.rowId) ? {
            ...row,
            length: Math.max(0, (typeof row.length === "number" ? row.length : 0) + delta),
          } : row),
        })),
      })),
    }));
  }, [selectedBrandRows, updateActiveBrandSchema]);

  const regenerateBrandSchemaForSheet = useCallback((sheetSlug: string) => {
    if (!projectId) {
      return Promise.resolve();
    }

    return fetch(`/api/project-context/${encodeURIComponent(projectId)}/wire-brand-list-schemas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sheetSlug, save: true }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(payload.error || `HTTP ${response.status}`);
        }

        return response.json() as Promise<{ schema: BrandListExportSchema }>;
      })
      .then((payload) => {
        setResourceMap((prev) => ({
          ...prev,
          [sheetSlug]: {
            ...(prev[sheetSlug] ?? { sheet: null, printSchema: null, brandSchema: null }),
            brandSchema: payload.schema,
          },
        }));
      })
      .catch(() => undefined);
  }, [projectId]);

  const renderWorkspaceSkeleton = () => {
    if (activeWorkspaceMode === "wire-list") {
      return (
        <div className="flex h-full min-h-0 gap-4">
          <div className="hidden w-[320px] shrink-0 rounded-2xl border bg-card/40 xl:block">
            <div className="border-b p-4">
              <Skeleton className="mb-4 h-6 w-36" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="rounded-xl border border-border/60 p-3">
                  <Skeleton className="mb-3 h-4 w-24" />
                  <Skeleton className="h-5 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 min-h-0 flex-1 flex-col gap-4">
            <div className="rounded-2xl border bg-card/40 p-4">
              <div className="mb-4 flex flex-wrap gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <div className="flex-1 min-h-0 rounded-2xl border bg-card/40 p-4">
              <div className="mb-4 flex items-center gap-3">
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-36 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>
              <div className="rounded-xl border border-border/60">
                <div className="border-b p-4">
                  <Skeleton className="h-6 w-56" />
                </div>
                <div className="space-y-3 p-4">
                  {[1, 2, 3, 4, 5, 6].map((index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border bg-card/40 p-4">
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((index) => (
                  <Skeleton key={index} className="h-9 w-28 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading sheet workspace...
      </div>
    );
  };

  const handleApproveSheet = useCallback(() => {
    if (!activeSlug) {
      return;
    }

    setApprovedSlugs((prev) => (prev.includes(activeSlug) ? prev : [...prev, activeSlug]));
    setSheetReviews((prev) => ({
      ...prev,
      [activeSlug]: {
        sheetSlug: activeSlug,
        reviewedAt: new Date().toISOString(),
        reviewedByBadge: user?.badge ?? null,
        reviewedByName: user?.preferredName || user?.legalName || user?.badge || null,
      },
    }));
    if (!activeResources?.brandSchema) {
      void regenerateBrandSchemaForSheet(activeSlug);
    }

    const nextTab = tabs[activeIndex + 1];
    if (nextTab) {
      setActiveSlug(nextTab.slug);
      return;
    }

    toast({
      title: "Sheet approved",
      description: "This sheet is ready to be combined into the final multi-sheet export.",
      duration: 2500,
    });
  }, [activeIndex, activeResources?.brandSchema, activeSlug, regenerateBrandSchemaForSheet, tabs, toast, user?.badge, user?.legalName, user?.preferredName]);

  const handleUnapproveSheet = useCallback(() => {
    if (!activeSlug) {
      return;
    }

    setApprovedSlugs((prev) => prev.filter((slug) => slug !== activeSlug));
    setSheetReviews((prev) => {
      const next = { ...prev };
      delete next[activeSlug];
      return next;
    });
    setExportResult(null);
    toast({
      title: "Sheet unapproved",
      description: "This sheet has been moved back to review and the combined export has been cleared.",
      duration: 2500,
    });
  }, [activeSlug, toast]);

  const handleCombine = useCallback(() => {
    if (!projectId) {
      return;
    }

    setIsCombining(true);

    void (async () => {
      const approvedSheetSlugs = tabs.filter((tab) => approvedSlugs.includes(tab.slug)).map((tab) => tab.slug);

      const missingBrandSchemas = approvedSheetSlugs.filter((sheetSlug) => !resourceMap[sheetSlug]?.brandSchema);
      await Promise.all(missingBrandSchemas.map((sheetSlug) => regenerateBrandSchemaForSheet(sheetSlug)));

      const response = await fetch(`/api/project-context/${encodeURIComponent(projectId)}/multi-sheet-print/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approvedSheetSlugs }),
      });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          throw new Error(payload.error || `HTTP ${response.status}`);
        }

        return response.json() as Promise<MultiSheetPrintExportResult>;
      })()
      .then((result) => {
        setExportResult(result);
        setExportFileState({
          brandingWorkbookExists: Boolean(result.brandingWorkbook),
          wireListSchemaExists: Boolean(result.wireListSchema),
          manifestFileExists: Boolean(result.manifestFile),
        });
        toast({
          title: "Combined export ready",
          description: `${result.approvedSheets.length} sheets merged into shared project exports.`,
          duration: 3500,
        });
      })
      .catch((error) => {
        toast({
          title: "Combine failed",
          description: error instanceof Error ? error.message : "Failed to generate combined print export",
          duration: 4000,
        });
      })
      .finally(() => {
        setIsCombining(false);
      });
  }, [approvedSlugs, projectId, regenerateBrandSchemaForSheet, resourceMap, tabs, toast]);

  const handleOpenCurrentWireListPdf = useCallback(() => {
    if (!activeSlug) {
      return;
    }

    window.open(buildPrintPreviewHref(activeSlug), "_blank", "noopener,noreferrer");
  }, [activeSlug, buildPrintPreviewHref]);

  const renderBrandSchemaWorkspace = () => {
    if (!activeSlug) {
      return renderWorkspaceSkeleton();
    }

    if (!activeBrandSchema) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="max-w-md rounded-3xl border bg-card p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <Printer className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Brand list schema not generated yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate the editable brand-list table for this sheet, then review lengths, rows, and bundle names directly.
            </p>
            <Button
              type="button"
              className="mt-5"
              disabled={isSavingBrandSchema}
              onClick={() => void regenerateBrandSchemaForSheet(activeSlug)}
            >
              {isSavingBrandSchema ? "Generating..." : "Generate Brand List"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <div className="border-b bg-background/95 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Editable Brand List Schema
              </div>
              <h3 className="mt-1 truncate text-2xl font-semibold">{activeBrandSchema.sheetName}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{activeBrandSchema.totalRows} export rows</Badge>
                <span>{activeBrandSchema.prefixGroups.length} device groups</span>
                {isSavingBrandSchema ? <span>Saving...</span> : <span>Saved to Share state</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeTab?.imageUrl ? (
                <Button type="button" variant="outline" className="gap-2" onClick={() => setLayoutPreviewOpen(true)}>
                  <ImageIcon className="h-4 w-4" />
                  Layout Reference
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={isSavingBrandSchema}
                onClick={() => void regenerateBrandSchemaForSheet(activeSlug)}
              >
                Rebuild from Wire List
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Project</div>
              <Input
                value={activeBrandSchema.projectInfo.projectName ?? ""}
                className="h-9"
                onChange={(event) => updateBrandSchemaProjectInfo({ projectName: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">PD / Project No.</div>
              <Input
                value={activeBrandSchema.projectInfo.projectNumber ?? ""}
                className="h-9"
                onChange={(event) => updateBrandSchemaProjectInfo({ projectNumber: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Revision</div>
              <Input
                value={activeBrandSchema.projectInfo.revision ?? ""}
                className="h-9"
                onChange={(event) => updateBrandSchemaProjectInfo({ revision: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Controls DE</div>
              <Input
                value={activeBrandSchema.projectInfo.controlsDE ?? ""}
                className="h-9"
                onChange={(event) => updateBrandSchemaProjectInfo({ controlsDE: event.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="min-w-[1180px] space-y-5">
            {activeBrandSchema.prefixGroups.map((prefixGroup, prefixIndex) => (
              <section key={`${prefixGroup.prefix}-${prefixIndex}`} className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Device Prefix</div>
                    <div className="text-lg font-semibold">{prefixGroup.prefix}</div>
                  </div>
                  <Badge variant="outline">
                    {prefixGroup.bundles.reduce((sum, bundle) => sum + bundle.rows.length, 0)} rows
                  </Badge>
                </div>

                <div className="divide-y">
                  {prefixGroup.bundles.map((bundle, bundleIndex) => (
                    <div key={`${bundle.bundleName}-${bundleIndex}`} className="bg-background">
                      <div className="grid grid-cols-[220px_1fr_auto] items-center gap-3 border-b bg-muted/10 px-4 py-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Bundle</div>
                          <Input
                            value={bundle.bundleName}
                            className="mt-1 h-9 font-semibold"
                            aria-label="Bundle name"
                            onChange={(event) => renameBrandBundle(prefixIndex, bundleIndex, event.target.value)}
                          />
                        </div>
                        <div className="min-w-0 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{bundle.rows.length}</span> rows
                          {bundle.toLocation ? <span> · {bundle.toLocation}</span> : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => addBrandSchemaRow(prefixIndex, bundleIndex)}
                        >
                          <Plus className="h-4 w-4" />
                          Add Row
                        </Button>
                      </div>

                      <div className="grid grid-cols-[44px_48px_170px_130px_120px_110px_110px_170px_170px_180px_48px] border-b bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        <div>
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={bundle.rows.length > 0 && bundle.rows.every((row) => selectedBrandRows.has(row.rowId))}
                            onChange={(event) => {
                              setSelectedBrandRows((prev) => {
                                const next = new Set(prev);
                                for (const row of bundle.rows) {
                                  if (event.target.checked) {
                                    next.add(row.rowId);
                                  } else {
                                    next.delete(row.rowId);
                                  }
                                }
                                return next;
                              });
                            }}
                            title="Select bundle rows"
                          />
                        </div>
                        <div>#</div>
                        <div>From Device</div>
                        <div>Wire No.</div>
                        <div>Wire ID</div>
                        <div>Gauge</div>
                        <div>Length</div>
                        <div>To Device</div>
                        <div>To Location</div>
                        <div>Bundle Display</div>
                        <div />
                      </div>

                      <div className="divide-y">
                        {bundle.rows.map((row, rowIndex) => (
                          <div
                            key={row.rowId}
                            className="grid grid-cols-[44px_48px_170px_130px_120px_110px_110px_170px_170px_180px_48px] items-center gap-0 px-4 py-2"
                          >
                            <div>
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={selectedBrandRows.has(row.rowId)}
                                onChange={(event) => {
                                  setSelectedBrandRows((prev) => {
                                    const next = new Set(prev);
                                    if (event.target.checked) {
                                      next.add(row.rowId);
                                    } else {
                                      next.delete(row.rowId);
                                    }
                                    return next;
                                  });
                                }}
                              />
                            </div>
                            <div className="text-sm text-muted-foreground">{rowIndex + 1}</div>
                            <Input
                              value={row.fromDeviceId}
                              className="h-9 rounded-none border-0 bg-muted/30 font-mono text-sm shadow-none"
                              onChange={(event) => updateBrandSchemaRow(prefixIndex, bundleIndex, rowIndex, { fromDeviceId: event.target.value })}
                            />
                            <Input
                              value={row.wireNo}
                              className="h-9 rounded-none border-0 bg-muted/20 font-mono text-sm shadow-none"
                              onChange={(event) => updateBrandSchemaRow(prefixIndex, bundleIndex, rowIndex, { wireNo: event.target.value })}
                            />
                            <Input
                              value={row.wireId}
                              className="h-9 rounded-none border-0 bg-muted/30 font-mono text-sm shadow-none"
                              onChange={(event) => updateBrandSchemaRow(prefixIndex, bundleIndex, rowIndex, { wireId: event.target.value })}
                            />
                            <Input
                              value={row.gaugeSize}
                              className="h-9 rounded-none border-0 bg-muted/20 font-mono text-sm shadow-none"
                              onChange={(event) => updateBrandSchemaRow(prefixIndex, bundleIndex, rowIndex, { gaugeSize: event.target.value })}
                            />
                            <Input
                              type="number"
                              min={0}
                              step={0.5}
                              value={row.length ?? ""}
                              className="h-9 rounded-none border-0 bg-amber-50 font-mono text-sm shadow-none"
                              onChange={(event) => {
                                const nextLength = event.target.value.trim() === "" ? null : Number(event.target.value);
                                updateBrandSchemaRow(prefixIndex, bundleIndex, rowIndex, {
                                  length: typeof nextLength === "number" && !Number.isNaN(nextLength) ? Math.max(0, nextLength) : null,
                                });
                              }}
                            />
                            <Input
                              value={row.toDeviceId}
                              className="h-9 rounded-none border-0 bg-muted/30 font-mono text-sm shadow-none"
                              onChange={(event) => updateBrandSchemaRow(prefixIndex, bundleIndex, rowIndex, { toDeviceId: event.target.value })}
                            />
                            <Input
                              value={row.toLocation}
                              className="h-9 rounded-none border-0 bg-muted/20 text-sm shadow-none"
                              onChange={(event) => updateBrandSchemaRow(prefixIndex, bundleIndex, rowIndex, { toLocation: event.target.value })}
                            />
                            <Input
                              value={row.bundleDisplay}
                              className="h-9 rounded-none border-0 bg-muted/30 text-sm shadow-none"
                              onChange={(event) => updateBrandSchemaRow(prefixIndex, bundleIndex, rowIndex, { bundleDisplay: event.target.value })}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive"
                              onClick={() => removeBrandSchemaRow(prefixIndex, bundleIndex, rowIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {showTrigger ? (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!projectId}
          onClick={() => setIsOpen(true)}
          title={projectId ? "Review and approve multiple print sheets" : "Project context required"}
        >
          <Layers3 className="h-4 w-4" />
          <span className="hidden sm:inline">Multi-Sheet</span>
        </Button>
      ) : null}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 16 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 z-50 pointer-events-none"
            >
              <div className="h-screen w-screen border-0 bg-background shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
                <div className="border-b bg-muted/30 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Printer className="h-5 w-5 text-foreground/70" />
                      <h2 className="text-lg font-semibold truncate">
                        {isWireListMode ? "Standard Wire List Review" : title}
                      </h2>
                      {!isWireListMode ? (
                        <Badge variant="secondary" className="text-xs">
                          {approvedSlugs.length}/{tabs.length} approved
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isWireListMode
                        ? "Browse each standard wire list sheet with its original-sidebar context and layout reference."
                        : description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2"
                      onClick={() => setStateReviewOpen(true)}
                    >
                      <Info className="h-4 w-4" />
                      Review State
                    </Button>
                    <div className="rounded-xl border bg-background p-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={!isWireListMode ? "default" : "ghost"}
                        className="h-8 px-3"
                        onClick={() => setActiveWorkspaceMode("print")}
                      >
                        Brand
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={isWireListMode ? "default" : "ghost"}
                        className="h-8 px-3"
                        onClick={() => setActiveWorkspaceMode("wire-list")}
                      >
                        Standard
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="border-b bg-background/95 px-3 py-2 xl:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Review Navigator
                      </div>
                      <div className="truncate text-xs font-semibold">
                        {approvedSlugs.length}/{tabs.length} sheets reviewed
                      </div>
                    </div>
                    {!isAuthenticated ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-2"
                        onClick={() => setLoginOpen(true)}
                      >
                        <LogIn className="h-3.5 w-3.5" />
                        Badge
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="max-w-[160px] truncate">
                        {user?.preferredName || user?.legalName || user?.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {tabs.map((tab, index) => {
                      const isApproved = approvedSlugs.includes(tab.slug);
                      const isActive = tab.slug === activeSlug;

                      return (
                        <button
                          key={tab.slug}
                          type="button"
                          onClick={() => setActiveSlug(tab.slug)}
                          className={cn(
                            "flex min-w-[168px] items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
                            isActive
                              ? "border-primary/40 bg-primary/10"
                              : "border-border bg-muted/30 hover:bg-muted/50",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                              isApproved
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-border bg-background text-muted-foreground",
                            )}
                          >
                            {isApproved ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold">{tab.name}</span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {tab.rowCount} rows
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col xl:flex-row">
                  <div className="relative min-h-0 flex-1">
                    {activeTab ? (
                      activeWorkspaceMode === "wire-list" ? (
                        <div className="flex h-full min-h-0 flex-col overflow-hidden">
                          <div className="min-h-0 flex-1 overflow-hidden">
                            {activeResources?.sheet ? (
                              <SingleSheetPrintWorkspace
                                rows={activeResources.sheet.rows}
                                currentSheetName={activeResources.sheet.name}
                                projectId={projectId}
                                sheetSlug={activeResources.sheet.slug}
                                sheetTitle={activeResources.sheet.name}
                                metadata={activeResources.sheet.metadata}
                                initialLoadedSchema={activeResources.printSchema}
                                initialMode="standardize"
                                swsType={activeAssignment ? {
                                  id: activeAssignment.swsType,
                                  label: activeAssignment.swsType,
                                  shortLabel: activeAssignment.swsType,
                                  color: getSwsAccentColor(activeAssignment.swsType),
                                } : undefined}
                                workspaceActive={isOpen}
                                hideCloseButton
                                headerTitle={`Standard Wire List · ${activeResources.sheet.name}`}
                              />
                            ) : renderWorkspaceSkeleton()}
                          </div>
                        </div>
                      ) : (
                        renderBrandSchemaWorkspace()
                      )
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No sheet available for review.
                      </div>
                    )}
                    {activeTab?.imageUrl ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="absolute right-4 top-4 z-20 gap-2 rounded-full shadow-lg"
                        onClick={() => setLayoutPreviewOpen(true)}
                      >
                        <ImageIcon className="h-4 w-4" />
                        Layout
                      </Button>
                    ) : null}
                  </div>

                  <aside className="hidden w-[380px] min-h-0 shrink-0 border-l bg-muted/10 xl:flex">
                    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                      <div className="border-b bg-background/95 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Review Navigator
                            </div>
                            <div className="mt-1 truncate text-sm font-semibold">
                              {approvedSlugs.length}/{tabs.length} sheets reviewed
                            </div>
                          </div>
                          <Badge variant={tabs.length > 0 && approvedSlugs.length === tabs.length ? "default" : "secondary"}>
                            {tabs.length > 0 && approvedSlugs.length === tabs.length ? "Ready" : "In Review"}
                          </Badge>
                        </div>
                      </div>

                      {!isAuthenticated ? (
                        <div className="border-b bg-amber-50 px-4 py-3 text-amber-950">
                          <div className="text-sm font-semibold">Sign in to track review activity</div>
                          <p className="mt-1 text-xs text-amber-800">
                            Badge login lets approvals and exports be associated with the current user.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3 w-full gap-2"
                            onClick={() => setLoginOpen(true)}
                          >
                            <LogIn className="h-4 w-4" />
                            Sign in with Badge
                          </Button>
                        </div>
                      ) : (
                        <div className="border-b bg-emerald-50 px-4 py-3 text-emerald-950">
                          <div className="text-sm font-semibold">
                            Tracking as {user?.preferredName || user?.legalName || user?.badge}
                          </div>
                          <p className="mt-1 text-xs text-emerald-800">
                            Sheet approvals and combined exports will be captured in this session.
                          </p>
                        </div>
                      )}

                      <div className="min-h-0 flex-1 overflow-y-auto p-3">
                        <div className="space-y-1">
                          {tabs.map((tab, index) => {
                            const isApproved = approvedSlugs.includes(tab.slug);
                            const isActive = tab.slug === activeSlug;
                            const review = sheetReviews[tab.slug];
                            const reviewTime = formatReviewTime(review?.reviewedAt);

                            return (
                              <button
                                key={tab.slug}
                                type="button"
                                onClick={() => setActiveSlug(tab.slug)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
                                  isActive
                                    ? "border-primary/40 bg-primary/10"
                                    : "border-transparent bg-background/70 hover:border-border hover:bg-background",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                                    isApproved
                                      ? "border-emerald-500 bg-emerald-500 text-white"
                                      : "border-border bg-muted text-muted-foreground",
                                  )}
                                >
                                  {isApproved ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-foreground">
                                    {tab.name}
                                  </span>
                                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                    {tab.rowCount} rows{tab.pageTitle ? ` · ${tab.pageTitle}` : ""}
                                  </span>
                                  {isApproved && review ? (
                                    <span className="mt-1 block truncate text-[11px] text-emerald-700">
                                      {review.reviewedByName || review.reviewedByBadge || "Reviewed"}
                                      {reviewTime ? ` · ${reviewTime}` : ""}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {false && !isWireListMode && activeBrandSchema ? (
                        <div className="max-h-[42vh] overflow-y-auto border-t bg-background/95 p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                Brand Schema
                              </div>
                              <div className="text-sm font-semibold">
                                {activeBrandSchema.totalRows} export rows
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {activeTab?.imageUrl ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setLayoutPreviewOpen(true)}
                                  title="Open layout reference"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8"
                                disabled={isSavingBrandSchema || !activeSlug}
                                onClick={() => {
                                  if (activeSlug) {
                                    void regenerateBrandSchemaForSheet(activeSlug);
                                  }
                                }}
                              >
                                {isSavingBrandSchema ? "Saving" : "Rebuild"}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {activeBrandSchema.prefixGroups.map((prefixGroup, prefixIndex) => (
                              <div key={`${prefixGroup.prefix}-${prefixIndex}`} className="rounded-2xl border bg-muted/20 p-2">
                                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                  {prefixGroup.prefix}
                                </div>
                                <div className="space-y-2">
                                  {prefixGroup.bundles.map((bundle, bundleIndex) => (
                                    <div key={`${bundle.bundleName}-${bundleIndex}`} className="rounded-xl border bg-background p-2">
                                      <div className="mb-2 flex items-center gap-2">
                                        <Input
                                          value={bundle.bundleName}
                                          className="h-8 text-xs font-medium"
                                          aria-label="Bundle name"
                                          onChange={(event) => {
                                            const nextName = event.target.value;
                                            updateActiveBrandSchema((schema) => ({
                                              ...schema,
                                              prefixGroups: schema.prefixGroups.map((group, groupIndex) => groupIndex === prefixIndex ? {
                                                ...group,
                                                bundles: group.bundles.map((currentBundle, currentBundleIndex) => currentBundleIndex === bundleIndex ? {
                                                  ...currentBundle,
                                                  bundleName: nextName,
                                                  rows: currentBundle.rows.map((row) => ({
                                                    ...row,
                                                    bundleName: nextName,
                                                    bundleDisplay: row.bundleDisplay === currentBundle.bundleName || !row.bundleDisplay
                                                      ? nextName
                                                      : row.bundleDisplay,
                                                  })),
                                                } : currentBundle),
                                              } : group),
                                            }));
                                          }}
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8"
                                          title="Add export row"
                                          onClick={() => {
                                            updateActiveBrandSchema((schema) => ({
                                              ...schema,
                                              prefixGroups: schema.prefixGroups.map((group, groupIndex) => groupIndex === prefixIndex ? {
                                                ...group,
                                                bundles: group.bundles.map((currentBundle, currentBundleIndex) => currentBundleIndex === bundleIndex ? {
                                                  ...currentBundle,
                                                  rows: [
                                                    ...currentBundle.rows,
                                                    {
                                                      rowId: `manual-${Date.now()}`,
                                                      rowIndex: currentBundle.rows.length + 1,
                                                      fromDeviceId: "",
                                                      wireNo: "",
                                                      wireId: "",
                                                      gaugeSize: "",
                                                      length: null,
                                                      toDeviceId: "",
                                                      toLocation: currentBundle.toLocation,
                                                      bundleName: currentBundle.bundleName,
                                                      bundleDisplay: currentBundle.bundleName,
                                                      devicePrefix: group.prefix,
                                                    },
                                                  ],
                                                } : currentBundle),
                                              } : group),
                                            }));
                                          }}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </div>

                                      <div className="space-y-1">
                                        {bundle.rows.slice(0, 8).map((row, rowIndex) => (
                                          <div key={row.rowId} className="grid grid-cols-[1fr_74px_28px] items-center gap-1">
                                            <div className="min-w-0 rounded-lg bg-muted/30 px-2 py-1">
                                              <div className="truncate text-[11px] font-medium">
                                                {row.fromDeviceId || "Manual row"} → {row.toDeviceId || "TBD"}
                                              </div>
                                              <div className="truncate text-[10px] text-muted-foreground">
                                                {row.wireNo || "wire"} · {row.gaugeSize || "gauge"}
                                              </div>
                                            </div>
                                            <Input
                                              type="number"
                                              min={0}
                                              step={0.5}
                                              value={row.length ?? ""}
                                              className="h-8 text-xs"
                                              aria-label="Wire length"
                                              placeholder="Len"
                                              onChange={(event) => {
                                                const nextLength = event.target.value.trim() === ""
                                                  ? null
                                                  : Number(event.target.value);
                                                updateActiveBrandSchema((schema) => ({
                                                  ...schema,
                                                  prefixGroups: schema.prefixGroups.map((group, groupIndex) => groupIndex === prefixIndex ? {
                                                    ...group,
                                                    bundles: group.bundles.map((currentBundle, currentBundleIndex) => currentBundleIndex === bundleIndex ? {
                                                      ...currentBundle,
                                                      rows: currentBundle.rows.map((currentRow, currentRowIndex) => currentRowIndex === rowIndex ? {
                                                        ...currentRow,
                                                        length: typeof nextLength === "number" && !Number.isNaN(nextLength)
                                                          ? Math.max(0, nextLength)
                                                          : null,
                                                      } : currentRow),
                                                    } : currentBundle),
                                                  } : group),
                                                }));
                                              }}
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                              title="Remove export row"
                                              onClick={() => {
                                                updateActiveBrandSchema((schema) => ({
                                                  ...schema,
                                                  prefixGroups: schema.prefixGroups.map((group, groupIndex) => groupIndex === prefixIndex ? {
                                                    ...group,
                                                    bundles: group.bundles.map((currentBundle, currentBundleIndex) => currentBundleIndex === bundleIndex ? {
                                                      ...currentBundle,
                                                      rows: currentBundle.rows.filter((_, currentRowIndex) => currentRowIndex !== rowIndex),
                                                    } : currentBundle),
                                                  } : group),
                                                }));
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        ))}
                                        {bundle.rows.length > 8 ? (
                                          <div className="px-2 pt-1 text-[10px] text-muted-foreground">
                                            Showing 8 of {bundle.rows.length} rows. Use the page preview for full inline length edits.
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {!isWireListMode && exportResult ? (
                        <div className="border-t bg-background/95 p-3">
                          {exportResult.brandingWorkbook ? (
                            <a
                              className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-3 py-2 text-sm font-semibold shadow-sm transition-colors hover:bg-muted/30"
                              href={buildExportHref(exportResult.brandingWorkbook.relativePath)}
                              title={exportResult.brandingWorkbook.fileName}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <Download className="h-4 w-4" />
                                <span className="truncate">Combined Export Ready</span>
                              </span>
                              <Badge variant="secondary">XLSX</Badge>
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </aside>
                </div>

                <div className="border-t bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {isWireListMode ? "Viewing" : "Step"} {Math.max(activeIndex + 1, 1)} of {Math.max(tabs.length, 1)}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isWireListMode ? (
                      <div className="mr-2 flex max-w-full flex-wrap items-center gap-1 rounded-2xl border bg-card p-1 shadow-sm">
                        <Badge variant={selectedBrandRows.size > 0 ? "default" : "secondary"} className="h-8 rounded-xl">
                          {selectedBrandRows.size} selected
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          disabled={activeBrandRowIds.length === 0}
                          onClick={() => setSelectedBrandRows(new Set(activeBrandRowIds))}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          disabled={selectedBrandRows.size === 0}
                          onClick={() => incrementSelectedBrandLengths(10)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          10
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          disabled={selectedBrandRows.size === 0}
                          onClick={() => incrementSelectedBrandLengths(-10)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                          10
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          disabled={selectedBrandRows.size === 0}
                          onClick={duplicateSelectedBrandRows}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Duplicate
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          disabled={selectedBrandRows.size === 0}
                          onClick={() => setSelectedBrandRows(new Set())}
                        >
                          Clear
                        </Button>
                      </div>
                    ) : null}
                    <Button
                      variant="outline"
                      onClick={() => {
                        const previous = tabs[activeIndex - 1];
                        if (previous) {
                          setActiveSlug(previous.slug);
                        }
                      }}
                      disabled={activeIndex <= 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    {isWireListMode ? (
                      <Button
                        variant="secondary"
                        onClick={handleOpenCurrentWireListPdf}
                        disabled={!activeSlug || !projectId}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Current Wire List PDF
                      </Button>
                    ) : activeSlug && approvedSlugs.includes(activeSlug) ? (
                      <Button variant="outline" onClick={handleUnapproveSheet}>
                        <X className="h-4 w-4 mr-2" />
                        Unapprove
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={handleApproveSheet} disabled={!activeSlug}>
                        Approve Sheet
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        const next = tabs[activeIndex + 1];
                        if (next) {
                          setActiveSlug(next.slug);
                        }
                      }}
                      disabled={activeIndex < 0 || activeIndex >= tabs.length - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                    {!isWireListMode ? (
                      <Button onClick={handleCombine} disabled={!(tabs.length > 0 && tabs.every((tab) => approvedSlugs.includes(tab.slug))) || isCombining}>
                        {isCombining ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Combining...
                          </>
                        ) : (
                          combineLabel
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {layoutPreviewOpen && activeTab?.imageUrl ? (
          <motion.div
              drag
              dragMomentum={false}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{
                opacity: 1,
                scale: 1,
                width: layoutPreviewMinimized ? 260 : 560,
                height: layoutPreviewMinimized ? 58 : 420,
              }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="fixed z-[61] overflow-hidden rounded-3xl border bg-background shadow-2xl"
              style={{ left: layoutPreviewPosition.x, top: layoutPreviewPosition.y }}
              onDragEnd={(_, info) => {
                setLayoutPreviewPosition((prev) => ({
                  x: Math.max(12, prev.x + info.offset.x),
                  y: Math.max(12, prev.y + info.offset.y),
                }));
              }}
            >
              <div className="flex cursor-grab items-center justify-between border-b px-4 py-3 active:cursor-grabbing">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Layout Reference
                  </div>
                  <div className="truncate text-base font-semibold">
                    {activeTab.name}{activeTab.pageNumber ? ` · Page ${activeTab.pageNumber}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setLayoutPreviewMinimized((prev) => !prev)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setLayoutPreviewOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {!layoutPreviewMinimized ? (
              <div className="h-[calc(100%-61px)] overflow-auto bg-muted/30 p-3">
                <img
                  src={activeTab.imageUrl}
                  alt={`${activeTab.name} layout reference`}
                  className="mx-auto max-h-full max-w-full rounded-2xl border bg-background object-contain shadow-xl"
                />
              </div>
              ) : null}
            </motion.div>
        ) : null}
      </AnimatePresence>

      <Dialog open={stateReviewOpen} onOpenChange={setStateReviewOpen}>
        <DialogContent className="max-w-3xl rounded-3xl p-0" showCloseButton>
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>Review Current Brand List State</DialogTitle>
            <DialogDescription>
              A quick checkpoint before approving or exporting. This catches missing schemas, weak layout references, and stale export files.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 px-6 py-5 md:grid-cols-4">
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Sheets</div>
              <div className="mt-2 text-2xl font-semibold">{reviewState.totalSheets}</div>
              <p className="mt-1 text-xs text-muted-foreground">Operational sheets in this review.</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Schemas</div>
              <div className="mt-2 text-2xl font-semibold">{reviewState.savedSchemas}/{reviewState.totalSheets}</div>
              <p className="mt-1 text-xs text-muted-foreground">Saved editable brand-list schemas.</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Layout Maps</div>
              <div className="mt-2 text-2xl font-semibold">{reviewState.mappedSheets}/{reviewState.totalSheets}</div>
              <p className="mt-1 text-xs text-muted-foreground">High-confidence layout references.</p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Approved</div>
              <div className="mt-2 text-2xl font-semibold">{reviewState.approvedSheets}/{reviewState.totalSheets}</div>
              <p className="mt-1 text-xs text-muted-foreground">Editing a sheet removes approval.</p>
            </div>
          </div>

          <div className="space-y-3 border-t bg-muted/10 px-6 py-5">
            <div className="flex items-start gap-3 rounded-2xl border bg-background p-4">
              <CheckCircle2 className={cn("mt-0.5 h-5 w-5", reviewState.savedSchemas === reviewState.totalSheets ? "text-emerald-600" : "text-muted-foreground")} />
              <div>
                <div className="font-semibold">1. Generate and edit brand schemas</div>
                <p className="text-sm text-muted-foreground">
                  Brand mode is the source of truth. Length edits, duplicated rows, removed rows, bundle names, and header fields save to Share state.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border bg-background p-4">
              <CheckCircle2 className={cn("mt-0.5 h-5 w-5", !reviewState.mappingNeedsReview ? "text-emerald-600" : "text-amber-600")} />
              <div>
                <div className="font-semibold">2. Confirm layout references</div>
                <p className="text-sm text-muted-foreground">
                  Layout previews now prefer stored assignment mapping and ignore low-confidence fallback matches, so page 1 is no longer trusted by default.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border bg-background p-4">
              <CheckCircle2 className={cn("mt-0.5 h-5 w-5", reviewState.allApproved ? "text-emerald-600" : "text-muted-foreground")} />
              <div>
                <div className="font-semibold">3. Approve after final edits</div>
                <p className="text-sm text-muted-foreground">
                  Any schema edit clears that sheet approval and clears the combined export so the next workbook can’t accidentally use stale review state.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border bg-background p-4">
              <CheckCircle2 className={cn("mt-0.5 h-5 w-5", reviewState.brandingWorkbookReady ? "text-emerald-600" : "text-muted-foreground")} />
              <div>
                <div className="font-semibold">4. Combine and download</div>
                <p className="text-sm text-muted-foreground">
                  Combined export readiness is only shown when the workbook path exists in the exports directory.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setStateReviewOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                setStateReviewOpen(false);
                if (!activeSlug && tabs[0]) {
                  setActiveSlug(tabs[0].slug);
                }
              }}
            >
              Start Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoginPopup open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
