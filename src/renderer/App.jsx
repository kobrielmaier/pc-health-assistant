import React, { useState, useEffect } from 'react';
import './App.css';
import History from './History';
import ChatAssistant from './ChatAssistant';
import ConversationalDiagnostic from './ConversationalDiagnostic';
import Privacy from './Privacy';
import About from './About';
import Welcome from './Welcome';
import LogViewer from './LogViewer';
import UpdateNotification from './UpdateNotification';
import Settings from './Settings';

// Problem type options for users to choose from
const PROBLEM_TYPES = [
  {
    id: 'crash',
    title: 'Program/Game Keeps Crashing',
    icon: '💥',
    description: 'Apps or games crash unexpectedly'
  },
  {
    id: 'slow',
    title: 'Computer is Slow',
    icon: '🐌',
    description: 'System performance is sluggish'
  },
  {
    id: 'error',
    title: 'Getting Error Messages',
    icon: '⚠️',
    description: 'Recurring error pop-ups'
  },
  {
    id: 'hardware',
    title: 'Hardware Not Working',
    icon: '🔌',
    description: 'Device or hardware issues'
  },
  {
    id: 'network',
    title: 'Internet Problems',
    icon: '🌐',
    description: 'Connectivity or network issues'
  },
  {
    id: 'full-scan',
    title: 'Complete System Scan',
    icon: '🔍',
    description: 'Check everything'
  }
];

function App() {
  const [currentView, setCurrentView] = useState('home'); // home, diagnosing, results, fixing, history, privacy, about
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [diagnosisProgress, setDiagnosisProgress] = useState([]);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fixProgress, setFixProgress] = useState(null);
  const [fixLogs, setFixLogs] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [proposedFix, setProposedFix] = useState(null); // AI-proposed fix from diagnosis
  const [isAdmin, setIsAdmin] = useState(null); // null = checking, true = admin, false = not admin
  const [appVersion, setAppVersion] = useState('0.1.0');
  const [hasApiKey, setHasApiKey] = useState(null); // null = checking

  // Check admin status, API key, and get app version on mount
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const status = await window.pcHealthAPI.checkAdminStatus();
        setIsAdmin(status.isAdmin);
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      }
    };
    checkAdminStatus();

    // Check if API key is configured
    const checkApiKey = async () => {
      try {
        const settings = await window.pcHealthAPI.getSettings();
        setHasApiKey(settings.hasApiKey);
      } catch (error) {
        console.error('Failed to check API key:', error);
        setHasApiKey(false);
      }
    };
    checkApiKey();

    // Get app version
    if (window.pcHealthAPI?.getAppVersion) {
      window.pcHealthAPI.getAppVersion().then(version => {
        setAppVersion(version);
      }).catch(err => {
        console.error('Failed to get app version:', err);
      });
    }
  }, []);

  // Check if this is first run
  useEffect(() => {
    const welcomeComplete = localStorage.getItem('welcomeComplete');
    if (!welcomeComplete) {
      setShowWelcome(true);
    }
  }, []);

  // Listen for AI Assistant open event
  useEffect(() => {
    const handleOpenAI = () => {
      setCurrentView('conversational');
    };
    window.addEventListener('open-ai-assistant', handleOpenAI);
    return () => window.removeEventListener('open-ai-assistant', handleOpenAI);
  }, []);


  /**
   * Start diagnosis when user selects a problem
   */
  const handleStartDiagnosis = async (problemType) => {
    setSelectedProblem(problemType);
    setCurrentView('diagnosing');
    setIsLoading(true);
    setDiagnosisProgress([]);

    try {
      // Call the AI-powered diagnosis (with auto-fix capability)
      const result = await window.pcHealthAPI.startDiagnosis(problemType.id);

      if (result.success) {
        setResults(result.results);

        // Check if AI proposed a fix
        if (result.proposedFix) {
          setProposedFix(result.proposedFix);
          // Fix approval modal will appear automatically
        }

        setCurrentView('results');
      } else {
        alert(`Diagnosis failed: ${result.error}`);
        setCurrentView('home');
      }

    } catch (error) {
      alert(`Error: ${error.message}`);
      setCurrentView('home');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Execute a recommended fix
   */
  const handleExecuteFix = async (fix) => {
    if (!confirm(`Are you sure you want to apply this fix?\n\n${fix.title}\n\nThis will take approximately ${fix.howLong || fix.estimatedTime}.`)) {
      return;
    }

    // Reset progress state
    setFixProgress(null);
    setFixLogs([]);
    setCurrentView('fixing');

    // Set up progress listener
    const removeListener = window.pcHealthAPI.onFixProgress((progressData) => {
      setFixProgress(progressData);

      // Add to logs for display
      setFixLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        ...progressData
      }]);
    });

    try {
      const result = await window.pcHealthAPI.executeFix(fix);

      if (result.success) {
        alert('Fix applied successfully!');
        setCurrentView('home');
      } else {
        alert(`Fix failed: ${result.error}`);
        setCurrentView('results');
      }

    } catch (error) {
      alert(`Error applying fix: ${error.message}`);
      setCurrentView('results');
    } finally {
      // Clean up listener
      removeListener();
    }
  };

  // Render different views based on current state
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>🖥️ PC Health Assistant</h1>
            <p className="tagline">AI-powered computer diagnostics and repair</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="history-nav-button"
              onClick={() => setCurrentView('conversational')}
            >
              💬 AI Assistant
            </button>
            <button
              className={`history-nav-button ${!hasApiKey ? 'needs-attention' : ''}`}
              onClick={() => setShowSettings(true)}
            >
              ⚙️ Settings
            </button>
            {currentView === 'home' && (
              <>
                <button
                  className="history-nav-button"
                  onClick={() => setCurrentView('about')}
                >
                  📊 About
                </button>
                <button
                  className="history-nav-button"
                  onClick={() => setCurrentView('privacy')}
                >
                  🔒 Privacy
                </button>
                <button
                  className="history-nav-button"
                  onClick={() => setCurrentView('history')}
                >
                  📜 History
                </button>
              </>
            )}
            {currentView !== 'home' && currentView !== 'history' && currentView !== 'privacy' && currentView !== 'about' && (
              <button
                className="history-nav-button"
                onClick={() => setCurrentView('home')}
              >
                🏠 Home
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Admin Warning Banner */}
      {isAdmin === false && (
        <div className="admin-warning-banner">
          <div className="admin-warning-content">
            <span className="admin-warning-icon">🔒</span>
            <div className="admin-warning-text">
              <strong>Not running as Administrator</strong>
              <p>Some fixes may require administrator privileges. To enable all features, restart the app as administrator.</p>
            </div>
          </div>
        </div>
      )}

      <main className="app-main">
        {currentView === 'home' && (
          <HomeView
            problemTypes={PROBLEM_TYPES}
            onSelectProblem={handleStartDiagnosis}
          />
        )}

        {currentView === 'diagnosing' && (
          <DiagnosingView
            problemType={selectedProblem}
            progress={diagnosisProgress}
          />
        )}

        {currentView === 'results' && (
          <>
            <ResultsView
              results={results}
              onExecuteFix={handleExecuteFix}
              onBack={() => setCurrentView('home')}
            />

            {/* AI Fix Approval Modal */}
            {proposedFix && (
              <div className="fix-approval-overlay">
                <div className="fix-approval-modal">
                  <div className="fix-approval-header">
                    <h3>🔧 Fix Proposal</h3>
                    <span className={`risk-badge ${proposedFix.riskLevel}`}>
                      {proposedFix.riskLevel === 'low' && '🟢 Low Risk'}
                      {proposedFix.riskLevel === 'medium' && '🟡 Medium Risk'}
                      {proposedFix.riskLevel === 'high' && '🔴 High Risk'}
                    </span>
                  </div>

                  <div className="fix-approval-content">
                    <h4>{proposedFix.title}</h4>
                    <p className="fix-description">{proposedFix.description}</p>

                    <div className="fix-why">
                      <strong>Why this will help:</strong>
                      <p>{proposedFix.why}</p>
                    </div>

                    <div className="fix-details">
                      <div className="fix-detail-item">
                        <span className="detail-label">⏱️ Time:</span>
                        <span>{proposedFix.estimatedTime || '5-10 minutes'}</span>
                      </div>
                      {proposedFix.requiresRestart && (
                        <div className="fix-detail-item warning">
                          <span className="detail-label">⚠️ Restart:</span>
                          <span>Required after fix</span>
                        </div>
                      )}
                      {proposedFix.requiresAdmin && (
                        <div className="fix-detail-item warning">
                          <span className="detail-label">🔒 Admin:</span>
                          <span>Administrator privileges required</span>
                        </div>
                      )}
                    </div>

                    <div className="fix-steps-preview">
                      <strong>What I'll do:</strong>
                      <ol>
                        {proposedFix.steps && proposedFix.steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {(proposedFix.riskLevel === 'medium' || proposedFix.riskLevel === 'high') && (
                      <div className="safety-notice">
                        <span className="safety-icon">🛡️</span>
                        <div>
                          <strong>Safety First</strong>
                          <p>A system restore point will be created automatically before making changes.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="fix-approval-actions">
                    <button
                      className="reject-button"
                      onClick={() => setProposedFix(null)}
                    >
                      ❌ No Thanks
                    </button>
                    <button
                      className="approve-button"
                      onClick={async () => {
                        setCurrentView('fixing');
                        const result = await window.pcHealthAPI.executeApprovedFix(proposedFix);
                        setProposedFix(null);
                        if (result.success) {
                          alert('Fix completed successfully!');
                          setCurrentView('home');
                        } else {
                          alert(`Fix failed: ${result.error}`);
                          setCurrentView('results');
                        }
                      }}
                    >
                      ✅ Yes, Fix It!
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {currentView === 'fixing' && (
          <FixingView progress={fixProgress} logs={fixLogs} />
        )}

        {currentView === 'history' && (
          <History onBack={() => setCurrentView('home')} />
        )}

        {currentView === 'privacy' && (
          <Privacy onBack={() => setCurrentView('home')} />
        )}

        {currentView === 'about' && (
          <About onBack={() => setCurrentView('home')} />
        )}

        {currentView === 'conversational' && (
          <ConversationalDiagnostic />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <span className="footer-icon">🛡️</span>
            <span>Protected & Open Source</span>
          </div>
          <div className="footer-section">
            <span className="footer-icon">📄</span>
            <span>MIT License</span>
          </div>
          <div className="footer-section">
            <span className="footer-icon">📋</span>
            <button
              className="footer-link"
              onClick={() => setShowLogViewer(true)}
            >
              View Logs
            </button>
          </div>
          <div className="footer-section">
            <span className="footer-icon">🔒</span>
            <button
              className="footer-link"
              onClick={() => setCurrentView('privacy')}
            >
              Privacy Policy
            </button>
          </div>
          <div className="footer-section">
            <span className="footer-version">v{appVersion}</span>
          </div>
        </div>
      </footer>

      {/* Chat Assistant Overlay */}
      {showChat && (
        <ChatAssistant
          onClose={() => setShowChat(false)}
          diagnosticContext={{
            currentView,
            selectedProblem,
            results
          }}
        />
      )}

      {/* Log Viewer */}
      {showLogViewer && (
        <LogViewer onClose={() => setShowLogViewer(false)} />
      )}

      {/* Welcome Screen - First Run */}
      {showWelcome && (
        <Welcome onComplete={() => setShowWelcome(false)} />
      )}

      {/* Update Notification */}
      <UpdateNotification />

      {/* Settings Modal */}
      {showSettings && (
        <Settings
          onClose={() => {
            setShowSettings(false);
            // Refresh API key status when closing settings
            window.pcHealthAPI.getSettings().then(settings => {
              setHasApiKey(settings.hasApiKey);
            }).catch(console.error);
          }}
        />
      )}

      {/* API Key Required Banner */}
      {hasApiKey === false && currentView === 'home' && (
        <div className="api-key-banner">
          <div className="api-key-banner-content">
            <span className="api-key-banner-icon">🔑</span>
            <div className="api-key-banner-text">
              <strong>API Key Required</strong>
              <p>Configure your API key in Settings to use AI-powered diagnostics.</p>
            </div>
            <button
              className="api-key-banner-button"
              onClick={() => setShowSettings(true)}
            >
              Configure Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Home View - Problem selection
 */
function HomeView({ problemTypes, onSelectProblem }) {
  return (
    <div className="home-view">
      {/* AI Assistant - Featured Section */}
      <div className="ai-assistant-featured">
        <div className="ai-assistant-content">
          <div className="ai-assistant-header">
            <span className="ai-icon">🤖</span>
            <h2>AI Diagnostic Assistant</h2>
            <span className="ai-badge">✨ Powered by Claude</span>
          </div>
          <p className="ai-description">
            <strong>Have a specific issue?</strong> Chat with our AI assistant for targeted diagnosis and automatic fixes.
            Perfect for describing exact problems like "NVIDIA driver crashes when playing games" or verifying specific issues.
          </p>
          <div className="ai-features">
            <div className="ai-feature">
              <span className="feature-icon">🔍</span>
              <span>Investigates your specific issue step-by-step</span>
            </div>
            <div className="ai-feature">
              <span className="feature-icon">💬</span>
              <span>Asks clarifying questions to understand the problem</span>
            </div>
            <div className="ai-feature">
              <span className="feature-icon">🔧</span>
              <span>Proposes and executes fixes automatically</span>
            </div>
          </div>
          <button
            className="ai-assistant-cta"
            onClick={() => {
              const event = new CustomEvent('open-ai-assistant');
              window.dispatchEvent(event);
            }}
          >
            💬 Chat with AI Assistant
          </button>
        </div>
      </div>

      <div className="divider">
        <span>OR</span>
      </div>

      <h2>Quick Diagnostic Scans</h2>
      <p className="section-subtitle">Not sure what's wrong? Choose a common problem and let AI investigate everything</p>

      <div className="problem-grid">
        {problemTypes.map(problem => (
          <button
            key={problem.id}
            className="problem-card"
            onClick={() => onSelectProblem(problem)}
          >
            <span className="problem-icon">{problem.icon}</span>
            <h3>{problem.title}</h3>
            <p>{problem.description}</p>
          </button>
        ))}
      </div>

      {/* Trust Indicators */}
      <div className="trust-indicators">
        <div className="trust-badge">
          <span className="trust-icon">🛡️</span>
          <div className="trust-text">
            <strong>Protected by SafetyGuard</strong>
            <p>All investigations are read-only. Changes require your approval.</p>
          </div>
        </div>
        <div className="trust-badge">
          <span className="trust-icon">💾</span>
          <div className="trust-text">
            <strong>Automatic Restore Points</strong>
            <p>We create backups before any risky changes.</p>
          </div>
        </div>
        <div className="trust-badge">
          <span className="trust-icon">🏠</span>
          <div className="trust-text">
            <strong>Your Data Stays Local</strong>
            <p>Personal files never leave your computer.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Diagnosing View - Shows investigation progress
 */
function DiagnosingView({ problemType, progress }) {
  // Get progress steps based on problem type
  const getProgressSteps = (type) => {
    switch (type.id) {
      case 'network':
        return [
          '⏳ Testing internet connection',
          '⏳ Checking network adapters',
          '⏳ Checking firewall settings',
          '⏳ Checking proxy settings'
        ];
      case 'crash':
        return [
          '⏳ Checking Windows crash logs',
          '⏳ Finding crash dump files',
          '⏳ Analyzing drivers',
          '⏳ Checking system resources'
        ];
      case 'slow':
        return [
          '⏳ Checking startup programs',
          '⏳ Analyzing disk space',
          '⏳ Checking memory usage',
          '⏳ Scanning background processes'
        ];
      case 'hardware':
        return [
          '⏳ Checking Device Manager',
          '⏳ Verifying drivers',
          '⏳ Monitoring hardware health',
          '⏳ Checking USB devices'
        ];
      case 'error':
        return [
          '⏳ Searching event logs',
          '⏳ Checking system files',
          '⏳ Analyzing drivers',
          '⏳ Reviewing recent changes'
        ];
      default:
        return [
          '⏳ Running diagnostics',
          '⏳ Checking system health',
          '⏳ Analyzing logs',
          '⏳ Gathering information'
        ];
    }
  };

  const steps = getProgressSteps(problemType);

  return (
    <div className="diagnosing-view">
      {/* Read-Only Indicator */}
      <div className="read-only-banner">
        <span className="banner-icon">🔒</span>
        <div className="banner-text">
          <strong>Read-Only Investigation</strong>
          <p>We're only reading diagnostic data. No changes will be made to your system.</p>
        </div>
      </div>

      <div className="spinner"></div>
      <h2>Investigating...</h2>
      <p>Finding out why you're having issues with: {problemType.title}</p>

      <div className="progress-list">
        {steps.map((step, index) => (
          <div key={index} className="progress-item active">{step}</div>
        ))}
      </div>

      <p className="progress-note">This usually takes 30-60 seconds...</p>
    </div>
  );
}

/**
 * Results View - Shows findings and recommended fixes
 */
function ResultsView({ results, onExecuteFix, onBack }) {
  const [expandedFix, setExpandedFix] = React.useState(null);

  // Debug logging
  console.log('ResultsView - Full results:', results);
  console.log('ResultsView - Analysis:', results?.analysis);
  console.log('ResultsView - Issues:', results?.analysis?.issues);
  console.log('ResultsView - Fixes:', results?.analysis?.fixes);

  if (!results || !results.analysis) {
    return <div>No results available</div>;
  }

  const { analysis } = results;

  const toggleTechnicalDetails = (index) => {
    setExpandedFix(expandedFix === index ? null : index);
  };

  return (
    <div className="results-view">
      <h2>Diagnosis Complete</h2>

      <div className="summary-box">
        <h3>📋 What We Found:</h3>
        <ul className="summary-findings">
          {analysis.issues && analysis.issues.map((issue, idx) => (
            <li key={idx}>
              <span className={`summary-severity ${issue.severity}`}>
                {issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵'}
              </span>
              {issue.title}
            </li>
          ))}
        </ul>

        <h3>💡 What We Recommend:</h3>
        <ul className="summary-recommendations">
          {analysis.fixes && analysis.fixes.slice(0, 3).map((fix, idx) => (
            <li key={idx}>{fix.title}</li>
          ))}
        </ul>
      </div>

      {/* Severity & Risk Level Guide */}
      {(analysis.issues && analysis.issues.length > 0) || (analysis.fixes && analysis.fixes.length > 0) && (
        <div className="risk-guide">
          <h4>🛡️ Understanding Severity & Risk Levels</h4>
          <div className="risk-guide-items">
            <div className="risk-guide-item">
              <span className="risk-guide-badge high">🔴 High Risk</span>
              <p>Significant system changes. Restore point created with verification.</p>
            </div>
            <div className="risk-guide-item">
              <span className="risk-guide-badge medium">🟡 Medium Risk</span>
              <p>Modifies system settings or drivers. Restore point created automatically.</p>
            </div>
            <div className="risk-guide-item">
              <span className="risk-guide-badge low">🟢 Low Risk</span>
              <p>Minor changes with minimal system impact. Easily reversible.</p>
            </div>
            <div className="risk-guide-item">
              <span className="risk-guide-badge info">🔵 Info</span>
              <p>Informational findings. No immediate action needed, but good to know.</p>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Details Toggle */}
      <div className="advanced-toggle-container">
        <button
          className="advanced-toggle-button"
          onClick={() => setExpandedFix(expandedFix === 'details' ? null : 'details')}
        >
          {expandedFix === 'details' ? '🔽 Hide' : '🔼 Show'} Detailed Problem Report
        </button>
      </div>

      {expandedFix === 'details' && (
        <div className="issues-section">
          <h3>📋 Detailed Problems:</h3>
          {analysis.issues && analysis.issues.length > 0 ? (
            analysis.issues.map((issue, index) => (
              <div key={index} className={`issue-card severity-${issue.severity} priority-${issue.priority || 'medium'}`}>
                <div className="issue-header">
                  <span className={`severity-badge ${issue.severity}`}>
                    {issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵'}
                    {issue.severity.toUpperCase()}
                  </span>
                  {issue.priority && (
                    <span className={`priority-badge priority-${issue.priority}`}>
                      {issue.priority === 'immediate' ? '⚠️ URGENT' :
                       issue.priority === 'high' ? '🔸 HIGH' :
                       issue.priority === 'medium' ? '🔹 MEDIUM' : '⬜ LOW'}
                    </span>
                  )}
                  {issue.confidence !== undefined && (
                    <span className="confidence-badge" title={`Confidence: ${Math.round(issue.confidence * 100)}%`}>
                      {issue.confidence >= 0.9 ? '✅' : issue.confidence >= 0.8 ? '☑️' : '✓'}
                      {Math.round(issue.confidence * 100)}%
                    </span>
                  )}
                  <h4>{issue.title}</h4>
                </div>
                <div className="issue-body">
                  {issue.timeToFix && (
                    <p className={`time-to-fix priority-${issue.priority}`}>
                      ⏰ <strong>{issue.timeToFix}</strong>
                    </p>
                  )}
                  <p className="issue-description">• {issue.description}</p>
                  {issue.whatThisMeans && (
                    <p className="issue-impact">• {issue.whatThisMeans}</p>
                  )}
                  {issue.foundEvidence && (
                    <p className="issue-evidence">💡 What we found: {issue.foundEvidence}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-issues-found">
              <p>✅ No major issues detected during the diagnostic scan.</p>
              <p>Your system appears to be functioning normally.</p>
              <p><strong>Raw diagnostic data:</strong></p>
              <pre style={{
                background: '#f5f5f5',
                padding: '10px',
                borderRadius: '5px',
                overflow: 'auto',
                maxHeight: '300px',
                fontSize: '12px'
              }}>
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Fixes Section - Always Visible */}
      {analysis.fixes && analysis.fixes.length > 0 && (
        <div className="fixes-section">
          <h3>🔧 Recommended Actions:</h3>
          {analysis.fixes.map((fix, index) => (
            <div key={index} className={`fix-card priority-${fix.priority || 'medium'}`}>
              <div className="fix-header">
                <div className="fix-title-row">
                  {fix.priority && (
                    <span className={`priority-badge priority-${fix.priority}`}>
                      {fix.priority === 'immediate' ? '⚠️' :
                       fix.priority === 'high' ? '🔸' :
                       fix.priority === 'medium' ? '🔹' : '⬜'}
                    </span>
                  )}
                  <h4>{fix.title}</h4>
                  {fix.confidence !== undefined && (
                    <span className="confidence-badge" title={`Confidence: ${Math.round(fix.confidence * 100)}%`}>
                      {Math.round(fix.confidence * 100)}% sure
                    </span>
                  )}
                </div>
                <div className="fix-badges">
                  {fix.riskLevel && (
                    <span className={`badge risk-level ${fix.riskLevel}`}>
                      {fix.riskLevel === 'low' && '🟢 Low Risk'}
                      {fix.riskLevel === 'medium' && '🟡 Medium Risk'}
                      {fix.riskLevel === 'high' && '🔴 High Risk'}
                    </span>
                  )}
                  <span className="badge time">⏱ {fix.howLong || fix.estimatedTime}</span>
                  <span className={`badge difficulty ${(fix.difficulty || 'medium').toLowerCase()}`}>
                    {fix.difficulty || 'Medium'}
                  </span>
                  {(fix.needsRestart || fix.requiresRestart) && (
                    <span className="badge restart">🔄 Restart needed</span>
                  )}
                  {fix.requiresAdmin && (
                    <span className="badge admin-required">🔒 Admin required</span>
                  )}
                  {fix.automatable && (
                    <span className="badge automatable">✨ Can auto-fix</span>
                  )}
                </div>
              </div>

              {/* Approval Required Message */}
              <div className="approval-notice">
                <span className="approval-icon">✋</span>
                <span>Your approval is required before any changes are made</span>
              </div>

              {/* Risk Explanation */}
              {fix.riskLevel && (
                <div className={`risk-explanation ${fix.riskLevel}`}>
                  <span className="risk-exp-icon">
                    {fix.riskLevel === 'low' && '🟢'}
                    {fix.riskLevel === 'medium' && '🟡'}
                    {fix.riskLevel === 'high' && '🔴'}
                  </span>
                  <div className="risk-exp-text">
                    {fix.riskLevel === 'low' && (
                      <>
                        <strong>Low Risk:</strong> This fix makes minor changes with minimal impact.
                        It can be safely reversed if needed.
                      </>
                    )}
                    {fix.riskLevel === 'medium' && (
                      <>
                        <strong>Medium Risk:</strong> This fix modifies system settings or drivers.
                        We'll create a restore point before making changes so you can roll back if needed.
                      </>
                    )}
                    {fix.riskLevel === 'high' && (
                      <>
                        <strong>High Risk:</strong> This fix makes significant system changes.
                        A restore point will be created automatically, and we'll verify the fix worked before completing.
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Restore Point Notice */}
              {(fix.riskLevel === 'medium' || fix.riskLevel === 'high') && (
                <div className="restore-point-notice">
                  <span className="restore-icon">💾</span>
                  <div className="restore-text">
                    <strong>Automatic Restore Point</strong>
                    <p>We'll create a system restore point before applying this fix. If anything goes wrong, your system can be restored to this point.</p>
                  </div>
                </div>
              )}

              {/* Restart Explanation */}
              {(fix.needsRestart || fix.requiresRestart) && (
                <div className="restart-explanation">
                  <span className="restart-icon">🔄</span>
                  <div className="restart-text">
                    <strong>Why restart is needed:</strong>
                    <p>This fix modifies system components that are currently in use. A restart allows Windows to reload these components with the new changes.</p>
                  </div>
                </div>
              )}

              {fix.whyThis && (
                <p className="fix-why">💡 {fix.whyThis || fix.description}</p>
              )}

              <div className="fix-steps">
                <strong>📝 Steps to follow:</strong>
                <ol>
                  {fix.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Technical Details Section */}
              {fix.technicalDetails && (
                <div className="technical-details-section">
                  <button
                    className="technical-toggle"
                    onClick={() => toggleTechnicalDetails(index)}
                  >
                    🔧 {expandedFix === index ? 'Hide' : 'Show'} Technical Details
                    <span className="toggle-icon">{expandedFix === index ? '▼' : '▶'}</span>
                  </button>

                  {expandedFix === index && (
                    <div className="technical-details-content">
                      {fix.technicalDetails.commands && (
                        <div className="tech-section">
                          <h5>Commands to Execute:</h5>
                          <ul>
                            {fix.technicalDetails.commands.map((cmd, i) => (
                              <li key={i}><code>{cmd}</code></li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {fix.technicalDetails.filesModified && (
                        <div className="tech-section">
                          <h5>Files/Registry Modified:</h5>
                          <ul>
                            {fix.technicalDetails.filesModified.map((file, i) => (
                              <li key={i}>{file}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {fix.technicalDetails.prerequisites && (
                        <div className="tech-section">
                          <h5>Prerequisites:</h5>
                          <ul>
                            {fix.technicalDetails.prerequisites.map((prereq, i) => (
                              <li key={i}>{prereq}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {fix.technicalDetails.expectedOutcome && (
                        <div className="tech-section">
                          <h5>Expected Outcome:</h5>
                          <p>{fix.technicalDetails.expectedOutcome}</p>
                        </div>
                      )}

                      {fix.technicalDetails.verification && (
                        <div className="tech-section">
                          <h5>How to Verify:</h5>
                          <ul>
                            {fix.technicalDetails.verification.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {fix.technicalDetails.rollback && (
                        <div className="tech-section">
                          <h5>How to Rollback (if needed):</h5>
                          <ul>
                            {fix.technicalDetails.rollback.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {fix.automatable && (
                <button
                  className="fix-button primary"
                  onClick={() => onExecuteFix(fix)}
                >
                  ✨ Fix This Automatically
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button className="back-button" onClick={onBack}>
        ← Back to Home
      </button>
    </div>
  );
}

/**
 * Fixing View - Shows fix progress with real-time updates
 */
function FixingView({ progress, logs, fixInfo }) {
  const percentage = progress?.percentage || 0;
  const message = progress?.message || 'Preparing to apply fix...';
  const stage = progress?.stage || 'starting';
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [startTime] = React.useState(Date.now());

  // Track elapsed time
  React.useEffect(() => {
    if (stage === 'complete' || stage === 'error') return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, stage]);

  // Calculate estimated time remaining
  const getEstimatedRemaining = () => {
    if (percentage <= 0 || percentage >= 100) return null;
    const elapsed = elapsedTime;
    const estimated = Math.round((elapsed / percentage) * (100 - percentage));
    return estimated;
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const estimatedRemaining = getEstimatedRemaining();
  const isComplete = stage === 'complete';
  const hasError = stage === 'error';

  // Count successful and failed steps
  const completedSteps = logs?.filter(l => l.stage === 'step-complete').length || 0;
  const failedSteps = logs?.filter(l => l.stage === 'step-failed').length || 0;

  return (
    <div className="fixing-view">
      {!isComplete && !hasError && <div className="spinner"></div>}
      {isComplete && <div className="success-icon">✅</div>}
      {hasError && <div className="error-icon">❌</div>}

      <h2>
        {isComplete ? 'Fix Applied Successfully!' : hasError ? 'Fix Encountered an Error' : 'Applying Fix...'}
      </h2>

      {/* Fix Title */}
      {fixInfo?.title && (
        <div className="fix-title-display">
          <span className="fix-title-label">🔧 {fixInfo.title}</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className={`progress-bar ${isComplete ? 'complete' : ''} ${hasError ? 'error' : ''}`}>
        <div
          className={`progress-fill ${isComplete ? 'complete' : ''} ${hasError ? 'error' : ''}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      {/* Time and Progress Stats */}
      <div className="progress-stats">
        <div className="stat-item">
          <span className="stat-label">Progress</span>
          <span className="stat-value">{percentage}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Elapsed</span>
          <span className="stat-value">{formatTime(elapsedTime)}</span>
        </div>
        {estimatedRemaining !== null && !isComplete && !hasError && (
          <div className="stat-item">
            <span className="stat-label">Remaining</span>
            <span className="stat-value highlight">~{formatTime(estimatedRemaining)}</span>
          </div>
        )}
      </div>

      {/* Current Stage Message */}
      <div className={`current-stage ${isComplete ? 'complete' : ''} ${hasError ? 'error' : ''}`}>
        <p className="stage-message">{message}</p>
        {progress?.currentStep && !isComplete && (
          <p className="step-counter">
            Step {progress.currentStep} of {progress.totalSteps}
          </p>
        )}
      </div>

      {/* Fix Completion Summary */}
      {isComplete && (
        <div className="fix-summary">
          <h3>✨ What Was Fixed</h3>
          <div className="fix-summary-content">
            {fixInfo?.description && (
              <p className="fix-summary-description">{fixInfo.description}</p>
            )}
            <div className="fix-summary-stats">
              <div className="summary-stat success">
                <span className="summary-stat-icon">✅</span>
                <span className="summary-stat-number">{completedSteps}</span>
                <span className="summary-stat-label">Steps Completed</span>
              </div>
              {failedSteps > 0 && (
                <div className="summary-stat warning">
                  <span className="summary-stat-icon">⚠️</span>
                  <span className="summary-stat-number">{failedSteps}</span>
                  <span className="summary-stat-label">Steps Skipped</span>
                </div>
              )}
              <div className="summary-stat time">
                <span className="summary-stat-icon">⏱️</span>
                <span className="summary-stat-number">{formatTime(elapsedTime)}</span>
                <span className="summary-stat-label">Total Time</span>
              </div>
            </div>
            {/* List what was actually done */}
            {logs && logs.filter(l => l.stage === 'step-complete').length > 0 && (
              <div className="fix-actions-completed">
                <h4>Actions Completed:</h4>
                <ul>
                  {logs.filter(l => l.stage === 'step-complete').map((log, idx) => (
                    <li key={idx}>
                      <span className="action-check">✓</span>
                      <span className="action-text">
                        {log.stepDescription || log.message.replace('✓ ', '').replace(' - completed', '')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* List any failed steps */}
            {logs && logs.filter(l => l.stage === 'step-failed').length > 0 && (
              <div className="fix-actions-failed">
                <h4>Actions that encountered issues:</h4>
                <ul>
                  {logs.filter(l => l.stage === 'step-failed').map((log, idx) => (
                    <li key={idx}>
                      <span className="action-warning">⚠️</span>
                      <span className="action-text">{log.message}</span>
                      {log.error && <span className="action-error-detail">{log.error}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {fixInfo?.requiresRestart && (
              <div className="restart-notice">
                <span className="restart-icon">🔄</span>
                <div>
                  <strong>Restart Required</strong>
                  <p>Please restart your computer for the changes to take full effect.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Command Logs */}
      {logs && logs.length > 0 && (
        <div className="fix-logs-container">
          <h3>
            {isComplete ? '📋 Execution History' : '📋 Live Execution Log'}
            {!isComplete && <span className="log-live-indicator">● LIVE</span>}
          </h3>
          <div className="fix-logs">
            {logs.map((log, index) => (
              <div key={index} className={`log-entry ${log.stage}`}>
                <div className="log-header">
                  <span className="log-time">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`log-stage stage-${log.stage}`}>
                    {getStageIcon(log.stage)} {log.stage.replace('-', ' ')}
                  </span>
                </div>
                <div className="log-message">{log.message}</div>

                {log.command && (
                  <div className="log-command">
                    <strong>Command:</strong> <code>{log.command}</code>
                  </div>
                )}

                {log.output && (
                  <div className="log-output">
                    <strong>Output:</strong>
                    <pre>{log.output}</pre>
                  </div>
                )}

                {log.error && (
                  <div className="log-error">
                    <strong>Error:</strong> {log.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get icon for stage
 */
function getStageIcon(stage) {
  const icons = {
    'starting': '🚀',
    'safety-check': '🛡️',
    'restore-point': '💾',
    'executing': '⚙️',
    'executing-step': '▶️',
    'step-complete': '✅',
    'step-failed': '❌',
    'verifying': '🔍',
    'complete': '✨',
    'rollback': '↩️'
  };
  return icons[stage] || '📋';
}

export default App;
