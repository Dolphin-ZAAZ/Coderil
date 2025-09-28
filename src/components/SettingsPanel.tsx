import { useState, useEffect } from 'react'
import { UserSettings, AIGenerationConfig } from '@/types'
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
  const [aiConfig, setAiConfig] = useState<AIGenerationConfig>({
    openaiApiKey: '',
    model: 'gpt-4.1-mini',
    maxTokens: 4000,
    temperature: 0.7,
    retryAttempts: 3,
    timeoutMs: 30000
  })
  const [availableModels, setAvailableModels] = useState<string[]>([])
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
        const [loadedSettings, loadedAiConfig, models] = await Promise.all([
          window.electronAPI.getSettings(),
          window.electronAPI.getAiConfig(),
          window.electronAPI.getAvailableModels()
        ])
        setSettings(loadedSettings)
        setAiConfig(loadedAiConfig)
        setAvailableModels(models)
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
        await Promise.all([
          window.electronAPI.saveSettings(settings),
          window.electronAPI.saveAiConfig(aiConfig)
        ])
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

  const handleAiConfigChange = (key: keyof AIGenerationConfig, value: any) => {
    setAiConfig(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const testApiKey = async () => {
    if (!aiConfig.openaiApiKey?.trim()) {
      setSaveMessage('Please enter an API key first.')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    setIsSaving(true)
    setSaveMessage('Testing API key...')
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.testOpenAIConnection(aiConfig.openaiApiKey)
        if (result.success) {
          setSaveMessage('API key is valid!')
        } else {
          setSaveMessage(`API key test failed: ${result.error}`)
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
                      value={aiConfig.openaiApiKey || ''}
                      onChange={(e) => handleAiConfigChange('openaiApiKey', e.target.value)}
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
                      disabled={isSaving || !aiConfig.openaiApiKey?.trim()}
                    >
                      Test
                    </button>
                  </div>
                  <p className="setting-description">
                    Required for AI-powered judging and kata generation. 
                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">OpenAI Platform</a>.
                  </p>
                  {!aiConfig.openaiApiKey?.trim() && (
                    <p className="setting-warning">
                      ⚠️ Without an API key, AI features including kata generation will not work.
                    </p>
                  )}
                </div>

                <div className="setting-item">
                  <label htmlFor="ai-model">AI Model</label>
                  <select
                    id="ai-model"
                    value={aiConfig.model}
                    onChange={(e) => handleAiConfigChange('model', e.target.value)}
                  >
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="setting-description">
                    Choose the AI model for kata generation and judging. GPT-4.1-mini is recommended for best results.
                  </p>
                </div>

                <div className="setting-item">
                  <label htmlFor="max-tokens">Max Tokens</label>
                  <input
                    id="max-tokens"
                    type="number"
                    min="100"
                    max="8000"
                    step="100"
                    value={aiConfig.maxTokens}
                    onChange={(e) => handleAiConfigChange('maxTokens', parseInt(e.target.value))}
                  />
                  <p className="setting-description">
                    Maximum number of tokens for AI responses. Higher values allow longer responses but cost more.
                  </p>
                </div>

                <div className="setting-item">
                  <label htmlFor="temperature">Temperature</label>
                  <input
                    id="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={aiConfig.temperature}
                    onChange={(e) => handleAiConfigChange('temperature', parseFloat(e.target.value))}
                  />
                  <p className="setting-description">
                    Controls randomness in AI responses. Lower values (0.1-0.3) for more focused output, higher values (0.7-1.0) for more creative output.
                  </p>
                </div>

                <div className="setting-item">
                  <label htmlFor="retry-attempts">Retry Attempts</label>
                  <input
                    id="retry-attempts"
                    type="number"
                    min="1"
                    max="10"
                    value={aiConfig.retryAttempts}
                    onChange={(e) => handleAiConfigChange('retryAttempts', parseInt(e.target.value))}
                  />
                  <p className="setting-description">
                    Number of times to retry failed API calls before giving up.
                  </p>
                </div>

                <div className="setting-item">
                  <label htmlFor="timeout">Timeout</label>
                  <input
                    id="timeout"
                    type="number"
                    min="5000"
                    max="120000"
                    step="5000"
                    value={aiConfig.timeoutMs}
                    onChange={(e) => handleAiConfigChange('timeoutMs', parseInt(e.target.value))}
                  />
                  <span className="unit">ms</span>
                  <p className="setting-description">
                    Maximum time to wait for AI responses before timing out.
                  </p>
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