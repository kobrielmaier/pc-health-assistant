/**
 * ConversationalDiagnosticAgent
 * Works like chatting with Claude - investigates step-by-step, asks questions, proposes fixes
 */

const Anthropic = require('@anthropic-ai/sdk');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Import existing investigators for data collection
const { EventLogInvestigator } = require('./investigators/EventLogInvestigator');
const { DiskInvestigator } = require('./investigators/DiskInvestigator');
const { DriverInvestigator } = require('./investigators/DriverInvestigator');
const SystemResourceInvestigator = require('./investigators/SystemResourceInvestigator');
const { NetworkInvestigator } = require('./investigators/NetworkInvestigator');

class ConversationalDiagnosticAgent {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.conversationHistory = [];
    this.investigators = {
      eventLog: new EventLogInvestigator(),
      disk: new DiskInvestigator(),
      driver: new DriverInvestigator(),
      systemResource: new SystemResourceInvestigator(),
      network: new NetworkInvestigator()
    };
  }

  /**
   * Main chat interface - processes user messages and returns AI responses
   */
  async chat(userMessage, onToolUse = null) {
    console.log('User:', userMessage);

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Start conversation loop (allows multi-turn tool use)
    let continueLoop = true;
    let finalResponse = null;
    let proposedFix = null;

    while (continueLoop) {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192,
        temperature: 0,
        system: this.getSystemPrompt(),
        messages: this.conversationHistory,
        tools: this.getTools()
      });

      console.log('Claude response:', response.stop_reason);

      // Check if Claude wants to use tools
      if (response.stop_reason === 'tool_use') {
        // Add Claude's response to history
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content
        });

        // Process all tool calls
        const toolResults = [];

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            console.log(`Executing tool: ${block.name}`);

            // Notify UI that a tool is being used (for loading states)
            if (onToolUse) {
              onToolUse({
                tool: block.name,
                input: block.input,
                status: 'executing'
              });
            }

            // Check if this is a fix proposal
            if (block.name === 'propose_fix') {
              proposedFix = block.input;
              console.log('Fix proposed:', proposedFix);
            }

            // Execute the tool
            const result = await this.executeTool(block.name, block.input);

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result)
            });
          }
        }

        // Add tool results to history
        this.conversationHistory.push({
          role: 'user',
          content: toolResults
        });

        // Continue loop to let Claude process results
      } else {
        // Claude is done - extract final text response
        finalResponse = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        continueLoop = false;
      }
    }

    console.log('Final response:', finalResponse);
    return { response: finalResponse, proposedFix };
  }

  /**
   * Execute a tool requested by Claude
   */
  async executeTool(toolName, input) {
    try {
      switch (toolName) {
        case 'check_event_logs':
          return await this.checkEventLogs(input);

        case 'check_disk_health':
          return await this.checkDiskHealth(input);

        case 'check_system_resources':
          return await this.checkSystemResources(input);

        case 'check_drivers':
          return await this.checkDrivers(input);

        case 'check_network':
          return await this.checkNetwork(input);

        case 'run_powershell_diagnostic':
          return await this.runPowerShellDiagnostic(input);

        case 'propose_fix':
          // This tool doesn't execute - it returns a fix proposal for the UI
          return {
            success: true,
            message: 'Fix proposal sent to user for approval',
            fix: input
          };

        default:
          return {
            error: `Unknown tool: ${toolName}`
          };
      }
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        error: error.message,
        details: error.stack
      };
    }
  }

  /**
   * Check Windows Event Logs
   */
  async checkEventLogs(input) {
    const { logNames = ['Application', 'System'], daysBack = 7 } = input;

    const result = await this.investigators.eventLog.investigate({
      action: 'checkEventLogs',
      config: {
        logNames,
        timeRange: `${daysBack}days`,
        findPatterns: true
      }
    });

    return {
      summary: `Found ${result.errors?.length || 0} errors in ${logNames.join(', ')} logs`,
      errors: result.errors?.slice(0, 20) || [], // Limit to 20 most recent
      patterns: result.patterns || []
    };
  }

  /**
   * Check disk health using SMART data
   */
  async checkDiskHealth(input) {
    const result = await this.investigators.disk.investigate({
      action: 'analyzeDiskHealth',
      config: {
        checkSMART: true
      }
    });

    return {
      disks: result.disks || [],
      healthStatus: result.healthStatus || [],
      lowSpaceWarnings: result.lowSpaceWarnings || [],
      summary: `Checked ${result.healthStatus?.length || 0} disk(s)`
    };
  }

  /**
   * Check system resources (RAM, CPU, etc.)
   */
  async checkSystemResources(input) {
    const result = await this.investigators.systemResource.investigate({
      action: 'checkSystemResources',
      config: {}
    });

    return {
      ram: result.ram || {},
      cpu: result.cpu || {},
      gpu: result.gpu || [],
      warnings: result.warnings || [],
      summary: `RAM: ${result.ram?.usagePercent || 'N/A'}%, CPU: ${result.cpu?.usagePercent || 'N/A'}%`
    };
  }

  /**
   * Check drivers
   */
  async checkDrivers(input) {
    const result = await this.investigators.driver.investigate({
      action: 'checkDrivers',
      config: {
        focus: input.focus || ['GPU', 'Audio', 'Network']
      }
    });

    return {
      drivers: result.drivers || [],
      outdatedDrivers: result.outdatedDrivers || [],
      problematicDrivers: result.problematicDrivers || [],
      summary: `Found ${result.drivers?.length || 0} drivers, ${result.outdatedDrivers?.length || 0} outdated`
    };
  }

  /**
   * Check network connectivity
   */
  async checkNetwork(input) {
    const result = await this.investigators.network.investigate({
      action: 'testConnectivity',
      config: {}
    });

    return result;
  }

  /**
   * Run a PowerShell diagnostic command (with safety checks)
   */
  async runPowerShellDiagnostic(input) {
    const { command, explanation } = input;

    // Safety check: Only allow read-only diagnostic commands
    const dangerousCommands = [
      'remove-item', 'rm', 'del', 'delete',
      'format', 'clear-disk',
      'set-', 'new-', 'remove-',
      'restart-computer', 'stop-computer',
      'invoke-expression', 'iex',
      'invoke-command', 'icm'
    ];

    const lowerCommand = command.toLowerCase();
    for (const dangerous of dangerousCommands) {
      if (lowerCommand.includes(dangerous)) {
        return {
          error: 'Command not allowed - diagnostic commands must be read-only',
          explanation: 'For safety, only diagnostic (read-only) commands are allowed without approval'
        };
      }
    }

    // Execute the command
    try {
      const { stdout, stderr } = await execPromise(
        `powershell -Command "${command}"`,
        { timeout: 30000 }
      );

      return {
        success: true,
        explanation,
        output: stdout || stderr,
        command
      };
    } catch (error) {
      return {
        error: error.message,
        explanation,
        command
      };
    }
  }

  /**
   * Define tools that Claude can use
   */
  getTools() {
    return [
      {
        name: 'check_event_logs',
        description: 'Check Windows Event Logs for errors and warnings. Use this to investigate crashes, errors, and system issues.',
        input_schema: {
          type: 'object',
          properties: {
            logNames: {
              type: 'array',
              items: { type: 'string' },
              description: 'Log names to check (e.g., ["Application", "System"])'
            },
            daysBack: {
              type: 'number',
              description: 'How many days back to search (default: 7)'
            }
          }
        }
      },
      {
        name: 'check_disk_health',
        description: 'Check disk health using SMART data and disk space. ALWAYS use this before diagnosing disk issues.',
        input_schema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'check_system_resources',
        description: 'Check RAM, CPU, and GPU usage. Use this to investigate performance issues.',
        input_schema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'check_drivers',
        description: 'Check driver versions and status. Use this for hardware issues or crashes.',
        input_schema: {
          type: 'object',
          properties: {
            focus: {
              type: 'array',
              items: { type: 'string' },
              description: 'Which drivers to focus on (e.g., ["GPU", "Audio"])'
            }
          }
        }
      },
      {
        name: 'check_network',
        description: 'Check network connectivity and adapters. Use this for internet problems.',
        input_schema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'run_powershell_diagnostic',
        description: 'Run a read-only PowerShell diagnostic command. Use for specific checks not covered by other tools.',
        input_schema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The PowerShell command to run (must be read-only)'
            },
            explanation: {
              type: 'string',
              description: 'Simple explanation of what this checks and why'
            }
          },
          required: ['command', 'explanation']
        }
      },
      {
        name: 'propose_fix',
        description: 'Propose a fix to the user. This will show an approval dialog - user must approve before execution.',
        input_schema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Short title for the fix (user-friendly)'
            },
            description: {
              type: 'string',
              description: 'What this fix will do, explained simply'
            },
            why: {
              type: 'string',
              description: 'Why this fix will help solve their problem'
            },
            steps: {
              type: 'array',
              items: { type: 'string' },
              description: 'Step-by-step instructions in simple language'
            },
            commands: {
              type: 'array',
              items: { type: 'string' },
              description: 'PowerShell commands to execute (will be shown to user)'
            },
            riskLevel: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Risk level of this fix'
            },
            requiresRestart: {
              type: 'boolean',
              description: 'Whether this fix requires a system restart'
            },
            estimatedTime: {
              type: 'string',
              description: 'How long this will take (e.g., "2-5 minutes")'
            }
          },
          required: ['title', 'description', 'why', 'steps', 'commands', 'riskLevel']
        }
      }
    ];
  }

  /**
   * System prompt that defines Claude's behavior
   */
  getSystemPrompt() {
    return `You are a friendly, patient PC repair technician helping someone fix their computer. You have the personality of a helpful expert who makes technology easy to understand.

CORE MISSION:
Help users diagnose and fix their computer problems through conversation. Investigate step-by-step like a real technician, explain things simply, and guide them to solutions.

YOUR APPROACH:
1. **Ask clarifying questions first** - "Which program crashes?" "When did this start?"
2. **Investigate methodically** - Check one thing at a time, explain what you're checking
3. **Think out loud** - "Let me check your disk health first..." "Hmm, that's interesting..."
4. **Explain simply** - Use everyday language, avoid jargon
5. **Verify before diagnosing** - Don't assume! Cross-reference data sources
6. **Only propose real fixes** - For confirmed problems with clear evidence

CRITICAL RULES FOR ACCURACY:

**SELF-EXCLUSION (VERY IMPORTANT!):**
- YOU ARE "PC Health Assistant" - this is the app you are running inside
- NEVER flag "PC Health Assistant" as malware or suspicious - IT IS THIS APP
- Multiple "PC Health Assistant" processes are NORMAL (Electron apps spawn multiple processes)
- Connections to Anthropic IPs (160.79.104.x, api.anthropic.com) are EXPECTED - that's how you work
- Files in Temp folder related to "PC Health Assistant" are NORMAL for portable apps
- DO NOT propose removing or killing "PC Health Assistant" - you would be deleting yourself

**DISK HEALTH:**
- ALWAYS use check_disk_health BEFORE diagnosing any disk issues
- SMART data (healthStatus.isHealthy) is the ONLY truth for disk health
- Event logs showing "bad block" are often OLD and RESOLVED
- If SMART shows healthy, the disk IS healthy - ignore old event log errors
- Only report disk problems if SMART shows unhealthy OR no SMART data + recent errors

**EVENT LOGS:**
- Check the daysAgo and isRecent fields
- Errors older than 2 days are probably not current issues
- Look for patterns (recurring errors) not one-time events
- Cross-reference with other data before concluding

**VERIFICATION:**
- When you see a potential issue, investigate further to confirm
- Example: See crash in logs → Check if it's recent → Check if it's recurring → Identify the cause
- Don't report problems based on single data points

COMMUNICATION STYLE:
- Warm and reassuring: "Don't worry, let's figure this out together"
- Simple explanations: "Your graphics driver is like a translator between Windows and your graphics card"
- Honest: "I'm not seeing any major problems - your computer looks healthy"
- Encouraging: "Great! That should fix it. Try it out and let me know how it goes"

USING TOOLS:
- Use tools one at a time and explain what you're doing
- Example: "Let me check your RAM usage to see if that's causing the slowdown..."
- Show your reasoning: "The event logs show some errors. Let me check if they're recent..."

PROPOSING FIXES:
- Only propose fixes for CONFIRMED problems
- Explain the fix simply and why it will help
- Be clear about risk level and time required
- For low-risk fixes, be encouraging
- For high-risk fixes, explain the precautions being taken

SAFETY FIRST:
- Never run commands that modify the system without proposing a fix first
- All fixes require user approval
- Explain what could go wrong and how to undo if needed
- Create restore points for risky changes

EXAMPLE INTERACTION:
User: "My computer is really slow"
You: "I can help with that! Let me check a few things. First, let me see how much of your RAM is being used..."
[uses check_system_resources]
You: "Your RAM usage is at 45% which is normal. Let me check what programs start when Windows boots up - that's often the cause of slowness..."
[investigates startup programs]
You: "Found it! You have 23 programs starting automatically when Windows boots. I can help you disable the ones you don't need. Would you like me to do that?"

Remember: You're like a friendly tech expert having a conversation, not a robot running through a checklist. Adapt based on what you find!`;
  }

  /**
   * Run playbook-guided diagnosis (for diagnostic buttons)
   * This combines the thoroughness of playbooks with AI intelligence and auto-fix
   */
  async runPlaybookDiagnosis(problemType, onToolUse = null) {
    console.log('Running playbook diagnosis for:', problemType);

    // Map problem types to investigation steps
    const playbookMap = {
      'crash': ['event_logs', 'disk_health', 'drivers', 'system_resources'],
      'slow': ['system_resources', 'disk_health', 'startup_programs'],
      'error': ['event_logs', 'disk_health', 'system_resources'],
      'network': ['network', 'drivers'],
      'full': ['event_logs', 'disk_health', 'drivers', 'system_resources', 'network']
    };

    // Get the investigation steps for this problem type
    const steps = playbookMap[problemType] || playbookMap['full'];

    // Build a comprehensive diagnostic prompt
    let diagnosticPrompt = `I need you to run a comprehensive diagnostic for: ${this.getProblemTypeDescription(problemType)}

Please investigate the following areas systematically:
`;

    if (steps.includes('event_logs')) {
      diagnosticPrompt += '\n1. Check Windows Event Logs for errors and warnings in the last 7 days';
    }
    if (steps.includes('disk_health')) {
      diagnosticPrompt += '\n2. Check disk health using SMART data';
    }
    if (steps.includes('drivers')) {
      diagnosticPrompt += '\n3. Check driver status (GPU, Audio, Network)';
    }
    if (steps.includes('system_resources')) {
      diagnosticPrompt += '\n4. Check system resources (RAM, CPU, GPU usage)';
    }
    if (steps.includes('network')) {
      diagnosticPrompt += '\n5. Check network connectivity';
    }
    if (steps.includes('startup_programs')) {
      diagnosticPrompt += '\n6. Check startup programs and background processes';
    }

    diagnosticPrompt += `

After running these checks:
1. Analyze the results carefully
2. Identify any real problems (ignore false positives like old event logs if SMART shows healthy)
3. If you find fixable issues, propose a fix using the propose_fix tool
4. Provide a clear summary of what you found

Run each check one at a time and report your findings.`;

    // Run the diagnostic conversation
    const result = await this.chat(diagnosticPrompt, onToolUse);

    // Extract structured analysis for the UI
    const analysis = this.parseAnalysisFromResponse(result.response);

    return {
      analysis,
      proposedFix: result.proposedFix,
      rawResponse: result.response
    };
  }

  /**
   * Get friendly description for problem type
   */
  getProblemTypeDescription(problemType) {
    const descriptions = {
      'crash': 'Program/Game Crashing Issues',
      'slow': 'Slow Computer Performance',
      'error': 'Error Messages',
      'network': 'Network/Internet Problems',
      'full': 'Complete System Scan'
    };
    return descriptions[problemType] || 'System Diagnostic';
  }

  /**
   * Parse AI response into structured analysis
   */
  parseAnalysisFromResponse(response) {
    // Try to extract structured information from the AI's response
    // This creates a format compatible with the existing results UI

    const issues = [];
    const fixes = [];

    // Look for mentions of problems
    const lines = response.split('\n');
    let currentSeverity = 'info';

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Detect severity indicators
      if (lowerLine.includes('critical') || lowerLine.includes('serious') || lowerLine.includes('failing')) {
        currentSeverity = 'critical';
      } else if (lowerLine.includes('warning') || lowerLine.includes('issue') || lowerLine.includes('problem')) {
        currentSeverity = 'warning';
      } else if (lowerLine.includes('healthy') || lowerLine.includes('normal') || lowerLine.includes('ok')) {
        currentSeverity = 'info';
      }

      // Extract findings (simple heuristic)
      if (line.match(/^[-•*]\s+/) || line.match(/^\d+\.\s+/)) {
        const text = line.replace(/^[-•*\d.]\s+/, '').trim();
        if (text.length > 10) {
          issues.push({
            severity: currentSeverity,
            title: text.substring(0, 80),
            description: text,
            whatThisMeans: 'Analysis from AI diagnostic',
            foundEvidence: 'Detected during playbook investigation'
          });
        }
      }
    }

    // If no structured issues found, create a summary issue
    if (issues.length === 0) {
      issues.push({
        severity: 'info',
        title: 'Diagnostic Complete',
        description: response.substring(0, 200),
        whatThisMeans: 'AI has completed the diagnostic scan',
        foundEvidence: 'Full analysis available in details'
      });
    }

    return {
      summary: response.substring(0, 150) + '...',
      issues,
      fixes,
      fullReport: response
    };
  }

  /**
   * Reset conversation (for new problem)
   */
  resetConversation() {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history (for UI to display)
   */
  getHistory() {
    return this.conversationHistory;
  }
}

module.exports = { ConversationalDiagnosticAgent };
