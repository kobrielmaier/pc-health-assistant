/**
 * ChatAssistant - AI-powered conversational help for custom PC problems
 * Handles free-form questions and provides personalized troubleshooting
 */

const Anthropic = require('@anthropic-ai/sdk');
const AuditLogger = require('../utils/AuditLogger');

class ChatAssistant {
  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.auditLogger = new AuditLogger();
    this.conversationHistory = [];
  }

  /**
   * Send a message and get AI response
   */
  async chat(userMessage, systemContext = {}) {
    console.log('Chat message received:', userMessage);

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Build system prompt with context
    const systemPrompt = this.buildSystemPrompt(systemContext);

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192,
        temperature: 0,
        system: systemPrompt,
        messages: this.conversationHistory
      });

      const assistantMessage = response.content[0].text;

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage
      });

      // Log the interaction
      this.auditLogger.logChatInteraction(userMessage, assistantMessage);

      return {
        success: true,
        message: assistantMessage,
        conversationLength: this.conversationHistory.length
      };

    } catch (error) {
      console.error('Chat error:', error);
      return {
        success: false,
        error: error.message,
        message: "I'm having trouble responding right now. Please try again in a moment."
      };
    }
  }

  /**
   * Build system prompt with context about the PC and current state
   */
  buildSystemPrompt(context) {
    let diagnosticInfo = '';

    // Add diagnostic context if available
    if (context && context.results) {
      const { results } = context;

      diagnosticInfo = `\n\n🔍 CURRENT DIAGNOSTIC CONTEXT:
The PC Health Assistant app has just completed a diagnostic scan and found the following:

**Problem Being Diagnosed:** ${context.selectedProblem ? context.selectedProblem.title : 'General system scan'}

**Summary:** ${results.analysis?.summary || results.summary || 'Diagnostic completed'}

**Issues Found (${results.analysis?.issues?.length || results.issues?.length || 0}):**
${this.formatIssues(results.analysis?.issues || results.issues || [])}

**Recommended Fixes (${results.analysis?.fixes?.length || results.fixes?.length || 0}):**
${this.formatFixes(results.analysis?.fixes || results.fixes || [])}

IMPORTANT: The user can see these same issues and fixes on their screen right now. They may ask you questions about:
- What these issues mean in simple terms
- Whether they should apply a specific fix
- What a fix will do and if it's safe
- Which fix to apply first
- How to perform the fix steps
- What happens if they don't fix something

Answer their questions about these specific issues and fixes. You have full context of what the app found and recommended.`;
    }

    return `You are a friendly, patient PC tech support assistant helping someone troubleshoot their Windows computer.

YOUR PERSONALITY:
- Warm, empathetic, and encouraging
- Explain things in VERY simple terms (like talking to a family member)
- Break complex tasks into easy step-by-step instructions
- Never use jargon or technical terms without explaining them
- Always reassure the user that their problem is solvable

YOUR CAPABILITIES:
- Diagnose PC problems through conversation
- Guide users through fixes step-by-step
- Explain what went wrong and why
- Suggest preventive measures
- Know when a problem needs professional help
- Answer questions about diagnostic results and recommended fixes

CRITICAL RULES:
1. **Use simple language** - Pretend you're explaining to someone who's never used a computer before
2. **Be specific** - Give exact instructions (e.g., "Click the Start button in the bottom-left corner")
3. **One step at a time** - Don't overwhelm with too many steps at once
4. **Safety first** - Always warn about risky operations and suggest backups
5. **No assumptions** - Ask clarifying questions if you're not sure what they mean
6. **Reference diagnostic results** - When diagnostic context is available, use it to give specific answers

CONVERSATION STYLE:
- Start with empathy: "That sounds frustrating, let's figure this out together"
- Ask questions to understand: "Can you tell me more about when this started?"
- Confirm understanding: "So if I understand correctly, your computer..."
- Give encouragement: "Great! You're doing well. Now let's try..."
- Celebrate successes: "Perfect! That should fix it. Let me know how it goes."
${diagnosticInfo}

RESPONSE FORMAT:
- Keep responses concise (2-4 paragraphs max)
- Use bullet points for lists
- Use numbered steps for instructions
- Use emojis sparingly for emphasis (✅ ❌ ⚠️ 💡)

Remember: Your goal is to make the user feel supported and confident that their problem can be solved.`;
  }

  /**
   * Format issues for system prompt
   */
  formatIssues(issues) {
    if (!issues || issues.length === 0) return 'None detected';

    return issues.map((issue, i) =>
      `${i + 1}. [${issue.severity?.toUpperCase() || 'INFO'}] ${issue.title || issue.description}
   ${issue.description ? `   Description: ${issue.description}` : ''}
   ${issue.impact ? `   Impact: ${issue.impact}` : ''}`
    ).join('\n');
  }

  /**
   * Format fixes for system prompt
   */
  formatFixes(fixes) {
    if (!fixes || fixes.length === 0) return 'No automated fixes available';

    return fixes.map((fix, i) =>
      `${i + 1}. ${fix.title}
   Difficulty: ${fix.difficulty || 'Unknown'}
   Time: ${fix.howLong || fix.estimatedTime || 'Unknown'}
   ${fix.description ? `Description: ${fix.description}` : ''}
   Steps: ${fix.steps?.length || 0} steps
   ${fix.riskLevel ? `Risk Level: ${fix.riskLevel}` : ''}`
    ).join('\n');
  }

  /**
   * Clear conversation history (start fresh)
   */
  clearHistory() {
    this.conversationHistory = [];
    console.log('Conversation history cleared');
  }

  /**
   * Get conversation history
   */
  getHistory() {
    return this.conversationHistory;
  }
}

module.exports = { ChatAssistant };
