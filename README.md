# Pilot

[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/Medal-Social/Pilot/badge)](https://scorecard.dev/viewer/?uri=github.com/Medal-Social/Pilot)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/12447/badge)](https://www.bestpractices.dev/projects/12447)
[![codecov](https://codecov.io/gh/Medal-Social/Pilot/graph/badge.svg)](https://codecov.io/gh/Medal-Social/Pilot)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

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
| `pilot status --json` | Machine-readable JSON output (see [schema](#status---json)) |
| `pilot completions <shell>` | Generate shell completions (bash, zsh, fish) |
| `pilot help` | Help reference |

## Contributor Guardrails

- Use `pnpm install` only; the repo blocks other package managers.
- Commit with conventional commits; Husky runs `commitlint` on every commit message.
- Release-worthy changes must include a changeset via `pnpm changeset` unless the PR is explicitly internal-only.
- Do not commit generated `dist/` or `coverage/` output.
- AI-assisted changes are welcome, but PR descriptions and commits must explain intent in human-written terms and include tests for behavior changes.

### `status --json`

Outputs machine-readable JSON for scripting and CI:

```json
{
  "pilot": "0.1.5",
  "node": "v24.0.0",
  "platform": "darwin",
  "arch": "arm64"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pilot` | `string` | Installed Pilot version |
| `node` | `string` | Node.js version (with `v` prefix) |
| `platform` | `string` | OS platform (`darwin`, `linux`, `win32`) |
| `arch` | `string` | CPU architecture (`arm64`, `x64`) |

### Shell Completions

Generate tab-completion scripts for your shell:

```bash
# Bash — add to ~/.bashrc
pilot completions bash >> ~/.bashrc

# Zsh — add to ~/.zshrc
pilot completions zsh >> ~/.zshrc

# Fish — add to Fish completions
pilot completions fish > ~/.config/fish/completions/pilot.fish
```

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

### Admin
| Feature | Status | Spec | Description |
|---------|--------|------|-------------|
| Admin Dashboard | In Progress | [Spec](docs/superpowers/specs/2026-04-19-admin-dashboard-design.md) | CLI command center with health strip, tabbed panels, SDK-powered data |

### pilot up (One-Click Setup)
| Feature | Status | Spec |
|---------|--------|------|
| Hosted registry (fetch, cache, SHA verify, offline fallback) | Done | [Spec](docs/superpowers/specs/2026-04-21-pilot-up-registry-design.md) |
| Template manifest format (pkg/npm/mcp/skill steps, cross-platform) | Done | [Spec](docs/superpowers/specs/2026-04-21-pilot-up-registry-design.md) |
| `pilot up <template>` install flow with progress UI | Done | [Spec](docs/superpowers/specs/2026-04-21-pilot-up-registry-design.md) |
| `pilot up` browse UI (split-panel, categories) | Done | [Spec](docs/superpowers/specs/2026-04-21-pilot-up-registry-design.md) |
| `pilot down <template>` step-based uninstall | Done | [Spec](docs/superpowers/specs/2026-04-21-pilot-up-registry-design.md) |
| Specialist crew wiring on install | Done | [Spec](docs/superpowers/specs/2026-04-21-pilot-up-registry-design.md) |

### Distribution & Quality
| Feature | Status | Spec |
|---------|--------|------|
| tsup dual CJS/ESM build | Planned | [Plan](docs/plans/masterplan.md) |
| Single binary via ncc | Planned | [Plan](docs/plans/masterplan.md) |
| Changesets versioning | Planned | [Plan](docs/plans/masterplan.md) |
| GitHub Actions CI + release | Planned | [Plan](docs/plans/masterplan.md) |
| E2E test suite | Planned | [Plan](docs/plans/masterplan.md) |
| Shell completions (bash, zsh, fish) | Done | [Plan](docs/plans/masterplan.md) |
| NO_COLOR / FORCE_COLOR support | Done | [Plan](docs/plans/masterplan.md) |
| Local-only telemetry | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |
| Themes (dark/light from design tokens) | Planned | [Spec](docs/specs/2026-04-09-pilot-cli-v2-design.md) |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for plugin development guidelines and PR process.

---

## License

Apache-2.0
