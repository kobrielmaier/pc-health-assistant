# Getting Started with PC Health Assistant

Welcome! This guide will walk you through setting up and running the PC Health Assistant.

## 📋 Prerequisites

Before you begin, make sure you have:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Check version: `node --version`

2. **npm** (comes with Node.js)
   - Check version: `npm --version`

3. **Claude API Key** (from Anthropic)
   - Sign up at: https://console.anthropic.com/
   - You'll need this for the AI diagnostics to work

## 🚀 Setup Instructions

### Step 1: Install Dependencies

Open a terminal in the project directory and run:

```bash
cd C:\Users\kobri\pc-health-assistant
npm install
```

This will install:
- Electron (desktop app framework)
- React (UI library)
- Vite (build tool)
- Claude AI SDK
- All other dependencies

### Step 2: Set Up API Key

Create a file named `.env` in the project root:

```bash
# .env file
ANTHROPIC_API_KEY=your-api-key-here
```

Replace `your-api-key-here` with your actual Claude API key.

### Step 3: Run the Application

Development mode (with hot-reload):

```bash
npm run dev
```

This will:
1. Start the Vite dev server (React frontend)
2. Launch the Electron window
3. Enable auto-reload when you make code changes

## 🏗️ Project Structure

```
pc-health-assistant/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.js       # App entry point
│   │   └── preload.js     # Secure IPC bridge
│   │
│   ├── renderer/          # React frontend
│   │   ├── App.jsx        # Main UI component
│   │   └── App.css        # Styling
│   │
│   ├── agents/            # AI diagnostic system
│   │   ├── DiagnosticAgent.js          # Core agent
│   │   ├── playbooks/                  # Investigation plans
│   │   │   └── index.js                # All playbooks
│   │   └── investigators/              # Specific diagnostics
│   │       ├── CrashDumpInvestigator.js
│   │       ├── DriverInvestigator.js
│   │       ├── EventLogInvestigator.js
│   │       └── DiskInvestigator.js
│   │
│   ├── safety/            # Safety guardrails
│   │   └── SafetyGuard.js # Prevents dangerous operations
│   │
│   └── utils/             # Utility functions
│
├── public/                # Static assets
├── docs/                  # Documentation
├── package.json           # Dependencies & scripts
└── README.md              # Project overview
```

## 🧪 How It Works

### 1. User Selects Problem

User clicks on a problem type (e.g., "Program keeps crashing")

### 2. Autonomous Investigation

The DiagnosticAgent:
- Loads the appropriate playbook for that problem
- Executes all investigation steps automatically
- Searches known locations for crash dumps, logs, etc.
- **No user input needed during investigation!**

### 3. AI Analysis

Investigation results are sent to Claude AI which:
- Analyzes all the data
- Identifies root causes
- Suggests specific fixes
- Returns results in plain English

### 4. User Approves Fix

The SafetyGuard:
- Shows user exactly what will be done
- Creates restore point for risky fixes
- Executes fix with monitoring
- Rolls back if anything fails

## 🔧 Customization

### Adding New Problem Types

1. Create a new playbook in `src/agents/playbooks/index.js`:

```javascript
const MY_NEW_PLAYBOOK = {
  name: "My Problem Investigation",
  description: "Investigates my specific problem",
  steps: [
    {
      action: "checkSomething",
      description: "Check something specific",
      config: { ... }
    }
  ]
};
```

2. Add it to the exports and to `DiagnosticAgent.getPlaybook()`

3. Create a new investigator if needed in `src/agents/investigators/`

### Adding New Investigators

Create a new file in `src/agents/investigators/`:

```javascript
class MyInvestigator {
  constructor() {
    this.name = 'MyInvestigator';
  }

  async investigate(step, options = {}) {
    // Your investigation logic here
    return {
      findings: [],
      recommendations: []
    };
  }
}

module.exports = { MyInvestigator };
```

## 🛡️ Safety Features

The Safety Guard prevents:
- ❌ Deleting user files
- ❌ Formatting drives
- ❌ Disabling security software
- ❌ Modifying BIOS
- ❌ Any operation in the FORBIDDEN_OPERATIONS list

It ensures:
- ✅ All changes require user approval
- ✅ Restore points for risky operations
- ✅ Automatic rollback on failure
- ✅ Full audit logging

## 📝 Next Steps

### For Development:

1. **Test with a real problem**
   - Run the app
   - Select "Program/Game Keeps Crashing"
   - See the investigation in action

2. **Add more investigators**
   - Start with simple ones (RAM usage, temp files, etc.)
   - Gradually add more complex ones

3. **Improve the AI prompts**
   - The quality of Claude's analysis depends on the prompt
   - Experiment in `DiagnosticAgent.buildAnalysisPrompt()`

4. **Build the fix execution**
   - Right now it's mostly scaffolding
   - Implement actual fix steps (driver updates, cache clearing, etc.)

### For Launch:

1. **Get Beta Testers**
   - Find 10-20 non-technical users
   - Have them try it with real problems
   - Gather feedback

2. **Build Installers**
   - `npm run build` creates distribution files
   - Use electron-builder for Windows/Mac/Linux installers

3. **Set Up Analytics**
   - Track which problems are most common
   - See which fixes work best
   - Identify areas for improvement

4. **Create Marketing Materials**
   - Website
   - Demo video
   - Before/after examples

## 🐛 Troubleshooting

**App won't start:**
- Make sure Node.js is installed: `node --version`
- Delete `node_modules` and run `npm install` again
- Check console for error messages

**API errors:**
- Verify your `.env` file has the correct API key
- Check your Anthropic account has credits
- Look at network tab in DevTools

**Permissions errors:**
- Some operations need admin rights
- Right-click app → "Run as administrator"

## 📚 Resources

- Electron Docs: https://www.electronjs.org/docs
- React Docs: https://react.dev/
- Claude API Docs: https://docs.anthropic.com/
- Node.js Docs: https://nodejs.org/docs/

## 💡 Ideas for Future Features

- [ ] macOS and Linux support
- [ ] Scheduled automatic health scans
- [ ] Performance optimization tools
- [ ] Malware scanning integration
- [ ] Remote assistance mode
- [ ] Cloud backup of diagnostics
- [ ] Mobile app companion
- [ ] Browser extension for quick access

## 🤝 Contributing

This is currently a private project, but contributions ideas are welcome!

---

**Ready to help millions of people fix their computers? Let's go! 🚀**
