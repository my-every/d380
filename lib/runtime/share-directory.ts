import 'server-only'

import { promises as fs } from 'node:fs'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_APP_LAUNCH_MODE,
  type AppLaunchMode,
} from '@/lib/runtime/app-mode-types'

const RUNTIME_SETTINGS_PATH = path.join(process.cwd(), 'cache', 'runtime-settings.json')

interface RuntimeSettings {
  shareDirectory?: string | null
  appMode?: AppLaunchMode
  firstLaunchCompleted?: boolean
}

type ShareDirectorySource = 'env' | 'config' | 'default'

async function readRuntimeSettings(): Promise<RuntimeSettings> {
  try {
    const raw = await fs.readFile(RUNTIME_SETTINGS_PATH, 'utf-8')
    return JSON.parse(raw) as RuntimeSettings
  } catch {
    return {}
  }
}

function readRuntimeSettingsSync(): RuntimeSettings {
  try {
    const raw = readFileSync(RUNTIME_SETTINGS_PATH, 'utf-8')
    return JSON.parse(raw) as RuntimeSettings
  } catch {
    return {}
  }
}

async function writeRuntimeSettings(settings: RuntimeSettings): Promise<void> {
  await fs.mkdir(path.dirname(RUNTIME_SETTINGS_PATH), { recursive: true })
  await fs.writeFile(RUNTIME_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
}

async function updateRuntimeSettings(
  updater: (current: RuntimeSettings) => RuntimeSettings,
): Promise<RuntimeSettings> {
  const current = await readRuntimeSettings()
  const next = updater(current)
  await writeRuntimeSettings(next)
  return next
}

function normalizeShareDirectory(value: string | null | undefined): string | null {
  if (!value || !value.trim()) {
    return null
  }

  const trimmed = value.trim()
  if (!path.isAbsolute(trimmed)) {
    return null
  }

  return path.normalize(trimmed)
}

function normalizeAppLaunchMode(value: string | null | undefined): AppLaunchMode {
  if (value === 'WORKSPACE' || value === 'STANDALONE_TOOL' || value === 'DEPARTMENT') {
    return value
  }

  return DEFAULT_APP_LAUNCH_MODE
}

export async function resolveShareDirectory(): Promise<string> {
  const envShare = normalizeShareDirectory(process.env.SHARE_DIR)
  if (envShare) {
    return envShare
  }

  const settings = await readRuntimeSettings()
  const configuredShare = normalizeShareDirectory(settings.shareDirectory)
  if (configuredShare) {
    return configuredShare
  }

  return path.join(process.cwd(), 'Share')
}

export function resolveShareDirectorySync(): string {
  const envShare = normalizeShareDirectory(process.env.SHARE_DIR)
  if (envShare) {
    return envShare
  }

  const settings = readRuntimeSettingsSync()
  const configuredShare = normalizeShareDirectory(settings.shareDirectory)
  if (configuredShare) {
    return configuredShare
  }

  return path.join(process.cwd(), 'Share')
}

export async function getShareDirectorySettings(): Promise<{
  shareDirectory: string
  source: ShareDirectorySource
}> {
  const envShare = normalizeShareDirectory(process.env.SHARE_DIR)
  if (envShare) {
    return {
      shareDirectory: envShare,
      source: 'env',
    }
  }

  const settings = await readRuntimeSettings()
  const configuredShare = normalizeShareDirectory(settings.shareDirectory)
  if (configuredShare) {
    return {
      shareDirectory: configuredShare,
      source: 'config',
    }
  }

  return {
    shareDirectory: path.join(process.cwd(), 'Share'),
    source: 'default',
  }
}

export async function hasUsersDirectory(): Promise<boolean> {
  const shareDirectory = await resolveShareDirectory()
  const usersPath = path.join(shareDirectory, 'users')

  try {
    const stat = await fs.stat(usersPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

export async function setShareDirectorySettings(shareDirectory: string | null): Promise<string> {
  const normalized = normalizeShareDirectory(shareDirectory)

  await updateRuntimeSettings(current => ({
    ...current,
    shareDirectory: normalized,
  }))

  const resolved = normalized ?? path.join(process.cwd(), 'Share')
  await fs.mkdir(resolved, { recursive: true })
  return resolved
}

export async function getAppModeSettings(): Promise<{
  appMode: AppLaunchMode
  firstLaunchCompleted: boolean
}> {
  const settings = await readRuntimeSettings()

  return {
    appMode: normalizeAppLaunchMode(settings.appMode),
    firstLaunchCompleted: settings.firstLaunchCompleted === true,
  }
}

export async function setAppModeSettings(appMode: AppLaunchMode): Promise<{
  appMode: AppLaunchMode
  firstLaunchCompleted: boolean
}> {
  const normalizedMode = normalizeAppLaunchMode(appMode)

  await updateRuntimeSettings(current => ({
    ...current,
    appMode: normalizedMode,
    firstLaunchCompleted: true,
  }))

  return {
    appMode: normalizedMode,
    firstLaunchCompleted: true,
  }
}
