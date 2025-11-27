/**
 * Platform Detection Utility
 * Provides cross-platform support for Windows and macOS
 */

const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Platform constants
const PLATFORMS = {
  WINDOWS: 'win32',
  MACOS: 'darwin',
  LINUX: 'linux'
};

/**
 * Get current platform
 */
function getPlatform() {
  return process.platform;
}

/**
 * Check if running on Windows
 */
function isWindows() {
  return process.platform === PLATFORMS.WINDOWS;
}

/**
 * Check if running on macOS
 */
function isMacOS() {
  return process.platform === PLATFORMS.MACOS;
}

/**
 * Check if running on Linux
 */
function isLinux() {
  return process.platform === PLATFORMS.LINUX;
}

/**
 * Get platform display name
 */
function getPlatformName() {
  switch (process.platform) {
    case PLATFORMS.WINDOWS:
      return 'Windows';
    case PLATFORMS.MACOS:
      return 'macOS';
    case PLATFORMS.LINUX:
      return 'Linux';
    default:
      return 'Unknown';
  }
}

/**
 * Execute a command based on platform
 * @param {Object} commands - Object with platform-specific commands
 * @param {string} commands.windows - Windows command (PowerShell)
 * @param {string} commands.macos - macOS command (bash/zsh)
 * @param {string} commands.linux - Linux command (bash)
 * @param {Object} options - exec options
 */
async function execPlatformCommand(commands, options = {}) {
  let command;

  if (isWindows() && commands.windows) {
    command = commands.windows;
  } else if (isMacOS() && commands.macos) {
    command = commands.macos;
  } else if (isLinux() && commands.linux) {
    command = commands.linux;
  } else {
    throw new Error(`No command available for platform: ${getPlatformName()}`);
  }

  const defaultOptions = {
    timeout: options.timeout || 30000,
    maxBuffer: options.maxBuffer || 10 * 1024 * 1024 // 10MB
  };

  return execPromise(command, { ...defaultOptions, ...options });
}

/**
 * Get system information
 */
function getSystemInfo() {
  return {
    platform: getPlatform(),
    platformName: getPlatformName(),
    arch: os.arch(),
    release: os.release(),
    hostname: os.hostname(),
    cpus: os.cpus(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    homeDir: os.homedir(),
    tempDir: os.tmpdir()
  };
}

/**
 * Get the appropriate shell for the platform
 */
function getShell() {
  if (isWindows()) {
    return 'powershell.exe';
  } else {
    return '/bin/bash';
  }
}

/**
 * Wrap a command for the platform's shell
 */
function wrapCommand(command) {
  if (isWindows()) {
    return `powershell -Command "${command.replace(/"/g, '\\"')}"`;
  } else {
    return command;
  }
}

module.exports = {
  PLATFORMS,
  getPlatform,
  isWindows,
  isMacOS,
  isLinux,
  getPlatformName,
  execPlatformCommand,
  getSystemInfo,
  getShell,
  wrapCommand
};
