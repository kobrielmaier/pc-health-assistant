import React from 'react';
import './Welcome.css';

/**
 * Welcome Screen - First-run experience
 * Explains how the app works, privacy commitments, and what to expect
 */
function Welcome({ onComplete }) {
  const [currentStep, setCurrentStep] = React.useState(0);

  const steps = [
    {
      icon: '👋',
      title: 'Welcome to PC Health Assistant',
      content: (
        <>
          <p className="welcome-intro">
            We're here to help you diagnose and fix PC problems - without the expensive tech support bills.
          </p>
          <div className="welcome-features">
            <div className="welcome-feature">
              <span className="feature-icon">🤖</span>
              <div>
                <strong>AI-Powered Diagnostics</strong>
                <p>Claude AI analyzes your system and explains issues in plain English</p>
              </div>
            </div>
            <div className="welcome-feature">
              <span className="feature-icon">🔧</span>
              <div>
                <strong>Automated Fixes</strong>
                <p>One-click solutions for common problems (with your approval)</p>
              </div>
            </div>
            <div className="welcome-feature">
              <span className="feature-icon">🛡️</span>
              <div>
                <strong>Safety First</strong>
                <p>Automatic backups and rollback protection</p>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      icon: '🔒',
      title: 'Your Privacy & Safety',
      content: (
        <>
          <p className="welcome-intro">
            We take your privacy and system safety seriously. Here's what you need to know:
          </p>
          <div className="privacy-commitments">
            <div className="commitment">
              <span className="commit-icon">🏠</span>
              <div>
                <strong>Your Data Stays Local</strong>
                <p>Personal files, passwords, and browsing history never leave your computer</p>
              </div>
            </div>
            <div className="commitment">
              <span className="commit-icon">✋</span>
              <div>
                <strong>You're In Control</strong>
                <p>All system changes require your explicit approval - no surprises</p>
              </div>
            </div>
            <div className="commitment">
              <span className="commit-icon">💾</span>
              <div>
                <strong>Automatic Backups</strong>
                <p>We create restore points before risky changes</p>
              </div>
            </div>
            <div className="commitment">
              <span className="commit-icon">🔓</span>
              <div>
                <strong>Open Source</strong>
                <p>You can review every line of code - complete transparency</p>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      icon: '🚀',
      title: 'How It Works',
      content: (
        <>
          <p className="welcome-intro">
            Using PC Health Assistant is simple. Here's what happens:
          </p>
          <div className="how-it-works">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <strong>Tell Us Your Problem</strong>
                <p>Select what's wrong: crashes, slow performance, errors, etc.</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <strong>We Investigate (Read-Only)</strong>
                <p>We scan system logs, drivers, and diagnostics - no changes made</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <strong>Get Plain English Results</strong>
                <p>AI explains what's wrong and why, in language you can understand</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <strong>Apply Fixes (Optional)</strong>
                <p>Choose to apply our recommendations - you approve every change</p>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      icon: '🎯',
      title: 'Example: Fixing a Crash',
      content: (
        <>
          <p className="welcome-intro">
            Let's say your favorite game keeps crashing. Here's what we'd do:
          </p>
          <div className="example-flow">
            <div className="example-step">
              <span className="example-icon">🔍</span>
              <div>
                <strong>Investigate</strong>
                <p>We check Windows crash logs, find the error code, and identify it's a graphics driver issue</p>
              </div>
            </div>
            <div className="example-arrow">↓</div>
            <div className="example-step">
              <span className="example-icon">💬</span>
              <div>
                <strong>Explain</strong>
                <p>"Your graphics driver is outdated. Games need the latest version to run properly."</p>
              </div>
            </div>
            <div className="example-arrow">↓</div>
            <div className="example-step">
              <span className="example-icon">🔧</span>
              <div>
                <strong>Fix</strong>
                <p>We offer to update your driver, showing exactly what will happen and asking for your approval</p>
              </div>
            </div>
            <div className="example-arrow">↓</div>
            <div className="example-step">
              <span className="example-icon">✅</span>
              <div>
                <strong>Verify</strong>
                <p>After updating, we verify the fix worked and your game runs smoothly</p>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      icon: '✨',
      title: 'Ready to Get Started!',
      content: (
        <>
          <p className="welcome-intro final">
            You're all set! Remember:
          </p>
          <div className="final-reminders">
            <div className="reminder">
              <span className="reminder-icon">🔒</span>
              <p><strong>Investigations are read-only</strong> - we only look, never touch</p>
            </div>
            <div className="reminder">
              <span className="reminder-icon">✋</span>
              <p><strong>You approve all changes</strong> - we ask permission before doing anything</p>
            </div>
            <div className="reminder">
              <span className="reminder-icon">📜</span>
              <p><strong>Everything is logged</strong> - check History to see all past actions</p>
            </div>
            <div className="reminder">
              <span className="reminder-icon">💬</span>
              <p><strong>Ask questions anytime</strong> - use the "Ask AI" button for help</p>
            </div>
          </div>
          <div className="final-cta">
            <p>Click "Get Started" below to diagnose your first PC issue!</p>
          </div>
        </>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark welcome as complete and close
      localStorage.setItem('welcomeComplete', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('welcomeComplete', 'true');
    onComplete();
  };

  return (
    <div className="welcome-overlay">
      <div className="welcome-container">
        {/* Progress Indicator */}
        <div className="welcome-progress">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`progress-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
            ></div>
          ))}
        </div>

        {/* Content */}
        <div className="welcome-content">
          <div className="welcome-icon">{currentStepData.icon}</div>
          <h2>{currentStepData.title}</h2>
          <div className="welcome-body">{currentStepData.content}</div>
        </div>

        {/* Navigation */}
        <div className="welcome-nav">
          {currentStep > 0 && (
            <button className="welcome-btn secondary" onClick={() => setCurrentStep(currentStep - 1)}>
              ← Back
            </button>
          )}
          <button className="welcome-btn skip" onClick={handleSkip}>
            Skip Tutorial
          </button>
          <button className="welcome-btn primary" onClick={handleNext}>
            {currentStep === steps.length - 1 ? 'Get Started →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Welcome;
