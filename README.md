# Tiara - AI Orchestration Layer

> **Tiara** is the orchestration layer for [agent-core](https://github.com/adolago/agent-core), vendored as a submodule. Based on [claude-flow](https://github.com/ruvnet/claude-flow).

<div align="center">

[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.1.20260112-blue?style=for-the-badge)](https://github.com/adolago/tiara)

</div>

## Overview

**Tiara** provides SPARC methodology, swarm coordination, and memory systems for agent-core. It powers the orchestration of the Personas triad (Zee, Stanley, Johny).


📚 **Release Notes**: [v2.7.0-alpha.10](./docs/RELEASE-NOTES-v2.7.0-alpha.10.md)


**Documentation**: `docs/agentdb/PRODUCTION_READINESS.md` | **PR**: #830

---

📚 **Full Reference**: [MCP Tools Documentation](./docs/MCP-TOOLS.md)

---

### **Available Hooks**

**Pre-Operation:**
- `pre-task`: Auto-assigns agents by complexity
- `pre-edit`: Validates files and prepares resources
- `pre-command`: Security validation

**Post-Operation:**
- `post-edit`: Auto-formats code
- `post-task`: Trains neural patterns
- `post-command`: Updates memory

**Session Management:**
- `session-start`: Restores previous context
- `session-end`: Generates summaries
- `session-restore`: Loads memory

---

## 📚 **Documentation**

### **📖 Core Documentation**
- **[Documentation Hub](./docs/)** - Complete documentation index with organized structure
- **[Skills Tutorial](./docs/guides/skills-tutorial.md)** - Complete guide to 25 Claude Flow skills with natural language invocation
- **[Installation Guide](./docs/INSTALLATION.md)** - Setup instructions
- **[Memory System Guide](./docs/MEMORY-SYSTEM.md)** - ReasoningBank + AgentDB hybrid
- **[MCP Tools Reference](./docs/MCP-TOOLS.md)** - Complete tool catalog
- **[Agent System](./docs/AGENT-SYSTEM.md)** - All 64 agents

### **🚀 Release Notes & Changelogs**
- **[v2.7.1](./docs/releases/v2.7.1/)** - Current stable release with critical fixes
- **[v2.7.0-alpha.10](./docs/releases/v2.7.0-alpha.10/)** - Semantic search fix
- **[v2.7.0-alpha.9](./docs/releases/v2.7.0-alpha.9/)** - Process cleanup
- **[Changelog](./CHANGELOG.md)** - Full version history


### **🛠️ Advanced Topics**
- **[Neural Module](./docs/NEURAL-MODULE.md)** - SAFLA self-learning
- **[Goal Module](./docs/GOAL-MODULE.md)** - GOAP intelligent planning
- **[Hive-Mind Intelligence](./docs/HIVE-MIND.md)** - Queen-led coordination
- **[GitHub Integration](./docs/GITHUB-INTEGRATION.md)** - Repository automation

### **⚙️ Configuration & Setup**
- **[CLAUDE.md Templates](./docs/CLAUDE-MD-TEMPLATES.md)** - Project configs
- **[SPARC Methodology](./docs/SPARC.md)** - TDD patterns
- **[Windows Installation](./docs/windows-installation.md)** - Windows setup

---

## 🤝 **Community & Support**

- **GitHub Issues**: [Report bugs or request features](https://github.com/ruvnet/claude-flow/issues)
- **Discord**: [Join the Agentics Foundation community](https://discord.com/invite/dfxmpwkG2D)
- **Documentation**: [Complete guides and tutorials](https://github.com/ruvnet/claude-flow/wiki)
- **Examples**: [Real-world usage patterns](https://github.com/ruvnet/claude-flow/tree/main/examples)

---

## 📄 **License**

MIT License - see [LICENSE](./LICENSE) for details

---

**Forked from [claude-flow](https://github.com/ruvnet/claude-flow) by [rUv](https://github.com/ruvnet) | Adapted for agent-core**

*v0.1.20260112 - Agent-Core Integration*

</div>
