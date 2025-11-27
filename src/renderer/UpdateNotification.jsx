import React, { useState, useEffect } from 'react';

/**
 * Update Notification Component
 * Shows when app updates are available and handles the update flow
 */
function UpdateNotification() {
  const [updateState, setUpdateState] = useState('idle'); // idle, checking, available, downloading, downloaded, error
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    // Get current version on mount
    if (window.pcHealthAPI?.getAppVersion) {
      window.pcHealthAPI.getAppVersion().then(version => {
        setCurrentVersion(version);
      });
    }

    // Set up update event listeners
    let cleanupFns = [];

    if (window.pcHealthAPI) {
      // Update available
      if (window.pcHealthAPI.onUpdateAvailable) {
        const cleanup = window.pcHealthAPI.onUpdateAvailable((info) => {
          setUpdateState('available');
          setUpdateInfo(info);
          setDismissed(false);
        });
        cleanupFns.push(cleanup);
      }

      // Download progress
      if (window.pcHealthAPI.onUpdateDownloadProgress) {
        const cleanup = window.pcHealthAPI.onUpdateDownloadProgress((progress) => {
          setUpdateState('downloading');
          setDownloadProgress(progress.percent);
        });
        cleanupFns.push(cleanup);
      }

      // Update downloaded
      if (window.pcHealthAPI.onUpdateDownloaded) {
        const cleanup = window.pcHealthAPI.onUpdateDownloaded((info) => {
          setUpdateState('downloaded');
          setUpdateInfo(info);
        });
        cleanupFns.push(cleanup);
      }

      // Update error
      if (window.pcHealthAPI.onUpdateError) {
        const cleanup = window.pcHealthAPI.onUpdateError((err) => {
          setUpdateState('error');
          setError(err.error);
        });
        cleanupFns.push(cleanup);
      }

      // Update status
      if (window.pcHealthAPI.onUpdateStatus) {
        const cleanup = window.pcHealthAPI.onUpdateStatus((status) => {
          if (status.status === 'checking') {
            setUpdateState('checking');
          } else if (status.status === 'up-to-date') {
            setUpdateState('idle');
          }
        });
        cleanupFns.push(cleanup);
      }
    }

    return () => {
      cleanupFns.forEach(fn => fn && fn());
    };
  }, []);

  const handleCheckForUpdates = async () => {
    setUpdateState('checking');
    setError(null);

    try {
      const result = await window.pcHealthAPI.checkForUpdates();
      if (result.status === 'up-to-date') {
        setUpdateState('idle');
      }
    } catch (err) {
      setUpdateState('error');
      setError(err.message);
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdateState('downloading');
    setDownloadProgress(0);

    try {
      await window.pcHealthAPI.downloadUpdate();
    } catch (err) {
      setUpdateState('error');
      setError(err.message);
    }
  };

  const handleInstallUpdate = () => {
    window.pcHealthAPI.installUpdate();
  };

  const handleSkipVersion = async () => {
    if (updateInfo?.version) {
      await window.pcHealthAPI.skipUpdate(updateInfo.version);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't render if no update or dismissed
  if (updateState === 'idle' || updateState === 'checking' || dismissed) {
    return null;
  }

  return (
    <div className="update-notification-overlay">
      <div className={`update-notification ${updateState}`}>
        {/* Close button */}
        {updateState !== 'downloading' && (
          <button
            className="update-close-btn"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            x
          </button>
        )}

        {/* Update Available */}
        {updateState === 'available' && (
          <>
            <div className="update-header">
              <span className="update-icon">
                <span role="img" aria-label="update">🎉</span>
              </span>
              <h3>Update Available!</h3>
            </div>

            <div className="update-content">
              <p className="update-version">
                Version <strong>{updateInfo?.version}</strong> is ready to download
              </p>
              {currentVersion && (
                <p className="current-version">
                  You're currently on version {currentVersion}
                </p>
              )}

              {updateInfo?.releaseNotes && (
                <div className="update-release-notes">
                  <strong>What's new:</strong>
                  <div
                    className="release-notes-content"
                    dangerouslySetInnerHTML={{
                      __html: typeof updateInfo.releaseNotes === 'string'
                        ? updateInfo.releaseNotes
                        : updateInfo.releaseNotes?.map(note => note.note || note).join('<br/>')
                    }}
                  />
                </div>
              )}
            </div>

            <div className="update-actions">
              <button
                className="update-btn secondary"
                onClick={handleSkipVersion}
              >
                Skip This Version
              </button>
              <button
                className="update-btn primary"
                onClick={handleDownloadUpdate}
              >
                Download Update
              </button>
            </div>
          </>
        )}

        {/* Downloading */}
        {updateState === 'downloading' && (
          <>
            <div className="update-header">
              <span className="update-icon downloading">
                <span role="img" aria-label="downloading">⬇️</span>
              </span>
              <h3>Downloading Update...</h3>
            </div>

            <div className="update-content">
              <div className="download-progress-bar">
                <div
                  className="download-progress-fill"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="download-progress-text">{downloadProgress}% complete</p>
            </div>
          </>
        )}

        {/* Downloaded - Ready to Install */}
        {updateState === 'downloaded' && (
          <>
            <div className="update-header">
              <span className="update-icon ready">
                <span role="img" aria-label="ready">✅</span>
              </span>
              <h3>Update Ready to Install</h3>
            </div>

            <div className="update-content">
              <p>
                Version <strong>{updateInfo?.version}</strong> has been downloaded.
                Restart the app to install the update.
              </p>
              <p className="update-warning">
                <span role="img" aria-label="warning">⚠️</span> The app will close and restart automatically.
              </p>
            </div>

            <div className="update-actions">
              <button
                className="update-btn secondary"
                onClick={handleDismiss}
              >
                Later
              </button>
              <button
                className="update-btn primary"
                onClick={handleInstallUpdate}
              >
                Restart & Install
              </button>
            </div>
          </>
        )}

        {/* Error */}
        {updateState === 'error' && (
          <>
            <div className="update-header">
              <span className="update-icon error">
                <span role="img" aria-label="error">❌</span>
              </span>
              <h3>Update Error</h3>
            </div>

            <div className="update-content">
              <p className="update-error-message">
                Failed to check for updates: {error}
              </p>
            </div>

            <div className="update-actions">
              <button
                className="update-btn secondary"
                onClick={handleDismiss}
              >
                Dismiss
              </button>
              <button
                className="update-btn primary"
                onClick={handleCheckForUpdates}
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default UpdateNotification;
