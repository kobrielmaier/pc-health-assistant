/**
 * USBDevicesInvestigator
 * Analyzes USB devices and potential issues
 * Cross-platform: Windows & macOS
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { isWindows, isMacOS, getPlatformName } = require('../../utils/platform');

class USBDevicesInvestigator {
  constructor() {
    this.name = 'USBDevicesInvestigator';
    console.log(`USBDevicesInvestigator initialized. Platform: ${getPlatformName()}`);
  }

  async investigate(step, options = {}) {
    console.log('Investigating USB devices...');

    const findings = {
      connectedUSBDevices: [],
      usbHubs: [],
      errorDevices: [],
      totalUSBDevices: 0,
      warnings: [],
      recommendations: []
    };

    try {
      if (isWindows()) {
        await this.investigateWindows(findings);
      } else if (isMacOS()) {
        await this.investigateMacOS(findings);
      }

      // Analyze findings (common for both platforms)
      this.analyzeFindings(findings);

    } catch (error) {
      findings.error = error.message;
    }

    return findings;
  }

  /**
   * Investigate USB devices on Windows
   */
  async investigateWindows(findings) {
    const { stdout } = await execPromise(
      `powershell -Command "Get-PnpDevice -Class USB | Select-Object FriendlyName, Status, InstanceId | ConvertTo-Json"`,
      { timeout: 10000 }
    );

    if (stdout && stdout.trim()) {
      let devices = JSON.parse(stdout);
      if (!Array.isArray(devices)) {
        devices = [devices];
      }

      for (const device of devices) {
        const deviceInfo = {
          name: device.FriendlyName,
          status: device.Status,
          instanceId: device.InstanceId
        };

        if (device.FriendlyName && device.FriendlyName.includes('Hub')) {
          findings.usbHubs.push(deviceInfo);
        } else if (device.FriendlyName && device.FriendlyName !== 'None') {
          findings.connectedUSBDevices.push(deviceInfo);
        }

        if (device.Status === 'Error') {
          findings.errorDevices.push(deviceInfo);
        }
      }

      findings.totalUSBDevices = devices.length;
    }
  }

  /**
   * Investigate USB devices on macOS
   */
  async investigateMacOS(findings) {
    try {
      // Use system_profiler to get USB devices
      const { stdout } = await execPromise('system_profiler SPUSBDataType -json', { timeout: 15000 });

      const data = JSON.parse(stdout);
      const usbData = data.SPUSBDataType || [];

      // Recursively extract USB devices
      const extractDevices = (items, isHub = false) => {
        for (const item of items) {
          if (item._name) {
            const deviceInfo = {
              name: item._name,
              status: 'OK',
              manufacturer: item.manufacturer || 'Unknown',
              vendorId: item.vendor_id || 'Unknown',
              productId: item.product_id || 'Unknown'
            };

            // Check if it's a hub
            if (item._name.toLowerCase().includes('hub') || item.bcd_device === '0.00') {
              findings.usbHubs.push(deviceInfo);
            } else {
              findings.connectedUSBDevices.push(deviceInfo);
            }
          }

          // Check nested items (devices connected through hubs)
          if (item._items) {
            extractDevices(item._items, false);
          }
        }
      };

      extractDevices(usbData);
      findings.totalUSBDevices = findings.connectedUSBDevices.length + findings.usbHubs.length;

    } catch (error) {
      console.error('Error getting macOS USB devices:', error.message);
    }
  }

  /**
   * Analyze findings and generate warnings/recommendations
   */
  analyzeFindings(findings) {
    if (findings.errorDevices.length > 0) {
      findings.warnings.push({
        type: 'usb-device-errors',
        severity: 'warning',
        message: `${findings.errorDevices.length} USB devices have errors`,
        value: findings.errorDevices.length,
        devices: findings.errorDevices.map(d => d.name).join(', ')
      });

      findings.recommendations.push({
        type: 'usb-troubleshoot',
        message: 'Reconnect USB devices with errors or update USB drivers'
      });
    }

    // Check for excessive USB devices (possible power issues)
    if (findings.connectedUSBDevices.length > 15) {
      findings.warnings.push({
        type: 'many-usb-devices',
        severity: 'info',
        message: `${findings.connectedUSBDevices.length} USB devices connected`,
        value: findings.connectedUSBDevices.length
      });

      findings.recommendations.push({
        type: 'usb-power',
        message: 'Many USB devices connected - ensure adequate power supply'
      });
    }
  }
}

module.exports = USBDevicesInvestigator;
