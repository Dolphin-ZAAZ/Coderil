import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AIAuthoringDialog } from '../AIAuthoringDialog';

describe('AIAuthoringDialog', () => {
  it('should not render when isOpen is false', () => {
    render(<AIAuthoringDialog isOpen={false} onClose={() => {}} onGenerate={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(<AIAuthoringDialog isOpen={true} onClose={() => {}} onGenerate={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Generate Kata with AI')).toBeInTheDocument();
  });

  it('should call onClose when the cancel button is clicked', () => {
    const handleClose = vi.fn();
    render(<AIAuthoringDialog isOpen={true} onClose={handleClose} onGenerate={() => {}} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onGenerate with the form data when submitted', () => {
    const handleGenerate = vi.fn();
    render(<AIAuthoringDialog isOpen={true} onClose={() => {}} onGenerate={handleGenerate} />);

    const descriptionInput = screen.getByLabelText('Kata Description');
    const languageSelect = screen.getByLabelText('Language');
    const difficultySelect = screen.getByLabelText('Difficulty');

    fireEvent.change(descriptionInput, { target: { value: 'A new test kata' } });
    fireEvent.change(languageSelect, { target: { value: 'ts' } });
    fireEvent.change(difficultySelect, { target: { value: 'medium' } });

    fireEvent.click(screen.getByText('Generate'));

    expect(handleGenerate).toHaveBeenCalledWith({
      description: 'A new test kata',
      language: 'ts',
      difficulty: 'medium',
      type: 'code', // default
      generateHiddenTests: true, // default
    });
  });
});