import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { D380WorkspaceValidationResult } from '../../types/electron-bridge'

const DEV_SERVER_URL = process.env.ELECTRON_RENDERER_URL ?? 'http://localhost:3000'
const PROD_SERVER_PORT = Number(process.env.PORT ?? '38011')
const WORKSPACE_SETTINGS_FILE = 'workspace-settings.json'
const WORKSPACE_BOOTSTRAP_PATHS = [
  'Projects',
  'Config',
  'users',
]

let mainWindow: BrowserWindow | null = null
let nextServerProcess: ChildProcess | null = null

interface WorkspaceSettings {
  workspaceRoot: string | null
  updatedAt: string | null
}

function getPreloadPath(): string {
  return path.join(__dirname, 'preload.js')
}

function getPackagedServerPath(): string {
  return path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js')
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), WORKSPACE_SETTINGS_FILE)
}

async function ensureUserDataDirectory(): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
}

async function readWorkspaceSettings(): Promise<WorkspaceSettings> {
  try {
    const raw = await readFile(getSettingsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as WorkspaceSettings
    return {
      workspaceRoot: parsed.workspaceRoot ?? null,
      updatedAt: parsed.updatedAt ?? null,
    }
  } catch {
    return {
      workspaceRoot: null,
      updatedAt: null,
    }
  }
}

async function writeWorkspaceSettings(workspaceRoot: string | null): Promise<WorkspaceSettings> {
  const settings: WorkspaceSettings = {
    workspaceRoot,
    updatedAt: new Date().toISOString(),
  }

  await ensureUserDataDirectory()
  await writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')

  return settings
}

async function validateWorkspaceRoot(workspaceRoot: string | null): Promise<D380WorkspaceValidationResult> {
  if (!workspaceRoot) {
    return {
      selectedRoot: null,
      isValid: false,
      missingPaths: [...WORKSPACE_BOOTSTRAP_PATHS],
    }
  }

  try {
    await access(workspaceRoot)
  } catch {
    return {
      selectedRoot: workspaceRoot,
      isValid: false,
      missingPaths: [...WORKSPACE_BOOTSTRAP_PATHS],
    }
  }

  const missingPaths: string[] = []

  for (const relativePath of WORKSPACE_BOOTSTRAP_PATHS) {
    try {
      await access(path.join(workspaceRoot, relativePath))
    } catch {
      missingPaths.push(relativePath)
    }
  }

  return {
    selectedRoot: workspaceRoot,
    isValid: true,
    missingPaths,
  }
}

function assertWorkspacePath(relativePath: string): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error('Relative workspace path is required')
  }

  const normalized = path.normalize(relativePath).replace(/^[\\/]+/, '')
  if (normalized.startsWith('..') || normalized.includes(`..${path.sep}`)) {
    throw new Error('Path traversal is not allowed')
  }

  return normalized
}

async function resolveWorkspacePath(relativePath: string): Promise<string> {
  const settings = await readWorkspaceSettings()
  if (!settings.workspaceRoot) {
    throw new Error('Workspace root is not configured')
  }

  const normalized = assertWorkspacePath(relativePath)
  const absolute = path.resolve(settings.workspaceRoot, normalized)
  const root = path.resolve(settings.workspaceRoot)

  if (!absolute.startsWith(root)) {
    throw new Error('Resolved path is outside workspace root')
  }

  return absolute
}

async function waitForServer(url: string, timeoutMs = 30000): Promise<void> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Ignore connection errors while the local server starts.
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  throw new Error(`Timed out waiting for Next server at ${url}`)
}

async function startPackagedNextServer(): Promise<string> {
  const serverPath = getPackagedServerPath()

  await access(serverPath)

  nextServerProcess = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOSTNAME: '127.0.0.1',
      PORT: String(PROD_SERVER_PORT),
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  })

  const serverUrl = `http://127.0.0.1:${PROD_SERVER_PORT}`
  await waitForServer(serverUrl)
  return serverUrl
}

async function resolveRendererUrl(): Promise<string> {
  if (!app.isPackaged) {
    return DEV_SERVER_URL
  }

  return startPackagedNextServer()
}

async function createMainWindow(): Promise<void> {
  const rendererUrl = await resolveRendererUrl()

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  await mainWindow.loadURL(rendererUrl)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerIpcHandlers(): void {
  ipcMain.handle('d380:get-runtime-info', async () => {
    const settings = await readWorkspaceSettings()

    return {
      isElectron: true,
      isPackaged: app.isPackaged,
      platform: process.platform,
      version: app.getVersion(),
      workspaceRoot: settings.workspaceRoot,
    }
  })

  ipcMain.handle('d380:get-workspace-root', async () => {
    const settings = await readWorkspaceSettings()
    return settings.workspaceRoot
  })

  ipcMain.handle('d380:choose-workspace-root', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select D380 Share Root',
      properties: ['openDirectory', 'createDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0] ?? null
  })

  ipcMain.handle('d380:set-workspace-root', async (_event, workspaceRoot: string | null) => {
    const settings = await writeWorkspaceSettings(workspaceRoot)
    return settings.workspaceRoot
  })

  ipcMain.handle('d380:validate-workspace-root', async (_event, workspaceRoot: string | null) => {
    return validateWorkspaceRoot(workspaceRoot)
  })

  ipcMain.handle('d380:open-path', async (_event, targetPath: string) => {
    if (!targetPath) {
      return false
    }

    const error = await shell.openPath(targetPath)
    return error.length === 0
  })

  ipcMain.handle('d380:reveal-path', async (_event, targetPath: string) => {
    if (!targetPath) {
      return false
    }

    shell.showItemInFolder(targetPath)
    return true
  })

  ipcMain.handle('d380:workspace-path-exists', async (_event, relativePath: string) => {
    try {
      const absolutePath = await resolveWorkspacePath(relativePath)
      await access(absolutePath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('d380:read-workspace-text-file', async (_event, relativePath: string) => {
    try {
      const absolutePath = await resolveWorkspacePath(relativePath)
      return await readFile(absolutePath, 'utf-8')
    } catch {
      return null
    }
  })

  ipcMain.handle('d380:write-workspace-text-file', async (_event, relativePath: string, content: string) => {
    try {
      const absolutePath = await resolveWorkspacePath(relativePath)
      await mkdir(path.dirname(absolutePath), { recursive: true })
      await writeFile(absolutePath, content, 'utf-8')
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('d380:ensure-workspace-directory', async (_event, relativePath: string) => {
    try {
      const absolutePath = await resolveWorkspacePath(relativePath)
      await mkdir(absolutePath, { recursive: true })
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('d380:rename-workspace-path', async (_event, fromRelativePath: string, toRelativePath: string) => {
    try {
      const fromAbsolutePath = await resolveWorkspacePath(fromRelativePath)
      const toAbsolutePath = await resolveWorkspacePath(toRelativePath)
      await mkdir(path.dirname(toAbsolutePath), { recursive: true })
      await rename(fromAbsolutePath, toAbsolutePath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('d380:delete-workspace-path', async (_event, relativePath: string) => {
    try {
      const absolutePath = await resolveWorkspacePath(relativePath)
      await rm(absolutePath, { force: true, recursive: true })
      return true
    } catch {
      return false
    }
  })
}

function registerApplicationLifecycle(): void {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    if (nextServerProcess && !nextServerProcess.killed) {
      nextServerProcess.kill()
      nextServerProcess = null
    }
  })

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow()
    }
  })
}

async function bootstrap(): Promise<void> {
  await app.whenReady()
  registerIpcHandlers()
  registerApplicationLifecycle()
  await createMainWindow()
}

bootstrap().catch(error => {
  console.error('[electron] Failed to bootstrap desktop runtime', error)
  app.quit()
})