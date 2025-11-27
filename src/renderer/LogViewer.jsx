import React, { useState, useEffect, useRef } from 'react';
import './LogViewer.css';

/**
 * LogViewer - Real-time log viewer with filtering and export
 */
function LogViewer({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportCopied, setReportCopied] = useState(false);
  const logsEndRef = useRef(null);

  // Load initial logs
  useEffect(() => {
    loadLogs();

    // Subscribe to real-time updates
    window.pcHealthAPI.subscribeLogs();
    const removeListener = window.pcHealthAPI.onLogEntry((entry) => {
      setLogs(prev => [...prev.slice(-999), entry]); // Keep last 1000
    });

    return () => removeListener();
  }, []);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const result = await window.pcHealthAPI.getLogs({ count: 500 });
      setLogs(result || []);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
    setIsLoading(false);
  };

  const handleExport = async () => {
    try {
      const result = await window.pcHealthAPI.exportLogs();
      if (result.success) {
        alert(`Logs exported to: ${result.path}`);
      } else if (!result.canceled) {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      alert(`Export error: ${error.message}`);
    }
  };

  const handleOpenFolder = async () => {
    try {
      await window.pcHealthAPI.openLogFolder();
    } catch (error) {
      alert(`Could not open folder: ${error.message}`);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear all logs from memory?')) {
      await window.pcHealthAPI.clearLogs();
      setLogs([]);
    }
  };

  const handleSendReport = async () => {
    setShowReportModal(true);
    setReportCopied(false);
    try {
      const result = await window.pcHealthAPI.getReportText();
      if (result.success) {
        setReportText(result.text);
      } else {
        setReportText('Error generating report: ' + result.error);
      }
    } catch (error) {
      setReportText('Error: ' + error.message);
    }
  };

  const handleCopyReport = async () => {
    try {
      await window.pcHealthAPI.copyReportToClipboard();
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 3000);
    } catch (error) {
      alert('Failed to copy: ' + error.message);
    }
  };

  const handleSaveReport = async () => {
    try {
      const result = await window.pcHealthAPI.saveReport();
      if (result.success) {
        alert('Report saved to: ' + result.path);
      } else if (!result.canceled) {
        alert('Failed to save: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const getFilteredLogs = () => {
    return logs.filter(log => {
      // Filter by level
      if (filter !== 'all') {
        if (filter === 'errors' && log.level !== 'ERROR' && log.level !== 'WARN') return false;
        if (filter === 'info' && log.level !== 'INFO' && log.level !== 'SUCCESS') return false;
        if (filter === 'diagnostic' && log.category !== 'Diagnostic' && !log.category?.includes('check_')) return false;
        if (filter === 'fix' && log.level !== 'FIX' && log.category !== 'FixExecutor') return false;
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          log.message?.toLowerCase().includes(searchLower) ||
          log.category?.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.data || {}).toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'ERROR': return '❌';
      case 'WARN': return '⚠️';
      case 'SUCCESS': return '✅';
      case 'INFO': return 'ℹ️';
      case 'DEBUG': return '🔍';
      case 'FIX': return '🔧';
      case 'DIAGNOSTIC': return '🩺';
      case 'API': return '🔌';
      default: return '📋';
    }
  };

  const getLevelClass = (level) => {
    switch (level) {
      case 'ERROR': return 'error';
      case 'WARN': return 'warning';
      case 'SUCCESS': return 'success';
      case 'FIX': return 'fix';
      case 'DIAGNOSTIC': return 'diagnostic';
      default: return 'info';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const filteredLogs = getFilteredLogs();
  const errorCount = logs.filter(l => l.level === 'ERROR').length;
  const warnCount = logs.filter(l => l.level === 'WARN').length;

  return (
    <div className="log-viewer-overlay">
      <div className="log-viewer-modal">
        <div className="log-viewer-header">
          <div className="log-viewer-title">
            <span className="log-viewer-icon">📋</span>
            <h2>System Logs</h2>
            {errorCount > 0 && (
              <span className="error-badge">{errorCount} error{errorCount > 1 ? 's' : ''}</span>
            )}
            {warnCount > 0 && (
              <span className="warn-badge">{warnCount} warning{warnCount > 1 ? 's' : ''}</span>
            )}
          </div>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="log-viewer-toolbar">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({logs.length})
            </button>
            <button
              className={`filter-btn ${filter === 'errors' ? 'active' : ''}`}
              onClick={() => setFilter('errors')}
            >
              Errors & Warnings
            </button>
            <button
              className={`filter-btn ${filter === 'diagnostic' ? 'active' : ''}`}
              onClick={() => setFilter('diagnostic')}
            >
              Diagnostics
            </button>
            <button
              className={`filter-btn ${filter === 'fix' ? 'active' : ''}`}
              onClick={() => setFilter('fix')}
            >
              Fixes
            </button>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>
            )}
          </div>

          <div className="toolbar-actions">
            <label className="auto-scroll-toggle">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button className="action-btn send-report" onClick={handleSendReport} title="Send Report">
              📤 Send Report
            </button>
            <button className="action-btn" onClick={loadLogs} title="Refresh">🔄</button>
            <button className="action-btn" onClick={handleExport} title="Export">💾</button>
            <button className="action-btn" onClick={handleOpenFolder} title="Open Folder">📁</button>
            <button className="action-btn danger" onClick={handleClear} title="Clear">🗑️</button>
          </div>
        </div>

        <div className="log-viewer-content">
          {isLoading ? (
            <div className="loading-logs">
              <div className="spinner"></div>
              <span>Loading logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="no-logs">
              <span className="no-logs-icon">📭</span>
              <p>No logs to display</p>
              {searchTerm && <p className="hint">Try a different search term</p>}
            </div>
          ) : (
            <div className="logs-list">
              {filteredLogs.map((log, index) => (
                <div key={log.id || index} className={`log-entry ${getLevelClass(log.level)}`}>
                  <div className="log-entry-header">
                    <span className="log-time">{formatTimestamp(log.timestamp)}</span>
                    <span className={`log-level ${getLevelClass(log.level)}`}>
                      {getLevelIcon(log.level)} {log.level}
                    </span>
                    <span className="log-category">{log.category}</span>
                  </div>
                  <div className="log-entry-message">{log.message}</div>
                  {log.data && (
                    <div className="log-entry-data">
                      <details>
                        <summary>Details</summary>
                        <pre>{JSON.stringify(log.data, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        <div className="log-viewer-footer">
          <span className="log-count">
            Showing {filteredLogs.length} of {logs.length} logs
          </span>
          <span className="log-hint">
            Logs are saved to file automatically
          </span>
        </div>
      </div>

      {/* Send Report Modal */}
      {showReportModal && (
        <div className="report-modal-overlay">
          <div className="report-modal">
            <div className="report-modal-header">
              <h3>📤 Send Error Report</h3>
              <button className="close-button" onClick={() => setShowReportModal(false)}>✕</button>
            </div>

            <div className="report-modal-content">
              <p className="report-instructions">
                Copy this report and send it to get help with any issues:
              </p>

              <div className="report-actions">
                <button
                  className={`report-btn primary ${reportCopied ? 'copied' : ''}`}
                  onClick={handleCopyReport}
                >
                  {reportCopied ? '✓ Copied!' : '📋 Copy to Clipboard'}
                </button>
                <button className="report-btn" onClick={handleSaveReport}>
                  💾 Save to File
                </button>
              </div>

              <div className="report-preview">
                <div className="report-preview-header">
                  <span>Report Preview</span>
                  <span className="report-size">{reportText.length} characters</span>
                </div>
                <pre className="report-text">{reportText || 'Generating report...'}</pre>
              </div>

              <div className="report-share-info">
                <p><strong>How to share:</strong></p>
                <ol>
                  <li>Click "Copy to Clipboard" above</li>
                  <li>Paste into an email, Discord, or support ticket</li>
                  <li>Send to get help with your issue</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogViewer;
