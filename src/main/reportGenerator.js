/**
 * Report Generator
 * Creates comprehensive error/diagnostic reports that can be shared
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { app, clipboard } = require('electron');

class ReportGenerator {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Generate a comprehensive report
   */
  async generateReport(options = {}) {
    const {
      includeSystemInfo = true,
      includeLogs = true,
      includeErrors = true,
      logCount = 200
    } = options;

    const report = {
      metadata: {
        appName: 'PC Health Assistant',
        appVersion: app.getVersion(),
        reportGeneratedAt: new Date().toISOString(),
        platform: process.platform,
        nodeVersion: process.version,
        electronVersion: process.versions.electron
      },
      systemInfo: includeSystemInfo ? this.getSystemInfo() : null,
      errors: includeErrors ? this.getErrors() : [],
      recentLogs: includeLogs ? this.getRecentLogs(logCount) : []
    };

    return report;
  }

  /**
   * Get system information
   */
  getSystemInfo() {
    return {
      os: {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        arch: os.arch(),
        hostname: os.hostname()
      },
      hardware: {
        cpus: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Unknown',
        totalMemory: this.formatBytes(os.totalmem()),
        freeMemory: this.formatBytes(os.freemem()),
        memoryUsagePercent: Math.round((1 - os.freemem() / os.totalmem()) * 100)
      },
      uptime: {
        system: this.formatUptime(os.uptime()),
        app: this.formatUptime(process.uptime())
      },
      user: {
        homeDir: os.homedir(),
        tempDir: os.tmpdir()
      }
    };
  }

  /**
   * Get error logs
   */
  getErrors() {
    if (!this.logger) return [];
    return this.logger.getErrors();
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count) {
    if (!this.logger) return [];
    return this.logger.getRecentLogs(count);
  }

  /**
   * Format report as readable text
   */
  formatAsText(report) {
    let text = '';

    // Header
    text += '═'.repeat(60) + '\n';
    text += '  PC HEALTH ASSISTANT - ERROR REPORT\n';
    text += '═'.repeat(60) + '\n\n';

    // Metadata
    text += '📋 REPORT INFO\n';
    text += '─'.repeat(40) + '\n';
    text += `Generated: ${report.metadata.reportGeneratedAt}\n`;
    text += `App Version: ${report.metadata.appVersion}\n`;
    text += `Platform: ${report.metadata.platform}\n`;
    text += `Electron: ${report.metadata.electronVersion}\n\n`;

    // System Info
    if (report.systemInfo) {
      text += '💻 SYSTEM INFO\n';
      text += '─'.repeat(40) + '\n';
      text += `OS: ${report.systemInfo.os.type} ${report.systemInfo.os.release}\n`;
      text += `Architecture: ${report.systemInfo.os.arch}\n`;
      text += `CPU: ${report.systemInfo.hardware.cpuModel} (${report.systemInfo.hardware.cpus} cores)\n`;
      text += `Memory: ${report.systemInfo.hardware.freeMemory} free of ${report.systemInfo.hardware.totalMemory} (${report.systemInfo.hardware.memoryUsagePercent}% used)\n`;
      text += `System Uptime: ${report.systemInfo.uptime.system}\n`;
      text += `App Uptime: ${report.systemInfo.uptime.app}\n\n`;
    }

    // Errors
    text += '❌ ERRORS & WARNINGS\n';
    text += '─'.repeat(40) + '\n';
    if (report.errors.length === 0) {
      text += 'No errors recorded.\n\n';
    } else {
      report.errors.forEach((error, i) => {
        text += `\n[${i + 1}] ${error.timestamp}\n`;
        text += `    Level: ${error.level}\n`;
        text += `    Category: ${error.category}\n`;
        text += `    Message: ${error.message}\n`;
        if (error.data) {
          text += `    Data: ${JSON.stringify(error.data, null, 2).split('\n').join('\n    ')}\n`;
        }
      });
      text += '\n';
    }

    // Recent Logs
    text += '📜 RECENT ACTIVITY LOG\n';
    text += '─'.repeat(40) + '\n';
    if (report.recentLogs.length === 0) {
      text += 'No logs recorded.\n';
    } else {
      report.recentLogs.slice(-50).forEach(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        text += `[${time}] [${log.level}] [${log.category}] ${log.message}\n`;
      });
    }

    text += '\n' + '═'.repeat(60) + '\n';
    text += '  END OF REPORT\n';
    text += '═'.repeat(60) + '\n';

    return text;
  }

  /**
   * Format report as JSON
   */
  formatAsJSON(report) {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Save report to file
   */
  async saveReport(report, filePath) {
    const text = this.formatAsText(report);
    fs.writeFileSync(filePath, text);
    return filePath;
  }

  /**
   * Copy report to clipboard
   */
  copyToClipboard(report) {
    const text = this.formatAsText(report);
    clipboard.writeText(text);
    return true;
  }

  /**
   * Helper: Format bytes to human readable
   */
  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Helper: Format uptime to human readable
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '< 1m';
  }
}

module.exports = { ReportGenerator };
