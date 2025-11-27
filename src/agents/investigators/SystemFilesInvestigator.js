/**
 * SystemFilesInvestigator
 * Checks system file integrity using SFC (System File Checker) results
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const execPromise = util.promisify(exec);

class SystemFilesInvestigator {
  constructor() {
    this.name = 'SystemFilesInvestigator';
  }

  async investigate(step, options = {}) {
    console.log('Investigating system file integrity...');

    const findings = {
      sfcStatus: 'unknown',
      corruptedFiles: [],
      repairedFiles: [],
      lastScanDate: null,
      warnings: [],
      recommendations: []
    };

    try {
      // Check the CBS.log file for recent SFC scan results
      // CBS.log is where SFC writes its results
      const cbsLogPath = 'C:\\Windows\\Logs\\CBS\\CBS.log';

      try {
        const logStats = await fs.stat(cbsLogPath);
        findings.lastScanDate = logStats.mtime;

        // Read the last portion of the CBS.log to find the MOST RECENT SFC scan results
        const { stdout } = await execPromise(
          `powershell -Command "Get-Content '${cbsLogPath}' -Tail 1000 | Select-String -Pattern 'Beginning system scan|Verification complete|no integrity violations|did not find|Windows Resource Protection found corrupt|Windows Resource Protection could not' | Select-Object -Last 10"`,
          { timeout: 10000 }
        );

        if (stdout && stdout.trim()) {
          const lines = stdout.trim().split('\n');

          // Look for the CONCLUSION of the most recent scan
          // SFC writes a clear conclusion at the end of each scan
          let foundConclusion = false;

          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];

            // Look for definitive scan completion messages (most recent)
            if (line.includes('did not find any integrity violations') ||
                line.includes('no integrity violations')) {
              findings.sfcStatus = 'healthy';
              foundConclusion = true;
              break;
            }

            if (line.includes('Windows Resource Protection found corrupt files and successfully repaired them')) {
              findings.sfcStatus = 'healthy';
              findings.note = 'Previous corruption was found and repaired';
              foundConclusion = true;
              break;
            }

            if (line.includes('Windows Resource Protection found corrupt files but was unable to fix')) {
              findings.sfcStatus = 'corruption-unrepairable';
              foundConclusion = true;
              break;
            }

            if (line.includes('Windows Resource Protection could not perform')) {
              findings.sfcStatus = 'scan-incomplete';
              findings.note = 'SFC scan did not complete - may require admin privileges';
              foundConclusion = true;
              break;
            }
          }

          if (!foundConclusion) {
            findings.sfcStatus = 'no-recent-scan';
            findings.note = 'No recent SFC scan found in logs';
          }

        } else {
          findings.sfcStatus = 'no-recent-scan';
        }

      } catch (error) {
        findings.sfcStatus = 'log-not-accessible';
        findings.note = 'CBS.log not accessible - may need admin privileges';
      }

      // Check DISM component store health as well
      try {
        const { stdout: dismStdout } = await execPromise(
          `powershell -Command "DISM /Online /Cleanup-Image /ScanHealth"`,
          { timeout: 60000 }
        );

        if (dismStdout.includes('No component store corruption detected')) {
          findings.dismStatus = 'healthy';
        } else if (dismStdout.includes('corruption')) {
          findings.dismStatus = 'corruption-detected';
        }
      } catch (error) {
        findings.dismStatus = 'scan-failed';
      }

      // Generate warnings and recommendations ONLY for CURRENT issues
      if (findings.sfcStatus === 'corruption-unrepairable') {
        findings.warnings.push({
          type: 'corrupted-system-files',
          severity: 'critical',
          message: 'System files are corrupted and could not be repaired automatically',
          value: 'unrepairable'
        });

        findings.recommendations.push({
          type: 'system-repair',
          message: 'Run DISM /RestoreHealth followed by SFC /scannow to repair system files'
        });
      } else if (findings.sfcStatus === 'scan-incomplete') {
        findings.warnings.push({
          type: 'sfc-scan-failed',
          severity: 'info',
          message: 'System file scan did not complete',
          value: 'incomplete'
        });
      }

      // If status is 'healthy' - DO NOT create any warnings
      // Old repaired corruption is not a current problem

      if (findings.dismStatus === 'corruption-detected') {
        findings.warnings.push({
          type: 'component-store-corruption',
          severity: 'warning',
          message: 'Windows component store has corruption',
          value: 'corruption-detected'
        });

        findings.recommendations.push({
          type: 'dism-repair',
          message: 'Run DISM /RestoreHealth to repair Windows image'
        });
      }

      // Only recommend a scan if there are other problems suggesting system issues
      // Don't recommend preventive scans unless there's a reason
      if (findings.sfcStatus === 'no-recent-scan' && options.recommendPreventive) {
        findings.recommendations.push({
          type: 'preventive',
          severity: 'info',
          message: 'Consider running SFC scan to verify system file integrity'
        });
      }

    } catch (error) {
      findings.error = error.message;
    }

    return findings;
  }
}

module.exports = SystemFilesInvestigator;
