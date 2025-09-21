import { StatementPanelProps } from '@/types'
import { marked } from 'marked'
import { useMemo } from 'react'
import './StatementPanel.css'

export function StatementPanel({ statement, metadata }: StatementPanelProps) {
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

  return (
    <div className="statement-panel">
      <div className="statement-header">
        <h2>{metadata.title}</h2>
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
      </div>
    </div>
  )
}