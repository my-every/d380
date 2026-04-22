import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'

import { resolveShareDirectory } from '@/lib/runtime/share-directory'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const shareRoot = await resolveShareDirectory()
    const filePath = path.join(shareRoot, 'Schedule', 'SLOTS.json')
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as unknown

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'SLOTS payload is not an array' }, { status: 500 })
    }

    return NextResponse.json({
      rows: parsed,
      count: parsed.length,
      source: 'SLOTS.json',
      importedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to load SLOTS.json', error)
    return NextResponse.json({ error: 'Failed to load SLOTS.json' }, { status: 500 })
  }
}