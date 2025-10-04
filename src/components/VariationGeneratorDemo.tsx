import { useState } from 'react'
import { VariationGenerator } from './VariationGenerator'
import { Kata } from '@/types'

const sampleKata: Kata = {
  slug: 'fibonacci-sequence',
  title: 'Fibonacci Sequence',
  language: 'py',
  type: 'code',
  difficulty: 'medium',
  tags: ['algorithms', 'recursion', 'dynamic-programming'],
  path: '/katas/fibonacci-sequence'
}

export function VariationGeneratorDemo() {
  const [showGenerator, setShowGenerator] = useState(false)

  const handleVariationGenerated = () => {
    console.log('Variation generated successfully!')
    setShowGenerator(false)
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Variation Generator Demo</h1>
      <p>This demo shows the VariationGenerator component in action.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Sample Source Kata:</h3>
        <div style={{ 
          padding: '16px', 
          border: '1px solid #ccc', 
          borderRadius: '8px',
          backgroundColor: '#f8f9fa'
        }}>
          <div><strong>Title:</strong> {sampleKata.title}</div>
          <div><strong>Language:</strong> {sampleKata.language}</div>
          <div><strong>Difficulty:</strong> {sampleKata.difficulty}</div>
          <div><strong>Type:</strong> {sampleKata.type}</div>
          <div><strong>Tags:</strong> {sampleKata.tags.join(', ')}</div>
        </div>
      </div>

      <button 
        onClick={() => setShowGenerator(true)}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Generate Variation
      </button>

      {showGenerator && (
        <VariationGenerator
          sourceKata={sampleKata}
          isOpen={showGenerator}
          onClose={() => setShowGenerator(false)}
          onVariationGenerated={handleVariationGenerated}
        />
      )}
    </div>
  )
}