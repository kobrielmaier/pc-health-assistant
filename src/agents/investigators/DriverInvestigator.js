/**
 * DriverInvestigator
 * Checks driver versions and identifies problematic or outdated drivers
 * Cross-platform: Windows & macOS
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { isWindows, isMacOS, getPlatformName } = require('../../utils/platform');

class DriverInvestigator {
  constructor() {
    this.name = 'DriverInvestigator';
    console.log(`DriverInvestigator initialized. Platform: ${getPlatformName()}`);
  }

  async investigate(step, options = {}) {
    console.log('Investigating drivers...');

    const findings = {
      drivers: [],
      outdatedDrivers: [],
      problematicDrivers: []
    };

    try {
      if (isWindows()) {
        await this.investigateWindows(findings);
      } else if (isMacOS()) {
        await this.investigateMacOS(findings);
      }

    } catch (error) {
      findings.error = error.message;
    }

    return findings;
  }

  /**
   * Investigate drivers on Windows
   */
  async investigateWindows(findings) {
    // Get GPU driver info (most critical for crashes/performance)
    const gpuDriver = await this.getGPUDriverInfoWindows();
    findings.drivers.push(gpuDriver);

    // Check if GPU driver is outdated
    if (await this.isDriverOutdated(gpuDriver)) {
      findings.outdatedDrivers.push(gpuDriver);
    }

    // Get all device drivers from Device Manager
    const allDrivers = await this.getAllDriversWindows();
    findings.drivers.push(...allDrivers);

    // Check for outdated non-GPU drivers
    for (const driver of allDrivers) {
      if (driver.ageInDays && driver.ageInDays > 365) {
        findings.outdatedDrivers.push(driver);
      } else if (driver.ageInDays && driver.ageInDays > 180 &&
                 ['Display', 'Net', 'System', 'HIDClass'].includes(driver.type)) {
        findings.outdatedDrivers.push(driver);
      }
    }
  }

  /**
   * Investigate drivers/kexts on macOS
   * Note: macOS manages drivers differently - most are built into the system
   */
  async investigateMacOS(findings) {
    try {
      // Get GPU info
      const gpuInfo = await this.getGPUInfoMacOS();
      if (gpuInfo) {
        findings.drivers.push(gpuInfo);
      }

      // Get loaded kernel extensions (third-party drivers)
      const kexts = await this.getThirdPartyKexts();
      findings.drivers.push(...kexts);

      // On macOS, recommend software update if system is outdated
      const osInfo = await this.getMacOSVersion();
      if (osInfo && osInfo.needsUpdate) {
        findings.outdatedDrivers.push({
          type: 'System',
          name: 'macOS System',
          version: osInfo.version,
          recommendation: 'Run Software Update to get latest drivers and security patches'
        });
      }

    } catch (error) {
      console.error('Error investigating macOS drivers:', error.message);
    }
  }

  /**
   * Get GPU driver information on Windows
   */
  async getGPUDriverInfoWindows() {
    try {
      const { stdout } = await execPromise(
        'wmic path win32_VideoController get name,driverversion,driverdate'
      );

      const lines = stdout.trim().split('\n').filter(line => line.trim());
      if (lines.length > 1) {
        const data = lines[1].trim().split(/\s{2,}/);

        const driverDateStr = data[0];
        const year = driverDateStr.substring(0, 4);
        const month = driverDateStr.substring(4, 6);
        const day = driverDateStr.substring(6, 8);
        const driverDate = new Date(`${year}-${month}-${day}`);

        return {
          type: 'GPU',
          name: data[2],
          version: data[1],
          date: driverDate.toISOString(),
          ageInDays: Math.floor((Date.now() - driverDate.getTime()) / (1000 * 60 * 60 * 24))
        };
      }
    } catch (error) {
      return { type: 'GPU', error: error.message };
    }
  }

  /**
   * Get GPU info on macOS
   */
  async getGPUInfoMacOS() {
    try {
      const { stdout } = await execPromise('system_profiler SPDisplaysDataType -json');
      const data = JSON.parse(stdout);
      const displays = data.SPDisplaysDataType || [];

      if (displays.length > 0) {
        const gpu = displays[0];
        return {
          type: 'GPU',
          name: gpu.sppci_model || gpu._name || 'Unknown',
          version: 'Built-in',
          date: 'N/A',
          ageInDays: null,
          manufacturer: 'Apple/System'
        };
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Get third-party kernel extensions on macOS
   */
  async getThirdPartyKexts() {
    const kexts = [];

    try {
      const { stdout } = await execPromise('kextstat | grep -v com.apple');

      const lines = stdout.trim().split('\n').filter(l => l.trim());
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 6) {
          const bundleId = parts[5];
          const version = parts[4];

          if (bundleId && !bundleId.startsWith('com.apple')) {
            kexts.push({
              type: 'Kernel Extension',
              name: bundleId,
              version: version,
              date: 'N/A',
              manufacturer: bundleId.split('.')[1] || 'Third-party'
            });
          }
        }
      }
    } catch (error) {
      // No third-party kexts or error getting them
    }

    return kexts;
  }

  /**
   * Get macOS version info
   */
  async getMacOSVersion() {
    try {
      const { stdout } = await execPromise('sw_vers -productVersion');
      const version = stdout.trim();

      // Check if version is current (simplified check)
      const parts = version.split('.');
      const majorVersion = parseInt(parts[0]);

      return {
        version: version,
        needsUpdate: majorVersion < 14 // Suggest update if before Sonoma
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a driver is outdated
   */
  async isDriverOutdated(driver) {
    if (driver.type === 'GPU' && driver.ageInDays > 90) {
      return true;
    }
    return false;
  }

  /**
   * Get all device drivers on Windows
   */
  async getAllDriversWindows() {
    const drivers = [];

    try {
      const { stdout } = await execPromise(
        `powershell -Command "Get-WmiObject Win32_PnPSignedDriver | Where-Object {$_.DriverDate -ne $null} | Select-Object DeviceName, DriverVersion, DriverDate, Manufacturer, DeviceClass | ConvertTo-Json"`,
        { timeout: 20000 }
      );

      if (stdout && stdout.trim()) {
        let driverData = JSON.parse(stdout);
        if (!Array.isArray(driverData)) {
          driverData = [driverData];
        }

        for (const driver of driverData) {
          let driverDate = null;
          let ageInDays = null;

          if (driver.DriverDate) {
            const dateStr = driver.DriverDate.substring(0, 8);
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            driverDate = new Date(`${year}-${month}-${day}`);
            ageInDays = Math.floor((Date.now() - driverDate.getTime()) / (1000 * 60 * 60 * 24));
          }

          drivers.push({
            type: driver.DeviceClass || 'Unknown',
            name: driver.DeviceName,
            version: driver.DriverVersion || 'Unknown',
            date: driverDate ? driverDate.toISOString().split('T')[0] : 'Unknown',
            ageInDays: ageInDays,
            manufacturer: driver.Manufacturer || 'Unknown'
          });
        }

        drivers.sort((a, b) => (b.ageInDays || 0) - (a.ageInDays || 0));
        return drivers.slice(0, 50);
      }

    } catch (error) {
      console.error('Failed to get all drivers:', error.message);
    }

    return drivers;
  }
}

module.exports = { DriverInvestigator };
