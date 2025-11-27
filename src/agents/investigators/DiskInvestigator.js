/**
 * DiskInvestigator
 * Analyzes disk space and health (Cross-platform: Windows & macOS)
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { isWindows, isMacOS, getPlatformName } = require('../../utils/platform');

class DiskInvestigator {
  constructor() {
    this.name = 'DiskInvestigator';
  }

  async investigate(step, options = {}) {
    console.log(`Investigating disk on ${getPlatformName()}...`);

    const findings = {
      disks: [],
      lowSpaceWarnings: [],
      healthStatus: [],
      recommendations: []
    };

    try {
      // Get disk space information
      const diskInfo = await this.getDiskSpace();
      findings.disks = diskInfo;

      // Get disk health status
      const healthInfo = await this.getDiskHealth();
      findings.healthStatus = healthInfo;

      // Check for low disk space
      for (const disk of diskInfo) {
        if (!disk.totalSpace || disk.totalSpace === 0) continue;

        const percentFree = (disk.freeSpace / disk.totalSpace) * 100;

        if (percentFree < (step.config?.criticalThreshold || 5)) {
          findings.lowSpaceWarnings.push({
            disk: disk.name,
            severity: 'critical',
            percentFree: percentFree.toFixed(1),
            message: `Disk ${disk.name} is critically low on space (${percentFree.toFixed(1)}% free)`
          });
        } else if (percentFree < (step.config?.warningThreshold || 10)) {
          findings.lowSpaceWarnings.push({
            disk: disk.name,
            severity: 'warning',
            percentFree: percentFree.toFixed(1),
            message: `Disk ${disk.name} is running low on space (${percentFree.toFixed(1)}% free)`
          });
        }
      }

      // Check for unhealthy disks
      for (const disk of healthInfo) {
        if (!disk.isHealthy) {
          findings.recommendations.push({
            type: 'disk-health-warning',
            severity: 'critical',
            message: `Disk "${disk.friendlyName}" health status: ${disk.healthStatus}`
          });
        }
      }

    } catch (error) {
      findings.error = error.message;
    }

    return findings;
  }

  /**
   * Get disk space information
   */
  async getDiskSpace() {
    if (isWindows()) {
      return this.getDiskSpaceWindows();
    } else if (isMacOS()) {
      return this.getDiskSpaceMacOS();
    }
    return [];
  }

  /**
   * Get disk space on Windows
   */
  async getDiskSpaceWindows() {
    const disks = [];

    try {
      const { stdout } = await execPromise(
        'wmic logicaldisk get name,freespace,size'
      );

      const lines = stdout.trim().split('\n').filter(line => line.trim());

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 3) {
          const freeSpace = parseInt(parts[0]) || 0;
          const totalSpace = parseInt(parts[1]) || 0;
          disks.push({
            name: parts[2],
            freeSpace: freeSpace,
            totalSpace: totalSpace,
            freeSpaceGB: (freeSpace / (1024 ** 3)).toFixed(2),
            totalSpaceGB: (totalSpace / (1024 ** 3)).toFixed(2)
          });
        }
      }

    } catch (error) {
      console.error('Error getting disk space:', error);
    }

    return disks;
  }

  /**
   * Get disk space on macOS
   */
  async getDiskSpaceMacOS() {
    const disks = [];

    try {
      // Use df command to get disk space
      const { stdout } = await execPromise('df -k');

      const lines = stdout.trim().split('\n').filter(line => line.trim());

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        // Format: Filesystem 1K-blocks Used Available Use% Mounted on
        if (parts.length >= 6) {
          const mountPoint = parts.slice(5).join(' ');
          // Only include real disks (not virtual filesystems)
          if (mountPoint.startsWith('/') && !mountPoint.includes('/dev') &&
              !mountPoint.includes('/private/var/vm')) {
            const totalKB = parseInt(parts[1]) || 0;
            const usedKB = parseInt(parts[2]) || 0;
            const availableKB = parseInt(parts[3]) || 0;

            disks.push({
              name: mountPoint,
              freeSpace: availableKB * 1024,
              totalSpace: totalKB * 1024,
              freeSpaceGB: (availableKB / (1024 ** 2)).toFixed(2),
              totalSpaceGB: (totalKB / (1024 ** 2)).toFixed(2)
            });
          }
        }
      }

    } catch (error) {
      console.error('Error getting disk space on macOS:', error);
    }

    return disks;
  }

  /**
   * Get disk health status
   */
  async getDiskHealth() {
    if (isWindows()) {
      return this.getDiskHealthWindows();
    } else if (isMacOS()) {
      return this.getDiskHealthMacOS();
    }
    return [];
  }

  /**
   * Get disk health on Windows using SMART data
   */
  async getDiskHealthWindows() {
    const healthInfo = [];

    try {
      const { stdout } = await execPromise(
        'powershell -Command "Get-PhysicalDisk | Select-Object FriendlyName, OperationalStatus, HealthStatus, MediaType | ConvertTo-Json"'
      );

      if (stdout.trim()) {
        const parsed = JSON.parse(stdout);
        const diskArray = Array.isArray(parsed) ? parsed : [parsed];

        for (const disk of diskArray) {
          healthInfo.push({
            friendlyName: disk.FriendlyName,
            operationalStatus: disk.OperationalStatus,
            healthStatus: disk.HealthStatus,
            mediaType: disk.MediaType,
            isHealthy: disk.HealthStatus === 'Healthy' && disk.OperationalStatus === 'OK'
          });
        }
      }

    } catch (error) {
      console.error('Error getting disk health on Windows:', error);
    }

    return healthInfo;
  }

  /**
   * Get disk health on macOS using diskutil and smartctl
   */
  async getDiskHealthMacOS() {
    const healthInfo = [];

    try {
      // Get list of disks using diskutil
      const { stdout: diskList } = await execPromise('diskutil list -plist');

      // Parse the plist output to get disk identifiers
      // For simplicity, we'll use diskutil info on common disk paths
      const { stdout: diskInfo } = await execPromise('diskutil info disk0');

      // Parse basic disk info
      const lines = diskInfo.split('\n');
      let diskName = 'disk0';
      let mediaType = 'Unknown';
      let smartStatus = 'Unknown';

      for (const line of lines) {
        if (line.includes('Device / Media Name:')) {
          diskName = line.split(':')[1]?.trim() || 'disk0';
        }
        if (line.includes('Solid State:')) {
          mediaType = line.includes('Yes') ? 'SSD' : 'HDD';
        }
        if (line.includes('SMART Status:')) {
          smartStatus = line.split(':')[1]?.trim() || 'Unknown';
        }
      }

      healthInfo.push({
        friendlyName: diskName,
        operationalStatus: 'OK',
        healthStatus: smartStatus === 'Verified' ? 'Healthy' : smartStatus,
        mediaType: mediaType,
        isHealthy: smartStatus === 'Verified' || smartStatus === 'Not Supported'
      });

      // Try to get SMART status using smartctl if available
      try {
        const { stdout: smartOutput } = await execPromise('smartctl -H /dev/disk0 2>/dev/null || echo "SMART not available"');
        if (smartOutput.includes('PASSED')) {
          healthInfo[0].healthStatus = 'Healthy';
          healthInfo[0].isHealthy = true;
        } else if (smartOutput.includes('FAILED')) {
          healthInfo[0].healthStatus = 'Failing';
          healthInfo[0].isHealthy = false;
        }
      } catch (e) {
        // smartctl not available, use diskutil status
      }

    } catch (error) {
      console.error('Error getting disk health on macOS:', error);
    }

    return healthInfo;
  }
}

module.exports = { DiskInvestigator };
