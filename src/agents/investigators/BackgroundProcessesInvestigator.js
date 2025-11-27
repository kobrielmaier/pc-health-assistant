/**
 * BackgroundProcessesInvestigator
 * Analyzes currently running processes for resource hogs and suspicious activity
 * Cross-platform: Windows & macOS
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { isWindows, isMacOS, getPlatformName } = require('../../utils/platform');

class BackgroundProcessesInvestigator {
  constructor() {
    this.name = 'BackgroundProcessesInvestigator';
    console.log(`BackgroundProcessesInvestigator initialized. Platform: ${getPlatformName()}`);
  }

  async investigate(step, options = {}) {
    console.log('Investigating background processes...');

    const findings = {
      topCPUProcesses: [],
      topMemoryProcesses: [],
      suspiciousProcesses: [],
      totalProcessCount: 0,
      warnings: [],
      recommendations: []
    };

    try {
      if (isWindows()) {
        await this.getProcessesWindows(findings);
      } else if (isMacOS()) {
        await this.getProcessesMacOS(findings);
      }

      // Analyze the findings
      this.analyzeProcesses(findings);

    } catch (error) {
      findings.error = error.message;
    }

    return findings;
  }

  /**
   * Get processes on Windows
   */
  async getProcessesWindows(findings) {
    // Get all processes with CPU and memory usage
    const { stdout } = await execPromise(
      `powershell -Command "Get-Process | Where-Object {$_.CPU -ne $null} | Select-Object Name, Id, CPU, WorkingSet, Path | Sort-Object CPU -Descending | Select-Object -First 30 | ConvertTo-Json"`,
      { timeout: 10000 }
    );

    if (stdout && stdout.trim()) {
      let processes = JSON.parse(stdout);
      if (!Array.isArray(processes)) {
        processes = [processes];
      }

      // Get total process count
      const { stdout: countStdout } = await execPromise(
        `powershell -Command "(Get-Process).Count"`
      );
      findings.totalProcessCount = parseInt(countStdout.trim());

      // Convert WorkingSet from bytes to MB
      const processedList = processes.map(p => ({
        name: p.Name,
        pid: p.Id,
        cpuSeconds: parseFloat(p.CPU?.toFixed(2) || 0),
        memoryMB: Math.round((p.WorkingSet || 0) / 1024 / 1024),
        path: p.Path || 'Unknown'
      }));

      // Top CPU consumers (sorted by CPU time)
      findings.topCPUProcesses = [...processedList]
        .sort((a, b) => b.cpuSeconds - a.cpuSeconds)
        .slice(0, 10);

      // Top memory consumers
      findings.topMemoryProcesses = [...processedList]
        .sort((a, b) => b.memoryMB - a.memoryMB)
        .slice(0, 10);

      // Check for suspicious processes
      this.checkSuspiciousProcesses(processedList, findings);
    }
  }

  /**
   * Get processes on macOS
   */
  async getProcessesMacOS(findings) {
    try {
      // Get process list with CPU and memory using ps
      const { stdout } = await execPromise(
        `ps -Ao pid,pcpu,pmem,rss,comm | head -40`,
        { timeout: 10000 }
      );

      if (stdout && stdout.trim()) {
        const lines = stdout.trim().split('\n');
        const processes = [];

        // Skip header line
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parseInt(parts[0]);
            const cpuPercent = parseFloat(parts[1]);
            const memPercent = parseFloat(parts[2]);
            const rssKB = parseInt(parts[3]);
            const name = parts.slice(4).join(' ').split('/').pop(); // Get just the command name

            processes.push({
              name: name,
              pid: pid,
              cpuPercent: cpuPercent,
              cpuSeconds: cpuPercent, // Use percent as proxy for now
              memoryMB: Math.round(rssKB / 1024),
              path: 'N/A'
            });
          }
        }

        // Get total process count
        const { stdout: countStdout } = await execPromise(`ps -A | wc -l`);
        findings.totalProcessCount = parseInt(countStdout.trim()) - 1; // Subtract header

        // Top CPU consumers
        findings.topCPUProcesses = [...processes]
          .sort((a, b) => b.cpuPercent - a.cpuPercent)
          .slice(0, 10);

        // Top memory consumers
        findings.topMemoryProcesses = [...processes]
          .sort((a, b) => b.memoryMB - a.memoryMB)
          .slice(0, 10);

        // Check for suspicious processes
        this.checkSuspiciousProcesses(processes, findings);
      }
    } catch (error) {
      console.error('Error getting macOS processes:', error.message);
    }
  }

  /**
   * Check for suspicious processes
   */
  checkSuspiciousProcesses(processes, findings) {
    const processCounts = {};
    const allowedMultiInstance = isWindows()
      ? ['svchost', 'chrome', 'msedge', 'firefox', 'runtimebroker']
      : ['chrome', 'firefox', 'safari', 'google chrome helper'];

    processes.forEach(p => {
      const name = (p.name || '').toLowerCase();
      processCounts[name] = (processCounts[name] || 0) + 1;
    });

    // Flag processes with many instances
    for (const [name, count] of Object.entries(processCounts)) {
      if (count > 5 && !allowedMultiInstance.includes(name)) {
        findings.suspiciousProcesses.push({
          name: name,
          instanceCount: count,
          reason: 'Multiple instances running'
        });
      }
    }
  }

  /**
   * Analyze processes and generate warnings/recommendations
   */
  analyzeProcesses(findings) {
    // Flag extremely high memory usage
    for (const proc of findings.topMemoryProcesses) {
      if (proc.memoryMB > 2000) {
        findings.warnings.push({
          type: 'high-memory-process',
          severity: 'warning',
          message: `${proc.name} is using ${proc.memoryMB} MB of RAM`,
          value: proc.memoryMB,
          processName: proc.name
        });
      }
    }

    // Flag high CPU usage
    const topCPU = findings.topCPUProcesses[0];
    if (topCPU) {
      const cpuValue = topCPU.cpuPercent || topCPU.cpuSeconds;
      if (cpuValue > 50) {
        findings.warnings.push({
          type: 'high-cpu-process',
          severity: 'info',
          message: `${topCPU.name} is using significant CPU (${cpuValue}${topCPU.cpuPercent ? '%' : 's'})`,
          value: cpuValue,
          processName: topCPU.name
        });
      }
    }

    // Add recommendations
    if (findings.suspiciousProcesses.length > 0) {
      findings.recommendations.push({
        type: 'suspicious-processes',
        message: `Found ${findings.suspiciousProcesses.length} processes with unusual behavior - may need investigation`
      });
    }

    if (findings.totalProcessCount > 200) {
      findings.warnings.push({
        type: 'too-many-processes',
        severity: 'warning',
        message: `${findings.totalProcessCount} processes running (high number may impact performance)`,
        value: findings.totalProcessCount
      });
      findings.recommendations.push({
        type: 'process-cleanup',
        message: 'Consider closing unused programs to improve performance'
      });
    }
  }
}

module.exports = BackgroundProcessesInvestigator;
