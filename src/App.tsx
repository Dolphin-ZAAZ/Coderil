import { useState, useEffect } from 'react'
import './App.css'

interface Kata {
  slug: string
  title: string
  language: string
  type: string
  difficulty: string
  tags: string[]
  path: string
}

function App() {
  const [katas, setKatas] = useState<Kata[]>([])
  const [selectedKata, setSelectedKata] = useState<Kata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [autoContinueEnabled, setAutoContinueEnabled] = useState(false)

  useEffect(() => {
    // Load katas and settings on app start
    loadKatas()
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const settings = await window.electronAPI.getSettings()
      setAutoContinueEnabled(settings.autoContinueEnabled)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const loadKatas = async () => {
    try {
      setIsLoading(true)
      const loadedKatas = await window.electronAPI.getKatas()
      setKatas(loadedKatas)
    } catch (error) {
      console.error('Failed to load katas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKataSelect = (kata: Kata) => {
    setSelectedKata(kata)
  }

  const handleAutoContinueToggle = async () => {
    const newValue = !autoContinueEnabled
    setAutoContinueEnabled(newValue)
    try {
      await window.electronAPI.updateSetting('auto_continue_enabled', newValue.toString())
    } catch (error) {
      console.error('Failed to update auto-continue setting:', error)
      // Revert on error
      setAutoContinueEnabled(!newValue)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Code Kata App</h1>
            <p>Practice coding challenges with local execution and AI-powered judging</p>
          </div>
          <div className="header-controls">
            <label className="auto-continue-toggle">
              <input
                type="checkbox"
                checked={autoContinueEnabled}
                onChange={handleAutoContinueToggle}
              />
              <span className="toggle-text">Auto-continue</span>
            </label>
          </div>
        </div>
      </header>
      
      <main className="app-main">
        <div className="kata-selector">
          <h2>Available Katas</h2>
          {isLoading ? (
            <p>Loading katas...</p>
          ) : katas.length === 0 ? (
            <div className="no-katas">
              <p>No katas found.</p>
              <p>Add kata folders to the /katas/ directory to get started.</p>
            </div>
          ) : (
            <div className="kata-list">
              {katas.map((kata) => (
                <div
                  key={kata.slug}
                  className={`kata-item ${selectedKata?.slug === kata.slug ? 'selected' : ''}`}
                  onClick={() => handleKataSelect(kata)}
                >
                  <h3>{kata.title}</h3>
                  <div className="kata-meta">
                    <span className={`difficulty ${kata.difficulty}`}>{kata.difficulty}</span>
                    <span className="language">{kata.language}</span>
                    <span className={`type ${kata.type}`}>{kata.type}</span>
                  </div>
                  {kata.tags.length > 0 && (
                    <div className="kata-tags">
                      {kata.tags.map((tag) => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="kata-workspace">
          {selectedKata ? (
            <div className="workspace-content">
              <h2>{selectedKata.title}</h2>
              <p>Selected kata: {selectedKata.slug}</p>
              <p>This workspace will be implemented in later tasks.</p>
            </div>
          ) : (
            <div className="workspace-placeholder">
              <h2>Select a Kata</h2>
              <p>Choose a kata from the list to start coding.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App