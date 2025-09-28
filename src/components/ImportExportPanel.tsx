import React, { useState } from 'react';
import { Kata } from '@/types';
import './ImportExportPanel.css';

interface ImportExportPanelProps {
  katas: Kata[];
  onImportComplete: () => void;
  onExportComplete: () => void;
}

interface ImportResult {
  success: string[];
  failed: { path: string; error: string }[];
}

interface ExportResult {
  success: string[];
  failed: { slug: string; error: string }[];
}

export const ImportExportPanel: React.FC<ImportExportPanelProps> = ({
  katas,
  onImportComplete,
  onExportComplete
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedKatas, setSelectedKatas] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<ImportResult | null>(null);
  const [exportResults, setExportResults] = useState<ExportResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleImportKatas = async () => {
    try {
      setIsImporting(true);
      setImportResults(null);
      setShowResults(false);

      // Open file dialog to select zip files
      const filePaths = await window.electronAPI.openFileDialog();
      
      if (filePaths.length === 0) {
        return; // User cancelled
      }

      // Import the selected files
      const results = await window.electronAPI.importMultipleKatas(filePaths);
      
      setImportResults(results);
      setShowResults(true);
      
      if (results.success.length > 0) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportResults({
        success: [],
        failed: [{ path: 'unknown', error: error instanceof Error ? error.message : String(error) }]
      });
      setShowResults(true);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportKatas = async () => {
    if (selectedKatas.length === 0) {
      alert('Please select at least one kata to export');
      return;
    }

    try {
      setIsExporting(true);
      setExportResults(null);
      setShowResults(false);

      // Export the selected katas
      const results = await window.electronAPI.exportMultipleKatas(selectedKatas);
      
      setExportResults(results);
      setShowResults(true);
      
      if (results.success.length > 0) {
        onExportComplete();
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportResults({
        success: [],
        failed: selectedKatas.map(slug => ({ 
          slug, 
          error: error instanceof Error ? error.message : String(error) 
        }))
      });
      setShowResults(true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSingleKata = async (slug: string) => {
    try {
      const result = await window.electronAPI.exportKata(slug);
      
      if (result.success) {
        alert(`Kata exported successfully to: ${result.outputPath}`);
        onExportComplete();
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Single export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleKataSelection = (slug: string, selected: boolean) => {
    if (selected) {
      setSelectedKatas(prev => [...prev, slug]);
    } else {
      setSelectedKatas(prev => prev.filter(s => s !== slug));
    }
  };

  const handleSelectAll = () => {
    if (selectedKatas.length === katas.length) {
      setSelectedKatas([]);
    } else {
      setSelectedKatas(katas.map(k => k.slug));
    }
  };

  const closeResults = () => {
    setShowResults(false);
    setImportResults(null);
    setExportResults(null);
  };

  return (
    <div className="import-export-panel">
      <div className="panel-header">
        <h3>Import/Export Katas</h3>
      </div>

      <div className="import-section">
        <h4>Import Katas</h4>
        <p>Import kata zip files to add new challenges to your collection.</p>
        <button 
          onClick={handleImportKatas}
          disabled={isImporting}
          className="import-button"
        >
          {isImporting ? 'Importing...' : 'Import Katas from Zip Files'}
        </button>
      </div>

      <div className="export-section">
        <h4>Export Katas</h4>
        <p>Export katas as zip files to share or backup your challenges.</p>
        
        <div className="kata-selection">
          <div className="selection-controls">
            <button 
              onClick={handleSelectAll}
              className="select-all-button"
            >
              {selectedKatas.length === katas.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="selection-count">
              {selectedKatas.length} of {katas.length} selected
            </span>
          </div>

          <div className="kata-list">
            {katas.map(kata => (
              <div key={kata.slug} className="kata-item">
                <label className="kata-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedKatas.includes(kata.slug)}
                    onChange={(e) => handleKataSelection(kata.slug, e.target.checked)}
                  />
                  <span className="kata-info">
                    <span className="kata-title">{kata.title}</span>
                    <span className="kata-meta">
                      {kata.language} • {kata.difficulty} • {kata.type}
                    </span>
                  </span>
                </label>
                <button
                  onClick={() => handleExportSingleKata(kata.slug)}
                  className="export-single-button"
                  title="Export this kata only"
                >
                  Export
                </button>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={handleExportKatas}
          disabled={isExporting || selectedKatas.length === 0}
          className="export-button"
        >
          {isExporting ? 'Exporting...' : `Export Selected Katas (${selectedKatas.length})`}
        </button>
      </div>

      {showResults && (importResults || exportResults) && (
        <div className="results-modal">
          <div className="results-content">
            <div className="results-header">
              <h4>
                {importResults ? 'Import Results' : 'Export Results'}
              </h4>
              <button onClick={closeResults} className="close-button">×</button>
            </div>

            <div className="results-body">
              {importResults && (
                <>
                  {importResults.success.length > 0 && (
                    <div className="success-section">
                      <h5>Successfully Imported ({importResults.success.length})</h5>
                      <ul>
                        {importResults.success.map((path, index) => (
                          <li key={index} className="success-item">{path}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importResults.failed.length > 0 && (
                    <div className="error-section">
                      <h5>Failed to Import ({importResults.failed.length})</h5>
                      <ul>
                        {importResults.failed.map((failure, index) => (
                          <li key={index} className="error-item">
                            <strong>{failure.path}</strong>: {failure.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {exportResults && (
                <>
                  {exportResults.success.length > 0 && (
                    <div className="success-section">
                      <h5>Successfully Exported ({exportResults.success.length})</h5>
                      <ul>
                        {exportResults.success.map((path, index) => (
                          <li key={index} className="success-item">{path}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {exportResults.failed.length > 0 && (
                    <div className="error-section">
                      <h5>Failed to Export ({exportResults.failed.length})</h5>
                      <ul>
                        {exportResults.failed.map((failure, index) => (
                          <li key={index} className="error-item">
                            <strong>{failure.slug}</strong>: {failure.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};