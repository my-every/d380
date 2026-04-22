import { NextRequest, NextResponse } from 'next/server'

import {
  createBrandingWorkspaceState,
  patchBrandingWorkspaceTask,
  readBrandingWorkspaceState,
} from '@/lib/project-state/branding-workspace-handlers'
import type { BrandingWorkspacePatch } from '@/types/branding-workspace'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const state = await readBrandingWorkspaceState(projectId)

  if (!state) {
    return NextResponse.json({ error: 'Branding workspace not found' }, { status: 404 })
  }

  return NextResponse.json({ state })
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    const state = await createBrandingWorkspaceState(projectId)
    return NextResponse.json({ state })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to create branding workspace',
      },
      { status: 400 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params
    const body = await request.json() as BrandingWorkspacePatch

    if (!body.sheetSlug) {
      return NextResponse.json({ error: 'sheetSlug is required' }, { status: 400 })
    }

    const state = await patchBrandingWorkspaceTask(projectId, body)
    return NextResponse.json({ state })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to update branding workspace',
      },
      { status: 400 },
    )
  }
}
