import { NextResponse } from 'next/server'
import { discoverAllProjectRevisions } from '@/lib/revision/revision-discovery'

export interface RevisionCatalogEntry {
    projectId: string
    pdNumber: string
    folderName: string
    wireListRevisions: string[]
    layoutRevisions: string[]
    allRevisions: string[]
}

export async function GET() {
    try {
        const histories = await discoverAllProjectRevisions()

        const catalog: RevisionCatalogEntry[] = histories.map((history) => {
            const wlRevisions = history.wireListRevisions.map((revision) => revision.revisionInfo.revision)
            const layRevisions = history.layoutRevisions.map((revision) => revision.revisionInfo.revision)
            const allSet = new Set([...wlRevisions, ...layRevisions])

            return {
                projectId: history.projectId,
                pdNumber: history.pdNumber,
                folderName: history.folderName,
                wireListRevisions: wlRevisions,
                layoutRevisions: layRevisions,
                allRevisions: Array.from(allSet),
            }
        })

        return NextResponse.json(catalog)
    } catch (err) {
        console.error('[RevisionCatalog] Failed to discover revisions:', err)
        return NextResponse.json(
            { error: 'Failed to discover project revisions' },
            { status: 500 },
        )
    }
}
