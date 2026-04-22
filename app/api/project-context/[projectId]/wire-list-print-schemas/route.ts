import { NextRequest, NextResponse } from 'next/server'

import { buildWireListPrintSchema, type BuildPrintSchemaOptions } from '@/lib/wire-list-print/schema'
import type { SemanticWireListRow } from '@/lib/workbook/types'
import type { PrintSettings, ProjectInfo } from '@/lib/wire-list-print/defaults'
import { generateAllPrintSchemas } from '@/lib/project-exports/generate-print-schemas'
import {
  saveWireListPrintSchema,
  readWireListPrintSchema,
  listWireListPrintSchemas,
} from '@/lib/project-state/share-print-schema-handlers'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const sheetSlug = request.nextUrl.searchParams.get('sheet')

  try {
    if (!sheetSlug) {
      const slugs = await listWireListPrintSchemas(projectId)
      return NextResponse.json({ sheets: slugs })
    }

    const schema = await readWireListPrintSchema(projectId, sheetSlug)
    if (!schema) {
      return NextResponse.json(
        { error: `No saved print schema found for sheet: ${sheetSlug}` },
        { status: 404 },
      )
    }

    return NextResponse.json(schema)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read print schema' },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params

  try {
    const body = await request.json()

    if (body.mode === 'all') {
      const result = await generateAllPrintSchemas(projectId)
      return NextResponse.json(result)
    }

    const {
      rows,
      currentSheetName,
      sheetSlug,
      settings,
      projectInfo,
      sheetTitle,
      hiddenSections,
      hiddenRows,
      crossWireSections,
      save = true,
    } = body as {
      rows: SemanticWireListRow[]
      currentSheetName: string
      sheetSlug?: string
      settings?: Partial<PrintSettings>
      projectInfo?: ProjectInfo
      sheetTitle?: string
      hiddenSections?: string[]
      hiddenRows?: string[]
      crossWireSections?: string[]
      save?: boolean
    }

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: "Missing or invalid 'rows' field — expected SemanticWireListRow[]" },
        { status: 400 },
      )
    }

    if (!currentSheetName || typeof currentSheetName !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'currentSheetName' field — expected string" },
        { status: 400 },
      )
    }

    const resolvedHiddenSections = new Set(hiddenSections ?? [])
    if (crossWireSections) {
      for (const key of crossWireSections) {
        resolvedHiddenSections.add(key)
      }
    }

    const schemaOptions: BuildPrintSchemaOptions = {
      rows: hiddenRows?.length
        ? rows.filter((row) => !hiddenRows.includes(row.__rowId))
        : rows,
      currentSheetName,
      settings: {
        ...settings,
        crossWireSections: new Set(crossWireSections ?? []),
        hiddenRows: new Set(hiddenRows ?? []),
      },
      projectInfo,
      sheetTitle,
      hiddenSections: resolvedHiddenSections.size > 0 ? resolvedHiddenSections : undefined,
    }

    const schema = buildWireListPrintSchema(schemaOptions)

    let savedPath: string | undefined
    if (save) {
      const slug =
        sheetSlug ||
        currentSheetName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      savedPath = await saveWireListPrintSchema(projectId, slug, schema)
    }

    return NextResponse.json({
      schema,
      ...(savedPath ? { savedPath } : {}),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate wire list print schema' },
      { status: 500 },
    )
  }
}
