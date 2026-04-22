import { NextRequest, NextResponse } from 'next/server'
import { readReferenceSheetData } from '@/lib/project-state/share-project-state-handlers'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; slug: string }> },
) {
  const { projectId, slug } = await params
  const refSheet = await readReferenceSheetData(projectId, slug)

  if (!refSheet) {
    return NextResponse.json({ error: 'Reference sheet not found' }, { status: 404 })
  }

  return NextResponse.json({
    sheet: {
      originalName: refSheet.sheet.name,
      slug: refSheet.sheet.slug,
      headers: refSheet.sheet.headers,
      rows: refSheet.data.rows ?? [],
      rowCount: refSheet.sheet.rowCount,
      columnCount: refSheet.sheet.columnCount,
      sheetIndex: refSheet.sheet.sheetIndex ?? 0,
      warnings: refSheet.sheet.warnings ?? [],
    },
  })
}
