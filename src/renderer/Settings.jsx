import React, { useState, useEffect } from 'react';

function Settings({ onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load current settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentSettings = await window.pcHealthAPI.getSettings();
      setSettings(currentSettings);

      // If we have an API key, get usage info
      if (currentSettings.hasApiKey) {
        const usageResult = await window.pcHealthAPI.getUsage();
        if (usageResult.success) {
          setUsage(usageResult);
        }
      }
    } catch (err) {
      setError('Failed to load settings');
      console.error('Settings load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.pcHealthAPI.setApiKey(apiKey.trim());

      if (result.success) {
        setSuccess('API key saved successfully!');
        setApiKey(''); // Clear input
        await loadSettings(); // Reload settings to show updated state
      } else {
        setError(result.error || 'Failed to save API key');
      }
    } catch (err) {
      setError(err.message || 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    if (!confirm('Are you sure you want to remove your API key? You will need to enter it again to use AI features.')) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await window.pcHealthAPI.removeApiKey();
      setSuccess('API key removed');
      setUsage(null);
      await loadSettings();
    } catch (err) {
      setError(err.message || 'Failed to remove API key');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="settings-overlay">
        <div className="settings-modal">
          <div className="settings-loading">
            <div className="spinner"></div>
            <p>Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          {/* API Key Section */}
          <section className="settings-section">
            <h3>API Key</h3>
            <p className="section-description">
              Enter your PC Health Assistant API key to enable AI-powered diagnostics.
            </p>

            {/* Error/Success Messages */}
            {error && (
              <div className="settings-error">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
            {success && (
              <div className="settings-success">
                <span className="success-icon">✅</span>
                {success}
              </div>
            )}

            {settings?.hasApiKey ? (
              <div className="api-key-configured">
                <div className="api-key-status">
                  <span className="status-icon">✅</span>
                  <div className="status-text">
                    <strong>API Key Configured</strong>
                    <span className="key-preview">Your API key is securely stored</span>
                  </div>
                </div>

                {/* Usage Stats */}
                {usage && (
                  <div className="usage-stats">
                    <h4>This Month's Usage</h4>
                    <div className="usage-grid">
                      <div className="usage-item">
                        <span className="usage-label">Plan</span>
                        <span className="usage-value tier">
                          {usage.user?.tier === 'onetime' ? 'One-Time Fix' :
                           usage.user?.tier === 'monthly' ? 'Monthly' :
                           usage.user?.tier || 'Unknown'}
                          {usage.user?.is_lifetime && ' (Lifetime)'}
                        </span>
                      </div>
                      <div className="usage-item">
                        <span className="usage-label">Requests</span>
                        <span className="usage-value">{usage.usage?.requests || 0}</span>
                      </div>
                      <div className="usage-item">
                        <span className="usage-label">Tokens Used</span>
                        <span className="usage-value">{(usage.usage?.totalTokens || 0).toLocaleString()}</span>
                      </div>
                      <div className="usage-item">
                        <span className="usage-label">Usage</span>
                        <span className="usage-value">{usage.usage?.percentUsed || 0}%</span>
                      </div>
                    </div>

                    {/* Usage Progress Bar */}
                    <div className="usage-progress">
                      <div
                        className={`usage-progress-fill ${usage.usage?.percentUsed > 80 ? 'warning' : ''}`}
                        style={{ width: `${Math.min(usage.usage?.percentUsed || 0, 100)}%` }}
                      />
                    </div>
                    <p className="usage-limit">
                      {(usage.usage?.totalTokens || 0).toLocaleString()} / {(usage.limits?.monthlyTokenLimit || 0).toLocaleString()} tokens
                    </p>
                  </div>
                )}

                <button
                  className="remove-key-button"
                  onClick={handleRemoveApiKey}
                  disabled={isSaving}
                >
                  Remove API Key
                </button>
              </div>
            ) : (
              <div className="api-key-input-section">
                <div className="input-group">
                  <input
                    type="password"
                    placeholder="pch_live_..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    disabled={isSaving}
                    className="api-key-input"
                  />
                  <button
                    className="save-key-button"
                    onClick={handleSaveApiKey}
                    disabled={isSaving || !apiKey.trim()}
                  >
                    {isSaving ? 'Saving...' : 'Save Key'}
                  </button>
                </div>

                <div className="get-key-info">
                  <h4>Don't have an API key?</h4>
                  <p>Subscribe to PC Health Assistant to get your API key.</p>
                  <a
                    href="https://pc-health-api.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="get-key-link"
                  >
                    Get an API Key →
                  </a>
                </div>
              </div>
            )}
          </section>

          {/* About Section */}
          <section className="settings-section">
            <h3>About API Keys</h3>
            <div className="about-keys">
              <div className="about-item">
                <span className="about-icon">🔒</span>
                <div>
                  <strong>Secure Storage</strong>
                  <p>Your API key is stored securely on your device and never shared.</p>
                </div>
              </div>
              <div className="about-item">
                <span className="about-icon">☁️</span>
                <div>
                  <strong>Cloud Processing</strong>
                  <p>AI diagnostics are processed through our secure backend.</p>
                </div>
              </div>
              <div className="about-item">
                <span className="about-icon">📊</span>
                <div>
                  <strong>Usage Tracking</strong>
                  <p>Monitor your token usage to stay within your plan limits.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Settings;
