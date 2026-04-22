import { contextBridge, ipcRenderer } from 'electron'

import type {
  D380ElectronBridge,
  D380ElectronRuntimeInfo,
  D380WorkspaceValidationResult,
} from '../../types/electron-bridge'

const bridge: D380ElectronBridge = {
  getRuntimeInfo(): Promise<D380ElectronRuntimeInfo> {
    return ipcRenderer.invoke('d380:get-runtime-info')
  },
  getWorkspaceRoot(): Promise<string | null> {
    return ipcRenderer.invoke('d380:get-workspace-root')
  },
  chooseWorkspaceRoot(): Promise<string | null> {
    return ipcRenderer.invoke('d380:choose-workspace-root')
  },
  setWorkspaceRoot(workspaceRoot: string | null): Promise<string | null> {
    return ipcRenderer.invoke('d380:set-workspace-root', workspaceRoot)
  },
  validateWorkspaceRoot(workspaceRoot: string | null): Promise<D380WorkspaceValidationResult> {
    return ipcRenderer.invoke('d380:validate-workspace-root', workspaceRoot)
  },
  openPath(targetPath: string): Promise<boolean> {
    return ipcRenderer.invoke('d380:open-path', targetPath)
  },
  revealPath(targetPath: string): Promise<boolean> {
    return ipcRenderer.invoke('d380:reveal-path', targetPath)
  },
  workspacePathExists(relativePath: string): Promise<boolean> {
    return ipcRenderer.invoke('d380:workspace-path-exists', relativePath)
  },
  readWorkspaceTextFile(relativePath: string): Promise<string | null> {
    return ipcRenderer.invoke('d380:read-workspace-text-file', relativePath)
  },
  writeWorkspaceTextFile(relativePath: string, content: string): Promise<boolean> {
    return ipcRenderer.invoke('d380:write-workspace-text-file', relativePath, content)
  },
  ensureWorkspaceDirectory(relativePath: string): Promise<boolean> {
    return ipcRenderer.invoke('d380:ensure-workspace-directory', relativePath)
  },
  renameWorkspacePath(fromRelativePath: string, toRelativePath: string): Promise<boolean> {
    return ipcRenderer.invoke('d380:rename-workspace-path', fromRelativePath, toRelativePath)
  },
  deleteWorkspacePath(relativePath: string): Promise<boolean> {
    return ipcRenderer.invoke('d380:delete-workspace-path', relativePath)
  },
}

contextBridge.exposeInMainWorld('d380Electron', bridge)