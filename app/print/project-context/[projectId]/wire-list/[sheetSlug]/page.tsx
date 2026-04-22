import { notFound } from "next/navigation";

import { WireListPrintDocument } from "@/components/wire-list/print-modal";
import { buildProjectSheetPrintDocument } from "@/lib/wire-list-print/build-project-sheet-print-document";

export const dynamic = "force-dynamic";

export default async function ProjectWireListPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; sheetSlug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { projectId, sheetSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const settings = resolvedSearchParams.mode === "branding"
    ? { mode: "branding" as const, showCoverPage: false, showTableOfContents: false, showIPVCodes: false }
    : undefined;
  const documentData = await buildProjectSheetPrintDocument({
    projectId,
    sheetSlug,
    settings,
  });

  if (!documentData) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8 print:p-0 print:bg-white">
      <div className="print-content mx-auto max-w-[860px]">
        <WireListPrintDocument data={documentData} />
      </div>
    </main>
  );
}