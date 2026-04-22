import { NextRequest, NextResponse } from 'next/server'

import {
  readAssignmentMappings,
  writeAssignmentMappings,
  readSheetSchema,
  writeSheetSchema,
  readProjectManifest,
  writeProjectManifest,
} from '@/lib/project-state/share-project-state-handlers'
import type { MappedAssignment } from '@/lib/assignment/mapped-assignment'
import type { AssignmentStageId } from '@/types/d380-assignment-stages'
import type { SheetSchema } from '@/types/sheet-schema'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const mappings = await readAssignmentMappings(projectId)
  return NextResponse.json({ mappings })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const body = await request.json() as { pdNumber?: string | null; mappings: MappedAssignment[] }
  const mappings = await writeAssignmentMappings(projectId, body.pdNumber, body.mappings)
  return NextResponse.json({ mappings })
}

/**
 * PATCH — Update a single assignment's stage and/or status.
 *
 * Body: { slug: string; selectedStage?: string; selectedStatus?: string }
 *
 * Updates only the targeted sheet schema + the manifest assignment index
 * without rewriting every other schema file.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params
  const body = await request.json() as {
    slug: string
    selectedStage?: string
    selectedStatus?: string
  }

  if (!body.slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  // Read the individual sheet schema
  const schema = await readSheetSchema(projectId, body.slug)
  if (!schema) {
    return NextResponse.json({ error: 'Sheet schema not found' }, { status: 404 })
  }

  // Apply stage/status updates to the schema's assignment block
  if (body.selectedStage !== undefined) {
    schema.assignment.stage = body.selectedStage as AssignmentStageId
  }
  if (body.selectedStatus !== undefined) {
    schema.assignment.status = body.selectedStatus as SheetSchema['assignment']['status']
  }

  // Persist the updated schema
  await writeSheetSchema(projectId, schema)

  // Update the manifest assignment index entry for this sheet
  const manifest = await readProjectManifest(projectId)
  if (manifest?.assignments) {
    const entry = manifest.assignments[body.slug]
    if (entry) {
      if (body.selectedStage !== undefined) entry.stage = body.selectedStage as AssignmentStageId
      if (body.selectedStatus !== undefined) entry.status = body.selectedStatus as SheetSchema['assignment']['status']
      await writeProjectManifest(manifest)
    }
  }

  return NextResponse.json({
    slug: body.slug,
    stage: schema.assignment.stage,
    status: schema.assignment.status,
  })
}
