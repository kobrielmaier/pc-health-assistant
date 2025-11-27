/**
 * SystemResourceInvestigator
 * Analyzes system resources: RAM, CPU, GPU, Temperature
 * Cross-platform: Windows & macOS
 */

const { exec } = require('child_process');
const util = require('util');
const os = require('os');
const execPromise = util.promisify(exec);
const { isWindows, isMacOS, getPlatformName } = require('../../utils/platform');

class SystemResourceInvestigator {
  constructor() {
    this.name = 'SystemResourceInvestigator';
    console.log(`SystemResourceInvestigator initialized. Platform: ${getPlatformName()}`);
  }

  async investigate(step, options = {}) {
    console.log('Investigating system resources...');

    const findings = {
      ram: {},
      cpu: {},
      gpu: [],
      temperature: {},
      warnings: [],
      recommendations: []
    };

    try {
      // Get RAM information
      findings.ram = await this.getRAMInfo();

      // Get CPU information
      findings.cpu = await this.getCPUInfo();

      // Get GPU information
      findings.gpu = await this.getGPUInfo();

      // Get temperature information
      findings.temperature = await this.getTemperatureInfo();

      // Analyze findings and generate warnings
      this.analyzeFindings(findings);

    } catch (error) {
      findings.error = error.message;
    }

    return findings;
  }

  /**
   * Get RAM information (total, used, available, usage percentage)
   */
  async getRAMInfo() {
    if (isWindows()) {
      return this.getRAMInfoWindows();
    } else if (isMacOS()) {
      return this.getRAMInfoMacOS();
    }

    // Fallback using Node.js os module (works on all platforms)
    return this.getRAMInfoNode();
  }

  /**
   * Get RAM info on Windows
   */
  async getRAMInfoWindows() {
    try {
      const { stdout } = await execPromise(
        `powershell -Command "Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory | ConvertTo-Json"`
      );

      const data = JSON.parse(stdout);

      // Convert from KB to GB
      const totalGB = (data.TotalVisibleMemorySize / 1024 / 1024).toFixed(2);
      const freeGB = (data.FreePhysicalMemory / 1024 / 1024).toFixed(2);
      const usedGB = (totalGB - freeGB).toFixed(2);
      const usagePercent = ((usedGB / totalGB) * 100).toFixed(1);

      return {
        totalGB: parseFloat(totalGB),
        usedGB: parseFloat(usedGB),
        freeGB: parseFloat(freeGB),
        usagePercent: parseFloat(usagePercent)
      };

    } catch (error) {
      return this.getRAMInfoNode();
    }
  }

  /**
   * Get RAM info on macOS
   */
  async getRAMInfoMacOS() {
    try {
      // Get memory pressure info
      const { stdout } = await execPromise('vm_stat');

      const pageSize = 4096; // Default page size on macOS
      const lines = stdout.split('\n');

      let freePages = 0;
      let activePages = 0;
      let inactivePages = 0;
      let wiredPages = 0;
      let compressedPages = 0;

      for (const line of lines) {
        if (line.includes('Pages free')) {
          freePages = parseInt(line.match(/(\d+)/)?.[1] || 0);
        } else if (line.includes('Pages active')) {
          activePages = parseInt(line.match(/(\d+)/)?.[1] || 0);
        } else if (line.includes('Pages inactive')) {
          inactivePages = parseInt(line.match(/(\d+)/)?.[1] || 0);
        } else if (line.includes('Pages wired')) {
          wiredPages = parseInt(line.match(/(\d+)/)?.[1] || 0);
        } else if (line.includes('Pages occupied by compressor')) {
          compressedPages = parseInt(line.match(/(\d+)/)?.[1] || 0);
        }
      }

      const totalBytes = os.totalmem();
      const usedBytes = (activePages + wiredPages + compressedPages) * pageSize;
      const freeBytes = (freePages + inactivePages) * pageSize;

      const totalGB = (totalBytes / (1024 ** 3)).toFixed(2);
      const usedGB = (usedBytes / (1024 ** 3)).toFixed(2);
      const freeGB = (freeBytes / (1024 ** 3)).toFixed(2);
      const usagePercent = ((usedBytes / totalBytes) * 100).toFixed(1);

      return {
        totalGB: parseFloat(totalGB),
        usedGB: parseFloat(usedGB),
        freeGB: parseFloat(freeGB),
        usagePercent: parseFloat(usagePercent)
      };

    } catch (error) {
      return this.getRAMInfoNode();
    }
  }

  /**
   * Fallback RAM info using Node.js os module
   */
  getRAMInfoNode() {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;

    const totalGB = (totalBytes / (1024 ** 3)).toFixed(2);
    const freeGB = (freeBytes / (1024 ** 3)).toFixed(2);
    const usedGB = (usedBytes / (1024 ** 3)).toFixed(2);
    const usagePercent = ((usedBytes / totalBytes) * 100).toFixed(1);

    return {
      totalGB: parseFloat(totalGB),
      usedGB: parseFloat(usedGB),
      freeGB: parseFloat(freeGB),
      usagePercent: parseFloat(usagePercent)
    };
  }

  /**
   * Get CPU information (name, cores, usage, load)
   */
  async getCPUInfo() {
    if (isWindows()) {
      return this.getCPUInfoWindows();
    } else if (isMacOS()) {
      return this.getCPUInfoMacOS();
    }

    return this.getCPUInfoNode();
  }

  /**
   * Get CPU info on Windows
   */
  async getCPUInfoWindows() {
    try {
      // Get CPU name and cores
      const { stdout: cpuInfo } = await execPromise(
        `powershell -Command "Get-CimInstance Win32_Processor | Select-Object Name, NumberOfCores, NumberOfLogicalProcessors | ConvertTo-Json"`
      );

      const cpuData = JSON.parse(cpuInfo);

      // Get CPU usage - sample over 2 seconds for accuracy
      const { stdout: cpuUsage } = await execPromise(
        `powershell -Command "(Get-Counter '\\Processor(_Total)\\% Processor Time' -SampleInterval 2 -MaxSamples 1).CounterSamples.CookedValue"`
      );

      return {
        name: cpuData.Name?.trim(),
        cores: cpuData.NumberOfCores,
        threads: cpuData.NumberOfLogicalProcessors,
        usagePercent: parseFloat(cpuUsage.trim()).toFixed(1)
      };

    } catch (error) {
      return this.getCPUInfoNode();
    }
  }

  /**
   * Get CPU info on macOS
   */
  async getCPUInfoMacOS() {
    try {
      // Get CPU name
      const { stdout: cpuBrand } = await execPromise('sysctl -n machdep.cpu.brand_string');

      // Get core count
      const { stdout: coreCount } = await execPromise('sysctl -n hw.physicalcpu');
      const { stdout: threadCount } = await execPromise('sysctl -n hw.logicalcpu');

      // Get CPU usage using top command (sample for 2 seconds)
      const { stdout: topOutput } = await execPromise('top -l 2 -n 0 | grep "CPU usage"');

      let usagePercent = 0;
      const lines = topOutput.trim().split('\n');
      if (lines.length > 0) {
        // Parse last line: "CPU usage: X.X% user, Y.Y% sys, Z.Z% idle"
        const lastLine = lines[lines.length - 1];
        const userMatch = lastLine.match(/([\d.]+)%\s*user/);
        const sysMatch = lastLine.match(/([\d.]+)%\s*sys/);

        if (userMatch && sysMatch) {
          usagePercent = (parseFloat(userMatch[1]) + parseFloat(sysMatch[1])).toFixed(1);
        }
      }

      return {
        name: cpuBrand.trim(),
        cores: parseInt(coreCount.trim()),
        threads: parseInt(threadCount.trim()),
        usagePercent: parseFloat(usagePercent)
      };

    } catch (error) {
      return this.getCPUInfoNode();
    }
  }

  /**
   * Fallback CPU info using Node.js os module
   */
  getCPUInfoNode() {
    const cpus = os.cpus();

    // Calculate average CPU usage
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }

    const usagePercent = (100 - (totalIdle / totalTick) * 100).toFixed(1);

    return {
      name: cpus[0]?.model || 'Unknown CPU',
      cores: cpus.length,
      threads: cpus.length,
      usagePercent: parseFloat(usagePercent)
    };
  }

  /**
   * Get GPU information (all GPUs with detailed info)
   */
  async getGPUInfo() {
    if (isWindows()) {
      return this.getGPUInfoWindows();
    } else if (isMacOS()) {
      return this.getGPUInfoMacOS();
    }

    return [{ name: 'Unknown', error: 'GPU detection not supported on this platform' }];
  }

  /**
   * Get GPU info on Windows
   */
  async getGPUInfoWindows() {
    const gpus = [];

    try {
      const { stdout } = await execPromise(
        `powershell -Command "Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, DriverDate, AdapterRAM, CurrentHorizontalResolution, CurrentVerticalResolution, Status | ConvertTo-Json"`
      );

      let gpuData = JSON.parse(stdout);
      if (!Array.isArray(gpuData)) {
        gpuData = [gpuData];
      }

      for (const gpu of gpuData) {
        const driverDate = gpu.DriverDate ? new Date(gpu.DriverDate) : null;
        const daysOld = driverDate
          ? Math.floor((Date.now() - driverDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        gpus.push({
          name: gpu.Name,
          driverVersion: gpu.DriverVersion || 'Unknown',
          driverDate: driverDate ? driverDate.toISOString().split('T')[0] : 'Unknown',
          driverAgeInDays: daysOld,
          vramMB: gpu.AdapterRAM ? Math.round(gpu.AdapterRAM / 1024 / 1024) : null,
          currentResolution: gpu.CurrentHorizontalResolution && gpu.CurrentVerticalResolution
            ? `${gpu.CurrentHorizontalResolution}x${gpu.CurrentVerticalResolution}`
            : 'Unknown',
          status: gpu.Status || 'Unknown'
        });
      }

    } catch (error) {
      gpus.push({
        error: `Failed to get GPU info: ${error.message}`
      });
    }

    return gpus;
  }

  /**
   * Get GPU info on macOS
   */
  async getGPUInfoMacOS() {
    const gpus = [];

    try {
      // Use system_profiler to get GPU info
      const { stdout } = await execPromise('system_profiler SPDisplaysDataType -json');

      const data = JSON.parse(stdout);
      const displays = data.SPDisplaysDataType || [];

      for (const display of displays) {
        // Get GPU name and VRAM
        const gpuName = display.sppci_model || display._name || 'Unknown GPU';
        const vram = display.spdisplays_vram || display.sppci_vram || 'Unknown';

        // Parse VRAM (comes as "X MB" or "X GB")
        let vramMB = null;
        if (typeof vram === 'string') {
          const match = vram.match(/([\d.]+)\s*(MB|GB)/i);
          if (match) {
            vramMB = match[2].toUpperCase() === 'GB'
              ? parseFloat(match[1]) * 1024
              : parseFloat(match[1]);
          }
        }

        // Get resolution from connected displays
        let resolution = 'Unknown';
        if (display.spdisplays_ndrvs && display.spdisplays_ndrvs.length > 0) {
          const mainDisplay = display.spdisplays_ndrvs[0];
          if (mainDisplay._spdisplays_resolution) {
            resolution = mainDisplay._spdisplays_resolution;
          }
        }

        gpus.push({
          name: gpuName,
          driverVersion: 'Built-in',
          driverDate: 'N/A',
          driverAgeInDays: null,
          vramMB: vramMB,
          currentResolution: resolution,
          status: 'OK'
        });
      }

    } catch (error) {
      gpus.push({
        error: `Failed to get GPU info: ${error.message}`
      });
    }

    return gpus.length > 0 ? gpus : [{ name: 'Unknown', status: 'Unknown' }];
  }

  /**
   * Get system temperature information
   */
  async getTemperatureInfo() {
    if (isWindows()) {
      return this.getTemperatureInfoWindows();
    } else if (isMacOS()) {
      return this.getTemperatureInfoMacOS();
    }

    return {
      available: false,
      message: 'Temperature monitoring not supported on this platform'
    };
  }

  /**
   * Get temperature info on Windows (if available via WMI)
   */
  async getTemperatureInfoWindows() {
    try {
      // Try to get temperature data from WMI
      // Note: This may not work on all systems as not all hardware exposes temp via WMI
      const { stdout } = await execPromise(
        `powershell -Command "Get-WmiObject -Namespace 'root/wmi' -Class MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object CurrentTemperature | ConvertTo-Json"`,
        { timeout: 5000 }
      );

      if (stdout && stdout.trim()) {
        let tempData = JSON.parse(stdout);
        if (!Array.isArray(tempData)) {
          tempData = [tempData];
        }

        const temperatures = tempData.map(t => {
          // Temperature is in tenths of Kelvin, convert to Celsius
          const kelvin = t.CurrentTemperature / 10;
          const celsius = kelvin - 273.15;
          return celsius.toFixed(1);
        });

        return {
          available: true,
          temperatures: temperatures,
          averageCelsius: (temperatures.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / temperatures.length).toFixed(1)
        };
      }

      return {
        available: false,
        message: 'Temperature sensors not accessible via WMI (this is normal for many systems)'
      };

    } catch (error) {
      return {
        available: false,
        message: 'Temperature monitoring not available on this system'
      };
    }
  }

  /**
   * Get temperature info on macOS
   * Note: macOS doesn't expose temperature easily without third-party tools
   */
  async getTemperatureInfoMacOS() {
    try {
      // Try using osx-cpu-temp if installed, or check if we can read SMC
      // Most Macs don't expose temp without sudo/special tools

      // Check thermal pressure as an alternative
      const { stdout } = await execPromise('sysctl -n machdep.xcpm.cpu_thermal_level 2>/dev/null || echo "-1"');
      const thermalLevel = parseInt(stdout.trim());

      if (thermalLevel >= 0) {
        // Thermal level: 0 = nominal, higher = throttling
        let status = 'Normal';
        if (thermalLevel > 0) {
          status = thermalLevel > 50 ? 'Hot (throttling likely)' : 'Warm';
        }

        return {
          available: true,
          thermalLevel: thermalLevel,
          status: status,
          message: `Thermal level: ${thermalLevel} (${status})`
        };
      }

      return {
        available: false,
        message: 'Temperature monitoring requires additional tools on macOS'
      };

    } catch (error) {
      return {
        available: false,
        message: 'Temperature monitoring not available (this is normal on macOS)'
      };
    }
  }

  /**
   * Analyze findings and generate warnings/recommendations
   */
  analyzeFindings(findings) {
    // RAM warnings
    if (findings.ram.usagePercent > 90) {
      findings.warnings.push({
        type: 'high-memory-usage',
        severity: 'critical',
        message: `RAM usage is critically high (${findings.ram.usagePercent}%)`,
        value: findings.ram.usagePercent
      });
      findings.recommendations.push({
        type: 'ram',
        message: 'Close unnecessary programs or add more RAM'
      });
    } else if (findings.ram.usagePercent > 80) {
      findings.warnings.push({
        type: 'high-memory-usage',
        severity: 'warning',
        message: `RAM usage is high (${findings.ram.usagePercent}%)`,
        value: findings.ram.usagePercent
      });
    }

    // CPU warnings
    if (findings.cpu.usagePercent > 90) {
      findings.warnings.push({
        type: 'high-cpu-usage',
        severity: 'critical',
        message: `CPU usage is critically high (${findings.cpu.usagePercent}%)`,
        value: findings.cpu.usagePercent
      });
      findings.recommendations.push({
        type: 'cpu',
        message: 'Check for resource-intensive processes or malware'
      });
    } else if (findings.cpu.usagePercent > 80) {
      findings.warnings.push({
        type: 'high-cpu-usage',
        severity: 'warning',
        message: `CPU usage is high (${findings.cpu.usagePercent}%)`,
        value: findings.cpu.usagePercent
      });
    }

    // GPU warnings (outdated drivers)
    for (const gpu of findings.gpu) {
      if (gpu.driverAgeInDays && gpu.driverAgeInDays > 180) {
        findings.warnings.push({
          type: 'outdated-gpu-driver',
          severity: 'warning',
          message: `${gpu.name} driver is ${gpu.driverAgeInDays} days old`,
          value: gpu.driverAgeInDays
        });
        findings.recommendations.push({
          type: 'gpu-driver',
          message: `Update ${gpu.name} driver`
        });
      }

      if (gpu.status && gpu.status !== 'OK') {
        findings.warnings.push({
          type: 'gpu-error',
          severity: 'critical',
          message: `${gpu.name} status: ${gpu.status}`,
          value: gpu.status
        });
      }
    }

    // Temperature warnings
    if (findings.temperature.available && findings.temperature.averageCelsius) {
      const avgTemp = parseFloat(findings.temperature.averageCelsius);

      if (avgTemp > 85) {
        findings.warnings.push({
          type: 'high-temperature',
          severity: 'critical',
          message: `System temperature is critically high (${avgTemp}°C)`,
          value: avgTemp
        });
        findings.recommendations.push({
          type: 'temperature',
          message: 'Check cooling system, clean dust from vents and fans'
        });
      } else if (avgTemp > 75) {
        findings.warnings.push({
          type: 'high-temperature',
          severity: 'warning',
          message: `System temperature is elevated (${avgTemp}°C)`,
          value: avgTemp
        });
      }
    }
  }
}

module.exports = SystemResourceInvestigator;
