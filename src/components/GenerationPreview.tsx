import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { GeneratedKataContent } from '@/types/ai-authoring';
import './GenerationPreview.css';

interface GenerationPreviewProps {
  generatedContent: GeneratedKataContent | null;
  onApprove: (content: GeneratedKataContent) => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

type FileType = keyof GeneratedKataContent;

export function GenerationPreview({ generatedContent, onApprove, onRegenerate, onCancel }: GenerationPreviewProps) {
  const [editableContent, setEditableContent] = useState<GeneratedKataContent | null>(generatedContent);
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);

  useEffect(() => {
    setEditableContent(generatedContent);
    if (generatedContent) {
      // Select the first available file to display
      const firstFile = Object.keys(generatedContent).find(key => typeof (generatedContent as any)[key] === 'string');
      setSelectedFile(firstFile as FileType);
    }
  }, [generatedContent]);

  const handleContentChange = (value: string | undefined) => {
    if (editableContent && selectedFile) {
      const newContent = { ...editableContent, [selectedFile]: value || '' };
      setEditableContent(newContent);
    }
  };

  const handleApprove = () => {
    if (editableContent) {
      onApprove(editableContent);
    }
  };

  const getMonacoLanguage = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (filename.includes('meta') && extension === 'yaml') return 'yaml';
    if (filename.includes('rubric') && extension === 'yaml') return 'yaml';
    if (extension === 'md') return 'markdown';

    const lang = editableContent?.metadata?.language;
    if (lang) {
        switch(lang) {
            case 'py': return 'python';
            case 'js': return 'javascript';
            case 'ts': return 'typescript';
            case 'cpp': return 'cpp';
        }
    }

    return 'plaintext';
  };

  const renderFileContent = () => {
    if (!editableContent || !selectedFile) {
      return <div className="no-file-selected">Select a file to view</div>;
    }

    const content = (editableContent as any)[selectedFile];
    const value = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
    const language = typeof content === 'object' ? 'json' : getMonacoLanguage(selectedFile.toString());

    return (
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleContentChange}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          automaticLayout: true,
          wordWrap: 'on',
        }}
      />
    );
  };

  if (!generatedContent) {
    return null; // Or a loading spinner
  }

  return (
    <div className="generation-preview-overlay">
      <div className="generation-preview">
        <h2>Preview Generated Kata</h2>
        <div className="preview-layout">
          <div className="file-list">
            <h3>Files</h3>
            <ul>
              {Object.keys(generatedContent).map((key) => (
                <li
                  key={key}
                  className={selectedFile === key ? 'selected' : ''}
                  onClick={() => setSelectedFile(key as FileType)}
                >
                  {key}
                </li>
              ))}
            </ul>
          </div>
          <div className="editor-container">
            {renderFileContent()}
          </div>
        </div>
        <div className="preview-actions">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onRegenerate} className="btn-secondary">Regenerate</button>
          <button onClick={handleApprove} className="btn-primary">Approve & Save</button>
        </div>
      </div>
    </div>
  );
}