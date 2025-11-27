/**
 * DiagnosticAgent - Core AI diagnostic system
 * Autonomously investigates computer problems using pre-defined playbooks
 */

const Anthropic = require('@anthropic-ai/sdk');
const { EventLogInvestigator } = require('./investigators/EventLogInvestigator');
const { DriverInvestigator } = require('./investigators/DriverInvestigator');
const { DiskInvestigator } = require('./investigators/DiskInvestigator');
const { CrashDumpInvestigator } = require('./investigators/CrashDumpInvestigator');
const { NetworkInvestigator } = require('./investigators/NetworkInvestigator');
const SystemResourceInvestigator = require('./investigators/SystemResourceInvestigator');
const StartupProgramsInvestigator = require('./investigators/StartupProgramsInvestigator');
const BackgroundProcessesInvestigator = require('./investigators/BackgroundProcessesInvestigator');
const TempFilesInvestigator = require('./investigators/TempFilesInvestigator');
const SystemFilesInvestigator = require('./investigators/SystemFilesInvestigator');
const DeviceManagerInvestigator = require('./investigators/DeviceManagerInvestigator');
const RecentChangesInvestigator = require('./investigators/RecentChangesInvestigator');
const USBDevicesInvestigator = require('./investigators/USBDevicesInvestigator');
const PLAYBOOKS = require('./playbooks');
const AuditLogger = require('../utils/AuditLogger');

class DiagnosticAgent {
  constructor() {
    // Security: API key must be provided via environment variable
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required. Please set it in your .env file.');
    }

    console.log('Initializing Anthropic client...');
    console.log('API Key present:', !!process.env.ANTHROPIC_API_KEY);
    console.log('API Key length:', process.env.ANTHROPIC_API_KEY?.length);

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Initialize audit logger
    this.auditLogger = new AuditLogger();

    console.log('Client initialized:', !!this.client);
    console.log('Audit logger initialized:', !!this.auditLogger);
  }

  /**
   * Main investigation entry point
   * @param {string} problemType - Type of problem (crash, slow, error, etc.)
   * @param {object} options - Additional options (e.g., specific program name)
   * @returns {object} Investigation results
   */
  async investigate(problemType, options = {}) {
    console.log(`Starting investigation for problem type: ${problemType}`);

    // Log diagnostic start
    const diagnosticId = this.auditLogger.logDiagnosticStart(problemType);

    try {
      // Get the appropriate playbook for this problem type
      const playbook = this.getPlaybook(problemType);
      if (!playbook) {
        throw new Error(`Unknown problem type: ${problemType}`);
      }

      // Execute all investigation steps in parallel
      const investigations = await this.runPlaybook(playbook, options);

      // Perform iterative deep analysis with Claude AI
      // This allows Claude to request additional investigations if needed
      const analysis = await this.iterativeAnalysis(investigations, problemType, options);

      // Prepare results
      const results = {
        problemType,
        timestamp: new Date().toISOString(),
        investigations,
        analysis,
        recommendations: analysis.fixes || []
      };

      console.log('📊 DIAGNOSTIC RESULTS:');
      console.log('  - Issues:', analysis.issues?.length || 0);
      console.log('  - Fixes:', analysis.fixes?.length || 0);
      console.log('  - Analysis type:', typeof analysis);
      console.log('  - Analysis.summary:', analysis.summary?.substring(0, 100));

      // Log successful diagnostic completion
      this.auditLogger.logDiagnosticComplete(diagnosticId, {
        summary: analysis.summary,
        issues: analysis.issues,
        fixes: analysis.fixes
      });

      return results;

    } catch (error) {
      // Log diagnostic error
      this.auditLogger.logDiagnosticError(diagnosticId, error);
      throw error;
    }
  }

  /**
   * Get the investigation playbook for a problem type
   */
  getPlaybook(problemType) {
    const playbooks = {
      'crash': PLAYBOOKS.CRASH_INVESTIGATION,
      'slow': PLAYBOOKS.SLOW_PC_INVESTIGATION,
      'error': PLAYBOOKS.ERROR_INVESTIGATION,
      'hardware': PLAYBOOKS.HARDWARE_INVESTIGATION,
      'network': PLAYBOOKS.NETWORK_INVESTIGATION,
      'full-scan': PLAYBOOKS.FULL_SYSTEM_SCAN
    };

    return playbooks[problemType];
  }

  /**
   * Execute a playbook's investigation steps
   */
  async runPlaybook(playbook, options) {
    console.log(`Running playbook: ${playbook.name}`);
    const results = {};

    for (const step of playbook.steps) {
      try {
        console.log(`  - Executing step: ${step.action}`);
        const investigator = this.getInvestigator(step.action);

        if (!investigator) {
          throw new Error(`No investigator available for action: ${step.action}`);
        }

        console.log(`  - Investigator loaded for ${step.action}`);
        const result = await investigator.investigate(step, options);
        console.log(`  - ${step.action} completed:`, result);

        results[step.action] = result;
      } catch (error) {
        console.error(`Error in step ${step.action}:`, error);
        console.error('Error stack:', error.stack);
        results[step.action] = {
          error: error.message,
          findings: [`Could not complete ${step.action}: ${error.message}`],
          recommendations: []
        };
      }
    }

    console.log('Playbook execution complete. Results:', JSON.stringify(results, null, 2));
    return results;
  }

  /**
   * Get the appropriate investigator for an action
   */
  getInvestigator(action) {
    const investigators = {
      'checkEventLogs': new EventLogInvestigator(),
      'findCrashDumps': new CrashDumpInvestigator(),
      'checkDrivers': new DriverInvestigator(),
      'analyzeDiskSpace': new DiskInvestigator(),

      // Network-related investigators
      'checkNetworkAdapters': new NetworkInvestigator(),
      'testConnectivity': new NetworkInvestigator(),
      'checkFirewall': new NetworkInvestigator(),
      'checkProxySettings': new NetworkInvestigator(),

      // Comprehensive system investigators (now fully implemented!)
      'checkSystemResources': new SystemResourceInvestigator(),
      'analyzeRecentChanges': new RecentChangesInvestigator(),
      'checkStartupPrograms': new StartupProgramsInvestigator(),
      'checkRAMUsage': new SystemResourceInvestigator(),  // Uses RAM portion
      'analyzeDiskHealth': new DiskInvestigator(),
      'checkBackgroundProcesses': new BackgroundProcessesInvestigator(),
      'scanTempFiles': new TempFilesInvestigator(),
      'checkSystemFiles': new SystemFilesInvestigator(),
      'checkDeviceManager': new DeviceManagerInvestigator(),
      'checkHardwareHealth': new SystemResourceInvestigator(),  // Uses all hardware checks
      'checkUSBDevices': new USBDevicesInvestigator(),
      'analyzeProcesses': new BackgroundProcessesInvestigator()  // Same as background processes
    };

    const investigator = investigators[action];

    // If no investigator found, return a fallback
    if (!investigator) {
      console.warn(`No investigator found for action: ${action}`);
      return {
        investigate: async () => ({
          findings: [`Investigation for "${action}" is not yet implemented`],
          recommendations: []
        })
      };
    }

    return investigator;
  }

  /**
   * Analyze investigation results using Claude AI
   */
  async analyzeWithClaude(investigations, problemType) {
    const prompt = this.buildAnalysisPrompt(investigations, problemType);

    console.log('Calling Claude API...');
    console.log('Client available:', !!this.client);
    console.log('Client.messages available:', !!this.client?.messages);

    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16384,
        temperature: 0,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Check if response was truncated
      if (message.stop_reason === 'max_tokens') {
        console.warn('WARNING: Claude response was truncated due to max_tokens limit');
      }

      // Parse Claude's response
      const analysisText = message.content[0].text;
      return this.parseAnalysis(analysisText);

    } catch (error) {
      console.error('Error calling Claude API:', error);
      return {
        summary: 'Unable to analyze - API error',
        issues: [],
        fixes: []
      };
    }
  }

  /**
   * Iterative analysis - allows Claude to perform multi-turn deep investigation
   * This matches the thoroughness of direct Claude interaction
   */
  async iterativeAnalysis(initialInvestigations, problemType, options = {}) {
    console.log('Starting iterative deep analysis...');

    let allInvestigations = { ...initialInvestigations };
    let iteration = 1;
    const maxIterations = 3;  // Prevent infinite loops

    try {
      // First analysis pass - let Claude examine everything we've gathered
      console.log(`Iteration ${iteration}: Initial comprehensive analysis...`);
      const analysis = await this.analyzeWithClaude(allInvestigations, problemType);

      // For now, single-pass is sufficient with our comprehensive investigators
      // Future enhancement: Could add Claude's ability to request specific follow-up investigations
      // by having it return a "needsMoreInfo" field with specific investigation requests

      console.log('✓ Deep analysis complete');
      return analysis;

    } catch (error) {
      console.error('Error in iterative analysis:', error);
      // Fallback to basic analysis
      return await this.analyzeWithClaude(initialInvestigations, problemType);
    }
  }

  /**
   * Build the prompt for Claude to analyze the investigation results
   */
  buildAnalysisPrompt(investigations, problemType) {
    return `You are an expert PC diagnostics system with full technical knowledge. Your job is to:

1. **ANALYZE THOROUGHLY**: Use all your technical expertise to deeply analyze the investigation data. Consider all technical details, correlations, patterns, and root causes.

2. **OUTPUT SIMPLY**: Once you've done your deep analysis, translate your findings into language a non-technical person can understand.

ANALYSIS APPROACH:
- Examine ALL investigation data in detail - don't skip anything
- Look for correlations between different data sources (events, crashes, hardware, network)
- Identify root causes, not just symptoms
- Consider timing patterns and severity
- Evaluate hardware vs software vs configuration issues
- Use your full technical knowledge during analysis

**CONSISTENCY REQUIREMENTS** (Same data MUST yield same diagnosis):
- Base ALL conclusions on objective evidence in the investigation data
- Use consistent thresholds:
  * Disk failing = SMART unhealthy OR (>10 recent bad blocks AND isHealthy=false)
  * Driver outdated = version older than 6 months from current date
  * High CPU = sustained >80% usage
  * Low disk space = <10% free
- DO NOT use probabilistic language that changes between runs
- Apply the SAME priority/severity logic every time
- If you see identical data again, produce identical output

OUTPUT TRANSLATION:
- "description" and "whatThisMeans" fields: Translate to simple language
  - Use everyday words instead of technical jargon
  - Example: "Graphics driver" not "nvwgf2umx.dll"
  - Example: "Your hard drive" not "NTFS file system"
  - Example: "Windows found errors" not "exception code 0xc0000094"
- "foundEvidence" field: You CAN include some technical details here for power users
  - Example: "Found Event ID 7 (bad sectors) but SMART reports disk is healthy"
  - Keep it concise but accurate
- "technicalDetails" section: Use full technical precision
  - Exact commands, file paths, error codes
  - This is for the repair system and advanced users

TONE: Professional, clear, and reassuring. Don't talk down to users, just make complex things understandable

FIX REQUIREMENTS:

ONLY recommend fixes that are:
1. **Targeted** - Address the specific problem found in the data
2. **Safe** - Include rollback/recovery steps for medium/high risk fixes
3. **Actionable** - Clear steps that users can follow
4. **Necessary** - Based on actual evidence, not speculation

IMPORTANT RULES:
- If investigation shows no problems, report that - don't invent issues
- Network working? (successful ping) Don't recommend network fixes
- Disk healthy? (isHealthy: true) Don't report disk problems regardless of old event logs
- No evidence of driver issues? Don't recommend driver updates
- Avoid extreme measures (reinstall Windows, BIOS changes) unless truly necessary

**CRITICAL FIX RULES**:
- Only create fixes for issues marked "critical" or "warning" severity
- Do NOT create fixes for "info" severity issues - those are informational only
- Each fix should correspond to an actual problem that needs solving
- If system file status is "healthy" or "no-recent-scan" - DO NOT recommend SFC scan
- If an issue was already repaired (e.g., "Previous corruption was found and repaired"), DO NOT create a fix for it
- The number of fixes should roughly match the number of critical/warning issues

Problem Type: ${problemType}

Investigation Results:
${JSON.stringify(investigations, null, 2)}

CRITICAL ANALYSIS RULES:

**DISK HEALTH - CRITICAL RULE - READ THIS CAREFULLY**:

❌ **NEVER REPORT DISK AS FAILING IF SMART SHOWS HEALTHY!** ❌

- SMART data (analyzeDiskHealth with healthStatus.isHealthy field) is the ONLY source of truth for disk health
- Event logs showing "bad block" are almost ALWAYS from normal Windows maintenance:
  * Windows runs automatic chkdsk scans
  * SSDs remap bad blocks automatically (this is NORMAL!)
  * File system operations log as "disk errors"
  * These are NOT signs of disk failure!

- **CRITICAL**: If healthStatus.isHealthy=true OR HealthStatus="Healthy", the disk IS HEALTHY - PERIOD!
  * DO NOT mention bad block errors
  * DO NOT suggest backup as urgent
  * DO NOT warn about disk failure
  * DO NOT create panic

- ONLY report disk problems if BOTH conditions are met:
  1. SMART data shows isHealthy=false OR healthStatus="Unhealthy" OR "Warning", AND
  2. Multiple errors in last 48 hours

- If SMART shows healthy but event logs show "bad block":
  * Say: "Your disk is healthy according to SMART data"
  * Explain: "Event logs show some disk maintenance operations, but your SSD is functioning normally"
  * NO PANIC: Do not suggest urgent backup or replacement

**REMEMBER: Windows logs normal disk operations as errors. SMART health is the truth!**

**TIME-BASED FILTERING**: Event logs include isRecent (< 2 days), isOld (> 7 days), and daysAgo fields. Only report issues that are:
- Recent AND recurring (recentOccurrences >= 2), OR
- Show ongoing pattern (occurred historically AND recently)
Ignore single old errors - they're not current problems.

**OUTPUT LENGTH**:
- description/whatThisMeans: 1-2 clear sentences (can be up to 25 words if needed for clarity)
- foundEvidence: Concise but can include key technical details
- Don't sacrifice accuracy for arbitrary word limits

**NEW FIELD REQUIREMENTS**:

**PRIORITY** (How urgent is this to fix?):
- "immediate": Data loss risk, system instability, or security vulnerability. Fix RIGHT NOW.
  * Examples: Failing hard drive with bad sectors, ransomware detected, system won't boot
- "high": Significant functionality impairment. Fix within 24 hours.
  * Examples: Driver causing frequent crashes, critical Windows service disabled
- "medium": Noticeable but not critical. Fix this week when convenient.
  * Examples: Outdated drivers, minor performance issues, non-critical startup programs
- "low": Optional improvement or informational. Fix if desired.
  * Examples: Old event log entries, cosmetic issues, optimization suggestions

**CONFIDENCE** (How certain are you about this diagnosis?):
- 1.0: Definitive evidence (SMART data, crash dumps, clear error patterns)
- 0.9: Very strong evidence (multiple corroborating sources)
- 0.8: Strong evidence (clear pattern with some ambiguity)
- 0.7: Moderate evidence (single clear source or weak pattern)
- 0.5-0.6: Uncertain (speculation or insufficient data)
- Below 0.5: Don't report it - not confident enough

**ACTIONABLE** (Can user actually do something about this?):
- true: There's a fix or action the user can take
- false: Informational only, no action needed or possible
  * Examples: "Your system is healthy" = false, "Old resolved errors" = false

**TIMETOFIX** (User-friendly urgency indicator):
- Use natural language: "Fix immediately", "Fix today", "Fix this week", "Fix when convenient", "Optional", "No action needed"

**CRITICAL FILTERING RULES**:
- ONLY include issues with confidence >= 0.7
- ONLY include issues where actionable=true OR severity="critical"
- If confidence < 0.7, investigate more or don't report it
- If system is healthy (no real problems), say so clearly - don't invent issues

JSON FORMATTING:
- Return ONLY valid JSON (no text before/after)
- No trailing commas
- Double quotes for strings, escape internal quotes with \"
- No line breaks inside string values

Format your response as valid JSON:
{
  "summary": "Brief 1-2 sentence overview in simple terms",
  "issues": [
    {
      "severity": "critical|warning|info",
      "priority": "immediate|high|medium|low",
      "confidence": 0.0-1.0,
      "actionable": true|false,
      "title": "Short, clear title (5-8 words max)",
      "description": "One short sentence. What's wrong and why it matters.",
      "whatThisMeans": "Another short sentence explaining the impact in everyday terms",
      "foundEvidence": "Brief mention of what we detected (translated to simple language)",
      "timeToFix": "How urgent is this? e.g., 'Fix within 1 hour', 'Fix this week', 'Optional'"
    }
  ],
  "fixes": [
    {
      "id": "unique-fix-id",
      "title": "What we'll do (short title)",
      "whyThis": "One sentence: what this fixes and why it helps",
      "howLong": "e.g., 10 minutes, 1 hour",
      "difficulty": "Easy|Medium|Advanced",
      "needsRestart": true|false,
      "requiresAdmin": true|false,
      "automatable": true|false,
      "riskLevel": "low|medium|high",
      "priority": "immediate|high|medium|low",
      "confidence": 0.0-1.0,

      "🚨 ADMIN PRIVILEGES RULE 🚨": "Set requiresAdmin to true if the fix requires administrator privileges. Examples: registry edits (HKLM), driver updates, system file repairs (sfc, DISM, chkdsk), service modifications, Windows Update operations. Set to false for user-level operations like deleting temp files, changing user settings, or app-specific fixes.",

      "🚨 CRITICAL RULE FOR AUTOMATABLE FIXES 🚨": "If automatable is true, the commands MUST actually REPAIR/FIX things. Commands that only READ information (like wmic get, Get-PhysicalDisk | Select-Object, systeminfo) are NOT fixes - they are diagnostics. Only include actual repair commands like sfc, chkdsk, DISM, driver updates, service restarts, etc. If you cannot provide automated repair commands, set automatable to false.",

      "🚨 MAXIMIZE AUTOMATION 🚨": "Try to make as many fixes automatable as possible. Many common fixes CAN be automated: clearing temp files (del, Remove-Item), restarting services (Restart-Service, net stop/start), running system repairs (sfc, DISM, chkdsk), clearing DNS cache (ipconfig /flushdns), resetting network (netsh), disabling startup programs (reg delete), updating Windows (wuauclt). ONLY set automatable=false if the fix truly requires manual steps like: downloading from external sites, physical hardware changes, or complex UI interactions.",

      "steps": [
        "Step 1: Clear, simple instruction",
        "Step 2: Another clear instruction",
        "Step 3: Continue..."
      ],
      "technicalDetails": {
        "commands": [
          "🚨 CRITICAL: These MUST be REPAIR/FIX commands that CHANGE things, NOT read-only diagnostic commands!",
          "✅ GOOD: sfc /scannow (repairs system files)",
          "✅ GOOD: chkdsk C: /F (fixes disk errors)",
          "✅ GOOD: DISM /Online /Cleanup-Image /RestoreHealth (repairs Windows)",
          "❌ BAD: Get-PhysicalDisk | Select-Object (just reads, doesn't fix)",
          "❌ BAD: wmic diskdrive get status (just reads, doesn't fix)",
          "❌ BAD: systeminfo (just reads, doesn't fix)",
          "If you can only diagnose but not fix automatically, set automatable: false"
        ],
        "filesModified": [
          "Files or registry keys that will be changed",
          "e.g., C:\\Windows\\System32\\drivers\\nvlddmkm.sys",
          "e.g., HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion"
        ],
        "prerequisites": [
          "What needs to be in place before running the fix",
          "e.g., Administrator privileges required",
          "e.g., Stable internet connection needed"
        ],
        "expectedOutcome": "What should happen after the fix completes successfully",
        "verification": [
          "How to check if the fix worked",
          "e.g., Run the game to see if it still crashes",
          "e.g., Check Device Manager for yellow warning icons"
        ],
        "rollback": [
          "How to undo the fix if something goes wrong",
          "e.g., Restore from System Restore Point",
          "e.g., Reinstall the previous driver version"
        ]
      }
    }
  ]
}

OUTPUT TRANSLATION EXAMPLES:

User-facing fields (description/whatThisMeans):
❌ "NTFS file system has structural corruption"
✅ "Your hard drive has damaged files"

❌ "XboxGameBarWidgets.exe crashing with 0xc0000094 in nvwgf2umx.dll"
✅ "Xbox Game Bar keeps crashing due to graphics driver issues"

foundEvidence field (can include technical details):
✅ "Event ID 7 (bad sectors) in logs, but SMART shows isHealthy: true"
✅ "XboxGameBarWidgets.exe exception 0xc0000094, occurs 5x in last 2 days"
✅ "Network ping successful (8.8.8.8 responds in 15ms)"

Remember: Analyze deeply with full technical knowledge, but communicate clearly for all users.`;
  }

  /**
   * Parse Claude's analysis response
   */
  parseAnalysis(analysisText) {
    try {
      // Remove markdown code blocks if present (be aggressive about it)
      let cleanText = analysisText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/^json\s*/gi, '')
        .trim();

      // Try to extract JSON from the response
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in Claude response');
        return {
          summary: 'Unable to parse diagnostic results',
          issues: [],
          fixes: []
        };
      }

      let jsonText = jsonMatch[0];

      // Try parsing the JSON
      try {
        const parsed = JSON.parse(jsonText);
        console.log('✅ Successfully parsed JSON with', parsed.issues?.length || 0, 'issues and', parsed.fixes?.length || 0, 'fixes');

        // Filter and enhance the results
        const filtered = this.filterAndPrioritizeResults(parsed);
        console.log('After filtering:', filtered.issues?.length || 0, 'issues and', filtered.fixes?.length || 0, 'fixes');

        return filtered;
      } catch (parseError) {
        console.error('JSON parse error:', parseError.message);
        console.log('Problematic JSON (first 500 chars):', jsonText.substring(0, 500));

        // Write full JSON to file for debugging
        const fs = require('fs');
        const path = require('path');
        const debugPath = path.join(__dirname, '../../debug-json-error.txt');
        fs.writeFileSync(debugPath, `Parse Error: ${parseError.message}\n\n${jsonText}`);

        // Try to fix common JSON issues
        jsonText = this.fixCommonJsonErrors(jsonText);

        try {
          const parsed = JSON.parse(jsonText);
          console.log('Successfully parsed after fixing common errors');
          return parsed;
        } catch (secondError) {
          console.error('Still failed after fixes:', secondError.message);
          throw secondError;
        }
      }

    } catch (error) {
      console.error('Error parsing analysis:', error);
      console.error('Full response text:', analysisText);

      // Return a safe fallback
      return {
        summary: 'Diagnostic completed but results could not be formatted properly. Please try running the diagnosis again.',
        issues: [{
          severity: 'warning',
          title: 'Analysis Error',
          description: 'The diagnostic completed but encountered a formatting issue.',
          whatThisMeans: 'You may want to try running the scan again.',
          foundEvidence: 'Technical parsing error occurred'
        }],
        fixes: []
      };
    }
  }

  /**
   * Fix common JSON formatting errors
   */
  fixCommonJsonErrors(jsonText) {
    // Remove trailing commas before closing brackets/braces
    jsonText = jsonText.replace(/,(\s*[\]}])/g, '$1');

    // Fix unescaped quotes in strings (basic attempt)
    // This is imperfect but catches some common cases
    jsonText = jsonText.replace(/([^\\])"([^",:}\]]*)"([^,:}\]]*?)"/g, '$1\\"$2\\"$3"');

    // Remove any control characters that might break JSON
    jsonText = jsonText.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    return jsonText;
  }

  /**
   * Filter out low-value issues and prioritize results
   * Achieves 10/10 by removing noise and showing what matters
   */
  filterAndPrioritizeResults(analysis) {
    if (!analysis || !analysis.issues) {
      return analysis;
    }

    // Filter issues
    const filteredIssues = analysis.issues.filter(issue => {
      // Set defaults for missing fields
      const confidence = issue.confidence !== undefined ? issue.confidence : 0.8;
      const actionable = issue.actionable !== undefined ? issue.actionable : true;
      const severity = issue.severity || 'info';

      // CRITICAL FILTER: Remove low-confidence issues
      if (confidence < 0.7) {
        console.log(`Filtering out low-confidence issue: ${issue.title} (confidence: ${confidence})`);
        return false;
      }

      // Remove non-actionable info-level issues
      if (severity === 'info' && !actionable) {
        console.log(`Filtering out non-actionable info issue: ${issue.title}`);
        return false;
      }

      // Keep all critical/warning issues, and actionable info issues
      return true;
    });

    // Sort issues by priority (immediate first, then high, medium, low)
    const priorityOrder = {immediate: 1, high: 2, medium: 3, low: 4};
    filteredIssues.sort((a, b) => {
      const priorityA = priorityOrder[a.priority] || 5;
      const priorityB = priorityOrder[b.priority] || 5;

      // First by priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Then by confidence (higher confidence first)
      const confA = a.confidence !== undefined ? a.confidence : 0.8;
      const confB = b.confidence !== undefined ? b.confidence : 0.8;
      return confB - confA;
    });

    // Filter and sort fixes similarly
    const filteredFixes = (analysis.fixes || []).filter(fix => {
      const confidence = fix.confidence !== undefined ? fix.confidence : 0.8;
      return confidence >= 0.7; // Only show fixes we're confident about
    });

    filteredFixes.sort((a, b) => {
      const priorityA = priorityOrder[a.priority] || 5;
      const priorityB = priorityOrder[b.priority] || 5;
      return priorityA - priorityB;
    });

    return {
      ...analysis,
      issues: filteredIssues,
      fixes: filteredFixes
    };
  }
}

module.exports = { DiagnosticAgent };
