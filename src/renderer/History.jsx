import React, { useState, useEffect } from 'react';
import './History.css';

function History({ onBack }) {
  const [logs, setLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [filter, setFilter] = useState('all'); // all, diagnostics, fixes, safety
  const [expandedLog, setExpandedLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditData();
  }, [filter]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      // Load statistics
      const stats = await window.pcHealthAPI.getAuditStatistics();
      setStatistics(stats);

      // Load logs based on filter
      let filterParam = {};
      if (filter === 'diagnostics') {
        filterParam.type = 'DIAGNOSTIC_COMPLETE';
      } else if (filter === 'fixes') {
        filterParam.type = 'FIX_SUCCESS';
      } else if (filter === 'safety') {
        filterParam.type = 'SAFETY_CHECK';
      }

      const auditLogs = await window.pcHealthAPI.getAuditLogs(filterParam);
      setLogs(auditLogs);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await window.pcHealthAPI.exportAuditLogs();
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pc-health-audit-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Failed to export logs');
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getLogIcon = (type) => {
    const icons = {
      'DIAGNOSTIC_START': '🔍',
      'DIAGNOSTIC_COMPLETE': '✅',
      'DIAGNOSTIC_ERROR': '❌',
      'FIX_START': '🔧',
      'FIX_SUCCESS': '✨',
      'FIX_FAILURE': '⚠️',
      'SAFETY_CHECK': '🛡️',
      'RESTORE_POINT_CREATED': '💾'
    };
    return icons[type] || '📋';
  };

  const getLogTypeLabel = (type) => {
    const labels = {
      'DIAGNOSTIC_START': 'Diagnostic Started',
      'DIAGNOSTIC_COMPLETE': 'Diagnostic Completed',
      'DIAGNOSTIC_ERROR': 'Diagnostic Failed',
      'FIX_START': 'Fix Started',
      'FIX_SUCCESS': 'Fix Successful',
      'FIX_FAILURE': 'Fix Failed',
      'SAFETY_CHECK': 'Safety Check',
      'RESTORE_POINT_CREATED': 'Restore Point Created'
    };
    return labels[type] || type;
  };

  const renderLogDetails = (log) => {
    switch (log.type) {
      case 'DIAGNOSTIC_COMPLETE':
        return (
          <div className="log-details">
            <p><strong>Summary:</strong> {log.results?.summary}</p>
            <p><strong>Issues Found:</strong> {log.results?.issuesFound || 0}</p>
            <p><strong>Fixes Recommended:</strong> {log.results?.fixesRecommended || 0}</p>
            {log.results?.issues && log.results.issues.length > 0 && (
              <div className="issues-list">
                <h4>Issues:</h4>
                {log.results.issues.map((issue, idx) => (
                  <div key={idx} className={`issue-item severity-${issue.severity}`}>
                    <strong>{issue.title}</strong>
                    <p>{issue.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'FIX_SUCCESS':
        return (
          <div className="log-details">
            <p><strong>Fix:</strong> {log.fix?.title}</p>
            <p><strong>Steps Completed:</strong> {log.executionDetails?.stepsCompleted} / {log.executionDetails?.totalSteps}</p>
            {log.executionDetails?.stepLogs && (
              <div className="step-logs">
                <h4>Execution Steps:</h4>
                {log.executionDetails.stepLogs.map((step, idx) => (
                  <div key={idx} className="step-log-item">
                    <strong>Step {step.stepNumber}:</strong> {step.stepDescription}
                    {step.output && (
                      <pre className="step-output">{step.output}</pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'FIX_FAILURE':
        return (
          <div className="log-details">
            <p><strong>Fix:</strong> {log.fix?.title}</p>
            <p className="error-message"><strong>Error:</strong> {log.error?.message}</p>
            <p><strong>Rollback Attempted:</strong> {log.rollback?.attempted ? 'Yes' : 'No'}</p>
            {log.rollback?.attempted && (
              <p><strong>Rollback Successful:</strong> {log.rollback?.successful ? 'Yes' : 'No'}</p>
            )}
          </div>
        );

      case 'SAFETY_CHECK':
        return (
          <div className="log-details">
            <p><strong>Passed:</strong> {log.passed ? 'Yes ✅' : 'No ❌'}</p>
            <div className="safety-checks">
              <div className={log.checks?.forbiddenOperations ? 'check-pass' : 'check-fail'}>
                Forbidden Operations: {log.checks?.forbiddenOperations ? '✓' : '✗'}
              </div>
              <div className={log.checks?.validStructure ? 'check-pass' : 'check-fail'}>
                Valid Structure: {log.checks?.validStructure ? '✓' : '✗'}
              </div>
              <div className={log.checks?.validRiskLevel ? 'check-pass' : 'check-fail'}>
                Valid Risk Level: {log.checks?.validRiskLevel ? '✓' : '✗'}
              </div>
              <div className={log.checks?.userDataProtection ? 'check-pass' : 'check-fail'}>
                User Data Protection: {log.checks?.userDataProtection ? '✓' : '✗'}
              </div>
            </div>
          </div>
        );

      case 'RESTORE_POINT_CREATED':
        return (
          <div className="log-details">
            <p><strong>Description:</strong> {log.restorePoint?.description}</p>
            <p><strong>Restore Point ID:</strong> {log.restorePoint?.id}</p>
          </div>
        );

      default:
        return (
          <div className="log-details">
            <pre>{JSON.stringify(log, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <div className="history-container">
      <header className="history-header">
        <button onClick={onBack} className="back-button">← Back to Home</button>
        <h1>Audit History</h1>
        <button onClick={handleExport} className="export-button">📥 Export Logs</button>
      </header>

      {/* Statistics Dashboard */}
      {statistics && (
        <div className="statistics-dashboard">
          <div className="stat-card">
            <div className="stat-number">{statistics.totalDiagnostics}</div>
            <div className="stat-label">Diagnostics Run</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{statistics.totalFixesRecommended}</div>
            <div className="stat-label">Fixes Recommended</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{statistics.totalFixesExecuted}</div>
            <div className="stat-label">Fixes Executed</div>
          </div>
          <div className="stat-card success">
            <div className="stat-number">{statistics.totalFixesSuccessful}</div>
            <div className="stat-label">Successful</div>
          </div>
          <div className="stat-card failure">
            <div className="stat-number">{statistics.totalFixesFailed}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All Activity
        </button>
        <button
          className={filter === 'diagnostics' ? 'active' : ''}
          onClick={() => setFilter('diagnostics')}
        >
          Diagnostics
        </button>
        <button
          className={filter === 'fixes' ? 'active' : ''}
          onClick={() => setFilter('fixes')}
        >
          Fixes
        </button>
        <button
          className={filter === 'safety' ? 'active' : ''}
          onClick={() => setFilter('safety')}
        >
          Safety Checks
        </button>
      </div>

      {/* Logs List */}
      <div className="logs-list">
        {loading ? (
          <div className="loading">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="no-logs">
            <p>No audit logs found.</p>
            <p className="hint">Run a diagnostic or execute a fix to start building your audit trail.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="log-entry">
              <div
                className="log-header"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <span className="log-icon">{getLogIcon(log.type)}</span>
                <div className="log-info">
                  <h3>{getLogTypeLabel(log.type)}</h3>
                  <p className="log-timestamp">{formatDate(log.timestamp)}</p>
                </div>
                <span className="expand-icon">
                  {expandedLog === log.id ? '▼' : '▶'}
                </span>
              </div>

              {expandedLog === log.id && (
                <div className="log-body">
                  {renderLogDetails(log)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default History;
