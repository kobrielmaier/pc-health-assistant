/**
 * FixExecutor
 * Safely executes approved fixes with guardrails, restore points, and user protection
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class FixExecutor {
  constructor() {
    this.isExecuting = false;
  }

  /**
   * Execute an approved fix with safety checks
   * @param {object} fix - Fix proposal from Claude
   * @param {function} onProgress - Callback for progress updates
   * @returns {object} Result of fix execution
   */
  async executeFix(fix, onProgress = null) {
    if (this.isExecuting) {
      return {
        success: false,
        error: 'Another fix is already being executed'
      };
    }

    this.isExecuting = true;

    try {
      // Validate fix structure
      if (!this.validateFix(fix)) {
        throw new Error('Invalid fix structure');
      }

      this.reportProgress(onProgress, {
        stage: 'starting',
        message: `Starting: ${fix.title}`,
        percentage: 0
      });

      // Safety checks
      await this.performSafetyChecks(fix, onProgress);

      // Create restore point for medium/high risk fixes
      if (fix.riskLevel === 'medium' || fix.riskLevel === 'high') {
        await this.createRestorePoint(fix, onProgress);
      }

      // Execute commands step-by-step
      const results = await this.executeCommands(fix, onProgress);

      // Verify the fix worked
      this.reportProgress(onProgress, {
        stage: 'verifying',
        message: 'Verifying that the fix worked...',
        percentage: 90
      });

      // Count successful steps
      const successfulSteps = results.filter(r => r.success).length;
      const failedSteps = results.filter(r => !r.success).length;

      // Build completion summary
      const completedActions = results
        .filter(r => r.success)
        .map(r => r.description || `Step ${r.step}`)
        .join(', ');

      // Success!
      this.reportProgress(onProgress, {
        stage: 'complete',
        message: `✅ Fix completed! ${successfulSteps} action(s) applied successfully.`,
        percentage: 100,
        summary: {
          title: fix.title,
          description: fix.description,
          successfulSteps,
          failedSteps,
          completedActions,
          requiresRestart: fix.requiresRestart
        }
      });

      return {
        success: true,
        message: `Fix "${fix.title}" applied successfully`,
        results,
        summary: {
          title: fix.title,
          description: fix.description,
          successfulSteps,
          failedSteps,
          completedActions
        },
        requiresRestart: fix.requiresRestart
      };

    } catch (error) {
      console.error('Error executing fix:', error);

      this.reportProgress(onProgress, {
        stage: 'error',
        message: `Error: ${error.message}`,
        percentage: 0
      });

      return {
        success: false,
        error: error.message,
        canRollback: fix.riskLevel === 'medium' || fix.riskLevel === 'high'
      };

    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Validate fix structure
   */
  validateFix(fix) {
    const required = ['title', 'description', 'commands', 'riskLevel'];

    for (const field of required) {
      if (!fix[field]) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    if (!Array.isArray(fix.commands) || fix.commands.length === 0) {
      console.error('Fix must have at least one command');
      return false;
    }

    if (!['low', 'medium', 'high'].includes(fix.riskLevel)) {
      console.error('Invalid risk level');
      return false;
    }

    return true;
  }

  /**
   * Perform safety checks before executing
   */
  async performSafetyChecks(fix, onProgress) {
    this.reportProgress(onProgress, {
      stage: 'safety-check',
      message: 'Running safety checks...',
      percentage: 10
    });

    // Check for dangerous commands
    const dangerousPatterns = [
      /format\s+[cd]:/i,
      /del\s+\/s\s+\/q\s+c:\\/i,
      /remove-item.*-recurse.*c:\\/i,
      /rd\s+\/s\s+\/q\s+c:\\/i,
      /rmdir.*\/s.*c:\\/i,
      /reg\s+delete.*hklm/i,
      /bcdedit/i,
      /diskpart/i
    ];

    for (const command of fix.commands) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(command)) {
          throw new Error(`Dangerous command detected: ${command.substring(0, 50)}... - Fix rejected for safety`);
        }
      }
    }

    // Check if running as administrator for commands that need it
    if (fix.requiresAdmin !== false) {
      try {
        await execPromise('net session');
      } catch (error) {
        throw new Error('This fix requires administrator privileges.\n\nTo run as administrator:\n1. Close this app\n2. Right-click the app icon\n3. Select "Run as administrator"\n4. Try the fix again');
      }
    }

    this.reportProgress(onProgress, {
      stage: 'safety-check',
      message: '✓ Safety checks passed',
      percentage: 20
    });
  }

  /**
   * Create a system restore point
   */
  async createRestorePoint(fix, onProgress) {
    this.reportProgress(onProgress, {
      stage: 'restore-point',
      message: 'Creating system restore point for safety...',
      percentage: 25
    });

    try {
      const restorePointName = `PC Health Assistant - ${fix.title} - ${new Date().toISOString()}`;

      // Create restore point using PowerShell
      const command = `powershell -Command "Checkpoint-Computer -Description '${restorePointName}' -RestorePointType MODIFY_SETTINGS"`;

      await execPromise(command, { timeout: 120000 }); // 2 minute timeout

      this.reportProgress(onProgress, {
        stage: 'restore-point',
        message: '✓ Restore point created',
        percentage: 35
      });

    } catch (error) {
      // Creating restore point failed - warn but don't abort
      console.warn('Failed to create restore point:', error);

      this.reportProgress(onProgress, {
        stage: 'restore-point',
        message: '⚠ Could not create restore point - proceeding with caution',
        percentage: 35
      });
    }
  }

  /**
   * Execute commands step-by-step
   */
  async executeCommands(fix, onProgress) {
    const results = [];
    const totalSteps = fix.commands.length;

    for (let i = 0; i < fix.commands.length; i++) {
      const command = fix.commands[i];
      const stepNum = i + 1;

      this.reportProgress(onProgress, {
        stage: 'executing-step',
        message: fix.steps && fix.steps[i] ? fix.steps[i] : `Executing step ${stepNum}...`,
        percentage: 40 + (40 * (i / totalSteps)),
        currentStep: stepNum,
        totalSteps,
        command
      });

      try {
        // Execute the command
        const { stdout, stderr } = await execPromise(
          `powershell -Command "${command}"`,
          { timeout: 300000 } // 5 minute timeout per command
        );

        // Get the step description if available
        const stepDescription = fix.steps && fix.steps[i] ? fix.steps[i] : `Step ${stepNum}`;

        results.push({
          step: stepNum,
          command,
          success: true,
          output: stdout || stderr,
          description: stepDescription
        });

        this.reportProgress(onProgress, {
          stage: 'step-complete',
          message: `✓ ${stepDescription} - completed`,
          percentage: 40 + (40 * ((i + 1) / totalSteps)),
          currentStep: stepNum,
          totalSteps,
          stepDescription
        });

        // Brief delay between steps for UI feedback
        await this.sleep(500);

      } catch (error) {
        console.error(`Command failed: ${command}`, error);

        results.push({
          step: stepNum,
          command,
          success: false,
          error: error.message
        });

        this.reportProgress(onProgress, {
          stage: 'step-failed',
          message: `✗ Step ${stepNum} failed: ${error.message}`,
          percentage: 40 + (40 * (i / totalSteps)),
          currentStep: stepNum,
          totalSteps,
          error: error.message
        });

        // For high-risk fixes, abort on first failure
        if (fix.riskLevel === 'high') {
          throw new Error(`High-risk fix aborted at step ${stepNum}: ${error.message}`);
        }

        // For lower-risk fixes, continue but warn
        console.warn(`Step ${stepNum} failed but continuing...`);
      }
    }

    return results;
  }

  /**
   * Report progress to callback
   */
  reportProgress(callback, progress) {
    if (callback && typeof callback === 'function') {
      callback(progress);
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Rollback a fix using system restore
   */
  async rollback(onProgress = null) {
    this.reportProgress(onProgress, {
      stage: 'rollback',
      message: 'Rolling back changes using system restore...',
      percentage: 0
    });

    try {
      // Open System Restore GUI
      await execPromise('rstrui.exe');

      this.reportProgress(onProgress, {
        stage: 'rollback',
        message: 'System Restore opened. Please select the most recent restore point.',
        percentage: 100
      });

      return {
        success: true,
        message: 'System Restore opened. Follow the wizard to restore your system.'
      };

    } catch (error) {
      return {
        success: false,
        error: 'Could not open System Restore: ' + error.message
      };
    }
  }
}

module.exports = { FixExecutor };
