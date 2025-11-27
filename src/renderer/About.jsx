import React, { useState, useEffect } from 'react';
import './About.css';

/**
 * About & Transparency Panel
 * Shows what the app can/can't do, audit logs, and system information
 */
function About({ onBack }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load audit statistics on mount
  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await window.pcHealthAPI.getAuditStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await window.pcHealthAPI.getRecentActivity(100);
      setAuditLogs(logs);
      setShowLogs(true);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      alert('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const result = await window.pcHealthAPI.exportAuditLogs();
      if (result.success) {
        alert(`Audit logs exported to: ${result.path}`);
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
      alert('Failed to export logs');
    }
  };

  return (
    <div className="about-page">
      <div className="about-header">
        <h2>📊 About & Transparency</h2>
        <p className="about-subtitle">
          Complete visibility into what this app does and has done on your system.
        </p>
      </div>

      {/* App Information */}
      <section className="about-section">
        <h3>ℹ️ Application Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Name:</span>
            <span className="info-value">PC Health Assistant</span>
          </div>
          <div className="info-item">
            <span className="info-label">Version:</span>
            <span className="info-value">0.1.0 (Alpha)</span>
          </div>
          <div className="info-item">
            <span className="info-label">License:</span>
            <span className="info-value">MIT License (Open Source)</span>
          </div>
          <div className="info-item">
            <span className="info-label">Platform:</span>
            <span className="info-value">Windows 10/11</span>
          </div>
          <div className="info-item">
            <span className="info-label">AI Engine:</span>
            <span className="info-value">Anthropic Claude</span>
          </div>
          <div className="info-item">
            <span className="info-label">Framework:</span>
            <span className="info-value">Electron + React</span>
          </div>
        </div>
      </section>

      {/* What We Can Do */}
      <section className="about-section">
        <h3>✅ What This App Can Do</h3>
        <div className="capabilities-grid">
          <div className="capability-item can-do">
            <span className="capability-icon">🔍</span>
            <div>
              <strong>Diagnose System Issues</strong>
              <p>Read Windows event logs, crash dumps, driver information, and system metrics</p>
            </div>
          </div>

          <div className="capability-item can-do">
            <span className="capability-icon">💬</span>
            <div>
              <strong>AI-Powered Analysis</strong>
              <p>Use Claude AI to analyze problems and suggest solutions in plain English</p>
            </div>
          </div>

          <div className="capability-item can-do">
            <span className="capability-icon">🔧</span>
            <div>
              <strong>Apply Fixes (With Approval)</strong>
              <p>Execute system commands, update drivers, clear caches - only with your permission</p>
            </div>
          </div>

          <div className="capability-item can-do">
            <span className="capability-icon">💾</span>
            <div>
              <strong>Create Restore Points</strong>
              <p>Automatically backup system state before making changes</p>
            </div>
          </div>

          <div className="capability-item can-do">
            <span className="capability-icon">📝</span>
            <div>
              <strong>Log All Actions</strong>
              <p>Keep detailed records of every diagnostic and fix applied</p>
            </div>
          </div>

          <div className="capability-item can-do">
            <span className="capability-icon">↩️</span>
            <div>
              <strong>Rollback Changes</strong>
              <p>Automatically revert to restore points if a fix fails</p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Cannot Do */}
      <section className="about-section">
        <h3>🚫 What This App Cannot Do</h3>
        <div className="capabilities-grid">
          <div className="capability-item cannot-do">
            <span className="capability-icon">❌</span>
            <div>
              <strong>Access Personal Files</strong>
              <p>We never read, modify, or delete documents, photos, or personal data</p>
            </div>
          </div>

          <div className="capability-item cannot-do">
            <span className="capability-icon">❌</span>
            <div>
              <strong>Make Changes Without Approval</strong>
              <p>All system modifications require your explicit confirmation</p>
            </div>
          </div>

          <div className="capability-item cannot-do">
            <span className="capability-icon">❌</span>
            <div>
              <strong>Perform Dangerous Operations</strong>
              <p>Hard-coded blocks prevent disk formatting, data deletion, and BIOS changes</p>
            </div>
          </div>

          <div className="capability-item cannot-do">
            <span className="capability-icon">❌</span>
            <div>
              <strong>Send Data to External Servers</strong>
              <p>Only diagnostic summaries go to Claude AI - no personal files or credentials</p>
            </div>
          </div>

          <div className="capability-item cannot-do">
            <span className="capability-icon">❌</span>
            <div>
              <strong>Run in Background Without Notice</strong>
              <p>All operations are visible and logged - no hidden processes</p>
            </div>
          </div>

          <div className="capability-item cannot-do">
            <span className="capability-icon">❌</span>
            <div>
              <strong>Bypass Windows Security</strong>
              <p>We work within Windows permissions - no privilege escalation tricks</p>
            </div>
          </div>
        </div>
      </section>

      {/* Audit Statistics */}
      {statistics && (
        <section className="about-section">
          <h3>📈 Activity Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{statistics.totalDiagnostics || 0}</div>
              <div className="stat-label">Total Diagnostics Run</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{statistics.totalFixes || 0}</div>
              <div className="stat-label">Fixes Applied</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{statistics.successfulFixes || 0}</div>
              <div className="stat-label">Successful Fixes</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{statistics.failedFixes || 0}</div>
              <div className="stat-label">Failed Fixes</div>
            </div>
          </div>
        </section>
      )}

      {/* Audit Log Viewer */}
      <section className="about-section">
        <h3>📜 Audit Trail</h3>
        <p className="section-description">
          Every action this app takes is logged with timestamps, commands executed, and results.
          Full transparency means you can review everything we've done.
        </p>

        <div className="audit-controls">
          <button
            className="audit-button primary"
            onClick={loadAuditLogs}
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : '📋 View Audit Logs'}
          </button>
          <button
            className="audit-button secondary"
            onClick={exportLogs}
          >
            💾 Export Logs
          </button>
        </div>

        {showLogs && (
          <div className="audit-logs">
            {auditLogs.length === 0 ? (
              <div className="no-logs">
                <p>No activity logged yet. Run a diagnostic to see audit entries.</p>
              </div>
            ) : (
              <div className="logs-list">
                {auditLogs.map((log, index) => (
                  <div key={index} className={`log-entry ${log.type}`}>
                    <div className="log-header">
                      <span className="log-type">{getLogTypeIcon(log.type)} {log.type}</span>
                      <span className="log-timestamp">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="log-message">{log.message}</div>
                    {log.details && (
                      <div className="log-details">
                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Open Source */}
      <section className="about-section">
        <h3>🔓 Open Source Commitment</h3>
        <div className="opensource-box">
          <p>
            This application is open source under the MIT License. This means:
          </p>
          <ul>
            <li>✅ You can review every line of code</li>
            <li>✅ You can verify there's no malicious behavior</li>
            <li>✅ Security researchers can audit the application</li>
            <li>✅ You can modify and distribute the code</li>
            <li>✅ The community can contribute improvements</li>
          </ul>
          <p className="opensource-note">
            <strong>Transparency is not optional.</strong> We believe users have the right
            to know exactly what software does on their computer.
          </p>
        </div>
      </section>

      {/* Support & Contact */}
      <section className="about-section">
        <h3>💬 Support & Questions</h3>
        <div className="support-box">
          <p>
            Have questions, concerns, or feedback about PC Health Assistant?
          </p>
          <div className="support-options">
            <div className="support-option">
              <span className="support-icon">📖</span>
              <div>
                <strong>Documentation</strong>
                <p>Check README.md and docs/ folder for detailed guides</p>
              </div>
            </div>
            <div className="support-option">
              <span className="support-icon">🔍</span>
              <div>
                <strong>Source Code</strong>
                <p>Review the code on GitHub to understand how it works</p>
              </div>
            </div>
            <div className="support-option">
              <span className="support-icon">💬</span>
              <div>
                <strong>AI Assistant</strong>
                <p>Use the built-in chat to ask questions about the app</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <button className="back-button" onClick={onBack}>
        ← Back to Home
      </button>
    </div>
  );
}

/**
 * Get icon for log type
 */
function getLogTypeIcon(type) {
  const icons = {
    'diagnostic_start': '🔍',
    'diagnostic_complete': '✅',
    'fix_start': '🔧',
    'fix_success': '✨',
    'fix_failure': '❌',
    'restore_point': '💾',
    'safety_check': '🛡️',
    'rollback': '↩️'
  };
  return icons[type] || '📋';
}

export default About;
