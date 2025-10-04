import { useState, useCallback, useMemo } from 'react'
import Editor from '@monaco-editor/react'
import { GeneratedKataContent, Language } from '@/types'
import './GenerationPreview.css'

interface GenerationPreviewProps {
  generatedContent: GeneratedKataContent
  onEdit: (fileType: string, content: string) => void
  onApprove: () => void
  onRegenerate: () => void
  onCancel: () => void
}

interface FileContent {
  name: string
  content: string
  language: string
  editable: boolean
  description: string
}

// Monaco language mappings
const getMonacoLanguage = (language: Language | string): string => {
  switch (language) {
    case 'py': return 'python'
    case 'js': return 'javascript'
    case 'ts': return 'typescript'
    case 'cpp': return 'cpp'
    case 'yaml': return 'yaml'
    case 'md': return 'markdown'
    case 'json': return 'json'
    default: return 'plaintext'
  }
}

// Get file extension for language
const getFileExtension = (language: Language): string => {
  switch (language) {
    case 'py': return 'py'
    case 'js': return 'js'
    case 'ts': return 'ts'
    case 'cpp': return 'cpp'
    default: return 'txt'
  }
}

export function GenerationPreview({
  generatedContent,
  onEdit,
  onApprove,
  onRegenerate,
  onCancel
}: GenerationPreviewProps) {
  const [selectedFile, setSelectedFile] = useState<string>('statement')
  const [editedContent, setEditedContent] = useState<Record<string, string>>({})
  const [showChanges, setShowChanges] = useState(false)

  // Build file list from generated content
  const files = useMemo((): FileContent[] => {
    const fileList: FileContent[] = []
    const { metadata, statement, starterCode, testCode, hiddenTestCode, solutionCode, rubric, solutionFiles, multiQuestionConfig, shortformConfig, oneLinerConfig, multipleChoiceConfig } = generatedContent

    // Always include statement and metadata
    fileList.push({
      name: 'statement',
      content: statement,
      language: 'markdown',
      editable: true,
      description: 'Problem statement and instructions'
    })

    fileList.push({
      name: 'metadata',
      content: formatMetadata(metadata),
      language: 'yaml',
      editable: true,
      description: 'Kata metadata and configuration'
    })

    // Add code files for code katas
    if (starterCode && metadata.language !== 'none') {
      const ext = getFileExtension(metadata.language)
      fileList.push({
        name: `entry.${ext}`,
        content: starterCode,
        language: getMonacoLanguage(metadata.language),
        editable: true,
        description: 'Starter code for participants'
      })
    }

    if (testCode && metadata.language !== 'none') {
      const ext = getFileExtension(metadata.language)
      fileList.push({
        name: `tests.${ext}`,
        content: testCode,
        language: getMonacoLanguage(metadata.language),
        editable: true,
        description: 'Public test cases'
      })
    }

    if (hiddenTestCode && metadata.language !== 'none') {
      const ext = getFileExtension(metadata.language)
      fileList.push({
        name: `hidden_tests.${ext}`,
        content: hiddenTestCode,
        language: getMonacoLanguage(metadata.language),
        editable: true,
        description: 'Hidden test cases for validation'
      })
    }

    if (solutionCode && metadata.language !== 'none') {
      const ext = getFileExtension(metadata.language)
      fileList.push({
        name: `solution.${ext}`,
        content: solutionCode,
        language: getMonacoLanguage(metadata.language),
        editable: true,
        description: 'Reference solution'
      })
    }

    // Add rubric for explanation and template katas
    if (rubric) {
      fileList.push({
        name: 'rubric.yaml',
        content: formatRubric(rubric),
        language: 'yaml',
        editable: true,
        description: 'AI judging criteria and thresholds'
      })
    }

    // Add solution files for template katas
    if (solutionFiles) {
      Object.entries(solutionFiles).forEach(([filename, content]) => {
        const ext = filename.split('.').pop() || 'txt'
        fileList.push({
          name: filename,
          content,
          language: getLanguageFromExtension(ext),
          editable: true,
          description: `Template solution file`
        })
      })
    }

    // Add configuration files for different kata types
    if (multiQuestionConfig) {
      fileList.push({
        name: 'multiQuestion.json',
        content: JSON.stringify(multiQuestionConfig, null, 2),
        language: 'json',
        editable: true,
        description: 'Multi-question assessment configuration'
      })
    }

    if (shortformConfig) {
      fileList.push({
        name: 'shortform.json',
        content: JSON.stringify(shortformConfig, null, 2),
        language: 'json',
        editable: true,
        description: 'Shortform question configuration'
      })
    }

    if (oneLinerConfig) {
      fileList.push({
        name: 'oneLiner.json',
        content: JSON.stringify(oneLinerConfig, null, 2),
        language: 'json',
        editable: true,
        description: 'One-liner question configuration'
      })
    }

    if (multipleChoiceConfig) {
      fileList.push({
        name: 'multipleChoice.json',
        content: JSON.stringify(multipleChoiceConfig, null, 2),
        language: 'json',
        editable: true,
        description: 'Multiple choice question configuration'
      })
    }

    return fileList
  }, [generatedContent])

  // Get current file content (edited or original)
  const getCurrentContent = useCallback((fileName: string): string => {
    if (editedContent[fileName] !== undefined) {
      return editedContent[fileName]
    }
    const file = files.find(f => f.name === fileName)
    return file?.content || ''
  }, [editedContent, files])

  // Handle content changes
  const handleContentChange = useCallback((fileName: string, newContent: string) => {
    setEditedContent(prev => ({
      ...prev,
      [fileName]: newContent
    }))
    onEdit(fileName, newContent)
  }, [onEdit])

  // Revert changes for a specific file
  const handleRevertFile = useCallback((fileName: string) => {
    setEditedContent(prev => {
      const newEdited = { ...prev }
      delete newEdited[fileName]
      return newEdited
    })
    
    const originalFile = files.find(f => f.name === fileName)
    if (originalFile) {
      onEdit(fileName, originalFile.content)
    }
  }, [files, onEdit])

  // Revert all changes
  const handleRevertAll = useCallback(() => {
    setEditedContent({})
    // Notify parent of all reverts
    files.forEach(file => {
      onEdit(file.name, file.content)
    })
  }, [files, onEdit])

  // Check if file has changes
  const hasChanges = useCallback((fileName: string): boolean => {
    return editedContent[fileName] !== undefined
  }, [editedContent])

  // Get total number of changed files
  const totalChanges = Object.keys(editedContent).length

  const selectedFileData = files.find(f => f.name === selectedFile)
  const currentContent = getCurrentContent(selectedFile)

  return (
    <div className="generation-preview">
      <div className="preview-header">
        <div className="preview-title">
          <h2>Generated Kata Preview</h2>
          <div className="kata-info">
            <span className="kata-type">{generatedContent.metadata.type}</span>
            <span className="kata-language">{generatedContent.metadata.language}</span>
            <span className="kata-difficulty">{generatedContent.metadata.difficulty}</span>
          </div>
        </div>
        
        <div className="preview-actions">
          {totalChanges > 0 && (
            <div className="changes-info">
              <span className="changes-count">{totalChanges} file{totalChanges !== 1 ? 's' : ''} modified</span>
              <button
                className="btn btn-link"
                onClick={() => setShowChanges(!showChanges)}
                title="Toggle change indicators"
              >
                {showChanges ? 'Hide' : 'Show'} Changes
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleRevertAll}
                title="Revert all changes"
              >
                Revert All
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="preview-content">
        <div className="file-list">
          <div className="file-list-header">
            <h3>Generated Files</h3>
            <span className="file-count">{files.length} files</span>
          </div>
          
          <div className="file-items">
            {files.map(file => (
              <button
                key={file.name}
                className={`file-item ${selectedFile === file.name ? 'active' : ''} ${hasChanges(file.name) ? 'modified' : ''}`}
                onClick={() => setSelectedFile(file.name)}
                title={file.description}
              >
                <div className="file-name">
                  {file.name}
                  {hasChanges(file.name) && showChanges && (
                    <span className="change-indicator" title="Modified">●</span>
                  )}
                </div>
                <div className="file-description">{file.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="file-editor">
          {selectedFileData && (
            <>
              <div className="editor-header">
                <div className="editor-info">
                  <h4>{selectedFileData.name}</h4>
                  <span className="editor-language">{selectedFileData.language}</span>
                  {hasChanges(selectedFile) && (
                    <span className="modified-indicator">Modified</span>
                  )}
                </div>
                
                <div className="editor-actions">
                  {hasChanges(selectedFile) && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleRevertFile(selectedFile)}
                      title="Revert changes to this file"
                    >
                      Revert
                    </button>
                  )}
                </div>
              </div>

              <div className="editor-container">
                {selectedFileData.editable ? (
                  <Editor
                    height="100%"
                    language={selectedFileData.language}
                    value={currentContent}
                    onChange={(value) => handleContentChange(selectedFile, value || '')}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                      },
                      automaticLayout: true,
                      tabSize: selectedFileData.language === 'python' ? 4 : 2,
                      insertSpaces: true,
                      wordWrap: 'on',
                    }}
                    theme="vs-dark"
                    loading={<div className="editor-loading">Loading editor...</div>}
                  />
                ) : (
                  <div className="readonly-content">
                    <pre>{currentContent}</pre>
                  </div>
                )}
              </div>

              <div className="editor-footer">
                <span className="editor-hint">
                  {selectedFileData.editable ? 'Editable' : 'Read-only'} • 
                  {selectedFileData.language} syntax highlighting
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="preview-footer">
        <div className="footer-info">
          <span className="generation-info">
            Generated: {generatedContent.metadata.title}
          </span>
          {totalChanges > 0 && (
            <span className="changes-summary">
              {totalChanges} modification{totalChanges !== 1 ? 's' : ''} pending
            </span>
          )}
        </div>
        
        <div className="footer-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            title="Discard generated content"
          >
            Cancel
          </button>
          <button
            className="btn btn-secondary"
            onClick={onRegenerate}
            title="Generate new content with same parameters"
          >
            Regenerate
          </button>
          <button
            className="btn btn-primary"
            onClick={onApprove}
            title="Save kata with current content"
          >
            Approve & Save
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper functions

function formatMetadata(metadata: any): string {
  // Convert metadata object to YAML format
  const yamlLines: string[] = []
  
  yamlLines.push(`slug: ${metadata.slug}`)
  yamlLines.push(`title: ${metadata.title}`)
  yamlLines.push(`language: ${metadata.language}`)
  yamlLines.push(`type: ${metadata.type}`)
  yamlLines.push(`difficulty: ${metadata.difficulty}`)
  
  if (metadata.tags && metadata.tags.length > 0) {
    yamlLines.push('tags:')
    metadata.tags.forEach((tag: string) => {
      yamlLines.push(`  - ${tag}`)
    })
  }
  
  yamlLines.push(`entry: ${metadata.entry}`)
  
  if (metadata.test) {
    yamlLines.push('test:')
    yamlLines.push(`  kind: ${metadata.test.kind}`)
    yamlLines.push(`  file: ${metadata.test.file}`)
  }
  
  yamlLines.push(`timeout_ms: ${metadata.timeout_ms}`)
  
  if (metadata.solution) {
    yamlLines.push(`solution: ${metadata.solution}`)
  }
  
  return yamlLines.join('\n')
}

function formatRubric(rubric: any): string {
  const yamlLines: string[] = []
  
  if (rubric.keys && rubric.keys.length > 0) {
    yamlLines.push('keys:')
    rubric.keys.forEach((key: string) => {
      yamlLines.push(`  - ${key}`)
    })
  }
  
  if (rubric.threshold) {
    yamlLines.push('threshold:')
    yamlLines.push(`  min_total: ${rubric.threshold.min_total}`)
    yamlLines.push(`  min_correctness: ${rubric.threshold.min_correctness}`)
    if (rubric.threshold.min_comprehension !== undefined) {
      yamlLines.push(`  min_comprehension: ${rubric.threshold.min_comprehension}`)
    }
  }
  
  return yamlLines.join('\n')
}

function getLanguageFromExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'py': return 'python'
    case 'js': return 'javascript'
    case 'ts': return 'typescript'
    case 'cpp':
    case 'cc':
    case 'cxx': return 'cpp'
    case 'yaml':
    case 'yml': return 'yaml'
    case 'md': return 'markdown'
    case 'json': return 'json'
    case 'html': return 'html'
    case 'css': return 'css'
    case 'xml': return 'xml'
    case 'sql': return 'sql'
    default: return 'plaintext'
  }
}