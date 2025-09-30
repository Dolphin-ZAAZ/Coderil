import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GenerationPreview } from '../GenerationPreview';
import { GeneratedKataContent } from '@/types/ai-authoring';

// Mock the Monaco Editor component
vi.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: vi.fn(({ value, onChange }) => (
    <textarea data-testid="mock-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  )),
}));

const mockContent: GeneratedKataContent = {
  metadata: { slug: 'test-preview', title: 'Test Preview', language: 'py', type: 'code', difficulty: 'easy' },
  statement: '# Test Preview',
  starterCode: 'def main(): pass',
};

describe('GenerationPreview', () => {
  it('should not render if generatedContent is null', () => {
    render(<GenerationPreview generatedContent={null} onApprove={() => {}} onRegenerate={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('should render the file list and editor when content is provided', () => {
    render(<GenerationPreview generatedContent={mockContent} onApprove={() => {}} onRegenerate={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('Preview Generated Kata')).toBeInTheDocument();
    expect(screen.getByText('metadata')).toBeInTheDocument();
    expect(screen.getByText('statement')).toBeInTheDocument();
    expect(screen.getByText('starterCode')).toBeInTheDocument();
  });

  it('should display the content of the selected file in the editor', () => {
    render(<GenerationPreview generatedContent={mockContent} onApprove={() => {}} onRegenerate={() => {}} onCancel={() => {}} />);
    const editor = screen.getByTestId('mock-editor') as HTMLTextAreaElement;

    // It should default to the first file (metadata)
    expect(editor.value).toContain('"slug": "test-preview"');

    // Click on another file
    fireEvent.click(screen.getByText('starterCode'));
    expect(editor.value).toBe('def main(): pass');
  });

  it('should call onApprove with the latest content when Approve is clicked', () => {
    const handleApprove = vi.fn();
    render(<GenerationPreview generatedContent={mockContent} onApprove={handleApprove} onRegenerate={() => {}} onCancel={() => {}} />);

    // Simulate editing
    fireEvent.click(screen.getByText('starterCode'));
    const editor = screen.getByTestId('mock-editor');
    fireEvent.change(editor, { target: { value: 'def run(): pass' } });

    fireEvent.click(screen.getByText('Approve & Save'));

    const expectedContent = {
      ...mockContent,
      starterCode: 'def run(): pass',
    };
    expect(handleApprove).toHaveBeenCalledWith(expectedContent);
  });

  it('should call onRegenerate when Regenerate is clicked', () => {
    const handleRegenerate = vi.fn();
    render(<GenerationPreview generatedContent={mockContent} onApprove={() => {}} onRegenerate={handleRegenerate} onCancel={() => {}} />);
    fireEvent.click(screen.getByText('Regenerate'));
    expect(handleRegenerate).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when Cancel is clicked', () => {
    const handleCancel = vi.fn();
    render(<GenerationPreview generatedContent={mockContent} onApprove={() => {}} onRegenerate={() => {}} onCancel={handleCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});