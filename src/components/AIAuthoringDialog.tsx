import React, { useState } from 'react';
import { Language, Difficulty, KataType } from '@/types';
import { KataGenerationRequest } from '@/types/ai-authoring';
import './AIAuthoringDialog.css';

interface AIAuthoringDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (request: KataGenerationRequest) => void;
}

export function AIAuthoringDialog({ isOpen, onClose, onGenerate }: AIAuthoringDialogProps) {
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<Language>('py');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [type, setType] = useState<KataType>('code');
  const [generateHiddenTests, setGenerateHiddenTests] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      description,
      language,
      difficulty,
      type,
      generateHiddenTests,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="ai-authoring-dialog-overlay">
      <div className="ai-authoring-dialog">
        <h2>Generate Kata with AI</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="description">Kata Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 'A medium difficulty python kata to find the longest palindrome in a string'"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="language">Language</label>
              <select id="language" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                <option value="py">Python</option>
                <option value="js">JavaScript</option>
                <option value="ts">TypeScript</option>
                <option value="cpp">C++</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="difficulty">Difficulty</label>
              <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="type">Kata Type</label>
              <select id="type" value={type} onChange={(e) => setType(e.target.value as KataType)}>
                <option value="code">Code</option>
                <option value="explain">Explanation</option>
                <option value="template">Template</option>
                <option value="codebase">Codebase</option>
                <option value="multi-question">Multi-Question</option>
              </select>
            </div>
          </div>
          <div className="form-group-checkbox">
            <input
              type="checkbox"
              id="hidden-tests"
              checked={generateHiddenTests}
              onChange={(e) => setGenerateHiddenTests(e.target.checked)}
            />
            <label htmlFor="hidden-tests">Generate Hidden Tests</label>
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Generate</button>
          </div>
        </form>
      </div>
    </div>
  );
}