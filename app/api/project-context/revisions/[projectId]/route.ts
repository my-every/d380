import { NextRequest, NextResponse } from 'next/server'
import { getProjectRevisionHistory } from '@/lib/revision/revision-discovery'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    )
  }

  const pdNumber = request.nextUrl.searchParams.get('pdNumber') || null
  const history = await getProjectRevisionHistory(projectId, pdNumber)

  if (!history) {
    const normalizedPdNumber = (pdNumber || projectId.replace(/^pd-/i, '')).toUpperCase()
    return NextResponse.json({
      projectId,
      folderName: '',
      pdNumber: normalizedPdNumber,
      wireListRevisions: [],
      layoutRevisions: [],
      currentWireList: null,
      currentLayout: null,
      previousWireList: null,
      previousLayout: null,
    })
  }

  return NextResponse.json(history)
}
