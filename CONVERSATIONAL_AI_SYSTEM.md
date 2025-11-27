# Conversational AI Diagnostic System

## Overview

The PC Health Assistant now uses a **conversational AI system** that works like chatting with a real tech support expert. Instead of pre-defined diagnostic scans, the AI investigates problems step-by-step, asks follow-up questions, and provides fixes with full user approval.

## How It Works

### 1. **Conversational Investigation**
- User describes their problem in natural language
- AI investigates using diagnostic tools (event logs, disk health, drivers, etc.)
- AI explains what it's checking in simple terms
- AI asks follow-up questions to narrow down the problem

### 2. **Step-by-Step Diagnosis**
- AI runs ONE diagnostic at a time (not everything at once)
- Shows progress: "Checking disk health..." "Analyzing event logs..."
- Cross-references multiple data sources before concluding
- **Prevents false positives** by verifying findings

### 3. **Safe Fix Execution**
- AI proposes fixes with clear explanations
- User must approve before any changes are made
- Automatic restore points for medium/high risk fixes
- Step-by-step progress tracking
- Rollback available if needed

## Architecture

```
User Input
    ↓
ConversationalDiagnosticAgent.js
    ├─ Uses Anthropic's tool-calling API
    ├─ Has access to diagnostic tools:
    │  ├─ check_event_logs
    │  ├─ check_disk_health (SMART data)
    │  ├─ check_system_resources
    │  ├─ check_drivers
    │  ├─ check_network
    │  ├─ run_powershell_diagnostic (read-only)
    │  └─ propose_fix (requires approval)
    ↓
FixExecutor.js
    ├─ Safety checks (dangerous command detection)
    ├─ Admin privilege verification
    ├─ Automatic restore point creation
    ├─ Step-by-step command execution
    └─ Progress reporting
```

## Key Features

### **Accuracy & Safety**

1. **SMART Data Priority**
   - Always checks SMART disk health before diagnosing disk issues
   - Ignores old event log errors if SMART shows healthy
   - Cross-references multiple data sources

2. **Time-Based Filtering**
   - Event logs include `isRecent` and `daysAgo` fields
   - Only reports issues with current evidence
   - Ignores single old errors

3. **Interactive Verification**
   - AI can run follow-up checks to confirm findings
   - Multi-turn reasoning like a real technician
   - Adapts based on what it discovers

### **User Protection**

1. **Safety Guardrails**
   - Dangerous commands are blocked (format, delete system files, etc.)
   - All fixes require explicit user approval
   - Automatic restore points for risky changes
   - Admin privilege checks

2. **Transparency**
   - Shows exactly what it's checking
   - Explains why each diagnostic is needed
   - Displays commands before execution
   - Progress tracking for all operations

3. **Rollback Support**
   - Restore points created automatically
   - Easy rollback if something goes wrong
   - Verification after each fix

## Usage

### For Users:

1. Click "💬 AI Assistant" in the header
2. Describe your problem in natural language:
   - "My computer is really slow"
   - "Valorant keeps crashing after 5 minutes"
   - "I'm getting a lot of error messages"
3. Answer AI's follow-up questions
4. Review and approve proposed fixes
5. AI executes fixes step-by-step
6. Test if the problem is resolved

### For Developers:

#### Adding New Diagnostic Tools:

```javascript
// In ConversationalDiagnosticAgent.js

// 1. Add tool definition
{
  name: 'check_my_new_thing',
  description: 'What this tool checks',
  input_schema: {
    type: 'object',
    properties: {
      param: { type: 'string' }
    }
  }
}

// 2. Add tool execution
async executeTool(toolName, input) {
  switch (toolName) {
    case 'check_my_new_thing':
      return await this.checkMyNewThing(input);
  }
}

// 3. Implement the check
async checkMyNewThing(input) {
  // Your diagnostic logic here
  return {
    summary: 'What was found',
    data: []
  };
}
```

#### Updating the AI Prompt:

Edit `getSystemPrompt()` in `ConversationalDiagnosticAgent.js`:
- Add new critical rules
- Update verification procedures
- Adjust communication style
- Add domain-specific knowledge

## Comparison: Old vs New System

| Feature | Old System | New System |
|---------|-----------|------------|
| **Investigation** | Pre-defined playbooks | Dynamic, conversational |
| **Processing** | Batch (all at once) | Interactive (step-by-step) |
| **Analysis** | One-shot | Multi-turn reasoning |
| **Verification** | None | Cross-references data |
| **False Positives** | Common | Rare (verifies findings) |
| **User Interaction** | Click & wait | Conversational dialog |
| **Fix Approval** | Static list | Contextual proposals |
| **Adaptability** | Fixed steps | Adapts to findings |

## Key Components

### 1. ConversationalDiagnosticAgent.js
- Main AI agent using Anthropic's Claude API
- Implements tool-calling for diagnostics
- Handles multi-turn conversations
- Manages investigation state

### 2. FixExecutor.js
- Executes approved fixes safely
- Creates restore points
- Validates commands
- Tracks progress
- Provides rollback capability

### 3. ConversationalDiagnostic.jsx
- React component for chat UI
- Displays messages and tool activity
- Shows fix proposals and progress
- Handles user input

### 4. IPC Handlers (main/index.js)
- `conversational-chat`: Process user messages
- `execute-approved-fix`: Run approved fixes
- `rollback-fix`: Undo changes
- `reset-conversation`: Start over

## System Prompt Highlights

The AI is instructed to:

1. **Think like a technician**
   - Investigate methodically
   - Ask clarifying questions
   - Explain findings simply
   - Verify before diagnosing

2. **Be accurate**
   - SMART data > Event logs
   - Check timestamps
   - Cross-reference sources
   - Only report real problems

3. **Be friendly**
   - Use simple language
   - Explain jargon
   - Be patient and encouraging
   - "Don't worry, let's figure this out together"

4. **Be safe**
   - Never modify without approval
   - Explain risks
   - Create restore points
   - Provide rollback instructions

## Testing

To test the conversational system:

1. Start the app: `npm run dev`
2. Click "💬 AI Assistant"
3. Try these test cases:

### Test Case 1: Disk Health (Should NOT report failure)
```
User: "My computer is slow"
AI: Will check system resources, disk health
Expected: Should verify SMART data shows disk is healthy
```

### Test Case 2: Follow-up Questions
```
User: "My games crash"
AI: "Which game crashes most often?"
User: "Valorant"
AI: Will investigate that specific game
```

### Test Case 3: Fix Approval
```
User: "My startup is slow"
AI: Proposes to disable startup programs
User: Must approve before execution
AI: Executes step-by-step with progress
```

## Future Enhancements

1. **Fix History & Learning**
   - Track which fixes worked
   - Learn from user feedback
   - Suggest similar fixes for similar problems

2. **Automated Testing**
   - Verify fixes actually work
   - Check for side effects
   - Monitor system after changes

3. **More Tools**
   - Memory diagnostics
   - GPU stress tests
   - Network speed tests
   - Malware scanning

4. **Better UI**
   - Fix approval modal with detailed info
   - Progress visualization
   - Before/after comparisons
   - Fix success rate statistics

## Troubleshooting

### AI gives wrong diagnosis
- Check system prompt in `getSystemPrompt()`
- Verify investigators are returning correct data
- Look at console logs to see tool outputs

### Fix execution fails
- Check `FixExecutor.js` safety checks
- Verify admin privileges
- Look at fix progress messages
- Check PowerShell command syntax

### Tools not working
- Verify IPC handlers in `main/index.js`
- Check preload.js exposes methods
- Look for errors in console
- Test investigators individually

## Security Notes

**Read-only Diagnostics:**
- All diagnostic tools are read-only
- `run_powershell_diagnostic` blocks dangerous commands
- No system modifications without approval

**Fix Execution:**
- Dangerous commands are blocked by regex patterns
- Admin check before execution
- Restore points created automatically
- User approval required for ALL changes

**Command Validation:**
- Whitelist approach for diagnostic commands
- Blacklist for dangerous operations
- Syntax validation before execution
- Timeout protection

## Contributing

To improve the conversational system:

1. Add new tools in `ConversationalDiagnosticAgent.js`
2. Enhance system prompt for better accuracy
3. Add more safety checks in `FixExecutor.js`
4. Improve UI/UX in `ConversationalDiagnostic.jsx`
5. Add more investigators for specific hardware/software

## License

Same as main project - see LICENSE file.
