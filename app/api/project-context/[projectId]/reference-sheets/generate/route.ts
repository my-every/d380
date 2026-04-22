import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import {
  readProjectManifest,
  resolveProjectRootDirectory,
} from '@/lib/project-state/share-project-state-handlers'
import {
  generateReferenceSheetsManifest,
  saveReferenceSheets,
} from '@/lib/project-state/reference-sheets-generator'
import type { StoredProject } from '@/types/d380-shared'

export const dynamic = 'force-dynamic'

async function readStoredProject(projectId: string): Promise<{ root: string; project: StoredProject } | null> {
  const manifest = await readProjectManifest(projectId)
  if (!manifest) {
    return null
  }

  const projectRoot = await resolveProjectRootDirectory(projectId, {
    pdNumber: manifest.pdNumber,
    projectName: manifest.name,
  })

  if (!projectRoot) {
    return null
  }

  const contextPath = path.join(projectRoot, 'state', 'project-context.json')
  try {
    const raw = await fs.readFile(contextPath, 'utf-8')
    return { root: projectRoot, project: JSON.parse(raw) as StoredProject }
  } catch {
    return null
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params

  try {
    const stored = await readStoredProject(projectId)
    if (!stored) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 },
      )
    }

    const manifest = await generateReferenceSheetsManifest(stored.project)
    await saveReferenceSheets(stored.root, stored.project, manifest)

    return NextResponse.json({
      success: true,
      generatedAt: manifest.generatedAt,
      sheetCount: manifest.sheetCount,
      sheets: manifest.sheets,
      message: `Generated ${manifest.sheetCount} reference sheet files successfully`,
    })
  } catch (error) {
    console.error('Error generating reference sheet files:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate reference sheet files',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
