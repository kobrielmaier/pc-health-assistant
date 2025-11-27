/**
 * StartupProgramsInvestigator
 * Analyzes programs that run at startup
 * Cross-platform: Windows & macOS
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { isWindows, isMacOS, getPlatformName } = require('../../utils/platform');

class StartupProgramsInvestigator {
  constructor() {
    this.name = 'StartupProgramsInvestigator';
    console.log(`StartupProgramsInvestigator initialized. Platform: ${getPlatformName()}`);
  }

  async investigate(step, options = {}) {
    console.log('Investigating startup programs...');

    const findings = {
      startupPrograms: [],
      totalCount: 0,
      highImpactCount: 0,
      warnings: [],
      recommendations: []
    };

    try {
      if (isWindows()) {
        await this.getStartupProgramsWindows(findings);
      } else if (isMacOS()) {
        await this.getStartupProgramsMacOS(findings);
      }

      // Identify known problematic or resource-intensive startup programs
      const problematicKeywords = [
        'adobe', 'java', 'quicktime', 'itunes helper', 'skype',
        'realplayer', 'apple push', 'spotify', 'steam', 'discord'
      ];

      for (const program of findings.startupPrograms) {
        const nameLower = (program.name || '').toLowerCase();

        if (problematicKeywords.some(keyword => nameLower.includes(keyword))) {
          findings.highImpactCount++;
        }
      }

      // Generate warnings based on findings
      if (findings.totalCount > 20) {
        findings.warnings.push({
          type: 'too-many-startup-programs',
          severity: 'warning',
          message: `${findings.totalCount} programs set to run at startup (may slow boot time)`,
          value: findings.totalCount
        });
        findings.recommendations.push({
          type: 'startup',
          message: 'Disable unnecessary startup programs to improve boot speed'
        });
      }

      if (findings.highImpactCount > 0) {
        findings.recommendations.push({
          type: 'startup-optimization',
          message: `Found ${findings.highImpactCount} resource-intensive startup programs that could be disabled`
        });
      }

    } catch (error) {
      findings.error = error.message;
    }

    return findings;
  }

  /**
   * Get startup programs on Windows
   */
  async getStartupProgramsWindows(findings) {
    try {
      const { stdout } = await execPromise(
        `powershell -Command "Get-CimInstance Win32_StartupCommand | Select-Object Name, Command, Location, User | ConvertTo-Json"`
      );

      if (stdout && stdout.trim()) {
        let programs = JSON.parse(stdout);
        if (!Array.isArray(programs)) {
          programs = [programs];
        }

        findings.startupPrograms = programs.map(p => ({
          name: p.Name,
          command: p.Command,
          location: p.Location,
          user: p.User || 'All Users'
        }));

        findings.totalCount = programs.length;
      }
    } catch (error) {
      console.error('Error getting Windows startup programs:', error.message);
    }
  }

  /**
   * Get startup programs on macOS (Launch Agents and Login Items)
   */
  async getStartupProgramsMacOS(findings) {
    try {
      const programs = [];

      // Check user LaunchAgents
      try {
        const { stdout: userAgents } = await execPromise(
          `ls -la ~/Library/LaunchAgents/*.plist 2>/dev/null || echo ""`
        );
        if (userAgents && userAgents.trim()) {
          const lines = userAgents.trim().split('\n').filter(l => l.trim());
          for (const line of lines) {
            const match = line.match(/([^\/]+)\.plist$/);
            if (match) {
              programs.push({
                name: match[1],
                command: 'LaunchAgent',
                location: '~/Library/LaunchAgents',
                user: 'Current User'
              });
            }
          }
        }
      } catch (e) {
        // No user launch agents
      }

      // Check system LaunchAgents
      try {
        const { stdout: systemAgents } = await execPromise(
          `ls -la /Library/LaunchAgents/*.plist 2>/dev/null || echo ""`
        );
        if (systemAgents && systemAgents.trim()) {
          const lines = systemAgents.trim().split('\n').filter(l => l.trim());
          for (const line of lines) {
            const match = line.match(/([^\/]+)\.plist$/);
            if (match) {
              programs.push({
                name: match[1],
                command: 'LaunchAgent',
                location: '/Library/LaunchAgents',
                user: 'All Users'
              });
            }
          }
        }
      } catch (e) {
        // No system launch agents
      }

      // Check Login Items using osascript
      try {
        const { stdout: loginItems } = await execPromise(
          `osascript -e 'tell application "System Events" to get the name of every login item' 2>/dev/null || echo ""`
        );
        if (loginItems && loginItems.trim()) {
          const items = loginItems.trim().split(', ').filter(i => i.trim());
          for (const item of items) {
            programs.push({
              name: item.trim(),
              command: 'Login Item',
              location: 'System Preferences',
              user: 'Current User'
            });
          }
        }
      } catch (e) {
        // Could not get login items
      }

      findings.startupPrograms = programs;
      findings.totalCount = programs.length;

    } catch (error) {
      console.error('Error getting macOS startup programs:', error.message);
    }
  }
}

module.exports = StartupProgramsInvestigator;
