import { useState, useEffect } from 'react'

export function useElectronAPI() {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkElectronAPI = async () => {
      const maxWaitTime = 5000 // 5 seconds
      const checkInterval = 100 // Check every 100ms
      let waitTime = 0

      while (!window.electronAPI && waitTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, checkInterval))
        waitTime += checkInterval
      }

      setIsAvailable(!!window.electronAPI)
      setIsLoading(false)

      if (!window.electronAPI) {
        console.warn('ElectronAPI not available after timeout - running in browser mode')
      } else {
        console.log('ElectronAPI is available')
      }
    }

    checkElectronAPI()
  }, [])

  return { isAvailable, isLoading, electronAPI: window.electronAPI }
}