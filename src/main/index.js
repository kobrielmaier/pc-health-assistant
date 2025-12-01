/**
 * Main Electron process
 * Manages the application window and handles system-level operations
 */

const path = require('path');
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');

// Load environment variables from .env file FIRST
// In production, .env is in resources folder; in dev, it's in project root
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

// Initialize Sentry crash reporting as early as possible
const sentry = require('./sentry');
sentry.initSentry();

// Detect development mode - only use app.isPackaged
const isDev = !app.isPackaged;

// Initialize logger
const { logger } = require('./logger');
const { ReportGenerator } = require('./reportGenerator');
const { initAutoUpdater } = require('./autoUpdater');

console.log('PC Health Assistant - Main process started');
console.log('Development mode:', isDev);
console.log('App packaged:', app.isPackaged);

let mainWindow;
let tray = null;
let chatAssistant = null;
let conversationalAgent = null;
let fixExecutor = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'PC Health Assistant',
    icon: path.join(__dirname, '../../public/icon.png')
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173'); // Vite dev server
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the app's build folder
    const indexPath = path.join(app.getAppPath(), 'build', 'index.html');
    console.log('Loading production index from:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create system tray icon with menu
 */
function createTray() {
  const fs = require('fs');

  // Try to load custom icon, fallback to embedded icon
  let icon;
  const customIconPath = path.join(__dirname, '../../assets/tray-icon.png');
  const customIcoPath = path.join(__dirname, '../../assets/tray-icon.ico');

  if (fs.existsSync(customIcoPath)) {
    icon = nativeImage.createFromPath(customIcoPath);
  } else if (fs.existsSync(customIconPath)) {
    icon = nativeImage.createFromPath(customIconPath);
  } else {
    // Fallback to embedded base64 icon (computer monitor icon)
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJfSURBVFhH7ZbPaxNBFMffbpJNs9nNZjdp0zRN2qS2tkqLWhG8iAcRPHjw4h+gguDBi3jy4h/gSRAEQRAEQRCkiIgHwYMXD0VEEKQHxYNYW7U/TH+k2SR1N7uzO+Mbdmw2u9k0Xjx0vvDhzZt5+5n3ZuYtY/+xfxuwawEWFxdZIBBgPp+PBYNBFgqFWDgcZtFolMXjcZZIJFgqlWLpdJplMhmWzWZZLpdjS0tLrFwus2q1yur1OjMMgzWbTdZqtVi73Wadm5C9CbBarTL8YA0C8Pv9zOv1Mo/Hw9xut+MKhUIsGo2yRCLBUqmU8zILCwtsZmaGTU9Ps6mpKTY5OcnGx8fZ2NgYGx0dZSMjI2x4eJgNDQ2xwcFBxu1rATQPWByorN/+BSqKN0KU0+lkTqeTuVwu+wbcbjdzuVxMEASbAQ8A75FKpV5isdjbVCo1nkwmp5LJ5PNEIvEmHo+/i0aj05FI5HM4HP4SCoU+h0Kh76qq/lJVVev1et3tdrvlcDisVqs1pVKpYqVS+el2u/9yOBz9DvQvgFaryiCdTs+Ew+FPfr//k8/n++Dz+ab9fv87r9f72ePxvPR4PC88Hs9zj8cz4Xa7Jx0Ox4TT6Zx0Op0TbrdbcTgcisPhKDkcjqLD4Shwu93qdrvf53K5d7lc7n0ul3uXy+Xe5nK52Vwu97bX631VSqVS0Wq1WrRarWi1Wi1arZaEL4ZtBtxu93+B57kvEAjMcAb+ewbw5hkjIyP/BDw2NmYzgK9ieHjYZmBwcNBm4Pr169dsBlKpVOfOyxm4dOmSzcDg4ODH5eXlNzgxMfHi7NmzqwLe/cfNX6xR2zX2oDMJAAAAAElFTkSuQmCC'
    );
  }

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open PC Health Assistant',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quick Scan',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('quick-scan');
        } else {
          createWindow();
          mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('quick-scan');
          });
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('PC Health Assistant');
  tray.setContextMenu(contextMenu);

  // Double click to open window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// App lifecycle events
app.whenReady().then(() => {
  // Initialize logger
  logger.init();
  logger.info('App', 'PC Health Assistant starting', { isDev, version: app.getVersion() });

  // Set Content Security Policy headers
  const { session } = require('electron');
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:*;"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://github.com https://api.github.com https://objects.githubusercontent.com https://*.s3.amazonaws.com;"
        ]
      }
    });
  });

  createTray();
  createWindow();

  // Initialize auto-updater after window is created
  initAutoUpdater(mainWindow);

  logger.success('App', 'Application started successfully');
});

app.on('window-all-closed', (event) => {
  // Don't quit the app when all windows are closed (keep in tray)
  event.preventDefault();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// Cleanup on quit
app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  if (tray) {
    tray.destroy();
  }
});

// Activity tracking for progress visualization
let activityTracker = {
  activities: [],
  currentId: 0,

  start(tool, details = null) {
    const id = `activity-${++this.currentId}-${Date.now()}`;
    const activity = {
      id,
      tool,
      status: 'running',
      startTime: new Date().toISOString(),
      details,
      subSteps: []
    };
    this.activities.push(activity);
    return id;
  },

  update(id, updates) {
    const activity = this.activities.find(a => a.id === id);
    if (activity) {
      Object.assign(activity, updates);
    }
  },

  complete(id, summary = null) {
    const activity = this.activities.find(a => a.id === id);
    if (activity) {
      activity.status = 'completed';
      activity.endTime = new Date().toISOString();
      activity.duration = this.formatDuration(activity.startTime, activity.endTime);
      if (summary) activity.summary = summary;
    }
  },

  error(id, errorMsg) {
    const activity = this.activities.find(a => a.id === id);
    if (activity) {
      activity.status = 'error';
      activity.endTime = new Date().toISOString();
      activity.error = errorMsg;
    }
  },

  addSubStep(id, text, status = 'running') {
    const activity = this.activities.find(a => a.id === id);
    if (activity) {
      activity.subSteps.push({ text, status, timestamp: new Date().toISOString() });
    }
  },

  completeSubStep(id, index) {
    const activity = this.activities.find(a => a.id === id);
    if (activity && activity.subSteps[index]) {
      activity.subSteps[index].status = 'completed';
    }
  },

  reset() {
    this.activities = [];
  },

  getAll() {
    return [...this.activities];
  },

  formatDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diff = Math.round((end - start) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  }
};

// Tool label mapping for user-friendly display
const toolLabels = {
  'check_event_logs': 'Checking Windows Event Logs',
  'check_disk_health': 'Analyzing Disk Health (SMART)',
  'check_system_resources': 'Checking CPU, RAM & GPU',
  'check_drivers': 'Scanning Device Drivers',
  'check_network': 'Testing Network Connectivity',
  'run_powershell_diagnostic': 'Running PowerShell Diagnostic',
  'propose_fix': 'Preparing Fix Recommendation'
};

// IPC Handlers for communication with renderer process
ipcMain.handle('start-diagnosis', async (event, problemType) => {
  console.log(`Starting AI-powered diagnosis for: ${problemType}`);

  // Use ConversationalDiagnosticAgent for ALL diagnostics (with auto-fix capability)
  if (!conversationalAgent) {
    const { ConversationalDiagnosticAgent } = require('../agents/ConversationalDiagnosticAgent');
    conversationalAgent = new ConversationalDiagnosticAgent();
  }

  // Reset activity tracker for new diagnosis
  activityTracker.reset();

  try {
    // Enhanced callback for tool use notifications with activity tracking
    const onToolUse = (toolData) => {
      // Send basic tool-use event for backwards compatibility
      event.sender.send('tool-use', toolData);

      // Track activity for visual progress
      if (toolData.status === 'executing') {
        const details = toolLabels[toolData.tool] || `Running ${toolData.tool}`;
        const activityId = activityTracker.start(toolData.tool, details);
        toolData.activityId = activityId;

        // Send full activity update
        event.sender.send('activity-update', {
          type: 'start',
          activityId,
          activities: activityTracker.getAll()
        });
      }
    };

    // Run playbook-guided diagnosis
    const result = await conversationalAgent.runPlaybookDiagnosis(problemType, onToolUse);

    // Mark all activities as complete
    activityTracker.activities.forEach(a => {
      if (a.status === 'running') {
        activityTracker.complete(a.id, 'Completed');
      }
    });

    event.sender.send('activity-update', {
      type: 'complete',
      activities: activityTracker.getAll()
    });

    return {
      success: true,
      results: result.analysis,
      proposedFix: result.proposedFix || null,
      conversationMode: true // Signals UI to show fix approval if needed
    };
  } catch (error) {
    console.error('Diagnosis error:', error);

    // Mark current activity as errored
    const runningActivity = activityTracker.activities.find(a => a.status === 'running');
    if (runningActivity) {
      activityTracker.error(runningActivity.id, error.message);
    }

    event.sender.send('activity-update', {
      type: 'error',
      error: error.message,
      activities: activityTracker.getAll()
    });

    return { success: false, error: error.message };
  }
});

ipcMain.handle('execute-fix', async (event, fix) => {
  console.log(`Executing fix:`, fix);
  const { SafetyGuard } = require('../safety/SafetyGuard');
  const guard = new SafetyGuard();

  // Set up progress callback
  guard.onProgress = (progressData) => {
    event.sender.send('fix-progress', progressData);
  };

  try {
    const result = await guard.executeFix(fix);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-system-info', async () => {
  const { SystemInfo } = require('../system/SystemInfo');
  return await SystemInfo.gather();
});

// Check if running as administrator
ipcMain.handle('check-admin-status', async () => {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  try {
    await execPromise('net session');
    return { isAdmin: true };
  } catch (error) {
    return { isAdmin: false };
  }
});

// Audit Log IPC Handlers
ipcMain.handle('get-audit-logs', async (event, filter = {}) => {
  const AuditLogger = require('../utils/AuditLogger');
  const logger = new AuditLogger();
  return logger.getLogs(filter);
});

ipcMain.handle('get-recent-activity', async (event, limit = 50) => {
  const AuditLogger = require('../utils/AuditLogger');
  const logger = new AuditLogger();
  return logger.getRecentActivity(limit);
});

ipcMain.handle('get-audit-statistics', async () => {
  const AuditLogger = require('../utils/AuditLogger');
  const logger = new AuditLogger();
  return logger.getStatistics();
});

ipcMain.handle('get-diagnostic-logs', async (event, diagnosticId) => {
  const AuditLogger = require('../utils/AuditLogger');
  const logger = new AuditLogger();
  return logger.getDiagnosticLogs(diagnosticId);
});

ipcMain.handle('export-audit-logs', async () => {
  const AuditLogger = require('../utils/AuditLogger');
  const logger = new AuditLogger();
  return logger.exportLogs();
});

ipcMain.handle('clear-audit-logs', async () => {
  const AuditLogger = require('../utils/AuditLogger');
  const logger = new AuditLogger();
  logger.clearLogs();
  return { success: true };
});

// Chat Assistant IPC Handlers
ipcMain.handle('send-chat-message', async (event, message, context) => {
  console.log('Chat message received:', message);
  console.log('Diagnostic context:', context ? 'Provided' : 'None');

  // Lazy-load ChatAssistant
  if (!chatAssistant) {
    const { ChatAssistant } = require('../agents/ChatAssistant');
    chatAssistant = new ChatAssistant();
  }

  try {
    const result = await chatAssistant.chat(message, context);
    return result;
  } catch (error) {
    console.error('Chat error:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('clear-chat-history', async () => {
  if (chatAssistant) {
    chatAssistant.clearHistory();
  }
  return { success: true };
});

ipcMain.handle('get-chat-history', async () => {
  if (chatAssistant) {
    return chatAssistant.getHistory();
  }
  return [];
});

// Conversational Diagnostic Agent IPC Handlers
ipcMain.handle('conversational-chat', async (event, message) => {
  console.log('Conversational diagnostic chat:', message);
  logger.info('Diagnostic', 'User started diagnostic chat', { message: message.substring(0, 100) });

  // Lazy-load Conversational Agent
  if (!conversationalAgent) {
    const { ConversationalDiagnosticAgent } = require('../agents/ConversationalDiagnosticAgent');
    conversationalAgent = new ConversationalDiagnosticAgent();
    logger.info('Diagnostic', 'ConversationalDiagnosticAgent initialized');
  }

  // Reset activity tracker for new message processing
  activityTracker.reset();

  try {
    // Track which activities have been started for this tool
    const toolActivityMap = new Map();

    // Enhanced callback for tool use with activity tracking
    const onToolUse = (toolData) => {
      // Log tool usage
      logger.logDiagnostic(toolData.tool, toolData.status, toolData);

      // Send basic tool-use event for backwards compatibility
      event.sender.send('tool-use', toolData);

      // Track activity for visual progress
      if (toolData.status === 'executing') {
        const details = toolLabels[toolData.tool] || `Running ${toolData.tool}`;
        const activityId = activityTracker.start(toolData.tool, details);
        toolActivityMap.set(toolData.tool, activityId);

        // Send full activity update
        event.sender.send('activity-update', {
          type: 'start',
          activityId,
          tool: toolData.tool,
          activities: activityTracker.getAll()
        });
      }
    };

    const result = await conversationalAgent.chat(message, onToolUse);

    // Mark all activities as complete
    activityTracker.activities.forEach(a => {
      if (a.status === 'running') {
        activityTracker.complete(a.id, 'Completed');
      }
    });

    event.sender.send('activity-update', {
      type: 'complete',
      activities: activityTracker.getAll()
    });

    logger.success('Diagnostic', 'Diagnostic chat completed', {
      hasProposedFix: !!result.proposedFix,
      responseLength: result.response?.length || 0
    });

    return {
      success: true,
      response: result.response,
      proposedFix: result.proposedFix || null
    };
  } catch (error) {
    console.error('Conversational chat error:', error);
    logger.error('Diagnostic', 'Diagnostic chat failed', { error: error.message, stack: error.stack });

    // Mark current activity as errored
    const runningActivity = activityTracker.activities.find(a => a.status === 'running');
    if (runningActivity) {
      activityTracker.error(runningActivity.id, error.message);
    }

    event.sender.send('activity-update', {
      type: 'error',
      error: error.message,
      activities: activityTracker.getAll()
    });

    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('execute-approved-fix', async (event, fix) => {
  console.log('Executing approved fix:', fix.title);
  logger.logFix('Starting', fix.title, { riskLevel: fix.riskLevel, steps: fix.steps?.length || 0 });

  // Lazy-load FixExecutor
  if (!fixExecutor) {
    const { FixExecutor } = require('../agents/FixExecutor');
    fixExecutor = new FixExecutor();
  }

  // Set up progress callback
  const onProgress = (progressData) => {
    // Log significant progress events
    if (['step-complete', 'step-failed', 'complete', 'error'].includes(progressData.stage)) {
      logger.logFix(progressData.stage, fix.title, {
        message: progressData.message,
        percentage: progressData.percentage
      });
    }
    event.sender.send('fix-progress', progressData);
  };

  try {
    const result = await fixExecutor.executeFix(fix, onProgress);
    logger.success('Fix', `Fix completed: ${fix.title}`, {
      success: result.success,
      successfulSteps: result.summary?.successfulSteps,
      failedSteps: result.summary?.failedSteps
    });
    return result;
  } catch (error) {
    console.error('Fix execution error:', error);
    logger.error('Fix', `Fix failed: ${fix.title}`, { error: error.message, stack: error.stack });
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('rollback-fix', async (event) => {
  console.log('Rolling back fix...');

  if (!fixExecutor) {
    const { FixExecutor } = require('../agents/FixExecutor');
    fixExecutor = new FixExecutor();
  }

  const onProgress = (progressData) => {
    event.sender.send('rollback-progress', progressData);
  };

  try {
    const result = await fixExecutor.rollback(onProgress);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('reset-conversation', async () => {
  if (conversationalAgent) {
    conversationalAgent.resetConversation();
    logger.info('Conversation', 'Conversation reset by user');
  }
  return { success: true };
});

// Logger IPC Handlers
ipcMain.handle('get-logs', async (event, options = {}) => {
  const { count = 100, level, category } = options;

  let logs = logger.getLogs();

  if (level) {
    logs = logs.filter(l => l.level === level);
  }
  if (category) {
    logs = logs.filter(l => l.category === category);
  }

  return logs.slice(-count);
});

ipcMain.handle('get-errors', async () => {
  return logger.getErrors();
});

ipcMain.handle('get-log-file-path', async () => {
  return logger.getLogFilePath();
});

ipcMain.handle('export-logs', async (event, exportPath) => {
  const { dialog } = require('electron');

  // If no path provided, show save dialog
  if (!exportPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Logs',
      defaultPath: `pc-health-logs-${new Date().toISOString().split('T')[0]}.txt`,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }
    exportPath = result.filePath;
  }

  return logger.exportLogs(exportPath);
});

ipcMain.handle('clear-logs', async () => {
  logger.clearLogs();
  return { success: true };
});

ipcMain.handle('open-log-folder', async () => {
  const { shell } = require('electron');
  const logPath = logger.getLogFilePath();
  if (logPath) {
    const path = require('path');
    shell.openPath(path.dirname(logPath));
    return { success: true };
  }
  return { success: false, error: 'No log file path' };
});

// Subscribe to log updates (for real-time log viewer)
ipcMain.on('subscribe-logs', (event) => {
  const removeListener = logger.addListener((entry) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-entry', entry);
    }
  });

  // Clean up when window closes
  event.sender.on('destroyed', () => {
    removeListener();
  });
});

// Report Generation IPC Handlers
const reportGenerator = new ReportGenerator(logger);

ipcMain.handle('generate-report', async (event, options = {}) => {
  logger.info('Report', 'Generating error report');
  try {
    const report = await reportGenerator.generateReport(options);
    return { success: true, report };
  } catch (error) {
    logger.error('Report', 'Failed to generate report', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('copy-report-to-clipboard', async (event, options = {}) => {
  logger.info('Report', 'Copying report to clipboard');
  try {
    const report = await reportGenerator.generateReport(options);
    reportGenerator.copyToClipboard(report);
    logger.success('Report', 'Report copied to clipboard');
    return { success: true };
  } catch (error) {
    logger.error('Report', 'Failed to copy report', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-report', async (event, options = {}) => {
  const { dialog } = require('electron');
  logger.info('Report', 'Saving report to file');

  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Error Report',
      defaultPath: `pc-health-report-${new Date().toISOString().split('T')[0]}.txt`,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    const report = await reportGenerator.generateReport(options);
    await reportGenerator.saveReport(report, result.filePath);
    logger.success('Report', 'Report saved', { path: result.filePath });
    return { success: true, path: result.filePath };
  } catch (error) {
    logger.error('Report', 'Failed to save report', { error: error.message });
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-report-text', async (event, options = {}) => {
  try {
    const report = await reportGenerator.generateReport(options);
    const text = reportGenerator.formatAsText(report);
    return { success: true, text };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Error Reporting IPC Handlers (Sentry integration)
ipcMain.handle('report-error', async (event, errorData, context = {}) => {
  try {
    const error = new Error(errorData.message || 'Unknown error');
    error.name = errorData.name || 'Error';
    error.stack = errorData.stack || error.stack;

    sentry.captureException(error, {
      ...context,
      source: 'renderer',
      url: errorData.url,
      componentStack: errorData.componentStack
    });

    logger.error('Renderer', 'Error reported to Sentry', {
      message: errorData.message,
      context
    });

    return { success: true };
  } catch (err) {
    logger.error('Sentry', 'Failed to report error', { error: err.message });
    return { success: false, error: err.message };
  }
});

ipcMain.handle('report-message', async (event, message, level = 'info', context = {}) => {
  try {
    sentry.captureMessage(message, level, {
      ...context,
      source: 'renderer'
    });

    logger.info('Renderer', `Message reported to Sentry: ${message}`, { level, context });

    return { success: true };
  } catch (err) {
    logger.error('Sentry', 'Failed to report message', { error: err.message });
    return { success: false, error: err.message };
  }
});

console.log('PC Health Assistant - Main process started');
