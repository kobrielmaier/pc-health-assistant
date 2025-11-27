/**
 * RecentChangesInvestigator
 * Analyzes recent Windows updates, software installations, and system changes
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class RecentChangesInvestigator {
  constructor() {
    this.name = 'RecentChangesInvestigator';
  }

  async investigate(step, options = {}) {
    console.log('Investigating recent system changes...');

    const findings = {
      windowsUpdates: [],
      recentInstalls: [],
      recentUninstalls: [],
      warnings: [],
      recommendations: []
    };

    try {
      // Get recent Windows Updates (last 30 days)
      const updates = await this.getRecentWindowsUpdates();
      findings.windowsUpdates = updates;

      // Get recently installed programs
      const installs = await this.getRecentInstalls();
      findings.recentInstalls = installs;

      // Analyze for problems
      this.analyzeChanges(findings);

    } catch (error) {
      findings.error = error.message;
    }

    return findings;
  }

  /**
   * Get recent Windows Updates
   */
  async getRecentWindowsUpdates() {
    const updates = [];

    try {
      const { stdout } = await execPromise(
        `powershell -Command "$session = New-Object -ComObject Microsoft.Update.Session; $searcher = $session.CreateUpdateSearcher(); $historyCount = $searcher.GetTotalHistoryCount(); $history = $searcher.QueryHistory(0, [Math]::Min(50, $historyCount)) | Select-Object Title, Date, ResultCode | ConvertTo-Json"`,
        { timeout: 15000 }
      );

      if (stdout && stdout.trim()) {
        let updateData = JSON.parse(stdout);
        if (!Array.isArray(updateData)) {
          updateData = [updateData];
        }

        for (const update of updateData) {
          const updateDate = new Date(update.Date);
          const daysAgo = Math.floor((Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24));

          // Only include updates from last 30 days
          if (daysAgo <= 30) {
            updates.push({
              title: update.Title,
              date: updateDate.toISOString().split('T')[0],
              daysAgo: daysAgo,
              success: update.ResultCode === 2, // 2 = Succeeded
              resultCode: update.ResultCode
            });
          }
        }
      }

    } catch (error) {
      console.error('Failed to get Windows Updates:', error.message);
    }

    return updates;
  }

  /**
   * Get recently installed programs (from event logs)
   */
  async getRecentInstalls() {
    const installs = [];

    try {
      // Check Application event log for installation events
      const { stdout } = await execPromise(
        `powershell -Command "Get-EventLog -LogName Application -Source MsiInstaller -Newest 50 -After (Get-Date).AddDays(-30) -ErrorAction SilentlyContinue | Select-Object TimeGenerated, Message | ConvertTo-Json"`,
        { timeout: 10000 }
      );

      if (stdout && stdout.trim()) {
        let events = JSON.parse(stdout);
        if (!Array.isArray(events)) {
          events = [events];
        }

        for (const event of events) {
          const installDate = new Date(event.TimeGenerated);
          const daysAgo = Math.floor((Date.now() - installDate.getTime()) / (1000 * 60 * 60 * 24));

          // Extract program name from message
          const programMatch = event.Message.match(/Product: (.+?) --/);
          const programName = programMatch ? programMatch[1] : 'Unknown';

          // Determine if install or uninstall
          const isInstall = event.Message.includes('Installation completed') ||
                           event.Message.includes('successfully installed');
          const isUninstall = event.Message.includes('removal') ||
                             event.Message.includes('uninstalled');

          installs.push({
            program: programName,
            date: installDate.toISOString().split('T')[0],
            daysAgo: daysAgo,
            action: isUninstall ? 'uninstall' : (isInstall ? 'install' : 'update')
          });
        }
      }

    } catch (error) {
      console.error('Failed to get recent installs:', error.message);
    }

    return installs;
  }

  /**
   * Analyze changes for potential problems
   */
  analyzeChanges(findings) {
    // Check for failed Windows Updates
    const failedUpdates = findings.windowsUpdates.filter(u => !u.success);
    if (failedUpdates.length > 0) {
      findings.warnings.push({
        type: 'failed-updates',
        severity: 'warning',
        message: `${failedUpdates.length} Windows updates failed to install`,
        value: failedUpdates.length,
        updates: failedUpdates.map(u => u.title).slice(0, 3)
      });

      findings.recommendations.push({
        type: 'windows-update',
        message: 'Retry failed Windows updates or run Windows Update troubleshooter'
      });
    }

    // Check for very recent updates that might correlate with problems
    const veryRecentUpdates = findings.windowsUpdates.filter(u => u.daysAgo <= 3);
    if (veryRecentUpdates.length > 0) {
      findings.recommendations.push({
        type: 'recent-update-correlation',
        message: `${veryRecentUpdates.length} updates installed in last 3 days - may be related to recent issues`
      });
    }

    // Check for recent software installations
    const recentSoftware = findings.recentInstalls.filter(i => i.daysAgo <= 7 && i.action === 'install');
    if (recentSoftware.length > 0) {
      findings.recommendations.push({
        type: 'recent-software',
        message: `${recentSoftware.length} programs installed recently - check if problems started after installation`
      });
    }
  }
}

module.exports = RecentChangesInvestigator;
