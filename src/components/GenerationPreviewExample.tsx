import { useState } from 'react'
import { GenerationPreview } from './GenerationPreview'
import { GeneratedKataContent, KataMetadata } from '@/types'

// Example usage of GenerationPreview component
export function GenerationPreviewExample() {
  const [showPreview, setShowPreview] = useState(false)

  // Example generated content
  const exampleContent: GeneratedKataContent = {
    metadata: {
      slug: 'fibonacci-sequence',
      title: 'Fibonacci Sequence Generator',
      language: 'py',
      type: 'code',
      difficulty: 'medium',
      tags: ['algorithms', 'recursion', 'math'],
      entry: 'entry.py',
      test: {
        kind: 'programmatic',
        file: 'tests.py'
      },
      timeout_ms: 5000
    },
    statement: `# Fibonacci Sequence Generator

Write a function that generates the nth number in the Fibonacci sequence.

The Fibonacci sequence is a series of numbers where each number is the sum of the two preceding ones:
0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...

## Requirements

- Implement the function \`fibonacci(n)\`
- Return the nth Fibonacci number (0-indexed)
- Handle edge cases for n = 0 and n = 1
- Use an efficient algorithm (avoid naive recursion for large n)

## Examples

\`\`\`python
fibonacci(0)  # Returns 0
fibonacci(1)  # Returns 1
fibonacci(5)  # Returns 5
fibonacci(10) # Returns 55
\`\`\``,
    starterCode: `def fibonacci(n):
    """
    Generate the nth Fibonacci number.
    
    Args:
        n (int): The position in the Fibonacci sequence (0-indexed)
        
    Returns:
        int: The nth Fibonacci number
    """
    # TODO: Implement the fibonacci function
    pass`,
    testCode: `import pytest
from entry import fibonacci

def test_fibonacci_base_cases():
    """Test base cases for Fibonacci sequence."""
    assert fibonacci(0) == 0
    assert fibonacci(1) == 1

def test_fibonacci_small_numbers():
    """Test Fibonacci for small numbers."""
    assert fibonacci(2) == 1
    assert fibonacci(3) == 2
    assert fibonacci(4) == 3
    assert fibonacci(5) == 5

def test_fibonacci_larger_numbers():
    """Test Fibonacci for larger numbers."""
    assert fibonacci(10) == 55
    assert fibonacci(15) == 610`,
    hiddenTestCode: `import pytest
from entry import fibonacci

def test_fibonacci_edge_cases():
    """Hidden test for edge cases."""
    # Test negative input handling
    try:
        fibonacci(-1)
        assert False, "Should raise exception for negative input"
    except ValueError:
        pass

def test_fibonacci_performance():
    """Hidden test for performance with larger numbers."""
    # Should complete quickly even for larger numbers
    result = fibonacci(30)
    assert result == 832040
    
def test_fibonacci_very_large():
    """Hidden test for very large Fibonacci numbers."""
    result = fibonacci(50)
    assert result == 12586269025`,
    solutionCode: `def fibonacci(n):
    """
    Generate the nth Fibonacci number using iterative approach.
    
    Args:
        n (int): The position in the Fibonacci sequence (0-indexed)
        
    Returns:
        int: The nth Fibonacci number
        
    Raises:
        ValueError: If n is negative
    """
    if n < 0:
        raise ValueError("n must be non-negative")
    
    if n <= 1:
        return n
    
    # Use iterative approach for efficiency
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    
    return b`
  }

  const handleEdit = (fileType: string, content: string) => {
    console.log(`Edited ${fileType}:`, content)
    // In a real implementation, this would update the generated content
  }

  const handleApprove = () => {
    console.log('Kata approved and saved!')
    setShowPreview(false)
    // In a real implementation, this would save the kata to the file system
  }

  const handleRegenerate = () => {
    console.log('Regenerating kata...')
    // In a real implementation, this would call the AI service again
  }

  const handleCancel = () => {
    console.log('Generation cancelled')
    setShowPreview(false)
  }

  if (showPreview) {
    return (
      <GenerationPreview
        generatedContent={exampleContent}
        onEdit={handleEdit}
        onApprove={handleApprove}
        onRegenerate={handleRegenerate}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Generation Preview Example</h2>
      <p>Click the button below to see the GenerationPreview component in action.</p>
      <button
        onClick={() => setShowPreview(true)}
        style={{
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          backgroundColor: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer'
        }}
      >
        Show Generation Preview
      </button>
    </div>
  )
}