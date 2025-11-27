# PC Health Assistant

AI-powered computer diagnostics and repair tool that helps non-technical users fix their PC issues automatically.

## 🎯 Problem We're Solving

- **Expensive tech support**: Geek Squad charges $100+ per visit
- **Long wait times**: Need appointments, can take days
- **Complexity**: Most people don't know how to diagnose/fix PC issues
- **Trust issues**: Concerns about data theft and privacy

## 💡 Our Solution

An AI assistant that:
- Autonomously investigates computer problems
- Explains issues in plain English
- Fixes problems with one click (user approval required)
- Works 24/7, instantly available
- Costs a fraction of traditional tech support

## 🏗️ Architecture

```
pc-health-assistant/
├── src/
│   ├── main/              # Electron main process
│   ├── renderer/          # React frontend UI
│   ├── agents/            # AI diagnostic agents
│   │   ├── playbooks/     # Investigation playbooks
│   │   └── investigators/ # Specific diagnostic modules
│   ├── system/            # System access layer
│   ├── safety/            # Safety guardrails
│   └── utils/             # Utilities
├── public/                # Static assets
└── docs/                  # Documentation

```

## 🚀 Features (MVP)

### Phase 1 - Diagnostics
- [x] Problem category selection
- [ ] Autonomous crash investigation
- [ ] Driver version checking
- [ ] Disk space analysis
- [ ] Plain English results

### Phase 2 - Automated Fixes
- [ ] One-click driver updates
- [ ] Cache clearing
- [ ] Software reinstallation
- [ ] Restore point creation
- [ ] Rollback capability

### Phase 3 - Advanced
- [ ] Performance optimization
- [ ] Malware scanning
- [ ] Startup program management
- [ ] System health monitoring

## 🛡️ Safety Features

- **Read-only investigation** (no approval needed)
- **User approval required** for all system changes
- **Automatic restore points** before major changes
- **Rollback capability** if fixes fail
- **Audit logging** of all actions
- **Hard limits** on dangerous operations

## 💻 Tech Stack

- **Frontend**: React + Tailwind CSS
- **Desktop**: Electron
- **AI**: Claude API (Anthropic)
- **System Access**: Node.js native modules + PowerShell
- **Storage**: electron-store (local data)

## 🎯 Target Market

- Non-technical users (elderly, students, general consumers)
- Small businesses without IT support
- Remote workers managing their own tech
- Anyone frustrated with expensive tech support

## 📊 Business Model

**Freemium**:
- Free: Unlimited diagnostics + manual fix instructions
- Premium ($9.99/month): Automated one-click fixes

**Alternative**: Pay-per-fix ($4.99 per fix)

## 🏁 Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## 📝 License

MIT

## 🤝 Contributing

This is currently a private project. Contact the maintainers for collaboration opportunities.
