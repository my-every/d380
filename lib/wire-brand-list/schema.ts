import type { BrandingSortMode, SectionColumnVisibility } from '@/lib/wire-list-print/defaults'
import { getEffectiveSectionColumns } from '@/lib/wire-list-print/defaults'
import { buildBrandingSectionRenderPlan, type BrandingVisibleSection } from '@/lib/wire-list-print/model'
import { shouldSwapForTargetPair } from '@/lib/wire-list-sections'

export interface BrandListSchemaProjectInfo {
  projectNumber?: string
  projectName?: string
  revision?: string
  controlsDE?: string
  controlsME?: string
}

export interface BrandListSchemaRow {
  rowId: string
  rowIndex: number
  fromDeviceId: string
  wireNo: string
  wireId: string
  gaugeSize: string
  length: number | null
  toDeviceId: string
  toLocation: string
  bundleName: string
  bundleDisplay: string
  devicePrefix: string
}

export interface BrandListSchemaBundle {
  bundleName: string
  toLocation: string
  rows: BrandListSchemaRow[]
}

export interface BrandListSchemaPrefixGroup {
  prefix: string
  bundles: BrandListSchemaBundle[]
}

export interface BrandListExportSchema {
  schemaVersion: 1
  generatedAt: string
  mode: 'branding-export'
  sheetSlug: string
  sheetName: string
  totalRows: number
  header: {
    locationTitle: string
    fromLabel: string
    toLabel: string
    columns: [
      'Device ID',
      'Wire No.',
      'Wire ID',
      'Gauge/Size',
      'Length',
      'Device ID',
      'To Location',
      'Bundle Name',
    ]
  }
  projectInfo: BrandListSchemaProjectInfo
  prefixGroups: BrandListSchemaPrefixGroup[]
}

function getDevicePrefix(deviceId: string | undefined): string {
  const baseDeviceId = (deviceId ?? '').split(':')[0]?.trim() ?? ''
  const match = baseDeviceId.match(/^([A-Za-z]+)/)
  return match ? match[1].toUpperCase() : baseDeviceId.toUpperCase() || 'UNKNOWN'
}

export function buildBrandListExportSchema(options: {
  sheetSlug: string
  sheetName: string
  brandingVisibleSections: BrandingVisibleSection[]
  sectionColumnVisibility: Record<string, SectionColumnVisibility>
  brandingSortMode?: BrandingSortMode
  projectInfo?: BrandListSchemaProjectInfo
  generatedAt?: string
}): BrandListExportSchema {
  const {
    sheetSlug,
    sheetName,
    brandingVisibleSections,
    sectionColumnVisibility,
    brandingSortMode = 'default',
    projectInfo,
    generatedAt,
  } = options

  const prefixGroups: BrandListSchemaPrefixGroup[] = []
  let currentPrefixGroup: BrandListSchemaPrefixGroup | null = null
  let currentBundle: BrandListSchemaBundle | null = null
  let currentSubgroupLabel = ''
  let isFirstRowInSubgroup = false
  const allRows: BrandListSchemaRow[] = []

  for (const { subsection, rows } of brandingVisibleSections) {
    const sectionColumns = getEffectiveSectionColumns(
      sectionColumnVisibility,
      subsection.label,
      subsection.sectionKind,
    )

    const rowMap = new Map(rows.map((entry) => [entry.row.__rowId, entry]))
    const renderPlan = buildBrandingSectionRenderPlan(
      rows.map((entry) => entry.row),
      sheetName,
      subsection.sectionKind,
      subsection.matchMetadata ?? {},
      undefined,
      brandingSortMode,
    )

    for (const item of renderPlan) {
      if (item.type === 'group-header' && item.group.groupKind === 'prefix-category') {
        currentPrefixGroup = {
          prefix: item.group.label || 'UNKNOWN',
          bundles: [],
        }
        prefixGroups.push(currentPrefixGroup)
        currentBundle = null
        currentSubgroupLabel = ''
        isFirstRowInSubgroup = false
        continue
      }

      if (item.type === 'group-header' && item.group.groupKind === 'subgroup') {
        currentSubgroupLabel = item.group.label || ''
        isFirstRowInSubgroup = true
        currentBundle = null
        continue
      }

      if (item.type !== 'row') {
        continue
      }

      const entry = rowMap.get(item.rowId)
      if (!entry) {
        continue
      }

      const swap = shouldSwapForTargetPair(entry.row.fromDeviceId, entry.row.toDeviceId)
      const fromDeviceId = swap ? (entry.row.toDeviceId || '') : (entry.row.fromDeviceId || '')
      const toDeviceId = swap ? (entry.row.fromDeviceId || '') : (entry.row.toDeviceId || '')
      const toLocation = entry.location || ''
      const devicePrefix = getDevicePrefix(fromDeviceId)

      if (!currentPrefixGroup || currentPrefixGroup.prefix !== devicePrefix) {
        currentPrefixGroup = {
          prefix: devicePrefix,
          bundles: [],
        }
        prefixGroups.push(currentPrefixGroup)
        currentBundle = null
      }

      const locationMatchesCurrent = toLocation
        && toLocation.toUpperCase() === sheetName.toUpperCase()
      const bundleName = currentSubgroupLabel || devicePrefix
      const bundleDisplay = isFirstRowInSubgroup
        ? (locationMatchesCurrent
          ? bundleName
          : toLocation
            ? `${bundleName} - ${toLocation}`
            : bundleName)
        : ''

      if (!currentBundle || currentBundle.bundleName !== bundleName) {
        currentBundle = {
          bundleName,
          toLocation,
          rows: [],
        }
        currentPrefixGroup.bundles.push(currentBundle)
      }

      const row: BrandListSchemaRow = {
        rowId: entry.row.__rowId,
        rowIndex: entry.row.__rowIndex,
        fromDeviceId,
        wireNo: sectionColumns.wireNo ? (entry.row.wireNo || '') : '',
        wireId: sectionColumns.wireId ? (entry.row.wireId || '') : '',
        gaugeSize: sectionColumns.gaugeSize ? (entry.row.gaugeSize || '') : '',
        length: typeof entry.measurement === 'number' ? entry.measurement : null,
        toDeviceId,
        toLocation,
        bundleName,
        bundleDisplay,
        devicePrefix,
      }

      currentBundle.rows.push(row)
      allRows.push(row)
      isFirstRowInSubgroup = false
    }
  }

  return {
    schemaVersion: 1,
    generatedAt: generatedAt ?? new Date().toISOString(),
    mode: 'branding-export',
    sheetSlug,
    sheetName,
    totalRows: allRows.length,
    header: {
      locationTitle: sheetName,
      fromLabel: 'From',
      toLabel: 'To',
      columns: [
        'Device ID',
        'Wire No.',
        'Wire ID',
        'Gauge/Size',
        'Length',
        'Device ID',
        'To Location',
        'Bundle Name',
      ],
    },
    projectInfo: {
      projectNumber: projectInfo?.projectNumber,
      projectName: projectInfo?.projectName,
      revision: projectInfo?.revision,
      controlsDE: projectInfo?.controlsDE,
      controlsME: projectInfo?.controlsME,
    },
    prefixGroups,
  }
}
