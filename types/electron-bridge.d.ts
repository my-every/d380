export interface D380ElectronRuntimeInfo {
  isElectron: boolean
  isPackaged: boolean
  platform: NodeJS.Platform
  version: string
  workspaceRoot: string | null
}

export interface D380WorkspaceValidationResult {
  selectedRoot: string | null
  isValid: boolean
  missingPaths: string[]
}

export interface D380ElectronBridge {
  getRuntimeInfo(): Promise<D380ElectronRuntimeInfo>
  getWorkspaceRoot(): Promise<string | null>
  chooseWorkspaceRoot(): Promise<string | null>
  setWorkspaceRoot(workspaceRoot: string | null): Promise<string | null>
  validateWorkspaceRoot(workspaceRoot: string | null): Promise<D380WorkspaceValidationResult>
  openPath(targetPath: string): Promise<boolean>
  revealPath(targetPath: string): Promise<boolean>
  workspacePathExists(relativePath: string): Promise<boolean>
  readWorkspaceTextFile(relativePath: string): Promise<string | null>
  writeWorkspaceTextFile(relativePath: string, content: string): Promise<boolean>
  ensureWorkspaceDirectory(relativePath: string): Promise<boolean>
  renameWorkspacePath(fromRelativePath: string, toRelativePath: string): Promise<boolean>
  deleteWorkspacePath(relativePath: string): Promise<boolean>
}

declare global {
  interface Window {
    d380Electron?: D380ElectronBridge
  }
}

export { }