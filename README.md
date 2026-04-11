# Pilot

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Medal-Social/pilot/badge)](https://scorecard.dev/viewer/?uri=github.com/Medal-Social/pilot)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/12447/badge)](https://www.bestpractices.dev/projects/12447)
[![codecov](https://codecov.io/gh/Medal-Social/pilot/graph/badge.svg)](https://codecov.io/gh/Medal-Social/pilot)

**Your AI crew, ready to fly.**

Pilot is an open source, local-first AI CLI platform. One command gives you a full AI crew that knows your brand, creates content, manages your machine, and works across every AI tool you use.

Everything runs locally. Your data stays on your machine. Cloud connectivity is optional and only expands functionality — it's never required.

---

## Why Pilot Exists

Non-technical people — marketers, designers, founders — need AI that works for them without technical setup. They shouldn't need to understand Nix, npm, skills, MCP servers, or prompt engineering. They should just type what they want and get it done.

Pilot gives you an AI crew that:
- **Knows your brand** — voice, tone, products, guidelines
- **Sets up your machine** — one command, zero technical knowledge required
- **Creates content** — social posts, emails, campaigns, designs
- **Works everywhere** — same crew in Pilot, Claude Code, Codex, any AI tool
- **Stays private** — local-first, your data never leaves your machine unless you choose to connect

## Who It's For

- **Marketers** who want to create on-brand content without touching code
- **Designers** who want to publish directly from their design tools
- **Founders** who want best-practice dev tools without configuring them
- **Engineers** who want a consistent, declarative machine setup across all devices
- **Any team** that wants AI agents that actually know their business

## Principles

- **Local-first** — everything works offline. No account required. No cloud dependency.
- **Private by design** — your knowledge base, brand voice, and content stay on your machine. Nothing is sent anywhere unless you explicitly connect a cloud service.
- **Cloud-optional** — connect to your platform when you want: account sync, plugin registry, push updates, team knowledge sharing. Disconnect anytime.
- **Open source** — inspect the code, contribute plugins, fork for your own team. Curated plugin registry ensures quality.

---

## How It's Engineered

Pilot is built to be **brew-level stable** — install once, works forever, updates cleanly.

| Layer | Technology | Why |
|-------|-----------|-----|
| Terminal UI | React Ink | Same mental model as React, reusable components |
| Command routing | Commander.js | Battle-tested, automatic --help, used by Vercel CLI |
| AI | Vercel AI SDK + Claude | Streaming, tool calling, MCP, agent loops |
| Plugins | Custom system with plugin.toml | Curated registry, permission enforcement, MCP + slash commands |
| Build | tsup + @vercel/ncc | Dual CJS/ESM for packages, single binary for distribution |
| Testing | Vitest + ink-testing-library + E2E | TDD throughout, 80%+ coverage, quality gate on every PR |
| Linting | Biome (strict) | Fast, zero-config, production-grade rules |
| Versioning | Changesets | Multi-package versioning with auto-generated changelogs |
| CI/CD | GitHub Actions | Quality gate + automated releases |
| Machine setup | Nix (abstracted) | Declarative, reproducible, never exposed to users |

### Architecture

```
pilot/
├── packages/
│   ├── cli/              ← entry point, REPL, screens, components, AI layer
│   └── plugins/
│       ├── kit/          ← machine management (open source)
│       ├── sanity/       ← CMS integration
│       └── pencil/       ← design tool integration
├── tests/e2e/            ← end-to-end test suite
├── docs/specs/           ← design specs and implementation plans
└── scripts/              ← build, install, release scripts
```

### Local-First Architecture

Everything works offline. Your crew, plugins, knowledge base, and machine commands run locally with zero network calls. Cloud connectivity is a separate, optional layer that adds:

- Account sync (share crew config across devices)
- Plugin registry (browse and install new plugins)
- Push updates (new skills delivered to your crew)
- Team knowledge sharing (shared brand voice across your org)

None of these are required. Pilot is fully functional without them.

### Private by Design

- **Knowledge base** — stored at `~/.pilot/knowledge/`, never transmitted
- **Crew config** — local files, portable via AGENTS.md / CLAUDE.md
- **Telemetry** — local-only analytics (`~/.pilot/analytics/`), no remote reporting
- **Plugin permissions** — declared in plugin.toml, reviewed before install, enforced at runtime

### Portable AI Config

`pilot training` generates AGENTS.md and CLAUDE.md files that work in:
- Pilot REPL
- Claude Code (via `/pilot` skill)
- Codex
- Any MCP-aware AI tool

Your crew configuration is portable. Set it up once, use it everywhere.

---

## Quick Start

```bash
# Install
curl -fsSL pilot.medalsocial.com/install | sh

# Launch
pilot
```

---

## Commands

| Command | What it does |
|---------|-------------|
| `pilot` | Launch the cockpit — chat with your crew, see dashboard |
| `pilot up <template>` | One-click setup — install templates and skills |
| `pilot crew` | Manage your AI crew — skills, tools, specialists |
| `pilot training` | Knowledge base — teach your crew about your brand |
| `pilot plugins` | Browse and manage plugins |
| `pilot update` | Check for and apply updates |
| `pilot status` | Machine and system health |
| `pilot help` | Help reference |

---

## Feature Tracker

Status: **Pre-release** · Building v1

### Core Platform
| Feature | Status | Spec |
|---------|--------|------|
| Monorepo + toolchain (Turbo, Biome, Husky) | Done | [Plan](docs/plans/masterplan.md) |
| React Ink component library | Done | [Plan](docs/plans/masterplan.md) |
| Commander.js CLI routing | Done | [Plan](docs/plans/masterplan.md) |
| Design token system (from Pencil) | Done | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Structured logging + error system | Planned | [Plan](docs/plans/masterplan.md) |
| ErrorBoundary + crash recovery | Planned | [Plan](docs/plans/masterplan.md) |

### Onboarding & Setup
| Feature | Status | Spec |
|---------|--------|------|
| curl installer (single command) | Planned | [Plan](docs/plans/masterplan.md) |
| Welcome screen + crew introduction | Done | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Home screen (instruments dashboard) | Done | [Plan](docs/plans/02-screens.md) |
| REPL routing (Welcome → Home) | Done | [Plan](docs/plans/02-screens.md) |
| Machine detection + auto-config | Done | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Update flow (check, progress, what's new) | Done | [Plan](docs/plans/02-screens.md) |
| XDG Base Directory compliance | Planned | [Plan](docs/plans/masterplan.md) |

### AI & Crew
| Feature | Status | Spec |
|---------|--------|------|
| Vercel AI SDK integration (Claude) | Planned | [Plan](docs/plans/masterplan.md) |
| 5 crew leads (Brand, Marketing, Tech, CS, Sales) | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Auto-routing (natural language to right crew lead) | Planned | [Plan](docs/plans/masterplan.md) |
| AI retry + timeout + offline resilience | Planned | [Plan](docs/plans/masterplan.md) |
| AGENTS.md / CLAUDE.md generation | Planned | [Plan](docs/plans/masterplan.md) |

### Skill Deployment
| Feature | Status | Spec |
|---------|--------|------|
| ~/.pilot/skills/ structure | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Symlink to ~/.claude/skills/pilot | Planned | [Plan](docs/plans/masterplan.md) |
| CLAUDE.md routing injection | Planned | [Plan](docs/plans/masterplan.md) |
| Smart updates (manifest checksums) | Planned | [Plan](docs/plans/masterplan.md) |
| Tech Lead dev guide + AI best practices | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |

### Plugin System
| Feature | Status | Spec |
|---------|--------|------|
| Plugin manifest (plugin.toml + Zod) | Done | [Plan](docs/plans/masterplan.md) |
| Plugin registry (load, enable, disable, remove) | Done | [Plan](docs/plans/masterplan.md) |
| Plugins screen (split panel browse + manage) | Done | [Plan](docs/plans/02-screens.md) |
| Plugin sandboxing (permission enforcement) | Planned | [Plan](docs/plans/masterplan.md) |
| Contribution guidelines | Planned | [Plan](docs/plans/masterplan.md) |

### Training & Knowledge
| Feature | Status | Spec |
|---------|--------|------|
| Training screen (split panel sources) | Done | [Plan](docs/plans/02-screens.md) |
| Knowledge base (sources, articles, runs) | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Bi-directional source sync | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Config migration system | Planned | [Plan](docs/plans/masterplan.md) |

### pilot up (One-Click Setup)
| Feature | Status | Spec |
|---------|--------|------|
| Split-panel browse UI (All/Templates/Skills/Crew) | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Preflight checks | Planned | [Plan](docs/plans/masterplan.md) |
| Template install progress | Planned | [Plan](docs/plans/masterplan.md) |

### Distribution & Quality
| Feature | Status | Spec |
|---------|--------|------|
| tsup dual CJS/ESM build | Planned | [Plan](docs/plans/masterplan.md) |
| Single binary via ncc | Planned | [Plan](docs/plans/masterplan.md) |
| Changesets versioning | Planned | [Plan](docs/plans/masterplan.md) |
| GitHub Actions CI + release | Planned | [Plan](docs/plans/masterplan.md) |
| E2E test suite | Planned | [Plan](docs/plans/masterplan.md) |
| Shell completions (bash, zsh, fish) | Planned | [Plan](docs/plans/masterplan.md) |
| NO_COLOR / FORCE_COLOR support | Planned | [Plan](docs/plans/masterplan.md) |
| Local-only telemetry | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Themes (dark/light from design tokens) | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for plugin development guidelines and PR process.

---

## License

MIT
