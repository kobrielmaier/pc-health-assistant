/**
 * Auto-Updater Module
 * Handles checking for updates and notifying users when updates are available
 */

const { autoUpdater } = require('electron-updater');
const { app, ipcMain } = require('electron');
const { logger } = require('./logger');

let mainWindow = null;

/**
 * Initialize the auto-updater
 * @param {BrowserWindow} window - The main application window
 */
function initAutoUpdater(window) {
  mainWindow = window;

  // Configure auto-updater
  autoUpdater.autoDownload = false; // Don't auto-download, let user decide
  autoUpdater.autoInstallOnAppQuit = true; // Install on quit if downloaded
  autoUpdater.allowDowngrade = false;

  // Set up event handlers
  setupEventHandlers();

  // Set up IPC handlers for renderer communication
  setupIpcHandlers();

  // Check for updates after a short delay (let app fully load)
  setTimeout(() => {
    checkForUpdates(true); // Silent check on startup
  }, 5000);

  logger.info('AutoUpdater', 'Auto-updater initialized');
}

/**
 * Set up auto-updater event handlers
 */
function setupEventHandlers() {
  // Checking for updates
  autoUpdater.on('checking-for-update', () => {
    logger.info('AutoUpdater', 'Checking for updates...');
    sendToRenderer('update-status', { status: 'checking' });
  });

  // Update available
  autoUpdater.on('update-available', (info) => {
    logger.info('AutoUpdater', 'Update available', {
      version: info.version,
      releaseDate: info.releaseDate
    });

    sendToRenderer('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    });
  });

  // No update available
  autoUpdater.on('update-not-available', (info) => {
    logger.info('AutoUpdater', 'No update available', { currentVersion: app.getVersion() });
    sendToRenderer('update-status', {
      status: 'up-to-date',
      currentVersion: app.getVersion()
    });
  });

  // Download progress
  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update-download-progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
  });

  // Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    logger.success('AutoUpdater', 'Update downloaded', { version: info.version });
    sendToRenderer('update-downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes
    });
  });

  // Error handling
  autoUpdater.on('error', (error) => {
    logger.error('AutoUpdater', 'Update error', { error: error.message });
    sendToRenderer('update-error', {
      error: error.message
    });
  });
}

/**
 * Set up IPC handlers for update operations
 */
function setupIpcHandlers() {
  // Check for updates manually
  ipcMain.handle('check-for-updates', async () => {
    return await checkForUpdates(false);
  });

  // Download the update
  ipcMain.handle('download-update', async () => {
    try {
      logger.info('AutoUpdater', 'Starting update download');
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      logger.error('AutoUpdater', 'Download failed', { error: error.message });
      return { success: false, error: error.message };
    }
  });

  // Install update and restart
  ipcMain.handle('install-update', () => {
    logger.info('AutoUpdater', 'Installing update and restarting');
    autoUpdater.quitAndInstall(false, true);
  });

  // Get current version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Skip this update version
  ipcMain.handle('skip-update', async (event, version) => {
    const Store = require('electron-store');
    const store = new Store();
    store.set('skippedVersion', version);
    logger.info('AutoUpdater', 'User skipped update', { version });
    return { success: true };
  });
}

/**
 * Check for available updates
 * @param {boolean} silent - If true, don't notify if no update available
 */
async function checkForUpdates(silent = false) {
  // Skip in development mode
  if (!app.isPackaged) {
    logger.info('AutoUpdater', 'Skipping update check in development mode');
    return {
      success: true,
      status: 'development',
      message: 'Update checks disabled in development mode'
    };
  }

  try {
    const result = await autoUpdater.checkForUpdates();

    if (result && result.updateInfo) {
      // Check if user has skipped this version
      const Store = require('electron-store');
      const store = new Store();
      const skippedVersion = store.get('skippedVersion');

      if (skippedVersion === result.updateInfo.version) {
        logger.info('AutoUpdater', 'Update available but skipped by user', {
          version: result.updateInfo.version
        });
        return {
          success: true,
          status: 'skipped',
          version: result.updateInfo.version
        };
      }

      return {
        success: true,
        status: 'available',
        version: result.updateInfo.version,
        releaseDate: result.updateInfo.releaseDate
      };
    }

    return {
      success: true,
      status: 'up-to-date',
      currentVersion: app.getVersion()
    };
  } catch (error) {
    logger.error('AutoUpdater', 'Check failed', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send message to renderer process
 */
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

/**
 * Set the feed URL (useful for testing or custom update servers)
 */
function setFeedURL(url) {
  autoUpdater.setFeedURL(url);
}

module.exports = {
  initAutoUpdater,
  checkForUpdates,
  setFeedURL
};
