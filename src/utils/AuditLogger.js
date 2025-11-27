/**
 * AuditLogger - Persistent audit logging system for PC Health Assistant
 *
 * Logs all diagnostic runs, fix recommendations, and fix executions
 * with full details for compliance and user transparency.
 */

const Store = require('electron-store');

class AuditLogger {
  constructor() {
    // Initialize persistent storage
    this.store = new Store({
      name: 'audit-logs',
      defaults: {
        logs: [],
        statistics: {
          totalDiagnostics: 0,
          totalFixesRecommended: 0,
          totalFixesExecuted: 0,
          totalFixesSuccessful: 0,
          totalFixesFailed: 0
        }
      }
    });
  }

  /**
   * Log a diagnostic session start
   */
  logDiagnosticStart(problemType) {
    const entry = {
      id: this._generateId(),
      type: 'DIAGNOSTIC_START',
      timestamp: new Date().toISOString(),
      problemType,
      status: 'in_progress'
    };

    this._addLog(entry);
    return entry.id;
  }

  /**
   * Log diagnostic completion with findings
   */
  logDiagnosticComplete(diagnosticId, results) {
    const entry = {
      id: diagnosticId,
      type: 'DIAGNOSTIC_COMPLETE',
      timestamp: new Date().toISOString(),
      status: 'completed',
      results: {
        summary: results.summary,
        issuesFound: results.issues ? results.issues.length : 0,
        issues: results.issues || [],
        fixesRecommended: results.fixes ? results.fixes.length : 0,
        fixes: results.fixes || []
      }
    };

    this._updateLog(diagnosticId, entry);
    this._incrementStat('totalDiagnostics');

    if (results.fixes && results.fixes.length > 0) {
      this._incrementStat('totalFixesRecommended', results.fixes.length);
    }

    return entry;
  }

  /**
   * Log when a diagnostic fails or errors
   */
  logDiagnosticError(diagnosticId, error) {
    const entry = {
      id: diagnosticId,
      type: 'DIAGNOSTIC_ERROR',
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: {
        message: error.message,
        stack: error.stack
      }
    };

    this._updateLog(diagnosticId, entry);
    return entry;
  }

  /**
   * Log when a fix execution starts
   */
  logFixStart(fix, diagnosticId = null) {
    const entry = {
      id: this._generateId(),
      type: 'FIX_START',
      timestamp: new Date().toISOString(),
      diagnosticId,
      fix: {
        id: fix.id,
        title: fix.title,
        difficulty: fix.difficulty,
        needsRestart: fix.needsRestart,
        steps: fix.steps,
        riskLevel: fix.riskLevel
      },
      status: 'in_progress',
      executionDetails: {
        startTime: new Date().toISOString(),
        stepsCompleted: 0,
        totalSteps: fix.steps ? fix.steps.length : 0
      }
    };

    this._addLog(entry);
    return entry.id;
  }

  /**
   * Log progress during fix execution
   */
  logFixProgress(fixExecutionId, stepNumber, stepDescription, output = null) {
    const logs = this.store.get('logs');
    const logIndex = logs.findIndex(log => log.id === fixExecutionId);

    if (logIndex !== -1) {
      if (!logs[logIndex].executionDetails.stepLogs) {
        logs[logIndex].executionDetails.stepLogs = [];
      }

      logs[logIndex].executionDetails.stepLogs.push({
        stepNumber,
        stepDescription,
        timestamp: new Date().toISOString(),
        output: output ? this._sanitizeOutput(output) : null
      });

      logs[logIndex].executionDetails.stepsCompleted = stepNumber;
      this.store.set('logs', logs);
    }
  }

  /**
   * Log successful fix completion
   */
  logFixSuccess(fixExecutionId, verificationResult = null) {
    const entry = {
      type: 'FIX_SUCCESS',
      timestamp: new Date().toISOString(),
      status: 'completed',
      executionDetails: {
        endTime: new Date().toISOString(),
        verificationResult
      }
    };

    this._updateLog(fixExecutionId, entry);
    this._incrementStat('totalFixesExecuted');
    this._incrementStat('totalFixesSuccessful');

    return entry;
  }

  /**
   * Log fix failure with rollback info
   */
  logFixFailure(fixExecutionId, error, rollbackAttempted = false, rollbackSuccess = false) {
    const entry = {
      type: 'FIX_FAILURE',
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: {
        message: error.message,
        stack: error.stack
      },
      rollback: {
        attempted: rollbackAttempted,
        successful: rollbackSuccess
      }
    };

    this._updateLog(fixExecutionId, entry);
    this._incrementStat('totalFixesExecuted');
    this._incrementStat('totalFixesFailed');

    return entry;
  }

  /**
   * Log safety check results
   */
  logSafetyCheck(fixId, checks) {
    const entry = {
      id: this._generateId(),
      type: 'SAFETY_CHECK',
      timestamp: new Date().toISOString(),
      fixId,
      checks: {
        forbiddenOperations: checks.forbiddenOperations || false,
        validStructure: checks.validStructure || false,
        validRiskLevel: checks.validRiskLevel || false,
        userDataProtection: checks.userDataProtection || false
      },
      passed: Object.values(checks).every(check => check === true)
    };

    this._addLog(entry);
    return entry;
  }

  /**
   * Log restore point creation
   */
  logRestorePoint(fixId, restorePointId, description) {
    const entry = {
      id: this._generateId(),
      type: 'RESTORE_POINT_CREATED',
      timestamp: new Date().toISOString(),
      fixId,
      restorePoint: {
        id: restorePointId,
        description
      }
    };

    this._addLog(entry);
    return entry;
  }

  /**
   * Get all logs with optional filtering
   */
  getLogs(filter = {}) {
    let logs = this.store.get('logs');

    // Filter by type
    if (filter.type) {
      logs = logs.filter(log => log.type === filter.type);
    }

    // Filter by date range
    if (filter.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filter.startDate));
    }
    if (filter.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(filter.endDate));
    }

    // Filter by status
    if (filter.status) {
      logs = logs.filter(log => log.status === filter.status);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return logs;
  }

  /**
   * Get logs for a specific diagnostic session
   */
  getDiagnosticLogs(diagnosticId) {
    const logs = this.store.get('logs');
    return logs.filter(log =>
      log.id === diagnosticId || log.diagnosticId === diagnosticId
    );
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return this.store.get('statistics');
  }

  /**
   * Get recent activity (last N logs)
   */
  getRecentActivity(limit = 50) {
    const logs = this.store.get('logs');
    return logs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Export logs to JSON
   */
  exportLogs() {
    return {
      exportDate: new Date().toISOString(),
      statistics: this.getStatistics(),
      logs: this.getLogs()
    };
  }

  /**
   * Log a chat interaction
   */
  logChatInteraction(userMessage, assistantResponse) {
    const entry = {
      id: this._generateId(),
      type: 'CHAT_INTERACTION',
      timestamp: new Date().toISOString(),
      userMessage: userMessage.substring(0, 500), // Limit length
      assistantResponse: assistantResponse.substring(0, 1000) // Limit length
    };

    this._addLog(entry);
  }

  /**
   * Clear all logs (use with caution!)
   */
  clearLogs() {
    this.store.set('logs', []);
    this.store.set('statistics', {
      totalDiagnostics: 0,
      totalFixesRecommended: 0,
      totalFixesExecuted: 0,
      totalFixesSuccessful: 0,
      totalFixesFailed: 0
    });
  }

  // Private helper methods

  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _addLog(entry) {
    const logs = this.store.get('logs');
    logs.push(entry);
    this.store.set('logs', logs);
  }

  _updateLog(id, updates) {
    const logs = this.store.get('logs');
    const index = logs.findIndex(log => log.id === id);

    if (index !== -1) {
      logs[index] = { ...logs[index], ...updates };
      this.store.set('logs', logs);
    }
  }

  _incrementStat(statName, amount = 1) {
    const stats = this.store.get('statistics');
    stats[statName] = (stats[statName] || 0) + amount;
    this.store.set('statistics', stats);
  }

  _sanitizeOutput(output) {
    // Truncate very long outputs
    if (typeof output === 'string' && output.length > 5000) {
      return output.substring(0, 5000) + '\n... (output truncated)';
    }
    return output;
  }
}

module.exports = AuditLogger;
