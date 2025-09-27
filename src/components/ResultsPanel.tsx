import { ResultsPanelProps, CombinedExecutionResult } from '@/types'
import { ScoringService } from '@/services/scoring'
import './ResultsPanel.css'

export function ResultsPanel({ results, aiJudgment, isLoading, onReset }: ResultsPanelProps) {
  const scoringService = ScoringService.getInstance()
  const isCombinedResult = results && 'finalScore' in results && 'passed' in results
  
  // Check if the kata was successfully completed
  const isSuccessfulSubmission = (
    (isCombinedResult && (results as CombinedExecutionResult).passed) ||
    (aiJudgment && aiJudgment.pass)
  )
  if (isLoading) {
    return (
      <div className="results-panel">
        <div className="results-header">
          <h3>Results</h3>
        </div>
        <div className="results-content">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Running tests...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!results && !aiJudgment) {
    return (
      <div className="results-panel">
        <div className="results-header">
          <h3>Results</h3>
        </div>
        <div className="results-content">
          <div className="empty-state">
            <p>Click "Run" to test your code or "Submit" for full evaluation.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="results-panel">
      <div className="results-header">
        <h3>Results</h3>
        {results && (
          <div className="results-summary">
            <span className={`status ${isCombinedResult ? (results as CombinedExecutionResult).passed : results.success ? 'success' : 'failure'}`}>
              {isCombinedResult ? ((results as CombinedExecutionResult).passed ? 'Passed' : 'Failed') : (results.success ? 'Passed' : 'Failed')}
            </span>
            {results.score !== undefined && (
              <span className="score">
                Score: {Math.round(isCombinedResult ? (results as CombinedExecutionResult).finalScore : results.score)}%
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="results-content">
        {results && (
          <div className="execution-results">
            {isCombinedResult && (
              <div className="scoring-breakdown">
                <h4>Scoring Breakdown</h4>
                {(() => {
                  const combinedResult = results as CombinedExecutionResult
                  const summary = scoringService.getScoringSummary(combinedResult)
                  return (
                    <div className="scoring-details">
                      <div className="score-item">
                        <span className="score-label">Public Tests (30%)</span>
                        <span className="score-value">{Math.round(summary.publicScore)}%</span>
                      </div>
                      <div className="score-item">
                        <span className="score-label">Hidden Tests (70%)</span>
                        <span className="score-value">{Math.round(summary.hiddenScore)}%</span>
                      </div>
                      <div className="score-item final-score">
                        <span className="score-label">Final Score</span>
                        <span className="score-value">{Math.round(summary.finalScore)}%</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
            
            <div className="test-results">
              <h4>Test Results</h4>
              {results.testResults.length > 0 ? (
                <div className="test-list">
                  {results.testResults.map((test, index) => (
                    <div key={index} className={`test-item ${test.passed ? 'passed' : 'failed'}`}>
                      <div className="test-name">
                        <span className={`test-icon ${test.passed ? 'pass' : 'fail'}`}>
                          {test.passed ? '✓' : '✗'}
                        </span>
                        {test.name}
                      </div>
                      {test.message && (
                        <div className="test-message">{test.message}</div>
                      )}
                      {!test.passed && test.expected !== undefined && test.actual !== undefined && (
                        <div className="test-details">
                          <div className="expected">Expected: {JSON.stringify(test.expected)}</div>
                          <div className="actual">Actual: {JSON.stringify(test.actual)}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-tests">No test results available</p>
              )}
            </div>

            {results.output && (
              <div className="output-section">
                <h4>Output</h4>
                <pre className="output-content">{results.output}</pre>
              </div>
            )}

            {results.errors && (
              <div className="error-section">
                <h4>Errors</h4>
                <pre className="error-content">{results.errors}</pre>
              </div>
            )}

            <div className="execution-info">
              <span>Duration: {results.duration}ms</span>
            </div>
          </div>
        )}

        {isSuccessfulSubmission && onReset && (
          <div className="success-actions">
            <div className="success-message">
              <span className="success-icon">🎉</span>
              <span>Congratulations! You've completed this kata successfully!</span>
            </div>
            <button 
              onClick={onReset}
              className="reset-button"
              title="Reset and try again"
            >
              Reset & Try Again
            </button>
          </div>
        )}

        {aiJudgment && (
          <div className="ai-judgment">
            <h4>AI Feedback</h4>
            <div className="judgment-summary">
              <span className={`judgment-status ${aiJudgment.pass ? 'pass' : 'fail'}`}>
                {aiJudgment.pass ? 'Passed' : 'Failed'}
              </span>
              <span className="judgment-score">
                Total Score: {Math.round(aiJudgment.totalScore)}%
              </span>
            </div>
            
            {Object.keys(aiJudgment.scores).length > 0 && (
              <div className="score-breakdown">
                <h5>Score Breakdown</h5>
                {Object.entries(aiJudgment.scores).map(([key, score]) => (
                  <div key={key} className="score-item">
                    <span className="score-key">{key}</span>
                    <span className="score-value">{Math.round(score)}%</span>
                  </div>
                ))}
              </div>
            )}

            <div className="feedback-content">
              <h5>Feedback</h5>
              <p>{aiJudgment.feedback}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}