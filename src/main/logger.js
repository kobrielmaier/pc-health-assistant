/**
 * Logger Service
 * Captures all actions, errors, and events for debugging and monitoring
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs in memory
    this.logFile = null;
    this.listeners = [];
    this.initialized = false;
  }

  /**
   * Initialize the logger with file path
   */
  init() {
    if (this.initialized) return;

    try {
      const userDataPath = app.getPath('userData');
      const logsDir = path.join(userDataPath, 'logs');

      // Create logs directory if it doesn't exist
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Create log file with date
      const date = new Date().toISOString().split('T')[0];
      this.logFile = path.join(logsDir, `pc-health-${date}.log`);

      this.initialized = true;
      this.info('Logger', 'Logger initialized', { logFile: this.logFile });
    } catch (error) {
      console.error('Failed to initialize logger:', error);
    }
  }

  /**
   * Add a listener for new log entries
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of new log entry
   */
  notifyListeners(entry) {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (e) {
        console.error('Logger listener error:', e);
      }
    });
  }

  /**
   * Create a log entry
   */
  createEntry(level, category, message, data = null) {
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };

    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Write to file
    this.writeToFile(entry);

    // Notify listeners
    this.notifyListeners(entry);

    // Also log to console
    const consoleMsg = `[${entry.timestamp}] [${level}] [${category}] ${message}`;
    if (level === 'ERROR') {
      console.error(consoleMsg, data || '');
    } else if (level === 'WARN') {
      console.warn(consoleMsg, data || '');
    } else {
      console.log(consoleMsg, data || '');
    }

    return entry;
  }

  /**
   * Write entry to log file
   */
  writeToFile(entry) {
    if (!this.logFile) return;

    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, line);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Log levels
   */
  info(category, message, data = null) {
    return this.createEntry('INFO', category, message, data);
  }

  warn(category, message, data = null) {
    return this.createEntry('WARN', category, message, data);
  }

  error(category, message, data = null) {
    return this.createEntry('ERROR', category, message, data);
  }

  debug(category, message, data = null) {
    return this.createEntry('DEBUG', category, message, data);
  }

  success(category, message, data = null) {
    return this.createEntry('SUCCESS', category, message, data);
  }

  /**
   * Log a fix execution
   */
  logFix(action, fixTitle, data = null) {
    return this.createEntry('FIX', 'FixExecutor', `${action}: ${fixTitle}`, data);
  }

  /**
   * Log a diagnostic action
   */
  logDiagnostic(tool, action, data = null) {
    return this.createEntry('DIAGNOSTIC', tool, action, data);
  }

  /**
   * Log an API/IPC call
   */
  logAPI(endpoint, action, data = null) {
    return this.createEntry('API', endpoint, action, data);
  }

  /**
   * Get all logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level) {
    return this.logs.filter(l => l.level === level);
  }

  /**
   * Get logs filtered by category
   */
  getLogsByCategory(category) {
    return this.logs.filter(l => l.category === category);
  }

  /**
   * Get recent logs (last N entries)
   */
  getRecentLogs(count = 100) {
    return this.logs.slice(-count);
  }

  /**
   * Get errors only
   */
  getErrors() {
    return this.logs.filter(l => l.level === 'ERROR' || l.level === 'WARN');
  }

  /**
   * Clear in-memory logs
   */
  clearLogs() {
    this.logs = [];
    this.info('Logger', 'Logs cleared');
  }

  /**
   * Get log file path
   */
  getLogFilePath() {
    return this.logFile;
  }

  /**
   * Read logs from file
   */
  readLogsFromFile() {
    if (!this.logFile || !fs.existsSync(this.logFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.trim().split('\n');
      return lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      console.error('Failed to read log file:', error);
      return [];
    }
  }

  /**
   * Export logs to a file
   */
  exportLogs(exportPath) {
    try {
      const allLogs = this.readLogsFromFile();
      const content = allLogs.map(log => {
        const dataStr = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
        return `[${log.timestamp}] [${log.level}] [${log.category}] ${log.message}${dataStr}`;
      }).join('\n');

      fs.writeFileSync(exportPath, content);
      return { success: true, path: exportPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
const logger = new Logger();

module.exports = { logger, Logger };
