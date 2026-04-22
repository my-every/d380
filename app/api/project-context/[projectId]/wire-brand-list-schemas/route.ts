import { NextRequest, NextResponse } from 'next/server'

import { buildProjectSheetPrintDocument } from '@/lib/wire-list-print/build-project-sheet-print-document'
import { readProjectManifest, readSheetSchema } from '@/lib/project-state/share-project-state-handlers'
import { buildBrandListExportSchema, type BrandListSchemaProjectInfo } from '@/lib/wire-brand-list/schema'
import {
  saveWireBrandListSchema,
  readWireBrandListSchema,
  listWireBrandListSchemas,
} from '@/lib/project-state/share-print-schema-handlers'

export const dynamic = 'force-dynamic'

async function generateBrandingSchemaForSheet(options: {
  projectId: string
  sheetSlug: string
  brandingSortMode?: 'default' | 'device-prefix' | 'device-prefix-part-number'
  projectInfo?: BrandListSchemaProjectInfo
  save?: boolean
}) {
  const { projectId, sheetSlug, brandingSortMode, projectInfo, save = true } = options

  const manifest = await readProjectManifest(projectId)
  if (!manifest) {
    throw new Error('Project not found')
  }

  const sheet = await readSheetSchema(projectId, sheetSlug)
  if (!sheet) {
    throw new Error(`Sheet schema not found for slug: ${sheetSlug}`)
  }

  const sheetDocument = await buildProjectSheetPrintDocument({
    projectId,
    sheetSlug,
    settings: {
      mode: 'branding',
      brandingSortMode,
      showCoverPage: false,
      showTableOfContents: false,
      showIPVCodes: false,
    },
  })
  if (!sheetDocument) {
    throw new Error(`Unable to build branding document for sheet: ${sheetSlug}`)
  }

  const schema = buildBrandListExportSchema({
    sheetSlug,
    sheetName: sheet.name,
    brandingVisibleSections: sheetDocument.brandingVisibleSections ?? [],
    sectionColumnVisibility: sheetDocument.settings.sectionColumnVisibility,
    brandingSortMode: sheetDocument.settings.brandingSortMode,
    projectInfo: {
      projectNumber: projectInfo?.projectNumber ?? manifest.pdNumber,
      projectName: projectInfo?.projectName ?? manifest.name,
      revision: projectInfo?.revision ?? manifest.revision,
      controlsDE: projectInfo?.controlsDE ?? sheet.metadata?.controlsDE,
      controlsME: projectInfo?.controlsME ?? sheet.metadata?.controlsME,
    },
  })

  let savedPath: string | undefined
  if (save) {
    savedPath = await saveWireBrandListSchema(projectId, sheetSlug, schema)
  }

  return {
    sheetSlug,
    sheetName: sheet.name,
    schema,
    ...(savedPath ? { savedPath } : {}),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const sheetSlug = request.nextUrl.searchParams.get('sheet')

  try {
    if (!sheetSlug) {
      const slugs = await listWireBrandListSchemas(projectId)
      return NextResponse.json({ sheets: slugs })
    }

    const schema = await readWireBrandListSchema(projectId, sheetSlug)
    if (!schema) {
      return NextResponse.json(
        { error: `No saved branding schema found for sheet: ${sheetSlug}` },
        { status: 404 },
      )
    }

    return NextResponse.json(schema)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read branding schema' },
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
      const manifest = await readProjectManifest(projectId)
      if (!manifest) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      const operationalSheets = manifest.sheets.filter((sheet) => sheet.kind === 'operational')
      const generated = [] as Array<{ sheetSlug: string; sheetName: string; savedPath?: string }>
      const skipped = [] as Array<{ sheetSlug: string; reason: string }>

      for (const sheet of operationalSheets) {
        try {
          const result = await generateBrandingSchemaForSheet({
            projectId,
            sheetSlug: sheet.slug,
            save: true,
          })
          generated.push({
            sheetSlug: result.sheetSlug,
            sheetName: result.sheetName,
            savedPath: result.savedPath,
          })
        } catch (error) {
          skipped.push({
            sheetSlug: sheet.slug,
            reason: error instanceof Error ? error.message : 'Failed to generate branding schema',
          })
        }
      }

      return NextResponse.json({
        projectId,
        generatedAt: new Date().toISOString(),
        generated,
        skipped,
      })
    }

    const {
      sheetSlug,
      brandingSortMode,
      projectInfo,
      save = true,
    } = body as {
      sheetSlug?: string
      brandingSortMode?: 'default' | 'device-prefix' | 'device-prefix-part-number'
      projectInfo?: BrandListSchemaProjectInfo
      save?: boolean
    }

    if (!sheetSlug || typeof sheetSlug !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'sheetSlug' field — expected string" },
        { status: 400 },
      )
    }

    const result = await generateBrandingSchemaForSheet({
      projectId,
      sheetSlug,
      brandingSortMode,
      projectInfo,
      save,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate branding schema' },
      { status: 500 },
    )
  }
}
