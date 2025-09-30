import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VariationGeneratorDialog } from '../VariationGeneratorDialog';
import { Kata } from '@/types';

const mockSourceKata: Kata = {
  slug: 'source-kata',
  title: 'Source Kata Title',
  language: 'py',
  type: 'code',
  difficulty: 'medium',
  tags: [],
  path: '/katas/source-kata',
};

describe('VariationGeneratorDialog', () => {
  it('should not render when isOpen is false', () => {
    render(<VariationGeneratorDialog isOpen={false} sourceKata={null} onClose={() => {}} onGenerate={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should render when isOpen is true and a sourceKata is provided', () => {
    render(<VariationGeneratorDialog isOpen={true} sourceKata={mockSourceKata} onClose={() => {}} onGenerate={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Generate Variation of "Source Kata Title"')).toBeInTheDocument();
  });

  it('should call onClose when the cancel button is clicked', () => {
    const handleClose = vi.fn();
    render(<VariationGeneratorDialog isOpen={true} sourceKata={mockSourceKata} onClose={handleClose} onGenerate={() => {}} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onGenerate with the selected options upon submission', () => {
    const handleGenerate = vi.fn();
    render(<VariationGeneratorDialog isOpen={true} sourceKata={mockSourceKata} onGenerate={handleGenerate} onClose={() => {}} />);

    const difficultySelect = screen.getByLabelText('Difficulty Adjustment');
    const changesInput = screen.getByLabelText('Specific Changes (Optional)');

    fireEvent.change(difficultySelect, { target: { value: 'harder' } });
    fireEvent.change(changesInput, { target: { value: 'Add more edge cases' } });

    fireEvent.click(screen.getByText('Generate Variation'));

    expect(handleGenerate).toHaveBeenCalledWith(mockSourceKata, {
      difficultyAdjustment: 'harder',
      parameterChanges: 'Add more edge cases',
    });
  });
});