import { useState } from 'react'
import { AIAuthoringDialog } from './AIAuthoringDialog'
import { GeneratedKata } from '@/types'

/**
 * Demo component showing how to integrate the AI Authoring Dialog
 * This would typically be integrated into the main App component
 */
export function AIAuthoringDialogDemo() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [generatedKata, setGeneratedKata] = useState<GeneratedKata | null>(null)

  const handleKataGenerated = (kata: GeneratedKata) => {
    setGeneratedKata(kata)
    console.log('Generated kata:', kata)
    // In the real app, this would:
    // 1. Save the kata to the file system
    // 2. Refresh the kata list
    // 3. Navigate to the new kata
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>AI Kata Authoring Demo</h2>
      
      <button 
        onClick={() => setIsDialogOpen(true)}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Generate Kata with AI
      </button>

      {generatedKata && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <h3>Generated Kata: {generatedKata.content.metadata.title}</h3>
          <p><strong>Type:</strong> {generatedKata.content.metadata.type}</p>
          <p><strong>Language:</strong> {generatedKata.content.metadata.language}</p>
          <p><strong>Difficulty:</strong> {generatedKata.content.metadata.difficulty}</p>
          <p><strong>Tags:</strong> {generatedKata.content.metadata.tags.join(', ')}</p>
          <p><strong>Tokens Used:</strong> {generatedKata.generationMetadata.tokensUsed}</p>
          <p><strong>Generation Time:</strong> {generatedKata.generationMetadata.generationTime}ms</p>
        </div>
      )}

      <AIAuthoringDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onKataGenerated={handleKataGenerated}
      />
    </div>
  )
}