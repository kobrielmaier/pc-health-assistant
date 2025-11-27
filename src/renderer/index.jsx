/**
 * React entry point
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
import './index.css';

// Set up global error handler for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  if (window.pcHealthAPI?.reportError) {
    window.pcHealthAPI.reportError({
      message: message,
      name: error?.name || 'Error',
      stack: error?.stack || `${source}:${lineno}:${colno}`
    }, {
      type: 'uncaught',
      source: 'window.onerror'
    });
  }
};

// Set up unhandled promise rejection handler
window.onunhandledrejection = (event) => {
  if (window.pcHealthAPI?.reportError) {
    const error = event.reason;
    window.pcHealthAPI.reportError({
      message: error?.message || String(error),
      name: error?.name || 'UnhandledPromiseRejection',
      stack: error?.stack
    }, {
      type: 'unhandledRejection',
      source: 'window.onunhandledrejection'
    });
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
