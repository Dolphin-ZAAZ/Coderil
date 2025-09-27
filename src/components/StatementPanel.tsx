import { StatementPanelProps } from '@/types'
import { marked } from 'marked'
import { useMemo, useState, useEffect } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import './StatementPanel.css'

export function StatementPanel({ statement, metadata, solutionCode, onShowSolution }: StatementPanelProps) {
  const [showingSolution, setShowingSolution] = useState(false)

  // Get the appropriate language for highlight.js
  const getHighlightLanguage = (language: string, type: string) => {
    if (type === 'explain') return 'markdown'
    if (type === 'template') return 'yaml'
    
    switch (language) {
      case 'py': return 'python'
      case 'js': return 'javascript'
      case 'ts': return 'typescript'
      case 'cpp': return 'cpp'
      default: return 'plaintext'
    }
  }

  // Highlight code when solution is shown
  useEffect(() => {
    if (showingSolution && solutionCode) {
      hljs.highlightAll()
    }
  }, [showingSolution, solutionCode])
  // Parse markdown to HTML with safe options
  const parsedStatement = useMemo(() => {
    // Configure marked for better code highlighting and security
    marked.setOptions({
      breaks: true,
      gfm: true,
    })
    
    // Force synchronous parsing by casting the result
    const result = marked(statement)
    return typeof result === 'string' ? result : ''
  }, [statement])

  const handleToggleSolution = () => {
    if (!showingSolution && onShowSolution) {
      onShowSolution()
    }
    setShowingSolution(!showingSolution)
  }

  return (
    <div className="statement-panel">
      <div className="statement-header">
        <div className="statement-title-row">
          <h2>{metadata.title}</h2>
          {solutionCode && (
            <button 
              className={`btn btn-solution ${showingSolution ? 'active' : ''}`}
              onClick={handleToggleSolution}
              title={showingSolution ? 'Hide solution' : 'Show solution'}
            >
              {showingSolution ? 'Hide Solution' : 'Show Solution'}
            </button>
          )}
        </div>
        <div className="statement-meta">
          <span className={`difficulty ${metadata.difficulty}`}>
            {metadata.difficulty}
          </span>
          <span className="language">{metadata.language}</span>
          <span className={`type ${metadata.type}`}>
            {metadata.type}
          </span>
        </div>
        {metadata.tags.length > 0 && (
          <div className="statement-tags">
            {metadata.tags.map((tag) => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
      
      <div className="statement-content">
        <div 
          className="statement-markdown"
          dangerouslySetInnerHTML={{ __html: parsedStatement }}
        />
        
        {showingSolution && solutionCode && (
          <div className="solution-section">
            <h3>Solution</h3>
            <pre className="solution-code">
              <code className={`hljs ${getHighlightLanguage(metadata.language, metadata.type)}`}>
                {solutionCode}
              </code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}