# Pilot

**Your AI crew, ready to fly.**

Pilot is Medal Social's AI-powered CLI platform. One command gives you a full AI crew that knows your brand, creates content, manages your machine, and works across every AI tool you use.

---

## Why Pilot Exists

Non-technical people — marketers, designers, founders — need AI that works for them without technical setup. They shouldn't need to understand Nix, npm, MCP servers, or prompt engineering. They should just type what they want and get it done.

Pilot gives every Medal Social team member an AI crew that:
- **Knows your brand** — voice, tone, products, guidelines
- **Sets up your machine** — one command, zero technical knowledge required
- **Creates content** — social posts, emails, campaigns, designs
- **Works everywhere** — same crew in Pilot, Claude Code, Codex, any AI tool

## Who It's For

- **Marketers** who want to create on-brand content without touching code
- **Designers** who use Pencil and want to publish directly to medalsocial.com
- **Founders** who want best-practice dev tools without configuring them
- **Engineers** who want a consistent, declarative machine setup across all devices
- **Any Medal Social team member** who wants AI that actually knows their business

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
| Linting | Biome (strict) | Fast, zero-config, matches medal-monorepo standards |
| Versioning | Changesets | Multi-package versioning with auto-generated changelogs |
| CI/CD | GitHub Actions | Quality gate + automated releases |
| Machine setup | Nix (abstracted) | Declarative, reproducible, never exposed to users |

### Architecture

```
pilot/
├── packages/
│   ├── cli/              ← entry point, REPL, screens, components, AI layer
│   └── plugins/
│       ├── kit/          ← @medalsocial/kit (machine management)
│       ├── sanity/       ← @medalsocial/sanity (CMS integration)
│       └── pencil/       ← @medalsocial/pencil (design tools)
├── tests/e2e/            ← end-to-end test suite
├── docs/specs/           ← design specs and implementation plans
└── scripts/              ← build, install, release scripts
```

### Local-First, Cloud-Connected

Everything works offline. Your crew, plugins, knowledge base, and machine commands run locally. When connected to Medal Social, you get: account sync, plugin registry, push updates, team knowledge sharing.

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
| `pilot plugins` | Browse and manage @medalsocial plugins |
| `pilot update` | Check for and apply updates |
| `pilot status` | Machine and system health |
| `pilot help` | Help reference |

---

## Feature Tracker

Status: **Pre-release** · Building v1

### Core Platform
| Feature | Status | Spec |
|---------|--------|------|
| Monorepo + toolchain (Turbo, Biome, Husky) | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| React Ink component library | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Commander.js CLI routing | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Design token system (from Pencil) | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Structured logging + error system | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| ErrorBoundary + crash recovery | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |

### Onboarding & Setup
| Feature | Status | Spec |
|---------|--------|------|
| curl installer (single command) | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Welcome screen + crew introduction | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Machine detection + auto-config | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| XDG Base Directory compliance | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |

### AI & Crew
| Feature | Status | Spec |
|---------|--------|------|
| Vercel AI SDK integration (Claude) | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| 5 crew leads (Brand, Marketing, Tech, CS, Sales) | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Auto-routing (natural language → right crew lead) | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| AI retry + timeout + offline resilience | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| AGENTS.md / CLAUDE.md generation | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |

### Skill Deployment
| Feature | Status | Spec |
|---------|--------|------|
| ~/.pilot/skills/ structure | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Symlink to ~/.claude/skills/pilot | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| CLAUDE.md routing injection | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Smart updates (manifest checksums) | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Tech Lead dev guide + AI best practices | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |

### Plugin System
| Feature | Status | Spec |
|---------|--------|------|
| Plugin manifest (plugin.toml + Zod) | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Plugin registry (load, enable, disable, remove) | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Plugin sandboxing (permission enforcement) | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| @medalsocial/kit plugin | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| @medalsocial/sanity plugin | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| @medalsocial/pencil plugin | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Contribution guidelines | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |

### Training & Knowledge
| Feature | Status | Spec |
|---------|--------|------|
| Knowledge base (sources, articles, runs) | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Bi-directional source sync | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Config migration system | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |

### pilot up (One-Click Setup)
| Feature | Status | Spec |
|---------|--------|------|
| Split-panel browse UI (All/Templates/Skills/Crew) | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Preflight checks (pencil, remotion, nextmedal) | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| nextmedal as Tech Lead skill | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Template install progress | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |

### Distribution & Quality
| Feature | Status | Spec |
|---------|--------|------|
| tsup dual CJS/ESM build | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Single binary via ncc | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Changesets versioning | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| GitHub Actions CI + release | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| E2E test suite | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Proxy support | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Shell completions (bash, zsh, fish) | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| NO_COLOR / FORCE_COLOR support | Planned | [Plan](docs/specs/plans/2026-04-09-pilot-cli-v2.md) |
| Local-only telemetry | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Themes (dark/light from Pencil tokens) | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for plugin development guidelines and PR process.

---

## License

Private. Medal Social LLC.
