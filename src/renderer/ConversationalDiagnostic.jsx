import React, { useState, useEffect, useRef } from 'react';
import './ConversationalDiagnostic.css';
import ActivityPath from './ActivityPath';

/**
 * ConversationalDiagnostic - Simple chat interface that works like talking to Claude
 */
function ConversationalDiagnostic() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your PC repair assistant. 👋\n\nTell me what's wrong with your computer, and I'll help you fix it. I'll investigate step-by-step and explain everything in simple terms.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [proposedFix, setProposedFix] = useState(null);
  const [fixProgress, setFixProgress] = useState(null);
  const [activities, setActivities] = useState([]);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTool, proposedFix]);

  // Listen for tool use notifications
  useEffect(() => {
    const removeListener = window.pcHealthAPI.onToolUse((toolData) => {
      setCurrentTool(toolData);
    });

    return () => removeListener();
  }, []);

  // Listen for fix progress
  useEffect(() => {
    const removeListener = window.pcHealthAPI.onFixProgress((progressData) => {
      setFixProgress(progressData);
    });

    return () => removeListener();
  }, []);

  // Listen for activity updates (detailed progress path)
  useEffect(() => {
    const removeListener = window.pcHealthAPI.onActivityUpdate((activityData) => {
      console.log('Activity update:', activityData);
      if (activityData.activities) {
        setActivities(activityData.activities);
      }
      // Clear activities when complete (after a delay to show completion)
      if (activityData.type === 'complete') {
        setTimeout(() => {
          setActivities([]);
        }, 2000);
      }
    });

    return () => removeListener();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setCurrentTool(null);
    setActivities([]); // Clear previous activities for new request

    // Add user message to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    try {
      // Send to conversational diagnostic agent
      const result = await window.pcHealthAPI.conversationalChat(userMessage);

      if (result.success) {
        // Add assistant response
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.response,
          timestamp: new Date()
        }]);

        // Check if there's a fix proposal
        if (result.proposedFix) {
          setProposedFix(result.proposedFix);
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'error',
          content: `Sorry, I ran into an error: ${result.error}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: `Sorry, something went wrong: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
      setCurrentTool(null);
      // Clear activities after a short delay to show completion
      setTimeout(() => setActivities([]), 2000);
    }
  };

  const handleApproveFix = async () => {
    if (!proposedFix) return;

    setFixProgress({ stage: 'starting', message: 'Starting fix...', percentage: 0 });

    try {
      const result = await window.pcHealthAPI.executeApprovedFix(proposedFix);

      if (result.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.requiresRestart
            ? '✅ Fix completed! Please restart your computer for the changes to take effect.'
            : '✅ Fix completed successfully!',
          timestamp: new Date()
        }]);
        setProposedFix(null);
      } else {
        // Check if this is an admin privileges error
        const isAdminError = result.error && result.error.includes('administrator privileges');

        setMessages(prev => [...prev, {
          role: 'error',
          content: isAdminError
            ? result.error
            : `Fix failed: ${result.error}`,
          timestamp: new Date(),
          isAdminError
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: `Error executing fix: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setFixProgress(null);
    }
  };

  const handleRejectFix = () => {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'No problem! Let me know if you change your mind or if you need help with something else.',
      timestamp: new Date()
    }]);
    setProposedFix(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = async () => {
    await window.pcHealthAPI.resetConversation();
    setMessages([{
      role: 'assistant',
      content: "New conversation started! What computer problem would you like help with?",
      timestamp: new Date()
    }]);
    setProposedFix(null);
    setFixProgress(null);
    setActivities([]);
  };

  return (
    <div className="conversational-diagnostic">
      {/* Header */}
      <div className="conv-header">
        <div>
          <h2>💬 AI PC Repair Assistant</h2>
          <p className="conv-subtitle">I'll help you diagnose and fix computer problems - step by step</p>
        </div>
        <button className="new-conversation-btn" onClick={handleNewConversation}>
          🔄 New Conversation
        </button>
      </div>

      {/* Trust Banner */}
      <div className="trust-banner">
        <div className="trust-item">
          <span className="trust-icon">🛡️</span>
          <span>Protected Investigation</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">✋</span>
          <span>Your Approval Required</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">💾</span>
          <span>Auto Restore Points</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'assistant' ? '🤖' : message.role === 'user' ? '👤' : '⚠️'}
            </div>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              <div className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Activity Path - shows detailed progress */}
        {activities.length > 0 && (
          <ActivityPath activities={activities} isActive={isLoading} />
        )}

        {/* Loading indicator (fallback when no activities) */}
        {isLoading && activities.length === 0 && (
          <div className="message assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              {currentTool ? (
                <div className="tool-activity">
                  <div className="spinner-small"></div>
                  <span>
                    {currentTool.tool === 'check_event_logs' && '📋 Checking event logs...'}
                    {currentTool.tool === 'check_disk_health' && '💽 Checking disk health...'}
                    {currentTool.tool === 'check_system_resources' && '⚙️ Checking system resources...'}
                    {currentTool.tool === 'check_drivers' && '🔌 Checking drivers...'}
                    {currentTool.tool === 'check_network' && '🌐 Checking network...'}
                    {currentTool.tool === 'run_powershell_diagnostic' && '⚡ Running diagnostic...'}
                  </span>
                </div>
              ) : (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fix Progress (if executing) */}
        {fixProgress && (
          <div className={`fix-progress-container ${fixProgress.stage === 'complete' ? 'complete' : ''} ${fixProgress.stage === 'error' ? 'error' : ''}`}>
            <div className="fix-progress-header">
              <span className="fix-progress-status">
                {fixProgress.stage === 'complete' ? '✅' : fixProgress.stage === 'error' ? '❌' : '⚙️'}
              </span>
              <span className="fix-progress-message">{fixProgress.message}</span>
            </div>
            <div className={`progress-bar ${fixProgress.stage === 'complete' ? 'complete' : ''}`}>
              <div
                className={`progress-fill ${fixProgress.stage === 'complete' ? 'complete' : ''}`}
                style={{ width: `${fixProgress.percentage}%` }}
              ></div>
            </div>
            <div className="fix-progress-footer">
              <span className="fix-progress-percentage">{fixProgress.percentage}% Complete</span>
              {fixProgress.currentStep && fixProgress.totalSteps && (
                <span className="fix-progress-steps">Step {fixProgress.currentStep} of {fixProgress.totalSteps}</span>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            className="message-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your computer problem... (e.g., 'My computer is really slow' or 'My games keep crashing')"
            rows="3"
            disabled={isLoading}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? '⏳' : '→'} Send
          </button>
        </div>
        <div className="input-hint">
          💡 Tip: Be specific! Example: "Valorant crashes after 5 minutes" instead of just "crash"
        </div>
      </div>

      {/* Example Prompts (only show if no conversation yet) */}
      {messages.length === 1 && (
        <div className="example-prompts">
          <p>Not sure what to say? Try one of these:</p>
          <div className="prompt-buttons">
            <button onClick={() => setInput("My computer is really slow when it starts up")}>
              🐌 Slow startup
            </button>
            <button onClick={() => setInput("My games keep crashing")}>
              💥 Games crashing
            </button>
            <button onClick={() => setInput("My internet connection keeps dropping")}>
              🌐 Internet problems
            </button>
            <button onClick={() => setInput("I'm getting a lot of error messages")}>
              ⚠️ Error messages
            </button>
          </div>
        </div>
      )}

      {/* Fix Approval Modal */}
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

              {proposedFix.why && (
                <div className="fix-why">
                  <strong>Why this helps:</strong>
                  <p>{proposedFix.why}</p>
                </div>
              )}

              <div className="fix-details">
                <div className="fix-detail-item">
                  <span className="detail-label">⏱️ Time:</span>
                  <span>{proposedFix.estimatedTime || 'A few minutes'}</span>
                </div>
                {proposedFix.requiresRestart && (
                  <div className="fix-detail-item warning">
                    <span className="detail-label">🔄 Restart:</span>
                    <span>Required after completion</span>
                  </div>
                )}
                {proposedFix.requiresAdmin && (
                  <div className="fix-detail-item warning">
                    <span className="detail-label">🔒 Admin:</span>
                    <span>Administrator privileges required</span>
                  </div>
                )}
              </div>

              {proposedFix.steps && proposedFix.steps.length > 0 && (
                <div className="fix-steps-preview">
                  <strong>What I'll do:</strong>
                  <ol>
                    {proposedFix.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {(proposedFix.riskLevel === 'medium' || proposedFix.riskLevel === 'high') && (
                <div className="safety-notice">
                  <span className="safety-icon">🛡️</span>
                  <div>
                    <strong>Safety First:</strong>
                    <p>I'll create a system restore point before making changes. You can undo this fix if needed.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="fix-approval-actions">
              <button className="reject-button" onClick={handleRejectFix}>
                ❌ No Thanks
              </button>
              <button className="approve-button" onClick={handleApproveFix}>
                ✅ Yes, Fix It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConversationalDiagnostic;
