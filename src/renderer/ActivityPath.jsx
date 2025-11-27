import React, { useState, useEffect } from 'react';
import './ActivityPath.css';

/**
 * ActivityPath - Shows a visual timeline of diagnostic/fix progress
 * Displays completed steps, current step with details, and pending steps
 */
function ActivityPath({ activities, isActive }) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for elapsed time display
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!activities || activities.length === 0) {
    return null;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'running':
        return '●';
      case 'error':
        return '✗';
      case 'pending':
      default:
        return '○';
    }
  };

  const getToolIcon = (tool) => {
    const icons = {
      'check_event_logs': '📋',
      'check_disk_health': '💽',
      'check_system_resources': '⚙️',
      'check_drivers': '🔌',
      'check_network': '🌐',
      'run_powershell_diagnostic': '⚡',
      'propose_fix': '🔧',
      'execute_fix': '🛠️',
      'create_restore_point': '💾',
      'rollback': '↩️'
    };
    return icons[tool] || '📍';
  };

  const getToolLabel = (tool) => {
    const labels = {
      'check_event_logs': 'Scanning Windows Event Logs',
      'check_disk_health': 'Analyzing Disk Health (SMART)',
      'check_system_resources': 'Checking CPU, RAM & GPU Usage',
      'check_drivers': 'Scanning Device Drivers',
      'check_network': 'Testing Network Connectivity',
      'run_powershell_diagnostic': 'Running System Diagnostic',
      'propose_fix': 'Preparing Fix Recommendation',
      'execute_fix': 'Applying Fix',
      'create_restore_point': 'Creating System Restore Point',
      'rollback': 'Reverting Changes'
    };
    return labels[tool] || tool;
  };

  // Get estimated time in seconds (midpoint of range)
  const getEstimatedSeconds = (tool) => {
    const times = {
      'check_event_logs': 20,
      'check_disk_health': 10,
      'check_system_resources': 5,
      'check_drivers': 10,
      'check_network': 8,
      'run_powershell_diagnostic': 12,
      'propose_fix': 3,
      'execute_fix': 75,
      'create_restore_point': 45,
      'rollback': 120
    };
    return times[tool] || 10;
  };

  const getEstimatedTime = (tool) => {
    const times = {
      'check_event_logs': '10-30 sec',
      'check_disk_health': '5-15 sec',
      'check_system_resources': '3-8 sec',
      'check_drivers': '5-15 sec',
      'check_network': '5-10 sec',
      'run_powershell_diagnostic': '5-20 sec',
      'propose_fix': '2-5 sec',
      'execute_fix': '30 sec - 2 min',
      'create_restore_point': '30 sec - 1 min',
      'rollback': '1-3 min'
    };
    return times[tool] || 'A few seconds';
  };

  // Calculate live elapsed time for running tasks
  const getLiveElapsed = (startTime) => {
    if (!startTime) return 0;
    const start = new Date(startTime);
    return Math.floor((currentTime - start) / 1000);
  };

  // Calculate estimated remaining time
  const getEstimatedRemaining = (tool, startTime) => {
    if (!startTime) return null;
    const elapsed = getLiveElapsed(startTime);
    const estimated = getEstimatedSeconds(tool);
    const remaining = Math.max(0, estimated - elapsed);
    return remaining;
  };

  // Format seconds to readable string
  const formatSeconds = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Calculate overall progress
  const calculateOverallProgress = () => {
    const completed = activities.filter(a => a.status === 'completed').length;
    const running = activities.filter(a => a.status === 'running');
    const total = activities.length;

    // Base progress from completed activities
    let progress = (completed / total) * 100;

    // Add partial progress from running activity
    if (running.length > 0 && running[0].startTime) {
      const runningActivity = running[0];
      const elapsed = getLiveElapsed(runningActivity.startTime);
      const estimated = getEstimatedSeconds(runningActivity.tool);
      const partialProgress = Math.min(0.9, elapsed / estimated); // Cap at 90% until actually complete
      progress += (partialProgress / total) * 100;
    }

    return Math.min(99, Math.round(progress)); // Cap at 99% until actually complete
  };

  // Calculate total estimated time
  const getTotalEstimatedTime = () => {
    let total = 0;
    activities.forEach(activity => {
      total += getEstimatedSeconds(activity.tool);
    });
    return total;
  };

  // Calculate total elapsed time
  const getTotalElapsedTime = () => {
    let total = 0;
    activities.forEach(activity => {
      if (activity.status === 'completed' && activity.startTime && activity.endTime) {
        const start = new Date(activity.startTime);
        const end = new Date(activity.endTime);
        total += Math.floor((end - start) / 1000);
      } else if (activity.status === 'running' && activity.startTime) {
        total += getLiveElapsed(activity.startTime);
      }
    });
    return total;
  };

  const getToolDescription = (tool) => {
    const descriptions = {
      'check_event_logs': 'Looking for errors, crashes, and warnings in system logs',
      'check_disk_health': 'Reading SMART data to check for disk failures or issues',
      'check_system_resources': 'Measuring memory, processor, and graphics card usage',
      'check_drivers': 'Checking for outdated or problematic device drivers',
      'check_network': 'Testing internet connection and network adapters',
      'run_powershell_diagnostic': 'Running specialized Windows diagnostic command',
      'propose_fix': 'Analyzing findings and preparing a solution',
      'execute_fix': 'Applying the approved fix to your system',
      'create_restore_point': 'Saving current system state for safety',
      'rollback': 'Restoring system to previous state'
    };
    return descriptions[tool] || 'Processing...';
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = Math.round((end - start) / 1000);
    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  };

  const overallProgress = calculateOverallProgress();
  const totalEstimated = getTotalEstimatedTime();
  const totalElapsed = getTotalElapsedTime();
  const remainingEstimate = Math.max(0, totalEstimated - totalElapsed);

  return (
    <div className={`activity-path ${isActive ? 'active' : ''}`}>
      <div className="activity-path-header">
        <span className="activity-path-icon">🔍</span>
        <span className="activity-path-title">Investigation Progress</span>
        {isActive && <span className="activity-pulse"></span>}
      </div>

      {/* Overall time stats */}
      {isActive && (
        <div className="activity-time-stats">
          <div className="time-stat">
            <span className="time-stat-label">Elapsed</span>
            <span className="time-stat-value">{formatSeconds(totalElapsed)}</span>
          </div>
          <div className="time-stat progress">
            <span className="time-stat-label">Progress</span>
            <span className="time-stat-value">{overallProgress}%</span>
          </div>
          <div className="time-stat remaining">
            <span className="time-stat-label">Est. Remaining</span>
            <span className="time-stat-value">~{formatSeconds(remainingEstimate)}</span>
          </div>
        </div>
      )}

      <div className="activity-timeline">
        {activities.map((activity, index) => (
          <div
            key={activity.id || index}
            className={`activity-step ${activity.status}`}
          >
            {/* Connector line */}
            {index > 0 && <div className="activity-connector"></div>}

            {/* Step indicator */}
            <div className="activity-indicator">
              <span className="activity-status-icon">
                {activity.status === 'running' ? (
                  <span className="spinner-tiny"></span>
                ) : (
                  getStatusIcon(activity.status)
                )}
              </span>
            </div>

            {/* Step content */}
            <div className="activity-content">
              <div className="activity-header">
                <span className="activity-tool-icon">{getToolIcon(activity.tool)}</span>
                <span className="activity-label">{getToolLabel(activity.tool)}</span>
                {activity.status === 'completed' && activity.duration && (
                  <span className="activity-duration completed">✓ {activity.duration}</span>
                )}
                {activity.status === 'running' && (
                  <span className="activity-duration running">
                    ⏱️ {formatSeconds(getLiveElapsed(activity.startTime))} / ~{getEstimatedTime(activity.tool)}
                  </span>
                )}
                {activity.status === 'pending' && (
                  <span className="activity-duration pending">
                    Est: {getEstimatedTime(activity.tool)}
                  </span>
                )}
              </div>

              {/* Show description for running step */}
              {activity.status === 'running' && (
                <div className="activity-details">
                  <span className="activity-detail-text">{getToolDescription(activity.tool)}</span>
                  {activity.startTime && (
                    <div className="activity-time-info">
                      <span className="activity-elapsed">
                        Running for {formatSeconds(getLiveElapsed(activity.startTime))}
                      </span>
                      {getEstimatedRemaining(activity.tool, activity.startTime) > 0 && (
                        <span className="activity-remaining">
                          ~{formatSeconds(getEstimatedRemaining(activity.tool, activity.startTime))} remaining
                        </span>
                      )}
                    </div>
                  )}
                  {/* Progress bar for current step */}
                  <div className="activity-step-progress">
                    <div
                      className="activity-step-progress-fill"
                      style={{
                        width: `${Math.min(95, (getLiveElapsed(activity.startTime) / getEstimatedSeconds(activity.tool)) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Show summary for completed steps */}
              {activity.status === 'completed' && (
                <div className="activity-summary">
                  <span className="activity-summary-text">
                    {activity.summary || `${getToolLabel(activity.tool)} - Complete`}
                  </span>
                  {activity.findingsCount !== undefined && (
                    <span className="activity-findings">
                      {activity.findingsCount === 0
                        ? '✓ No issues found'
                        : `⚠️ ${activity.findingsCount} issue(s) found`}
                    </span>
                  )}
                </div>
              )}

              {/* Show error for failed steps */}
              {activity.status === 'error' && activity.error && (
                <div className="activity-error">
                  <span className="activity-error-text">❌ {activity.error}</span>
                </div>
              )}

              {/* Show sub-steps if any */}
              {activity.subSteps && activity.subSteps.length > 0 && (
                <div className="activity-substeps">
                  {activity.subSteps.map((subStep, subIndex) => (
                    <div key={subIndex} className={`activity-substep ${subStep.status}`}>
                      <span className="substep-icon">
                        {subStep.status === 'completed' ? '✓' :
                         subStep.status === 'running' ? '→' : '·'}
                      </span>
                      <span className="substep-text">{subStep.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Overall progress bar if percentage available */}
      {activities.some(a => a.percentage !== undefined) && (
        <div className="activity-overall-progress">
          <div className="overall-progress-bar">
            <div
              className="overall-progress-fill"
              style={{
                width: `${Math.max(...activities.filter(a => a.percentage).map(a => a.percentage))}%`
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityPath;
