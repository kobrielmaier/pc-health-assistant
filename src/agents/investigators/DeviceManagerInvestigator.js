/**
 * DeviceManagerInvestigator
 * Checks for device errors, unknown devices, and disabled devices
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class DeviceManagerInvestigator {
  constructor() {
    this.name = 'DeviceManagerInvestigator';
  }

  async investigate(step, options = {}) {
    console.log('Investigating device manager...');

    const findings = {
      errorDevices: [],
      disabledDevices: [],
      unknownDevices: [],
      allDevicesHealthy: true,
      warnings: [],
      recommendations: []
    };

    try {
      // Get all PnP devices with their status
      const { stdout } = await execPromise(
        `powershell -Command "Get-PnpDevice | Select-Object FriendlyName, Status, Class, InstanceId, ProblemDescription | ConvertTo-Json"`,
        { timeout: 15000 }
      );

      if (stdout && stdout.trim()) {
        let devices = JSON.parse(stdout);
        if (!Array.isArray(devices)) {
          devices = [devices];
        }

        // Categorize devices by status
        for (const device of devices) {
          // Skip software devices and drivers
          if (!device.FriendlyName || device.FriendlyName === 'None') {
            continue;
          }

          if (device.Status === 'Error') {
            findings.allDevicesHealthy = false;
            findings.errorDevices.push({
              name: device.FriendlyName,
              class: device.Class,
              problem: device.ProblemDescription || 'Unknown error',
              instanceId: device.InstanceId
            });
          }

          if (device.Status === 'Disabled') {
            findings.disabledDevices.push({
              name: device.FriendlyName,
              class: device.Class,
              instanceId: device.InstanceId
            });
          }

          if (device.Status === 'Unknown' || device.FriendlyName.includes('Unknown')) {
            findings.allDevicesHealthy = false;
            findings.unknownDevices.push({
              name: device.FriendlyName,
              class: device.Class,
              instanceId: device.InstanceId
            });
          }
        }

        // Generate warnings
        if (findings.errorDevices.length > 0) {
          findings.warnings.push({
            type: 'device-errors',
            severity: 'warning',
            message: `${findings.errorDevices.length} devices have errors`,
            value: findings.errorDevices.length,
            devices: findings.errorDevices.map(d => d.name).join(', ')
          });

          findings.recommendations.push({
            type: 'device-drivers',
            message: 'Update or reinstall drivers for devices with errors'
          });
        }

        if (findings.unknownDevices.length > 0) {
          findings.warnings.push({
            type: 'unknown-devices',
            severity: 'info',
            message: `${findings.unknownDevices.length} unknown devices found`,
            value: findings.unknownDevices.length,
            devices: findings.unknownDevices.map(d => d.name).join(', ')
          });

          findings.recommendations.push({
            type: 'missing-drivers',
            message: 'Install drivers for unknown devices'
          });
        }

        if (findings.disabledDevices.length > 5) {
          findings.warnings.push({
            type: 'many-disabled-devices',
            severity: 'info',
            message: `${findings.disabledDevices.length} devices are disabled`,
            value: findings.disabledDevices.length
          });
        }

      }

    } catch (error) {
      findings.error = error.message;
    }

    return findings;
  }
}

module.exports = DeviceManagerInvestigator;
