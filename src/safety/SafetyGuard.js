/**
 * SafetyGuard - Ensures all fixes are safe and reversible
 * This is CRITICAL - prevents the AI from breaking things!
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs').promises;
const path = require('path');
const AuditLogger = require('../utils/AuditLogger');

class SafetyGuard {
  constructor() {
    this.name = 'SafetyGuard';
    this.restorePoints = [];
    this.auditLogger = new AuditLogger();
    this.onProgress = null; // Callback for progress updates

    // Hard limits - NEVER allow these operations
    this.FORBIDDEN_OPERATIONS = [
      'format',
      'del /f /q C:\\*',
      'rm -rf /',
      'rmdir /s /q C:\\Users',
      'disable-firewall-permanently',
      'bios',
      'fdisk'
    ];

    // Nonsensical operations that don't make sense
    this.NONSENSICAL_OPERATIONS = [
      'restart the internet',
      'reinstall internet connector',
      'reinstall internet',
      'update internet',
      'fix the cloud',
      'restart wifi signal',
      'reinstall network'
    ];
  }

  /**
   * Emit progress update
   */
  _emitProgress(data) {
    if (this.onProgress && typeof this.onProgress === 'function') {
      this.onProgress(data);
    }
  }

  /**
   * Main entry point - execute a fix with full safety checks
   */
  async executeFix(fix, diagnosticId = null) {
    console.log(`SafetyGuard: Evaluating fix "${fix.title}"`);

    // Log fix execution start
    const fixExecutionId = this.auditLogger.logFixStart(fix, diagnosticId);

    // Emit initial progress
    this._emitProgress({
      stage: 'starting',
      message: 'Preparing to apply fix...',
      percentage: 0
    });

    // Check if fix is automatable
    if (!fix.automatable) {
      const error = new Error('This fix requires manual steps and cannot be automated');
      this.auditLogger.logFixFailure(fixExecutionId, error, false, false);
      throw error;
    }

    // Check if fix has technical details with commands
    if (!fix.technicalDetails || !fix.technicalDetails.commands || fix.technicalDetails.commands.length === 0) {
      const error = new Error('This fix does not have executable commands defined');
      this.auditLogger.logFixFailure(fixExecutionId, error, false, false);
      throw error;
    }

    // Step 1: Safety checks
    this._emitProgress({
      stage: 'safety-check',
      message: 'Running safety checks...',
      percentage: 10
    });

    const safetyCheck = await this.performSafetyChecks(fix);

    // Log safety check results
    this.auditLogger.logSafetyCheck(fix.id, {
      forbiddenOperations: !safetyCheck.reason?.includes('forbidden'),
      validStructure: !safetyCheck.reason?.includes('incomplete'),
      validRiskLevel: !safetyCheck.reason?.includes('Risk level'),
      userDataProtection: !safetyCheck.reason?.includes('user data')
    });

    if (!safetyCheck.safe) {
      this.auditLogger.logFixFailure(fixExecutionId, new Error(`Safety check failed: ${safetyCheck.reason}`), false, false);
      throw new Error(`Safety check failed: ${safetyCheck.reason}`);
    }

    // Step 2: Create restore point (for high-risk fixes)
    let restorePoint = null;
    if (fix.riskLevel === 'high' || fix.riskLevel === 'medium') {
      this._emitProgress({
        stage: 'restore-point',
        message: 'Creating system restore point...',
        percentage: 20
      });

      restorePoint = await this.createRestorePoint(fix.title);
      if (restorePoint) {
        this.auditLogger.logRestorePoint(fix.id, restorePoint.id, restorePoint.description);
      }
    }

    // Step 3: Execute with monitoring
    try {
      this._emitProgress({
        stage: 'executing',
        message: 'Starting fix execution...',
        percentage: 30
      });

      const result = await this.executeWithMonitoring(fix, fixExecutionId);

      // Step 4: Verify the fix worked
      this._emitProgress({
        stage: 'verifying',
        message: 'Verifying fix was successful...',
        percentage: 95
      });

      const verification = await this.verifyFix(fix, result);

      // Log successful completion
      this.auditLogger.logFixSuccess(fixExecutionId, verification);

      this._emitProgress({
        stage: 'complete',
        message: 'Fix applied successfully!',
        percentage: 100
      });

      return {
        success: true,
        restorePointId: restorePoint?.id,
        result,
        verification
      };

    } catch (error) {
      console.error('Fix failed:', error);

      let rollbackSuccess = false;

      // Step 5: Automatic rollback on failure
      if (restorePoint) {
        this._emitProgress({
          stage: 'rollback',
          message: 'Fix failed, rolling back changes...',
          percentage: 0,
          error: error.message
        });

        console.log('Attempting automatic rollback...');
        const rollbackResult = await this.rollback(restorePoint);
        rollbackSuccess = rollbackResult.success;
      }

      // Log fix failure with rollback info
      this.auditLogger.logFixFailure(fixExecutionId, error, !!restorePoint, rollbackSuccess);

      throw error;
    }
  }

  /**
   * Perform comprehensive safety checks
   */
  async performSafetyChecks(fix) {
    // Get commands to check (use technical commands if available, fallback to steps)
    const commandsToCheck = fix.technicalDetails?.commands || fix.steps || [];

    // Check 1: Forbidden operations
    for (const forbidden of this.FORBIDDEN_OPERATIONS) {
      if (commandsToCheck.some(cmd => cmd.toLowerCase().includes(forbidden.toLowerCase()))) {
        return {
          safe: false,
          reason: `Contains forbidden operation: ${forbidden}`
        };
      }
    }

    // Check 1.5: Nonsensical operations
    const fixText = (fix.title + ' ' + (fix.steps || []).join(' ')).toLowerCase();
    for (const nonsensical of this.NONSENSICAL_OPERATIONS) {
      if (fixText.includes(nonsensical.toLowerCase())) {
        return {
          safe: false,
          reason: `Contains nonsensical operation: "${nonsensical}" - this doesn't make sense and would confuse users`
        };
      }
    }

    // Check 2: Validate fix has required fields
    if (!fix.title || (!fix.steps && !fix.technicalDetails?.commands) || commandsToCheck.length === 0) {
      return {
        safe: false,
        reason: 'Fix is incomplete or malformed'
      };
    }

    // Check 3: Risk level is specified
    if (!['low', 'medium', 'high'].includes(fix.riskLevel)) {
      return {
        safe: false,
        reason: 'Risk level not properly specified'
      };
    }

    // Check 4: Don't allow deletion of user data directories
    const userDataPaths = [
      'C:\\Users\\*\\Documents',
      'C:\\Users\\*\\Pictures',
      'C:\\Users\\*\\Desktop',
      process.env.USERPROFILE
    ];

    for (const userPath of userDataPaths) {
      if (commandsToCheck.some(cmd => cmd.includes('del') && cmd.includes(userPath))) {
        return {
          safe: false,
          reason: 'Cannot delete user data'
        };
      }
    }

    return { safe: true };
  }

  /**
   * Create a system restore point
   */
  async createRestorePoint(description) {
    console.log('Creating restore point...');

    try {
      const id = Date.now().toString();
      const { stdout } = await execPromise(
        `powershell -Command "Checkpoint-Computer -Description 'PC Health Assistant: ${description}' -RestorePointType 'MODIFY_SETTINGS'"`
      );

      const restorePoint = {
        id,
        description,
        timestamp: new Date().toISOString(),
        status: 'created'
      };

      this.restorePoints.push(restorePoint);

      console.log('Restore point created successfully');
      return restorePoint;

    } catch (error) {
      console.warn('Could not create restore point:', error.message);
      // Don't fail the entire operation if restore point creation fails
      // Just log it and continue
      return null;
    }
  }

  /**
   * Detect if a command is a PowerShell cmdlet and wrap it if needed
   */
  wrapPowerShellIfNeeded(command) {
    // Skip if already wrapped
    if (command.trim().toLowerCase().startsWith('powershell')) {
      return command;
    }

    // Common PowerShell cmdlets that need wrapping
    const powerShellCmdlets = [
      'Get-', 'Set-', 'New-', 'Remove-', 'Invoke-', 'Start-', 'Stop-',
      'Test-', 'Enable-', 'Disable-', 'Add-', 'Clear-', 'Update-',
      'Install-', 'Uninstall-', 'Export-', 'Import-', 'ConvertTo-',
      'ConvertFrom-', 'Select-', 'Where-', 'ForEach-', 'Measure-',
      'Compare-', 'Sort-', 'Group-', 'Format-', 'Out-', 'Write-',
      'Read-', 'Checkpoint-', 'Restore-'
    ];

    // Check if command starts with any PowerShell cmdlet
    const trimmedCmd = command.trim();
    const isPowerShellCmdlet = powerShellCmdlets.some(cmdlet =>
      trimmedCmd.startsWith(cmdlet)
    );

    if (isPowerShellCmdlet) {
      // Escape double quotes in the command and wrap it
      const escapedCommand = command.replace(/"/g, '\\"');
      return `powershell -Command "${escapedCommand}"`;
    }

    return command;
  }

  /**
   * Execute fix steps with monitoring and logging
   */
  async executeWithMonitoring(fix, fixExecutionId) {
    const results = [];
    // Use technical commands instead of human-readable steps
    const commands = fix.technicalDetails.commands;
    const totalSteps = commands.length;

    for (let i = 0; i < totalSteps; i++) {
      const originalCommand = commands[i];
      // Auto-wrap PowerShell cmdlets if needed
      const command = this.wrapPowerShellIfNeeded(originalCommand);
      // Get corresponding human-readable step for display (if available)
      const displayStep = fix.steps && fix.steps[i] ? fix.steps[i] : originalCommand;
      console.log(`Executing step ${i + 1}/${totalSteps}: ${command}`);

      // Calculate progress percentage (30% to 90% range for execution)
      const stepPercentage = 30 + Math.floor((i / totalSteps) * 60);

      // Emit progress for current step (show human-readable description)
      this._emitProgress({
        stage: 'executing-step',
        message: `Step ${i + 1}/${totalSteps}: ${displayStep}`,
        percentage: stepPercentage,
        currentStep: i + 1,
        totalSteps: totalSteps,
        command: displayStep
      });

      try {
        // Execute the actual command (not the display step)
        const { stdout, stderr } = await execPromise(command);

        const stepResult = {
          step: i + 1,
          command: command,
          success: true,
          output: stdout,
          error: stderr
        };

        results.push(stepResult);

        // Emit step completion with output
        this._emitProgress({
          stage: 'step-complete',
          message: `Step ${i + 1} completed`,
          percentage: stepPercentage + Math.floor(60 / totalSteps),
          currentStep: i + 1,
          totalSteps: totalSteps,
          output: stdout || stderr || 'Success'
        });

        // Log step progress to audit log
        this.auditLogger.logFixProgress(
          fixExecutionId,
          i + 1,
          command,
          stdout || stderr
        );

        // Small delay between steps
        await this.delay(1000);

      } catch (error) {
        const stepResult = {
          step: i + 1,
          command: command,
          success: false,
          error: error.message
        };

        results.push(stepResult);

        // Emit step failure
        this._emitProgress({
          stage: 'step-failed',
          message: `Step ${i + 1} failed: ${error.message}`,
          percentage: stepPercentage,
          currentStep: i + 1,
          totalSteps: totalSteps,
          error: error.message
        });

        // Log failed step to audit log
        this.auditLogger.logFixProgress(
          fixExecutionId,
          i + 1,
          command,
          error.message
        );

        // If a step fails, stop and throw
        throw new Error(`Step ${i + 1} failed: command failed: ${command} ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Verify that the fix actually worked
   */
  async verifyFix(fix, results) {
    // Basic verification - check that all steps completed
    const allSuccessful = results.every(r => r.success);

    if (!allSuccessful) {
      return {
        verified: false,
        reason: 'Not all steps completed successfully'
      };
    }

    // Fix-specific verification could be added here
    // For now, basic verification
    return {
      verified: true,
      stepsCompleted: results.length
    };
  }

  /**
   * Rollback using restore point
   */
  async rollback(restorePoint) {
    console.log(`Rolling back to restore point: ${restorePoint.id}`);

    try {
      await execPromise(
        `powershell -Command "Restore-Computer -RestorePoint ${restorePoint.id}"`
      );

      return {
        success: true,
        message: 'System rolled back successfully'
      };

    } catch (error) {
      console.error('Rollback failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Helper delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { SafetyGuard };
