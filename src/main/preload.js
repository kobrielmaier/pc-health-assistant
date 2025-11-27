/**
 * Preload script - Securely exposes IPC methods to renderer process
 * This is the bridge between the frontend and system-level operations
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('pcHealthAPI', {
  // Start a diagnostic investigation
  startDiagnosis: (problemType) => ipcRenderer.invoke('start-diagnosis', problemType),

  // Execute a fix with user approval
  executeFix: (fix) => ipcRenderer.invoke('execute-fix', fix),

  // Get system information
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Check admin status
  checkAdminStatus: () => ipcRenderer.invoke('check-admin-status'),

  // Listen for progress updates
  onProgress: (callback) => {
    ipcRenderer.on('diagnosis-progress', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('diagnosis-progress');
  },

  // Listen for fix progress
  onFixProgress: (callback) => {
    ipcRenderer.on('fix-progress', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('fix-progress');
  },

  // Audit Log Methods
  getAuditLogs: (filter) => ipcRenderer.invoke('get-audit-logs', filter),
  getRecentActivity: (limit) => ipcRenderer.invoke('get-recent-activity', limit),
  getAuditStatistics: () => ipcRenderer.invoke('get-audit-statistics'),
  getDiagnosticLogs: (diagnosticId) => ipcRenderer.invoke('get-diagnostic-logs', diagnosticId),
  exportAuditLogs: () => ipcRenderer.invoke('export-audit-logs'),
  clearAuditLogs: () => ipcRenderer.invoke('clear-audit-logs'),

  // Chat Assistant Methods
  sendChatMessage: (message, context) => ipcRenderer.invoke('send-chat-message', message, context),
  clearChatHistory: () => ipcRenderer.invoke('clear-chat-history'),
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),

  // Conversational Diagnostic Agent Methods
  conversationalChat: (message) => ipcRenderer.invoke('conversational-chat', message),
  executeApprovedFix: (fix) => ipcRenderer.invoke('execute-approved-fix', fix),
  rollbackFix: () => ipcRenderer.invoke('rollback-fix'),
  resetConversation: () => ipcRenderer.invoke('reset-conversation'),

  // Listen for tool use notifications
  onToolUse: (callback) => {
    ipcRenderer.on('tool-use', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('tool-use');
  },

  // Listen for rollback progress
  onRollbackProgress: (callback) => {
    ipcRenderer.on('rollback-progress', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('rollback-progress');
  },

  // Listen for activity updates (detailed progress path)
  onActivityUpdate: (callback) => {
    ipcRenderer.on('activity-update', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('activity-update');
  },

  // Logger Methods
  getLogs: (options) => ipcRenderer.invoke('get-logs', options),
  getErrors: () => ipcRenderer.invoke('get-errors'),
  getLogFilePath: () => ipcRenderer.invoke('get-log-file-path'),
  exportLogs: (path) => ipcRenderer.invoke('export-logs', path),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  openLogFolder: () => ipcRenderer.invoke('open-log-folder'),

  // Subscribe to real-time log updates
  subscribeLogs: () => {
    ipcRenderer.send('subscribe-logs');
  },
  onLogEntry: (callback) => {
    ipcRenderer.on('log-entry', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('log-entry');
  },

  // Report Generation Methods
  generateReport: (options) => ipcRenderer.invoke('generate-report', options),
  copyReportToClipboard: (options) => ipcRenderer.invoke('copy-report-to-clipboard', options),
  saveReport: (options) => ipcRenderer.invoke('save-report', options),
  getReportText: (options) => ipcRenderer.invoke('get-report-text', options),

  // Auto-Update Methods
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  skipUpdate: (version) => ipcRenderer.invoke('skip-update', version),

  // Update event listeners
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('update-available');
  },
  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on('update-download-progress', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('update-download-progress');
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('update-downloaded');
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('update-error');
  },
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('update-status');
  },

  // Error Reporting Methods
  reportError: (error, context) => ipcRenderer.invoke('report-error', error, context),
  reportMessage: (message, level, context) => ipcRenderer.invoke('report-message', message, level, context)
});

console.log('Preload script loaded - API exposed to renderer');
