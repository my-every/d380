import { getElectronBridge } from './bridge'

export interface WorkspaceFs {
    exists(relativePath: string): Promise<boolean>
    readText(relativePath: string): Promise<string | null>
    writeText(relativePath: string, content: string): Promise<boolean>
    ensureDir(relativePath: string): Promise<boolean>
    rename(fromRelativePath: string, toRelativePath: string): Promise<boolean>
    delete(relativePath: string): Promise<boolean>
}

class ElectronWorkspaceFs implements WorkspaceFs {
    private getBridge() {
        const bridge = getElectronBridge()
        if (!bridge) {
            throw new Error('Electron bridge is unavailable')
        }
        return bridge
    }

    async exists(relativePath: string): Promise<boolean> {
        return this.getBridge().workspacePathExists(relativePath)
    }

    async readText(relativePath: string): Promise<string | null> {
        return this.getBridge().readWorkspaceTextFile(relativePath)
    }

    async writeText(relativePath: string, content: string): Promise<boolean> {
        return this.getBridge().writeWorkspaceTextFile(relativePath, content)
    }

    async ensureDir(relativePath: string): Promise<boolean> {
        return this.getBridge().ensureWorkspaceDirectory(relativePath)
    }

    async rename(fromRelativePath: string, toRelativePath: string): Promise<boolean> {
        return this.getBridge().renameWorkspacePath(fromRelativePath, toRelativePath)
    }

    async delete(relativePath: string): Promise<boolean> {
        return this.getBridge().deleteWorkspacePath(relativePath)
    }
}

let workspaceFsInstance: WorkspaceFs | null = null

export function getWorkspaceFs(): WorkspaceFs {
    if (!workspaceFsInstance) {
        workspaceFsInstance = new ElectronWorkspaceFs()
    }
    return workspaceFsInstance
}
