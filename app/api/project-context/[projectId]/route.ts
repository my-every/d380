import { NextRequest, NextResponse } from 'next/server'

import {
  deleteStoredProject,
  readProjectManifest,
  writeProjectManifest,
} from '@/lib/project-state/share-project-state-handlers'
import { enrichManifestFromProjectState } from '@/lib/project-state/manifest-enrichment'
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
  const manifest = await request.json() as ProjectManifest
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