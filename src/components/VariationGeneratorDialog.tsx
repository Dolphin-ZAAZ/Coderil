import React, { useState } from 'react';
import { Kata } from '@/types';
import './VariationGeneratorDialog.css';

export interface VariationOptions {
  difficultyAdjustment: 'easier' | 'harder' | 'same';
  parameterChanges?: string;
  seriesName?: string;
}

interface VariationGeneratorDialogProps {
  isOpen: boolean;
  sourceKata: Kata | null;
  onClose: () => void;
  onGenerate: (sourceKata: Kata, options: VariationOptions) => void;
}

export function VariationGeneratorDialog({ isOpen, sourceKata, onClose, onGenerate }: VariationGeneratorDialogProps) {
  const [difficultyAdjustment, setDifficultyAdjustment] = useState<VariationOptions['difficultyAdjustment']>('same');
  const [parameterChanges, setParameterChanges] = useState('');

  if (!isOpen || !sourceKata) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(sourceKata, {
      difficultyAdjustment,
      parameterChanges,
    });
  };

  return (
    <div className="variation-generator-dialog-overlay">
      <div className="variation-generator-dialog">
        <h2>Generate Variation of "{sourceKata.title}"</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="difficulty-adjustment">Difficulty Adjustment</label>
            <select
              id="difficulty-adjustment"
              value={difficultyAdjustment}
              onChange={(e) => setDifficultyAdjustment(e.target.value as VariationOptions['difficultyAdjustment'])}
            >
              <option value="same">Same Difficulty</option>
              <option value="harder">Make Harder</option>
              <option value="easier">Make Easier</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="parameter-changes">Specific Changes (Optional)</label>
            <textarea
              id="parameter-changes"
              value={parameterChanges}
              onChange={(e) => setParameterChanges(e.target.value)}
              placeholder="e.g., 'Use larger numbers in the test cases', 'Change the data structure from an array to a linked list'"
            />
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Generate Variation</button>
          </div>
        </form>
      </div>
    </div>
  );
}