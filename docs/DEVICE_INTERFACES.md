# Device Details — TypeScript Interfaces Reference

Complete inventory of all TypeScript interfaces and types related to device details, termination guides, terminal matrices, and device property records in D380.

---

## Table of Contents

1. [Parsed Device ID](#1-parsed-device-id) — `lib/device-details/types.ts`
2. [Device Part Info](#2-device-part-info)
3. [Termination Records](#3-termination-records)
4. [Device Details](#4-device-details)
5. [Terminal Matrix](#5-terminal-matrix)
6. [Termination Guide](#6-termination-guide)
7. [Device Family & Guide Registry](#7-device-family--guide-registry)
8. [Device Properties](#8-device-properties) — `lib/device/device-property-types.ts`

---

## 1. Parsed Device ID

**File:** `lib/device-details/types.ts`

```ts
interface ParsedDeviceId {
  baseId: string          // e.g. "AF0123"
  terminal: string | null // e.g. "13" or null
}
```

---

## 2. Device Part Info

**File:** `lib/device-details/types.ts`

```ts
interface DevicePartInfo {
  deviceId: string
  partNumbers: string[]
  description: string
  location: string
}
```

---

## 3. Termination Records

**File:** `lib/device-details/types.ts`

```ts
interface TerminationRecord {
  terminal: string
  fromDeviceId: string
  wireNo: string
  wireType: string
  wireId: string
  gaugeSize: string
  toDeviceId: string
  toLocation: string
  fromLocation: string
  wireColor?: string
  stripLength?: string
  changeState?: 'added' | 'removed'
  rowId: string
}
```

---

## 4. Device Details

**File:** `lib/device-details/types.ts`

```ts
interface DeviceDetails {
  parsedId: ParsedDeviceId
  partInfo: DevicePartInfo | null
  terminations: TerminationRecord[]
  usedTerminals: Set<string>
  usedTerminalList: string[]
  totalTerminalsUsed: number
}
```

---

## 5. Terminal Matrix

**File:** `lib/device-details/types.ts`

```ts
interface TerminalMatrixLayout {
  rows: TerminalMatrixRow[]
  columns: number
  totalTerminals: number
}

interface TerminalMatrixRow {
  label: string           // "00", "01", "COM -", "V+", "SH", etc.
  terminalNumbers: string[]
}
```

---

## 6. Termination Guide

**File:** `lib/device-details/types.ts`

```ts
interface TerminationGuideProps {
  deviceId: string
  description?: string
  terminations: TerminationRecord[]
  usedTerminals: Set<string>
  usedTerminalList?: string[]
  partNumbers?: string[]
  selectedTerminal?: string | null
  onTerminalClick?: (terminal: string) => void
}
```

---

## 7. Device Family & Guide Registry

**File:** `lib/device-details/types.ts`

```ts
type DeviceFamilyType =
  | 'relay'           // KA, KT
  | 'fuse'            // FU
  | 'terminal-block'  // XT
  | 'i-o-module'      // AF
  | 'other'

interface GuideRegistryEntry {
  family: DeviceFamilyType
  prefixes: string[]
  component: React.ComponentType<TerminationGuideProps>
  label: string
}
```

---

## 8. Device Properties

**File:** `lib/device/device-property-types.ts`

```ts
type DevicePropertyField =
  | 'partNumber'
  | 'description'
  | 'category'
  | 'referenceImage'
  | 'icon'

interface DevicePropertyRecord {
  partNumber: string
  description: string
  category: string
  referenceImage: string
  icon: string
}
```

---

## Cross-Domain References

| Type | Source | Consumed By |
|---|---|---|
| `SemanticWireListRow`, `ParsedSheetRow` | `lib/workbook/types.ts` | Imported by device-details types for row data |
| `TerminationRecord` | Local | Device detail components, termination guide components |
| `DeviceDetails` | Local | `hooks/use-device-details.ts`, device detail panels |
| `DevicePropertyRecord` | Local | Device property library components |
