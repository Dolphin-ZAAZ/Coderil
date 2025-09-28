import { useState, useEffect } from 'react'
import { UserSettings } from '@/types'
import './SettingsPanel.css'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<UserSettings>({
    autoContinueEnabled: false,
    theme: 'auto',
    editorFontSize: 14,
    autoSaveInterval: 1000,
    openaiApiKey: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      if (window.electronAPI) {
        const loadedSettings = await window.electronAPI.getSettings()
        setSettings(loadedSettings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    setSaveMessage('')
    
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveSettings(settings)
        setSaveMessage('Settings saved successfully!')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveMessage('Failed to save settings. Please try again.')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const testApiKey = async () => {
    if (!settings.openaiApiKey?.trim()) {
      setSaveMessage('Please enter an API key first.')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    setIsSaving(true)
    setSaveMessage('Testing API key...')
    
    try {
      if (window.electronAPI) {
        const isValid = await window.electronAPI.testOpenAIKey(settings.openaiApiKey)
        if (isValid) {
          setSaveMessage('API key is valid!')
        } else {
          setSaveMessage('API key is invalid. Please check your key.')
        }
      }
    } catch (error) {
      console.error('Failed to test API key:', error)
      setSaveMessage('Failed to test API key. Please check your connection.')
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        <div className="settings-content">
          {isLoading ? (
            <div className="loading">Loading settings...</div>
          ) : (
            <>
              <div className="settings-section">
                <h3>General</h3>
                
                <div className="setting-item">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.autoContinueEnabled}
                      onChange={(e) => handleSettingChange('autoContinueEnabled', e.target.checked)}
                    />
                    Enable auto-continue to next kata
                  </label>
                  <p className="setting-description">
                    Automatically move to a random kata after successfully completing one
                  </p>
                </div>

                <div className="setting-item">
                  <label htmlFor="theme-select">Theme</label>
                  <select
                    id="theme-select"
                    value={settings.theme}
                    onChange={(e) => handleSettingChange('theme', e.target.value)}
                  >
                    <option value="auto">Auto (System)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div className="setting-item">
                  <label htmlFor="font-size">Editor Font Size</label>
                  <input
                    id="font-size"
                    type="number"
                    min="10"
                    max="24"
                    value={settings.editorFontSize}
                    onChange={(e) => handleSettingChange('editorFontSize', parseInt(e.target.value))}
                  />
                  <span className="unit">px</span>
                </div>

                <div className="setting-item">
                  <label htmlFor="auto-save">Auto-save Interval</label>
                  <input
                    id="auto-save"
                    type="number"
                    min="500"
                    max="10000"
                    step="500"
                    value={settings.autoSaveInterval}
                    onChange={(e) => handleSettingChange('autoSaveInterval', parseInt(e.target.value))}
                  />
                  <span className="unit">ms</span>
                </div>
              </div>

              <div className="settings-section">
                <h3>AI Features</h3>
                
                <div className="setting-item">
                  <label htmlFor="openai-key">OpenAI API Key</label>
                  <div className="api-key-input-group">
                    <input
                      id="openai-key"
                      type={showApiKey ? "text" : "password"}
                      value={settings.openaiApiKey || ''}
                      onChange={(e) => handleSettingChange('openaiApiKey', e.target.value)}
                      placeholder="sk-..."
                      className="api-key-input"
                    />
                    <button
                      type="button"
                      className="toggle-visibility"
                      onClick={() => setShowApiKey(!showApiKey)}
                      aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    >
                      {showApiKey ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button
                      type="button"
                      className="test-key-button"
                      onClick={testApiKey}
                      disabled={isSaving || !settings.openaiApiKey?.trim()}
                    >
                      Test
                    </button>
                  </div>
                  <p className="setting-description">
                    Required for AI-powered judging of explanation and template katas. 
                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>.
                  </p>
                  {!settings.openaiApiKey?.trim() && (
                    <p className="setting-warning">
                      ⚠️ Without an API key, explanation and template katas will not work properly.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="settings-footer">
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('Failed') || saveMessage.includes('invalid') ? 'error' : 'success'}`}>
              {saveMessage}
            </div>
          )}
          <div className="settings-actions">
            <button onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button 
              onClick={saveSettings} 
              disabled={isSaving}
              className="primary"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}