/**
 * CrashDumpInvestigator
 * Automatically finds and analyzes crash dump files
 * Cross-platform: Windows & macOS
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { isWindows, isMacOS, getPlatformName } = require('../../utils/platform');

class CrashDumpInvestigator {
  constructor() {
    this.name = 'CrashDumpInvestigator';
    console.log(`CrashDumpInvestigator initialized. Platform: ${getPlatformName()}`);
  }

  /**
   * Main investigation method
   * Automatically searches for crash dumps in known locations
   */
  async investigate(step, options = {}) {
    console.log('Investigating crash dumps...');

    let locations;
    if (isMacOS()) {
      locations = this.getMacOSCrashLocations();
    } else {
      locations = this.expandLocations(step.config?.locations || []);
    }

    const findings = {
      crashDumpsFound: [],
      locations: locations,
      analysis: []
    };

    // Search all locations for crash dumps
    for (const location of locations) {
      try {
        const dumps = await this.findCrashDumps(location);
        findings.crashDumpsFound.push(...dumps);
      } catch (error) {
        console.log(`Could not access ${location}: ${error.message}`);
      }
    }

    // Analyze the most recent crash dumps
    if (findings.crashDumpsFound.length > 0) {
      findings.analysis = await this.analyzeCrashDumps(
        findings.crashDumpsFound,
        options
      );
    }

    return findings;
  }

  /**
   * Get macOS crash report locations
   */
  getMacOSCrashLocations() {
    const homeDir = os.homedir();
    return [
      `${homeDir}/Library/Logs/DiagnosticReports`,
      '/Library/Logs/DiagnosticReports',
      `${homeDir}/Library/Logs/CrashReporter`
    ];
  }

  /**
   * Expand environment variables in location paths
   */
  expandLocations(locations) {
    return locations.map(loc => {
      if (isWindows()) {
        // Expand Windows environment variables
        return loc
          .replace('%LOCALAPPDATA%', process.env.LOCALAPPDATA)
          .replace('%APPDATA%', process.env.APPDATA)
          .replace('%USERPROFILE%', process.env.USERPROFILE);
      } else if (isMacOS()) {
        // Expand macOS home directory
        return loc.replace('~', os.homedir());
      }
      return loc;
    });
  }

  /**
   * Find crash dump files in a specific location
   */
  async findCrashDumps(location) {
    const dumps = [];

    try {
      if (isWindows()) {
        // Handle wildcard paths (e.g., %APPDATA%\*\Saved\Crashes)
        if (location.includes('*')) {
          const { stdout } = await execPromise(
            `powershell -Command "Get-ChildItem -Path '${location.replace(/\*/g, '*')}' -Filter '*.dmp' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 10 | ForEach-Object { $_.FullName }"`
          );

          const paths = stdout.trim().split('\n').filter(p => p);
          for (const dumpPath of paths) {
            dumps.push(await this.getCrashDumpInfo(dumpPath.trim()));
          }
        } else {
          // Direct path
          const files = await fs.readdir(location);
          for (const file of files) {
            if (file.endsWith('.dmp')) {
              const fullPath = path.join(location, file);
              dumps.push(await this.getCrashDumpInfo(fullPath));
            }
          }
        }
      } else if (isMacOS()) {
        // macOS crash reports are .crash, .ips, or .diag files
        const files = await fs.readdir(location);
        for (const file of files) {
          if (file.endsWith('.crash') || file.endsWith('.ips') || file.endsWith('.diag')) {
            const fullPath = path.join(location, file);
            dumps.push(await this.getCrashDumpInfo(fullPath));
          }
        }
      }
    } catch (error) {
      // Location doesn't exist or not accessible - that's okay
    }

    return dumps;
  }

  /**
   * Get information about a crash dump file
   */
  async getCrashDumpInfo(dumpPath) {
    try {
      const stats = await fs.stat(dumpPath);
      return {
        path: dumpPath,
        filename: path.basename(dumpPath),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)) // days
      };
    } catch (error) {
      return {
        path: dumpPath,
        error: error.message
      };
    }
  }

  /**
   * Analyze crash dumps to find patterns
   * This is the key method - similar to how we analyzed your Arc Raiders crash!
   */
  async analyzeCrashDumps(dumps, options) {
    const analysis = [];

    // Sort by most recent
    dumps.sort((a, b) => b.modified - a.modified);

    // Analyze up to 50 most recent crashes
    const recentDumps = dumps.slice(0, 50);

    for (const dump of recentDumps) {
      try {
        if (isWindows()) {
          // For .dmp files in Unreal Engine games (like Arc Raiders)
          // Look for associated XML files
          if (dump.path.includes('UECC-Windows')) {
            const xmlPath = dump.path.replace('.dmp', '').replace('UEMinidump', 'CrashContext.runtime-xml');
            const xmlAnalysis = await this.analyzeUECrashDump(xmlPath);
            if (xmlAnalysis) {
              analysis.push({
                ...dump,
                type: 'Unreal Engine',
                details: xmlAnalysis
              });
            }
          }

          // For Windows minidumps
          if (dump.path.includes('Minidump') || dump.path.includes('\\Windows\\')) {
            analysis.push({
              ...dump,
              type: 'Windows Minidump',
              note: 'Requires WinDbg for detailed analysis'
            });
          }
        } else if (isMacOS()) {
          // Analyze macOS crash reports
          const crashAnalysis = await this.analyzeMacOSCrashReport(dump.path);
          if (crashAnalysis) {
            analysis.push({
              ...dump,
              type: crashAnalysis.type || 'macOS Crash Report',
              details: crashAnalysis
            });
          }
        }

      } catch (error) {
        console.error(`Error analyzing ${dump.path}:`, error);
      }
    }

    return analysis;
  }

  /**
   * Analyze macOS crash report
   */
  async analyzeMacOSCrashReport(crashPath) {
    try {
      const content = await fs.readFile(crashPath, 'utf-8');

      const info = {
        processName: null,
        crashReason: null,
        crashedThread: null,
        osVersion: null
      };

      // Parse .crash or .ips file format
      const lines = content.split('\n');

      for (const line of lines) {
        if (line.startsWith('Process:')) {
          info.processName = line.split(':')[1]?.trim();
        } else if (line.startsWith('Exception Type:') || line.includes('"termination_reason"')) {
          info.crashReason = line.split(':')[1]?.trim() || line;
        } else if (line.startsWith('Crashed Thread:')) {
          info.crashedThread = line.split(':')[1]?.trim();
        } else if (line.startsWith('OS Version:') || line.includes('"os_version"')) {
          info.osVersion = line.split(':')[1]?.trim() || line;
        }
      }

      // Determine crash type
      if (info.crashReason) {
        if (info.crashReason.includes('EXC_BAD_ACCESS') || info.crashReason.includes('SIGSEGV')) {
          info.type = 'Memory Access Violation';
          info.recommendation = 'This usually indicates a bug in the application or low memory condition';
        } else if (info.crashReason.includes('EXC_CRASH') || info.crashReason.includes('SIGABRT')) {
          info.type = 'Application Abort';
          info.recommendation = 'The application terminated itself due to an internal error';
        } else if (info.crashReason.includes('EXC_RESOURCE')) {
          info.type = 'Resource Limit';
          info.recommendation = 'The application exceeded system resource limits (memory, CPU, etc.)';
        }
      }

      return info;

    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze Unreal Engine crash dumps (XML format)
   * This is exactly what we did for your Arc Raiders crash!
   */
  async analyzeUECrashDump(xmlPath) {
    try {
      const content = await fs.readFile(xmlPath, 'utf-8');

      // Parse key information from the XML
      const info = {
        errorMessage: this.extractXMLValue(content, 'ErrorMessage'),
        gameName: this.extractXMLValue(content, 'GameName'),
        engineVersion: this.extractXMLValue(content, 'EngineVersion'),
        platform: this.extractXMLValue(content, 'PlatformName'),
        cpuBrand: this.extractXMLValue(content, 'Misc.CPUBrand'),
        gpuBrand: this.extractXMLValue(content, 'Misc.PrimaryGPUBrand'),
        driverVersion: this.extractXMLValue(content, 'RHI.UserDriverVersion'),
        driverDenylisted: this.extractXMLValue(content, 'RHI.DriverDenylisted'),
        timeOfCrash: this.extractXMLValue(content, 'TimeOfCrash')
      };

      // Key insight: Check if driver is blacklisted!
      if (info.driverDenylisted === 'true') {
        info.criticalIssue = {
          type: 'DRIVER_BLACKLISTED',
          severity: 'critical',
          message: `GPU driver ${info.driverVersion} is blacklisted by ${info.gameName}. This is likely causing crashes.`,
          fix: 'Update graphics drivers to latest version'
        };
      }

      return info;

    } catch (error) {
      return null;
    }
  }

  /**
   * Helper to extract values from XML
   */
  extractXMLValue(xml, tag) {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
  }
}

module.exports = { CrashDumpInvestigator };
