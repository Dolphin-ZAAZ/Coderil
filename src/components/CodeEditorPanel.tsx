import { CodeEditorProps } from '@/types'
import './CodeEditorPanel.css'

export function CodeEditorPanel({ 
  language, 
  initialCode, 
  onChange, 
  onRun, 
  onSubmit 
}: CodeEditorProps) {
  return (
    <div className="code-editor-panel">
      <div className="editor-header">
        <div className="editor-info">
          <span className="editor-language">{language}</span>
          <span className="editor-status">Ready</span>
        </div>
        <div className="editor-actions">
          <button 
            className="btn btn-secondary"
            onClick={onRun}
            title="Run public tests only"
          >
            Run
          </button>
          <button 
            className="btn btn-primary"
            onClick={onSubmit}
            title="Submit and run all tests"
          >
            Submit
          </button>
        </div>
      </div>
      
      <div className="editor-container">
        <textarea
          className="code-textarea"
          value={initialCode}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Write your ${language} code here...`}
          spellCheck={false}
        />
      </div>
      
      <div className="editor-footer">
        <span className="editor-hint">
          Monaco Editor will be integrated in task 6
        </span>
      </div>
    </div>
  )
}