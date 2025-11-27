/**
 * TempFilesInvestigator
 * Analyzes temporary files and cache that could be cleaned
 * Cross-platform: Windows & macOS
 */

const { exec } = require('child_process');
const util = require('util');
const os = require('os');
const execPromise = util.promisify(exec);
const { isWindows, isMacOS, getPlatformName } = require('../../utils/platform');

class TempFilesInvestigator {
  constructor() {
    this.name = 'TempFilesInvestigator';
    console.log(`TempFilesInvestigator initialized. Platform: ${getPlatformName()}`);
  }

  async investigate(step, options = {}) {
    console.log('Investigating temporary files...');

    const findings = {
      tempLocations: [],
      totalSizeMB: 0,
      warnings: [],
      recommendations: []
    };

    try {
      if (isWindows()) {
        await this.getTempFilesWindows(findings);
      } else if (isMacOS()) {
        await this.getTempFilesMacOS(findings);
      }

      // Generate warnings and recommendations
      this.analyzeFindings(findings);

    } catch (error) {
      findings.error = error.message;
    }

    return findings;
  }

  /**
   * Get temp files on Windows
   */
  async getTempFilesWindows(findings) {
    const tempPaths = [
      { name: 'Windows Temp', path: '%TEMP%' },
      { name: 'Windows Temp (System)', path: 'C:\\Windows\\Temp' },
      { name: 'Prefetch', path: 'C:\\Windows\\Prefetch' },
      { name: 'IE Cache', path: '%LOCALAPPDATA%\\Microsoft\\Windows\\INetCache' },
      { name: 'Windows Update Cache', path: 'C:\\Windows\\SoftwareDistribution\\Download' }
    ];

    for (const location of tempPaths) {
      try {
        const { stdout } = await execPromise(
          `powershell -Command "$path = [Environment]::ExpandEnvironmentVariables('${location.path}'); if (Test-Path $path) { $size = (Get-ChildItem -Path $path -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum; [PSCustomObject]@{ Path=$path; SizeMB=[math]::Round($size/1MB, 2); FileCount=(Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count } | ConvertTo-Json } else { [PSCustomObject]@{ Path=$path; SizeMB=0; FileCount=0 } | ConvertTo-Json }"`,
          { timeout: 30000 }
        );

        if (stdout && stdout.trim()) {
          const data = JSON.parse(stdout);
          if (data.SizeMB > 0) {
            findings.tempLocations.push({
              name: location.name,
              path: data.Path,
              sizeMB: data.SizeMB,
              fileCount: data.FileCount
            });
            findings.totalSizeMB += data.SizeMB;
          }
        }
      } catch (error) {
        console.log(`Skipping ${location.name}: ${error.message}`);
      }
    }
  }

  /**
   * Get temp files on macOS
   */
  async getTempFilesMacOS(findings) {
    const homeDir = os.homedir();
    const tempPaths = [
      { name: 'System Temp', path: '/tmp' },
      { name: 'User Temp', path: '/var/folders' },
      { name: 'User Caches', path: `${homeDir}/Library/Caches` },
      { name: 'Safari Cache', path: `${homeDir}/Library/Caches/com.apple.Safari` },
      { name: 'Chrome Cache', path: `${homeDir}/Library/Caches/Google/Chrome` },
      { name: 'Logs', path: `${homeDir}/Library/Logs` }
    ];

    for (const location of tempPaths) {
      try {
        // Use du to get folder size
        const { stdout } = await execPromise(
          `du -sk "${location.path}" 2>/dev/null | cut -f1`,
          { timeout: 30000 }
        );

        if (stdout && stdout.trim()) {
          const sizeKB = parseInt(stdout.trim()) || 0;
          const sizeMB = Math.round(sizeKB / 1024 * 100) / 100;

          if (sizeMB > 0) {
            // Get file count
            let fileCount = 0;
            try {
              const { stdout: countOutput } = await execPromise(
                `find "${location.path}" -type f 2>/dev/null | wc -l`,
                { timeout: 10000 }
              );
              fileCount = parseInt(countOutput.trim()) || 0;
            } catch (e) {
              // Ignore file count errors
            }

            findings.tempLocations.push({
              name: location.name,
              path: location.path,
              sizeMB: sizeMB,
              fileCount: fileCount
            });
            findings.totalSizeMB += sizeMB;
          }
        }
      } catch (error) {
        console.log(`Skipping ${location.name}: ${error.message}`);
      }
    }
  }

  /**
   * Analyze findings and generate warnings/recommendations
   */
  analyzeFindings(findings) {
    const cleanupCommand = isWindows() ? 'Run Disk Cleanup' : 'Clear caches in System Preferences or use a cleanup tool';

    if (findings.totalSizeMB > 10000) {
      findings.warnings.push({
        type: 'excessive-temp-files',
        severity: 'warning',
        message: `${Math.round(findings.totalSizeMB)} MB of temporary files found`,
        value: Math.round(findings.totalSizeMB)
      });
      findings.recommendations.push({
        type: 'cleanup',
        message: `${cleanupCommand} to free up disk space`
      });
    } else if (findings.totalSizeMB > 5000) {
      findings.recommendations.push({
        type: 'cleanup',
        message: `${Math.round(findings.totalSizeMB)} MB of temp files could be cleaned`
      });
    }

    // Check for excessive files in any single location
    for (const location of findings.tempLocations) {
      if (location.sizeMB > 5000) {
        findings.warnings.push({
          type: 'large-temp-folder',
          severity: 'info',
          message: `${location.name} contains ${Math.round(location.sizeMB)} MB`,
          value: Math.round(location.sizeMB),
          location: location.name
        });
      }
    }
  }
}

module.exports = TempFilesInvestigator;
