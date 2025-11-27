/**
 * EventLogInvestigator
 * Checks system logs for errors and patterns
 * Cross-platform: Windows & macOS
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { isWindows, isMacOS, getPlatformName } = require('../../utils/platform');

class EventLogInvestigator {
  constructor() {
    this.name = 'EventLogInvestigator';
    console.log(`EventLogInvestigator initialized. Platform: ${getPlatformName()}`);
  }

  async investigate(step, options = {}) {
    console.log('Investigating system logs...');

    const findings = {
      errors: [],
      warnings: [],
      patterns: []
    };

    try {
      if (isWindows()) {
        // Query Application and System event logs
        for (const logName of step.config.logNames) {
          const events = await this.queryEventLogWindows(logName, step.config);
          findings.errors.push(...events);
        }
      } else if (isMacOS()) {
        // Query macOS unified log
        const events = await this.querySystemLogMacOS(step.config);
        findings.errors.push(...events);
      }

      // Find patterns in errors
      if (step.config.findPatterns) {
        findings.patterns = this.findPatterns(findings.errors);
      }

    } catch (error) {
      findings.error = error.message;
    }

    return findings;
  }

  /**
   * Query Windows Event Log
   */
  async queryEventLogWindows(logName, config) {
    const events = [];

    try {
      // Use PowerShell to query event log
      const daysBack = config.timeRange === '7days' ? 7 : 30;
      const { stdout } = await execPromise(
        `powershell -Command "Get-EventLog -LogName ${logName} -EntryType Error -Newest 500 -After (Get-Date).AddDays(-${daysBack}) | Select-Object TimeGenerated, Source, Message | ConvertTo-Json"`
      );

      if (stdout.trim()) {
        const parsed = JSON.parse(stdout);
        const eventArray = Array.isArray(parsed) ? parsed : [parsed];

        const now = new Date();
        for (const event of eventArray) {
          // Parse PowerShell's weird /Date(milliseconds)/ format
          let eventTime;
          const timeStr = event.TimeGenerated;

          if (typeof timeStr === 'string' && timeStr.includes('/Date(')) {
            // Extract milliseconds from /Date(1763619246000)/
            const match = timeStr.match(/\/Date\((\d+)\)\//);
            if (match) {
              eventTime = new Date(parseInt(match[1]));
            } else {
              eventTime = new Date(timeStr);
            }
          } else {
            eventTime = new Date(timeStr);
          }

          const hoursAgo = (now - eventTime) / (1000 * 60 * 60);
          const daysAgo = hoursAgo / 24;

          events.push({
            logName,
            time: event.TimeGenerated,
            source: event.Source,
            message: event.Message,
            hoursAgo: Math.round(hoursAgo),
            daysAgo: Math.round(daysAgo * 10) / 10,  // Round to 1 decimal
            isRecent: daysAgo < 2,  // Within last 2 days = recent/current
            isOld: daysAgo > 7      // Older than 7 days = historical
          });
        }
      }

    } catch (error) {
      console.error(`Error querying ${logName}:`, error.message);
    }

    return events;
  }

  /**
   * Query macOS system log
   */
  async querySystemLogMacOS(config) {
    const events = [];

    try {
      // Use log command to query unified log for errors
      const daysBack = config.timeRange === '7days' ? 7 : 30;
      const hoursBack = daysBack * 24;

      // Query for error and fault level messages
      const { stdout } = await execPromise(
        `log show --predicate 'eventMessage contains "error" OR eventMessage contains "fault" OR eventMessage contains "crash"' --style syslog --last ${hoursBack}h 2>/dev/null | head -500`,
        { timeout: 30000, maxBuffer: 5 * 1024 * 1024 }
      );

      if (stdout && stdout.trim()) {
        const lines = stdout.trim().split('\n');
        const now = new Date();

        for (const line of lines) {
          if (!line.trim()) continue;

          // Parse syslog format: YYYY-MM-DD HH:MM:SS.mmm ... process[pid]: message
          const match = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}).*?\s+(\w+)\[?\d*\]?:\s*(.*)$/);

          if (match) {
            const eventTime = new Date(match[1]);
            const source = match[2];
            const message = match[3];

            const hoursAgo = (now - eventTime) / (1000 * 60 * 60);
            const daysAgo = hoursAgo / 24;

            events.push({
              logName: 'System',
              time: eventTime.toISOString(),
              source: source,
              message: message.substring(0, 500), // Truncate long messages
              hoursAgo: Math.round(hoursAgo),
              daysAgo: Math.round(daysAgo * 10) / 10,
              isRecent: daysAgo < 2,
              isOld: daysAgo > 7
            });
          }
        }
      }

    } catch (error) {
      console.error('Error querying macOS log:', error.message);
    }

    return events;
  }

  /**
   * Find patterns in error messages
   * Now with time-based filtering to prioritize recent/recurring errors
   */
  findPatterns(errors) {
    const patterns = [];
    const errorCounts = {};
    const recentErrorCounts = {};  // Errors from last 48 hours

    // Count occurrences of similar error messages
    for (const error of errors) {
      const key = `${error.source}:${error.message.substring(0, 100)}`;

      // Count all occurrences
      if (!errorCounts[key]) {
        errorCounts[key] = {
          count: 0,
          recentCount: 0,
          oldestDaysAgo: error.daysAgo || 0,
          newestDaysAgo: error.daysAgo || 0,
          isOngoing: false
        };
      }

      errorCounts[key].count += 1;
      errorCounts[key].oldestDaysAgo = Math.max(errorCounts[key].oldestDaysAgo, error.daysAgo || 0);
      errorCounts[key].newestDaysAgo = Math.min(errorCounts[key].newestDaysAgo, error.daysAgo || 0);

      // Track recent occurrences (last 2 days)
      if (error.isRecent) {
        errorCounts[key].recentCount += 1;
      }

      // Mark as ongoing if it happened both recently AND in the past
      if (error.isRecent && errorCounts[key].count > 1) {
        errorCounts[key].isOngoing = true;
      }
    }

    // Find errors that are ACTUALLY problematic (recent or recurring)
    for (const [key, data] of Object.entries(errorCounts)) {
      // Only report as patterns if:
      // 1. Multiple recent occurrences (happening now), OR
      // 2. Recurring pattern over time (3+ occurrences with at least 1 recent)
      const isCurrentIssue = data.recentCount >= 2;  // Multiple errors in last 48 hours
      const isRecurringIssue = data.count >= 3 && data.recentCount >= 1;  // Recurring pattern still active

      if (isCurrentIssue || isRecurringIssue) {
        patterns.push({
          pattern: key,
          occurrences: data.count,
          recentOccurrences: data.recentCount,
          oldestDaysAgo: data.oldestDaysAgo,
          newestDaysAgo: data.newestDaysAgo,
          isOngoing: data.isOngoing,
          severity: data.recentCount >= 5 ? 'critical' :
                   data.recentCount >= 2 ? 'warning' : 'info',
          timeframe: data.newestDaysAgo < 1 ? 'today' :
                    data.newestDaysAgo < 2 ? 'recent' : 'older'
        });
      }
    }

    return patterns;
  }
}

module.exports = { EventLogInvestigator };
