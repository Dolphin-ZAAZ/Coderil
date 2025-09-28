import { useState, useEffect, useCallback } from 'react'
import { SystemDependencies } from '@/types'

export const useDependencyChecker = () => {
  const [dependencies, setDependencies] = useState<SystemDependencies | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const checkDependencies = useCallback(async () => {
    if (!window.electronAPI) {
      console.warn('Electron API not available')
      return
    }

    setIsLoading(true)
    try {
      const deps = await window.electronAPI.checkDependencies()
      setDependencies(deps)
      console.log('Dependencies checked:', deps)
    } catch (error) {
      console.error('Failed to check dependencies:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshDependencies = useCallback(async () => {
    await checkDependencies()
    setIsDismissed(false) // Show warning again after refresh
  }, [checkDependencies])

  const dismissWarning = useCallback(() => {
    setIsDismissed(true)
  }, [])

  // Listen for dependency status from main process on startup
  useEffect(() => {
    if (!window.ipcRenderer) {
      return
    }

    const handleDependencyStatus = (_event: any, deps: SystemDependencies) => {
      console.log('Received dependency status from main process:', deps)
      setDependencies(deps)
    }

    window.ipcRenderer.on('dependency-status', handleDependencyStatus)

    return () => {
      window.ipcRenderer.off('dependency-status', handleDependencyStatus)
    }
  }, [])

  // Initial check if not received from main process
  useEffect(() => {
    if (!dependencies && !isLoading) {
      checkDependencies()
    }
  }, [dependencies, isLoading, checkDependencies])

  return {
    dependencies,
    isLoading,
    isDismissed,
    checkDependencies,
    refreshDependencies,
    dismissWarning,
    shouldShowWarning: dependencies && !dependencies.allAvailable && !isDismissed
  }
}