/**
 * Investigation Playbooks
 * Pre-defined investigation steps for different types of computer problems
 */

const CRASH_INVESTIGATION = {
  name: "Application/Game Crash Investigation",
  description: "Investigates why programs or games are crashing",
  steps: [
    {
      action: "checkEventLogs",
      description: "Check Windows Event Logs for crash entries",
      config: {
        logNames: ["Application", "System"],
        levels: ["Error", "Critical"],
        sources: ["Application Error", "Windows Error Reporting"],
        timeRange: "7days",
        findPatterns: true
      }
    },
    {
      action: "findCrashDumps",
      description: "Locate and analyze crash dump files",
      config: {
        locations: [
          "C:\\Windows\\Minidump",
          "%LOCALAPPDATA%\\CrashDumps",
          "%APPDATA%\\*\\Saved\\Crashes",
          "%LOCALAPPDATA%\\*\\Crashes"
        ],
        maxAge: "30days"
      }
    },
    {
      action: "analyzeDiskHealth",
      description: "Check disk health with SMART data",
      config: {
        checkSMART: true,
        checkFragmentation: false
      }
    },
    {
      action: "checkDrivers",
      description: "Verify driver versions and status",
      config: {
        focus: ["GPU", "Audio", "Network", "Chipset"],
        checkForUpdates: true,
        checkBlacklists: true
      }
    },
    {
      action: "checkSystemResources",
      description: "Verify system has sufficient resources",
      config: {
        metrics: ["RAM", "Disk", "CPU", "GPU", "Temperature"]
      }
    },
    {
      action: "analyzeRecentChanges",
      description: "Check for recent software installations or updates",
      config: {
        timeRange: "7days",
        types: ["software", "drivers", "windows-updates"]
      }
    }
  ]
};

const SLOW_PC_INVESTIGATION = {
  name: "Slow Performance Investigation",
  description: "Investigates why the computer is running slowly",
  steps: [
    {
      action: "checkStartupPrograms",
      description: "Analyze programs that start with Windows",
      config: {
        locations: ["registry", "startup-folder", "task-scheduler"]
      }
    },
    {
      action: "analyzeDiskSpace",
      description: "Check available disk space",
      config: {
        warningThreshold: 10, // percent
        criticalThreshold: 5
      }
    },
    {
      action: "checkRAMUsage",
      description: "Analyze memory usage patterns",
      config: {
        includeProcesses: true,
        top: 10
      }
    },
    {
      action: "analyzeDiskHealth",
      description: "Check disk health and fragmentation",
      config: {
        checkSMART: true,
        checkFragmentation: true
      }
    },
    {
      action: "checkBackgroundProcesses",
      description: "Identify resource-hungry background processes",
      config: {
        sortBy: "cpu",
        top: 20
      }
    },
    {
      action: "scanTempFiles",
      description: "Find and analyze temporary files",
      config: {
        locations: ["%TEMP%", "C:\\Windows\\Temp", "%LOCALAPPDATA%\\Temp"]
      }
    }
  ]
};

const ERROR_INVESTIGATION = {
  name: "Error Message Investigation",
  description: "Investigates recurring error messages",
  steps: [
    {
      action: "checkEventLogs",
      description: "Search Event Logs for error patterns",
      config: {
        logNames: ["Application", "System"],
        levels: ["Error", "Warning"],
        timeRange: "7days",
        findPatterns: true
      }
    },
    {
      action: "analyzeDiskHealth",
      description: "Check disk health with SMART data",
      config: {
        checkSMART: true,
        checkFragmentation: false
      }
    },
    {
      action: "checkSystemFiles",
      description: "Verify system file integrity",
      config: {
        runSFC: false, // Just check, don't fix yet
        checkWindowsImage: false
      }
    },
    {
      action: "checkDrivers",
      description: "Look for driver errors",
      config: {
        focus: "all",
        checkForErrors: true
      }
    },
    {
      action: "analyzeRecentChanges",
      description: "Correlation with recent system changes",
      config: {
        timeRange: "14days"
      }
    }
  ]
};

const HARDWARE_INVESTIGATION = {
  name: "Hardware Problem Investigation",
  description: "Investigates hardware-related issues",
  steps: [
    {
      action: "checkDeviceManager",
      description: "Check for hardware errors in Device Manager",
      config: {
        findErrors: true,
        findDisabled: true,
        findMissing: true
      }
    },
    {
      action: "checkDrivers",
      description: "Verify all hardware drivers",
      config: {
        focus: "all",
        checkForUpdates: true
      }
    },
    {
      action: "checkHardwareHealth",
      description: "Monitor hardware sensors and health",
      config: {
        checkTemperature: true,
        checkVoltage: true,
        checkFanSpeeds: true
      }
    },
    {
      action: "checkUSBDevices",
      description: "Analyze USB device issues",
      config: {
        checkEventLogs: true
      }
    }
  ]
};

const NETWORK_INVESTIGATION = {
  name: "Network Problem Investigation",
  description: "Investigates internet and network connectivity issues",
  steps: [
    {
      action: "testConnectivity",
      description: "Test internet connectivity and speed",
      config: {
        pingTargets: ["8.8.8.8", "1.1.1.1"],
        checkDNS: true,
        checkSpeed: true
      }
    },
    {
      action: "checkNetworkAdapters",
      description: "Verify network adapter status",
      config: {
        checkDrivers: true,
        checkIPConfig: true
      }
    },
    {
      action: "checkFirewall",
      description: "Check Windows Firewall settings",
      config: {
        checkRules: true,
        checkBlockedApps: true
      }
    },
    {
      action: "checkProxySettings",
      description: "Verify proxy and VPN settings",
      config: {
        includeVPN: true
      }
    }
  ]
};

const FULL_SYSTEM_SCAN = {
  name: "Complete System Scan",
  description: "Comprehensive diagnostic of entire system",
  steps: [
    // Combine steps from all playbooks
    ...CRASH_INVESTIGATION.steps,
    ...SLOW_PC_INVESTIGATION.steps,
    ...HARDWARE_INVESTIGATION.steps,
    ...NETWORK_INVESTIGATION.steps
  ]
};

module.exports = {
  CRASH_INVESTIGATION,
  SLOW_PC_INVESTIGATION,
  ERROR_INVESTIGATION,
  HARDWARE_INVESTIGATION,
  NETWORK_INVESTIGATION,
  FULL_SYSTEM_SCAN
};
