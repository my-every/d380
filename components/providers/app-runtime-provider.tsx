'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  detectInitialAppDataMode,
  type AppDataMode,
} from '@/lib/services/provider-registry'
import {
  DEFAULT_APP_LAUNCH_MODE,
  type AppLaunchMode,
} from '@/lib/runtime/app-mode-types'
import { getProviderIdForMode } from '@/lib/services/service-provider-registry'
import type { AppProviderId } from '@/lib/services/provider-types'
import { getElectronBridge } from '@/lib/services/providers/share-380-electron/bridge'
import type {
  D380ElectronRuntimeInfo,
  D380WorkspaceValidationResult,
} from '@/types/electron-bridge'

interface AppRuntimeContextValue {
  dataMode: AppDataMode
  isElectron: boolean
  isPackaged: boolean
  platform: NodeJS.Platform | 'browser'
  version: string | null
  workspaceRoot: string | null
  workspaceValidation: D380WorkspaceValidationResult | null
  providerId: AppProviderId
  appMode: AppLaunchMode
  hasCompletedFirstLaunch: boolean
  isAppModeLoading: boolean
  isLoading: boolean
  isSelectingWorkspace: boolean
  needsWorkspaceSetup: boolean
  refreshRuntimeInfo: () => Promise<void>
  refreshAppModeSettings: () => Promise<void>
  setAppMode: (nextMode: AppLaunchMode) => Promise<void>
  chooseWorkspaceRoot: () => Promise<string | null>
  setWorkspaceRoot: (workspaceRoot: string | null) => Promise<string | null>
  clearWorkspaceRoot: () => Promise<void>
}

const defaultMode = detectInitialAppDataMode()

const defaultContextValue: AppRuntimeContextValue = {
  dataMode: defaultMode,
  isElectron: defaultMode === 'electron',
  isPackaged: false,
  platform: 'browser',
  version: null,
  workspaceRoot: null,
  workspaceValidation: null,
  providerId: getProviderIdForMode(defaultMode),
  appMode: DEFAULT_APP_LAUNCH_MODE,
  hasCompletedFirstLaunch: false,
  isAppModeLoading: true,
  isLoading: defaultMode === 'electron',
  isSelectingWorkspace: false,
  needsWorkspaceSetup: defaultMode === 'electron',
  refreshRuntimeInfo: async () => {},
  refreshAppModeSettings: async () => {},
  setAppMode: async () => {},
  chooseWorkspaceRoot: async () => null,
  setWorkspaceRoot: async () => null,
  clearWorkspaceRoot: async () => {},
}

const AppRuntimeContext = createContext<AppRuntimeContextValue>(defaultContextValue)

function buildFallbackRuntimeInfo(dataMode: AppDataMode): D380ElectronRuntimeInfo {
  return {
    isElectron: dataMode === 'electron',
    isPackaged: false,
    platform: 'linux',
    version: null as unknown as string,
    workspaceRoot: null,
  }
}

export function AppRuntimeProvider({ children }: { children: ReactNode }) {
  const [dataMode, setDataMode] = useState<AppDataMode>(defaultMode)
  const [runtimeInfo, setRuntimeInfo] = useState<D380ElectronRuntimeInfo>(buildFallbackRuntimeInfo(defaultMode))
  const [workspaceValidation, setWorkspaceValidation] = useState<D380WorkspaceValidationResult | null>(null)
  const [appMode, setAppModeState] = useState<AppLaunchMode>(DEFAULT_APP_LAUNCH_MODE)
  const [hasCompletedFirstLaunch, setHasCompletedFirstLaunch] = useState(false)
  const [isAppModeLoading, setIsAppModeLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(defaultMode === 'electron')
  const [isSelectingWorkspace, setIsSelectingWorkspace] = useState(false)

  const bridge = useMemo(() => getElectronBridge(), [])

  const refreshRuntimeInfo = useCallback(async () => {
    if (!bridge) {
      setDataMode(detectInitialAppDataMode())
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const nextRuntimeInfo = await bridge.getRuntimeInfo()
      setRuntimeInfo(nextRuntimeInfo)
      setDataMode(nextRuntimeInfo.isElectron ? 'electron' : detectInitialAppDataMode())

      if (nextRuntimeInfo.workspaceRoot) {
        const validation = await bridge.validateWorkspaceRoot(nextRuntimeInfo.workspaceRoot)
        setWorkspaceValidation(validation)
      } else {
        setWorkspaceValidation(null)
      }
    } catch (error) {
      console.error('[runtime] Failed to refresh runtime info', error)
      setDataMode(detectInitialAppDataMode())
      setWorkspaceValidation(null)
    } finally {
      setIsLoading(false)
    }
  }, [bridge])

  useEffect(() => {
    void refreshRuntimeInfo()
  }, [refreshRuntimeInfo])

  const refreshAppModeSettings = useCallback(async () => {
    setIsAppModeLoading(true)

    try {
      const response = await fetch('/api/runtime/app-mode', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load app mode settings')
      }

      const nextSettings = await response.json() as {
        appMode: AppLaunchMode
        firstLaunchCompleted: boolean
      }

      setAppModeState(nextSettings.appMode)
      setHasCompletedFirstLaunch(nextSettings.firstLaunchCompleted)
    } catch (error) {
      console.error('[runtime] Failed to refresh app mode settings', error)
      setAppModeState(DEFAULT_APP_LAUNCH_MODE)
      setHasCompletedFirstLaunch(false)
    } finally {
      setIsAppModeLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshAppModeSettings()
  }, [refreshAppModeSettings])

  const setAppMode = useCallback(async (nextMode: AppLaunchMode) => {
    setIsAppModeLoading(true)

    try {
      const response = await fetch('/api/runtime/app-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appMode: nextMode }),
      })

      if (!response.ok) {
        throw new Error('Failed to save app mode settings')
      }

      const nextSettings = await response.json() as {
        appMode: AppLaunchMode
        firstLaunchCompleted: boolean
      }

      setAppModeState(nextSettings.appMode)
      setHasCompletedFirstLaunch(nextSettings.firstLaunchCompleted)
    } finally {
      setIsAppModeLoading(false)
    }
  }, [])

  const setWorkspaceRoot = useCallback(async (workspaceRoot: string | null) => {
    if (!bridge) {
      return null
    }

    const persistedRoot = await bridge.setWorkspaceRoot(workspaceRoot)
    setRuntimeInfo(prev => ({ ...prev, workspaceRoot: persistedRoot }))
    setWorkspaceValidation(
      persistedRoot ? await bridge.validateWorkspaceRoot(persistedRoot) : null,
    )
    return persistedRoot
  }, [bridge])

  const chooseWorkspaceRoot = useCallback(async () => {
    if (!bridge) {
      return null
    }

    setIsSelectingWorkspace(true)

    try {
      const selectedRoot = await bridge.chooseWorkspaceRoot()
      if (!selectedRoot) {
        return null
      }

      const validation = await bridge.validateWorkspaceRoot(selectedRoot)
      setRuntimeInfo(prev => ({ ...prev, workspaceRoot: selectedRoot }))
      setWorkspaceValidation(validation)

      if (validation.isValid) {
        await bridge.setWorkspaceRoot(selectedRoot)
      }

      return selectedRoot
    } finally {
      setIsSelectingWorkspace(false)
    }
  }, [bridge])

  const clearWorkspaceRoot = useCallback(async () => {
    if (!bridge) {
      return
    }

    await bridge.setWorkspaceRoot(null)
    setRuntimeInfo(prev => ({ ...prev, workspaceRoot: null }))
    setWorkspaceValidation(null)
  }, [bridge])

  const needsWorkspaceSetup =
    dataMode === 'electron' && (!runtimeInfo.workspaceRoot || workspaceValidation?.isValid === false || workspaceValidation === null)

  const value: AppRuntimeContextValue = {
    dataMode,
    isElectron: dataMode === 'electron',
    isPackaged: dataMode === 'electron' ? runtimeInfo.isPackaged : false,
    platform: dataMode === 'electron' ? runtimeInfo.platform : 'browser',
    version: dataMode === 'electron' ? runtimeInfo.version : null,
    workspaceRoot: runtimeInfo.workspaceRoot,
    workspaceValidation,
    providerId: getProviderIdForMode(dataMode),
    appMode,
    hasCompletedFirstLaunch,
    isAppModeLoading,
    isLoading,
    isSelectingWorkspace,
    needsWorkspaceSetup,
    refreshRuntimeInfo,
    refreshAppModeSettings,
    setAppMode,
    chooseWorkspaceRoot,
    setWorkspaceRoot,
    clearWorkspaceRoot,
  }

  return <AppRuntimeContext.Provider value={value}>{children}</AppRuntimeContext.Provider>
}

export function useAppRuntime() {
  return useContext(AppRuntimeContext)
}