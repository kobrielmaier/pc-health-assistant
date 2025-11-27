/**
 * NetworkInvestigator - Checks network connectivity and configuration
 * Cross-platform: Windows & macOS
 */

const { exec } = require('child_process');
const util = require('util');
const os = require('os');
const execPromise = util.promisify(exec);
const { isWindows, isMacOS, getPlatformName } = require('../../utils/platform');

class NetworkInvestigator {
  constructor() {
    this.name = 'NetworkInvestigator';
    this.commandTimeout = 30000; // 30 second timeout for commands
    console.log(`NetworkInvestigator initialized. Platform: ${getPlatformName()}`);
  }

  /**
   * Execute a command with timeout
   */
  async execWithTimeout(command, timeout = this.commandTimeout) {
    console.log(`[EXEC] Running command: ${command} (timeout: ${timeout}ms)`);

    try {
      const result = await Promise.race([
        execPromise(command, {
          windowsHide: true,
          encoding: 'utf8',
          maxBuffer: 1024 * 1024 // 1MB buffer
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Command timed out after ${timeout}ms`)), timeout)
        )
      ]);

      console.log(`[EXEC] ✓ Command succeeded: ${command}`);
      console.log(`[EXEC] stdout length: ${result.stdout?.length || 0}, stderr length: ${result.stderr?.length || 0}`);
      return result;
    } catch (error) {
      console.error(`[EXEC] ✗ Command failed: ${command}`);
      console.error(`[EXEC] Error code: ${error.code}, message: ${error.message}`);
      console.error(`[EXEC] stdout: ${error.stdout || 'none'}`);
      console.error(`[EXEC] stderr: ${error.stderr || 'none'}`);
      throw error;
    }
  }

  /**
   * Main investigation entry point
   */
  async investigate(step, options = {}) {
    console.log(`NetworkInvestigator: Starting check for ${step.action}`);
    console.log('Step config:', step.config);
    console.log('Options:', options);

    try {
      let result;

      switch (step.action) {
        case 'checkNetworkAdapters':
          console.log('→ Calling checkNetworkAdapters()');
          result = await this.checkNetworkAdapters();
          break;
        case 'testConnectivity':
          console.log('→ Calling testConnectivity()');
          result = await this.testConnectivity(step.config || {});
          break;
        case 'checkFirewall':
          console.log('→ Calling checkFirewall()');
          result = await this.checkFirewall();
          break;
        case 'checkProxySettings':
          console.log('→ Calling checkProxySettings()');
          result = await this.checkProxySettings();
          break;
        default:
          console.warn(`Unknown network action: ${step.action}`);
          result = { findings: ['Unknown network check'], recommendations: [] };
      }

      console.log(`✓ ${step.action} completed successfully:`, result);
      return result;

    } catch (error) {
      console.error(`✗ NetworkInvestigator error in ${step.action}:`, error);
      console.error('Error stack:', error.stack);
      return {
        findings: [`Network check encountered an error: ${error.message}`],
        recommendations: ['Try restarting your computer', 'Check your network settings']
      };
    }
  }

  /**
   * Check network adapter status
   */
  async checkNetworkAdapters() {
    console.log('Checking network adapters...');

    if (isWindows()) {
      return this.checkNetworkAdaptersWindows();
    } else if (isMacOS()) {
      return this.checkNetworkAdaptersMacOS();
    }

    return {
      findings: ['Network adapter check not supported on this platform'],
      recommendations: []
    };
  }

  /**
   * Check network adapters on Windows
   */
  async checkNetworkAdaptersWindows() {
    try {
      const { stdout } = await this.execWithTimeout('ipconfig', 10000);
      console.log('ipconfig result:', stdout.substring(0, 200));

      const findings = [];

      // Check for active adapters
      if (stdout.includes('Ethernet adapter') || stdout.includes('Wireless LAN adapter') || stdout.includes('Wi-Fi')) {
        const hasIPv4 = stdout.includes('IPv4 Address');
        const hasGateway = stdout.includes('Default Gateway') && !stdout.includes('Default Gateway . . . . . . . . . :');

        if (hasIPv4 && hasGateway) {
          findings.push('Network adapter is connected and has an IP address');
        } else if (!hasIPv4) {
          findings.push('Network adapter is not receiving an IP address');
        } else if (!hasGateway) {
          findings.push('Network adapter is missing gateway - cannot reach internet');
        }
      } else {
        findings.push('No network adapters detected');
      }

      console.log('Network adapter check complete:', findings);

      return {
        findings: findings.length > 0 ? findings : ['Network adapter check completed'],
        recommendations: findings.some(f => f.includes('not receiving') || f.includes('missing')) ?
          ['Restart your network adapter', 'Check network cable is plugged in', 'Restart your router'] :
          []
      };

    } catch (error) {
      console.log('Network adapter check error:', error.message);
      return {
        findings: ['Could not check network adapter status'],
        recommendations: []
      };
    }
  }

  /**
   * Check network adapters on macOS
   */
  async checkNetworkAdaptersMacOS() {
    try {
      const { stdout } = await this.execWithTimeout('ifconfig', 10000);
      console.log('ifconfig result:', stdout.substring(0, 200));

      const findings = [];

      // Check for active adapters (en0 is usually the primary interface)
      const hasIPv4 = stdout.includes('inet ') && !stdout.includes('inet 127.0.0.1');
      const isUp = stdout.includes('status: active') || stdout.includes('<UP,');

      if (hasIPv4 && isUp) {
        findings.push('Network adapter is connected and has an IP address');
      } else if (!hasIPv4) {
        findings.push('Network adapter is not receiving an IP address');
      } else if (!isUp) {
        findings.push('Network adapter is not active');
      }

      // Check for WiFi vs Ethernet
      if (stdout.includes('en0:')) {
        // Try to get WiFi info
        try {
          const { stdout: wifiInfo } = await this.execWithTimeout(
            '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I 2>/dev/null || echo "Not WiFi"',
            5000
          );
          if (wifiInfo && !wifiInfo.includes('Not WiFi') && wifiInfo.includes('SSID')) {
            findings.push('Connected via WiFi');
          }
        } catch (e) {
          // Not on WiFi or airport command not available
        }
      }

      console.log('Network adapter check complete:', findings);

      return {
        findings: findings.length > 0 ? findings : ['Network adapter check completed'],
        recommendations: findings.some(f => f.includes('not receiving') || f.includes('not active')) ?
          ['Check WiFi is enabled', 'Restart your router', 'Try connecting to a different network'] :
          []
      };

    } catch (error) {
      console.log('Network adapter check error:', error.message);
      return {
        findings: ['Could not check network adapter status'],
        recommendations: []
      };
    }
  }

  /**
   * Test internet connectivity
   */
  async testConnectivity(config = {}) {
    console.log('Testing internet connectivity...');
    const findings = [];
    let isConnected = false;
    let avgPingTime = null;

    const pingTargets = config.pingTargets || ['8.8.8.8', '1.1.1.1'];

    // Platform-specific ping command
    const pingCmd = isWindows() ? 'ping -n 4' : 'ping -c 4';

    // Test basic connectivity with more detailed ping
    for (const target of pingTargets) {
      try {
        console.log(`Pinging ${target}...`);
        const { stdout, stderr } = await this.execWithTimeout(`${pingCmd} ${target}`, 15000);
        console.log('Ping result:', stdout.substring(0, 200));

        if (stdout.includes('Reply from') || stdout.includes('bytes from')) {
          isConnected = true;

          // Extract ping time for speed assessment (try different formats)
          // Windows: Average = XXms
          // macOS: round-trip min/avg/max/stddev = X/XX/X/X ms
          let avgMatch = stdout.match(/Average = (\d+)ms/);
          if (!avgMatch) {
            // macOS format
            avgMatch = stdout.match(/avg[\/=]\s*(\d+(?:\.\d+)?)/);
          }
          if (!avgMatch) {
            avgMatch = stdout.match(/avg = (\d+)ms/i);
          }
          if (!avgMatch) {
            // Try to find any ping time
            const timeMatch = stdout.match(/time[=<](\d+(?:\.\d+)?)\s*ms/i);
            if (timeMatch) {
              avgPingTime = parseInt(timeMatch[1]);
            }
          } else {
            avgPingTime = parseInt(avgMatch[1]);
          }

          if (avgPingTime) {
            if (avgPingTime < 30) {
              findings.push(`Internet connection is excellent (${avgPingTime}ms response time)`);
            } else if (avgPingTime < 100) {
              findings.push(`Internet connection is working well (${avgPingTime}ms response time)`);
            } else if (avgPingTime < 300) {
              findings.push(`Internet connection is slow (${avgPingTime}ms response time)`);
            } else {
              findings.push(`Internet connection is very slow (${avgPingTime}ms response time)`);
            }
          } else {
            findings.push('Internet connection is working');
          }

          // Check packet loss (works on both platforms)
          const lossMatch = stdout.match(/(\d+(?:\.\d+)?)\s*%\s*(?:packet\s+)?loss/i);
          if (lossMatch && parseFloat(lossMatch[1]) > 0) {
            findings.push(`Experiencing ${lossMatch[1]}% packet loss - connection is unstable`);
          }

          break; // Connection working, no need to test other targets
        }
      } catch (error) {
        console.log(`Ping to ${target} failed:`, error.message);
        // Continue to next target
      }
    }

    // If no connection found, report it clearly
    if (!isConnected) {
      findings.push('No internet connection detected - cannot reach any servers');
    }

    // Test DNS resolution
    if (config.checkDNS !== false && isConnected) {
      try {
        console.log('Testing DNS...');
        const dnsCmd = isWindows() ? 'nslookup google.com' : 'nslookup google.com 2>&1';
        const { stdout } = await this.execWithTimeout(dnsCmd, 10000);
        if (stdout.includes('Address') && !stdout.includes('UnKnown') && !stdout.includes("can't find")) {
          findings.push('DNS (website name lookup) is working correctly');
        } else {
          findings.push('DNS has issues - may have trouble loading websites');
        }
      } catch (error) {
        console.log('DNS test failed:', error.message);
        findings.push('DNS check skipped - internet connectivity issue');
      }
    }

    // Speed test recommendation
    if (isConnected) {
      findings.push('For accurate speed: Visit fast.com or speedtest.net in your browser');
    }

    console.log('Connectivity test complete:', findings);

    return {
      findings: findings.length > 0 ? findings : ['Internet connectivity check completed'],
      recommendations: !isConnected ?
        ['Restart your router and modem (unplug for 30 seconds)', 'Check if network cable is plugged in', 'Try connecting to WiFi'] :
        avgPingTime && avgPingTime > 200 ?
        ['Your connection is slow - restart your router', 'Check if other devices are using bandwidth', 'Contact your internet provider if speed stays slow'] :
        []
    };
  }

  /**
   * Check Firewall settings
   */
  async checkFirewall() {
    if (isWindows()) {
      return this.checkFirewallWindows();
    } else if (isMacOS()) {
      return this.checkFirewallMacOS();
    }

    return {
      findings: ['Firewall check not supported on this platform'],
      recommendations: []
    };
  }

  /**
   * Check Windows Firewall settings
   */
  async checkFirewallWindows() {
    try {
      const { stdout } = await this.execWithTimeout('netsh advfirewall show allprofiles state', 10000);

      const findings = [];

      if (stdout.includes('State') && stdout.includes('ON')) {
        findings.push('Windows Firewall is enabled and protecting your computer');
      } else if (stdout.includes('OFF')) {
        findings.push('WARNING: Windows Firewall is turned off - your computer is not protected');
      }

      // Try to get blocked apps (may require admin)
      try {
        const { stdout: rulesOutput } = await this.execWithTimeout('netsh advfirewall firewall show rule name=all | findstr "Block"', 10000);
        if (rulesOutput) {
          findings.push('Some firewall rules are blocking connections');
        }
      } catch (error) {
        // Ignore if we can't get rules (permission issue)
        console.log('Could not check firewall rules (may need admin):', error.message);
      }

      return {
        findings,
        recommendations: findings.some(f => f.includes('OFF')) ?
          ['Turn on Windows Firewall immediately', 'Run Windows Security scan'] :
          []
      };

    } catch (error) {
      return {
        findings: ['Could not check firewall status - may require administrator privileges'],
        recommendations: []
      };
    }
  }

  /**
   * Check macOS Firewall settings
   */
  async checkFirewallMacOS() {
    try {
      const findings = [];

      // Check application firewall status
      const { stdout } = await this.execWithTimeout(
        '/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null || echo "unknown"',
        10000
      );

      if (stdout.includes('enabled')) {
        findings.push('macOS Firewall is enabled and protecting your computer');
      } else if (stdout.includes('disabled')) {
        findings.push('WARNING: macOS Firewall is turned off - your computer may be at risk');
      } else {
        findings.push('Could not determine firewall status');
      }

      // Check stealth mode
      try {
        const { stdout: stealthOutput } = await this.execWithTimeout(
          '/usr/libexec/ApplicationFirewall/socketfilterfw --getstealthmode 2>/dev/null || echo "unknown"',
          5000
        );
        if (stealthOutput.includes('enabled')) {
          findings.push('Stealth mode is enabled (extra protection)');
        }
      } catch (e) {
        // Ignore stealth mode check failure
      }

      return {
        findings,
        recommendations: findings.some(f => f.includes('turned off')) ?
          ['Enable macOS Firewall in System Preferences > Security & Privacy', 'Run a security scan'] :
          []
      };

    } catch (error) {
      return {
        findings: ['Could not check firewall status'],
        recommendations: []
      };
    }
  }

  /**
   * Check proxy and VPN settings
   */
  async checkProxySettings() {
    if (isWindows()) {
      return this.checkProxySettingsWindows();
    } else if (isMacOS()) {
      return this.checkProxySettingsMacOS();
    }

    return {
      findings: ['Proxy check not supported on this platform'],
      recommendations: []
    };
  }

  /**
   * Check proxy settings on Windows
   */
  async checkProxySettingsWindows() {
    try {
      const { stdout } = await this.execWithTimeout('netsh winhttp show proxy', 10000);

      const findings = [];

      if (stdout.includes('Direct access (no proxy server)')) {
        findings.push('No proxy server configured - direct internet connection');
      } else if (stdout.includes('Proxy Server')) {
        findings.push('Proxy server is configured - may affect internet connectivity');
      }

      // Check for VPN adapters
      try {
        const { stdout: vpnOutput } = await this.execWithTimeout('ipconfig /all', 10000);
        if (vpnOutput.includes('VPN') || vpnOutput.includes('TAP-Windows')) {
          findings.push('VPN adapter detected - may be affecting network connections');
        }
      } catch (error) {
        // Ignore
        console.log('Could not check VPN adapters:', error.message);
      }

      return {
        findings,
        recommendations: []
      };

    } catch (error) {
      return {
        findings: ['Could not check proxy settings'],
        recommendations: []
      };
    }
  }

  /**
   * Check proxy settings on macOS
   */
  async checkProxySettingsMacOS() {
    try {
      const findings = [];

      // Check proxy settings using networksetup
      const { stdout } = await this.execWithTimeout(
        'networksetup -getwebproxy "Wi-Fi" 2>/dev/null || networksetup -getwebproxy "Ethernet" 2>/dev/null || echo "No proxy"',
        10000
      );

      if (stdout.includes('Enabled: No') || stdout.includes('No proxy')) {
        findings.push('No proxy server configured - direct internet connection');
      } else if (stdout.includes('Enabled: Yes')) {
        findings.push('Proxy server is configured - may affect internet connectivity');
      }

      // Check for VPN connections
      try {
        const { stdout: vpnOutput } = await this.execWithTimeout('ifconfig | grep -E "utun|ppp"', 5000);
        if (vpnOutput && vpnOutput.trim()) {
          findings.push('VPN connection detected - may be affecting network connections');
        }
      } catch (error) {
        // No VPN detected or command failed - that's okay
      }

      return {
        findings,
        recommendations: []
      };

    } catch (error) {
      return {
        findings: ['Could not check proxy settings'],
        recommendations: []
      };
    }
  }
}

module.exports = { NetworkInvestigator };
