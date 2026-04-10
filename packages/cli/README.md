# @medalsocial/pilot

**Your AI crew, ready to fly.**

Pilot is an AI-powered CLI platform by Medal Social. One command gives you a full AI crew that knows your brand, creates content, manages your machine, and works across every AI tool you use.

Everything runs locally. Your data stays on your machine.

## Install

```bash
npm install -g @medalsocial/pilot
```

## Usage

```bash
# Launch the cockpit
pilot

# One-click machine setup
pilot up <template>

# Manage your AI crew
pilot crew

# Teach your crew about your brand
pilot training

# Browse and manage plugins
pilot plugins

# Check for updates
pilot update

# System health
pilot status
```

## Commands

| Command | Description |
|---------|-------------|
| `pilot` | Launch the cockpit — chat with your crew, see dashboard |
| `pilot up <template>` | One-click setup — install templates and skills |
| `pilot crew` | Manage your AI crew — skills, tools, specialists |
| `pilot training` | Knowledge base — teach your crew about your brand |
| `pilot plugins` | Browse and manage plugins |
| `pilot update` | Check for and apply updates |
| `pilot status` | Machine and system health |
| `pilot help` | Help reference |

## How It Works

Pilot gives you five AI crew leads, each specialized in a domain:

- **Brand Lead** — voice, tone, style, guidelines
- **Marketing Lead** — social posts, campaigns, email, content
- **Tech Lead** — build, deploy, scaffold, code review
- **CS Lead** — support tickets, customer issues
- **Sales Lead** — outreach, pipeline

Ask anything in natural language and Pilot routes to the right crew member automatically.

## Key Features

- **Local-first** — works offline, no account required
- **Private by design** — your data never leaves your machine
- **Cloud-optional** — connect for sync, registry, team sharing
- **Portable config** — generates AGENTS.md and CLAUDE.md for use in Claude Code, Codex, and more
- **Plugin system** — extend with community or custom plugins

## Plugin System

Pilot supports plugins declared via `plugin.toml` with permission enforcement:

- `@medalsocial/kit` — machine management
- `@medalsocial/sanity` — CMS integration
- `@medalsocial/pencil` — design tool integration

## Links

- [GitHub](https://github.com/Medal-Social/pilot)
- [Issues](https://github.com/Medal-Social/pilot/issues)

## License

MIT
