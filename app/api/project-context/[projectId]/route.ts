import { NextRequest, NextResponse } from 'next/server'

import {
  deleteStoredProject,
  readProjectManifest,
  writeFullProject,
  writeProjectManifest,
} from '@/lib/project-state/share-project-state-handlers'
import { enrichManifestFromProjectState } from '@/lib/project-state/manifest-enrichment'
import { buildAllSheetSchemas, buildProjectManifest } from '@/lib/project-state/schema-generators'
import type { ProjectModel } from '@/lib/workbook/types'
import type { ProjectManifest } from '@/types/project-manifest'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const manifest = await readProjectManifest(projectId)

  if (!manifest) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({ manifest })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const body = await request.json() as ProjectManifest | { projectModel?: ProjectModel }

  if ('projectModel' in body && body.projectModel) {
    const projectModel = body.projectModel
    if (projectModel.id !== projectId) {
      return NextResponse.json({ error: 'Project id mismatch' }, { status: 400 })
    }

    const manifest = buildProjectManifest(projectModel, [])
    const enrichedManifest = await enrichManifestFromProjectState(manifest)
    const sheetSchemas = buildAllSheetSchemas(projectModel, [])
    await writeFullProject(enrichedManifest, sheetSchemas, projectModel)
    return NextResponse.json({ manifest: enrichedManifest })
  }

  const manifest = body as ProjectManifest
  if (manifest.id !== projectId) {
    return NextResponse.json({ error: 'Project id mismatch' }, { status: 400 })
  }

  const enrichedManifest = await enrichManifestFromProjectState(manifest)
  await writeProjectManifest(enrichedManifest)
  return NextResponse.json({ manifest: enrichedManifest })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  await deleteStoredProject(projectId)
  return NextResponse.json({ success: true })
}
