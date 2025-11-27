/**
 * Sentry Crash Reporting Configuration
 * Captures and reports application crashes and errors
 */

const Sentry = require('@sentry/electron/main');
const { app } = require('electron');

// Sentry DSN - Replace with your actual Sentry DSN from https://sentry.io
// Create a free account and project to get your DSN
const SENTRY_DSN = process.env.SENTRY_DSN || '';

let isInitialized = false;

/**
 * Initialize Sentry crash reporting
 * Should be called as early as possible in app startup
 */
function initSentry() {
  // Skip if no DSN configured or already initialized
  if (!SENTRY_DSN || isInitialized) {
    if (!SENTRY_DSN) {
      console.log('Sentry: DSN not configured, crash reporting disabled');
    }
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,

      // Set the release version for tracking which version has issues
      release: `pc-health-assistant@${app.getVersion()}`,

      // Environment (production vs development)
      environment: app.isPackaged ? 'production' : 'development',

      // Always enable - we want crash reports in all environments
      enabled: true,

      // Sample rate for error events (1.0 = 100%)
      sampleRate: 1.0,

      // Attach user info if available
      autoSessionTracking: true,

      // Debug mode - set to true for troubleshooting
      debug: false,

      // Before sending an event, you can modify or drop it
      beforeSend(event, hint) {
        // Remove any sensitive data
        if (event.extra) {
          delete event.extra.apiKey;
          delete event.extra.password;
          delete event.extra.token;
        }

        // Add app-specific context
        event.tags = {
          ...event.tags,
          platform: process.platform,
          arch: process.arch,
          electron_version: process.versions.electron,
          node_version: process.versions.node
        };

        return event;
      },

      // Configure which errors to ignore
      ignoreErrors: [
        // Ignore network errors that are expected
        'net::ERR_INTERNET_DISCONNECTED',
        'net::ERR_NETWORK_CHANGED',
        // Ignore user-initiated cancellations
        'AbortError',
        'User cancelled'
      ]
    });

    isInitialized = true;
    console.log('Sentry: Crash reporting initialized');
    console.log('Sentry: DSN =', SENTRY_DSN.substring(0, 30) + '...');

  } catch (error) {
    console.error('Sentry: Failed to initialize', error);
  }
}

/**
 * Send a test error to verify Sentry is working
 */
function sendTestError() {
  if (!isInitialized) {
    console.log('Sentry: Cannot send test - not initialized');
    return false;
  }

  try {
    console.log('Sentry: Sending test error...');
    Sentry.captureMessage('Test message from PC Health Assistant - Sentry is working!', 'info');
    Sentry.captureException(new Error('TEST ERROR: PC Health Assistant Sentry Test'));
    console.log('Sentry: Test error sent successfully');
    return true;
  } catch (error) {
    console.error('Sentry: Failed to send test error', error);
    return false;
  }
}

/**
 * Manually capture an exception
 * Use this for caught errors that should be reported
 */
function captureException(error, context = {}) {
  if (!isInitialized) return;

  Sentry.captureException(error, {
    extra: context
  });
}

/**
 * Capture a message (non-error event)
 */
function captureMessage(message, level = 'info', context = {}) {
  if (!isInitialized) return;

  Sentry.captureMessage(message, {
    level,
    extra: context
  });
}

/**
 * Set user context for error reports
 * Helps identify which user experienced the issue
 */
function setUser(userId, email = null) {
  if (!isInitialized) return;

  Sentry.setUser({
    id: userId,
    email: email
  });
}

/**
 * Clear user context (e.g., on logout)
 */
function clearUser() {
  if (!isInitialized) return;

  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 * Breadcrumbs show the trail of events leading to an error
 */
function addBreadcrumb(message, category = 'app', data = {}) {
  if (!isInitialized) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000
  });
}

/**
 * Set custom tags for filtering errors in Sentry dashboard
 */
function setTag(key, value) {
  if (!isInitialized) return;

  Sentry.setTag(key, value);
}

/**
 * Set extra context data
 */
function setExtra(key, value) {
  if (!isInitialized) return;

  Sentry.setExtra(key, value);
}

/**
 * Wrap a function to automatically capture errors
 */
function wrapWithSentry(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, {
        ...context,
        args: args.map(arg => typeof arg === 'object' ? '[object]' : arg)
      });
      throw error;
    }
  };
}

module.exports = {
  initSentry,
  sendTestError,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  setTag,
  setExtra,
  wrapWithSentry
};
