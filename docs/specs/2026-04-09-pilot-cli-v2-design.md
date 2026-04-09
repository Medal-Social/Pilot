# Pilot CLI v2 — Design Spec

> **Status:** Draft · April 9, 2026
> **Author:** Ali
> **Design file:** `05-cli.pen`
> **For agentic workers:** Use `superpowers:subagent-driven-development` to implement this plan task-by-task.

---

## What Pilot Is

Pilot is Medal Social's AI-powered CLI platform. It runs locally first and syncs with medalsocial.com when connected. The primary users are non-technical marketers and designers who need to set up their machines, create content, and manage brand voice.

Pilot is also an extensible platform. Plugins bridge Medal Social into Claude Code, Codex, and any MCP-aware AI tool via the `/pilot` skill. When you configure your crew in Pilot, it generates portable CLAUDE.md / AGENTS.md files that work across every AI tool.

**Tagline:** Your AI crew, ready to fly.

---

## Core Commands

| Command | Purpose |
|---------|---------|
| `pilot` | Main REPL — the cockpit. Chat, auto-routing, instruments dashboard |
| `pilot up <template>` | One-click setup. Install templates, skills, crew bindings |
| `pilot crew` | Manage AI agents. Assign skills, configure tools, add/remove specialists |
| `pilot training` | Knowledge base. Feed brand voice, docs, style guides. Generates AGENTS.md |
| `pilot plugins` | Extension system. Browse, install, disable/remove @medalsocial/ plugins |
| `pilot update` | Self-update. Benefit-oriented changelog, no version numbers |
| `pilot help` | Help and available commands |
| `pilot status` | Machine and system health |

---

## Design Principles

1. **Never expose technical internals** — no package manager names (Nix, npm, apt), no file paths, no checksums, no version strings. Users see outcomes, not operations.
2. **Frame every step as a benefit** — "Preparing your AI agents" not "Downloading binary." Every line answers: "What is Pilot doing for me?"
3. **Aviation metaphor** — crew, flight, cockpit, takeoff. Updates are "flight system upgrades." Completion is "ready for takeoff."
4. **Medal-branded names** — `pilot up nextmedal` not `pilot up nextjs`. `pilot up pencil` not `pilot up figma-plugin`.
5. **Skills show crew bindings** — "SEO optimization guide → Marketing Lead" not just "SEO loaded." Never floating abstractions.
6. **Local-first, cloud-connected** — everything works offline. Medal Social account adds sync, push updates, team sharing.
7. **Curated plugin ecosystem** — @medalsocial/ official plugins. Community plugins added via PR with review. Ali controls the registry.
8. **Time-to-value < 60s** — first run to first productive interaction in under a minute.
9. **Portable AI config** — `pilot training` generates CLAUDE.md / AGENTS.md consumed by Claude Code, Codex, Pilot REPL, any MCP-aware tool. `/pilot` as a skill in other AI tools.
10. **Auto-detect installed agents** — skill deployment scans for installed AI agents (Claude Code, Cursor, Windsurf, Cline, Codex) and deploys to all of them automatically. No prompt asking which agents — just deploy and report what was found.
11. **Inform, don't interrogate** — minimize Y/N prompts. Non-technical users shouldn't be gatekeepers of their own intent. Only confirm destructive actions (remove, delete). For everything else, act and show an undo path.

---

## Architecture

### Local (always works)
- React Ink terminal UI
- Commander.js routing
- Plugin system (MCP servers + slash commands)
- Machine setup (Nix, abstracted behind `pilot up`)
- Knowledge base (local files)
- Crew config (local)

### Cloud (when connected to Medal Social)
- Account sync
- Plugin registry (browse + install)
- Push updates (new tools, skills)
- Sanity CMS, Linear, Vercel APIs
- Team knowledge sharing

### AI Layer
- **Vercel AI SDK** (same as medal-monorepo) — streaming, agent loop, tool calling, MCP
- **Claude** via `@ai-sdk/anthropic` — primary model
- **MCP** — integration layer for plugins (Pencil, Sanity, etc.)
- **Auto-routing** — root agent uses AGENTS.md training to route requests to the right crew member automatically

---

## Flow 1 — Installation & Onboarding

From zero to first productive interaction. 6 screens, 2 phases.

### Design Requirements
1. Never expose package manager names
2. Never show file paths or system locations
3. Never show checksums, hashes, or version strings
4. Frame every step as a benefit
5. Progress indicators must feel purposeful
6. Completion should feel celebratory ("ready for takeoff")

### Phase 1 — Download & Install

**Screen 1: curl install**
- User runs: `curl -fsSL pilot.medalsocial.com/install | sh`
- Hint: "Press Enter to install Pilot..."

**Screen 2: Installing**
- "Setting up your workspace..."
- Checklist with benefit labels:
  - ✓ Preparing your AI agents
  - ✓ Loading skills & automations
  - ✓ Securing your environment
  - ⠸ Optimizing your machine for performance...
- Progress bar + "Almost ready..."

**Screen 3: Install Complete**
- All checks green
- "✈ Pilot is ready for takeoff!"
- "Run `pilot` to start your first flight"

### Phase 2 — First Run & Onboarding

**Screen 4: Welcome Aboard**
- PILOT logo (large, purple)
- "Welcome aboard, Captain."
- Crew introduction:
  - Brand Lead — learns your voice, trains all other leads
  - Marketing Lead — social posts, campaigns, content calendar
  - Tech Lead — suite builds, deploys, code review
  - CS Lead — tickets, escalation, customer retention
  - Sales Lead — outreach, pipeline, lead scoring
- "Press Enter to start flying"
- Footer: "5 leads ready · PILOT v1.0.0"

**Screen 5: CLI Home**
- PILOT logo (medium)
- "What would you like to work on?" input box
- Tip: "Type /help to see all available commands"
- Status bar: "ready · pilot · content"

**Screen 6: First Message**
- User types first task (e.g., "Set up our brand voice for Medal Social")
- AI responds with tone, audience, style guidelines
- Creates brand.yml
- "Brand voice is now active. Try it out:"

---

## Flow 2 — pilot up: One-Click Setup

### Design Requirements
1. Medal-branded template names only
2. Every skill shows its crew binding
3. Auto-add required specialists (inform, don't ask)
4. Progress items are benefits, not operations
5. No version numbers, package counts, or file paths
6. `pilot up` is for tools/templates only (agents = `pilot crew`)

### Browse UI
Split-panel with tabs: All / Templates / Skills / Crew (Final Select v2 pattern). Left: browsable list with search. Right: detail preview with actions. This is the canonical UI for `pilot up`.

### Templates (v1)

| Template | What it sets up | Crew binding |
|----------|----------------|--------------|
| `pilot up pencil` | Design studio — editor, color tokens, component library, fonts | Brand Lead, Marketing Lead |
| `pilot up remotion` | Video studio — editor, motion templates, media export, animation presets | Content Lead, Social Lead + Video Specialist prompt |
| `pilot up nextmedal` | Web app — scaffolded by Tech Lead (this is a skill, not a static template) | Tech Lead |

Social and deploy templates are deferred to v2.

### nextmedal as Tech Lead Skill
`nextmedal` is a skill on the Tech Lead crew member, not a static template. The Tech Lead agent scaffolds the project using its knowledge of the Next.js + shadcn + auth + database stack. This means it can handle variations: "scaffold nextmedal with stripe billing" or "scaffold nextmedal as a landing page."

### Preflight Checks
Each template has preflight verification before install. Shows what's being checked using benefit language (e.g., "Video engine ✓ ready", "Audio processor ✓ found"). Preflight checks for pencil, remotion, and nextmedal only in v1.

### Install Progress
Checklist with benefit labels:
- ✓ Design editor ready (not "Installed @pencil/core v3.2.1")
- ✓ Component library synced (not "Downloaded 47 packages")
- ⠸ Preparing your creative workspace...
- Progress bar + "Almost ready..."

### Specialist Auto-Add
If a template needs a crew role the user doesn't have, add it automatically and inform:
```
✓ Video Specialist added to your crew
  This template works best with one — you're all set.
  Manage crew anytime: pilot crew
```
No Y/N prompt. The user chose to install the template — the specialist is part of that choice. They can remove via `pilot crew` if they want.

### Template Success
All checks green. "✈ Your design studio is ready for takeoff!" Summary card with what was set up + crew skills bound. "Press Enter to start working with your crew."

### Skill Management
Via the split-panel browse UI:
- **Search**: `pilot up search content` — find skills in library
- **Add**: `pilot up content-writer` — install + bind to crew member
- **Remove**: `pilot up remove content-writer` — unbind from crew with confirmation

---

## Flow 3 — Pilot Chat: The Cockpit

### Home States

**First run:** Welcome screen with crew introduction (Screen 4 from Flow 1). One-time only.

**Returning user:** Instruments dashboard — crew activity, usage stats, gauges, quick actions. The cockpit. Update indicator if updates are available.

### Chat Mode
- User types natural language — Pilot auto-routes to the right crew member
- No need to specify which agent handles it
- Tool calls shown inline as thinking dots (◆ reading..., ◆ writing...)
- Multi-turn conversations with context maintained

### Auto-Routing
The root agent uses AGENTS.md training to decide which crew member handles each request. "Write me an Instagram caption" → Marketing Lead. "Set up a new project" → Tech Lead. User never needs to know the routing.

### System Commands
- `/training` — open knowledge base
- `/crew` — manage agents
- `/plugins` — extension system
- `/update` — check for updates
- `/help` — help reference
- `/status` — machine health

No domain-specific slash commands (no `/ad`, `/brand`, `/tone`, etc.). Everything is natural language, routed by the AI.

### /pilot as Skill in Other AI Tools
Pilot's crew registers as a `/pilot` skill in Claude Code, Codex, and other AI tools. When configured via `pilot training`, the same AGENTS.md works everywhere. This is how Medal Social expands into any AI ecosystem.

---

## Flow 4 — Pilot Training: Knowledge Base

### What Training Does
Training = CLAUDE.md / AGENTS.md generation. When users add articles, connect sources, and define brand voice, Pilot generates portable AI config files consumed by Claude Code, Codex, and any MCP-aware tool.

### UI Pattern
Split-panel with tabs: Sources / Articles / Runs. Same pattern as pilot up v2 and plugins.

### Screen 1: Training Home
Left sidebar: Connected sources (Sanity CMS, Slack, Manual articles) with status. "+ Connect new source" action. "Start Training Run" button (purple).
Right panel: Selected source detail with actions (Sync now, Configure filters, Disconnect) and recent changes feed.

### Screen 2: Training Run
Left sidebar: Sources included (checked), step progress (✓ Reading sources, ✓ Extracting brand voice, ✓ Building knowledge index, ⠸ Writing AGENTS.md, ○ Verifying coverage, ○ Quality checks, ○ Deploying to crew).
Right panel: Live preview of AGENTS.md being generated — shows Brand Lead voice config, Marketing Lead context. Output files: AGENTS.md, CLAUDE.md, .pilot/knowledge.json.

### Bi-Directional Sync
Sources are not one-way imports:
- **Pull**: Import from Sanity docs, Slack threads, manual articles into knowledge base
- **Push**: Update Sanity docs, post to Slack, update source articles from knowledge base
- **Review channel**: Chat-like interface (terminal or Slack) for discussing and refining knowledge changes before they go live

### Source Types
- **Sanity CMS** — auto-sync product catalog, blog posts, pages
- **Slack** — monitor channels (#support, #feedback), import threads
- **Manual** — uploaded articles, brand guides, style docs

---

## Flow 5 — Pilot Plugins: Extension System

### What Plugins Provide
- MCP servers — connect to external services
- Slash commands — new commands in the REPL
- Network permissions — declared API access
- Role bindings — auto-assign to crew roles

### Registry Model
- **Curated** — plugins added via PR/merge to registry repo. Ali reviews and controls what gets in.
- **Namespace**: `@medalsocial/` for official plugins. Future: community namespaces.
- **Open source** — Pilot is open source. Guidelines for contributors who want to add plugins or request new ones.
- **Guidelines doc** in repo — naming conventions, what a plugin must include (plugin.toml, MCP servers, slash commands, permissions), quality bar, review process.

### v1 Plugins

| Plugin | Purpose |
|--------|---------|
| `@medalsocial/kit` | Machine config & Nix management — pilot up, update, status |
| `@medalsocial/sanity` | CMS content management — /content, /schema, /publish |
| `@medalsocial/pencil` | Design tool integration |

All plugins are flexible — any can be installed, disabled, or removed. No "core" plugins.

### UI Pattern
One screen, split-panel. Left: @medalsocial/ plugin list with status (installed/available). Right: detail view with DETAILS, PROVIDES (commands, MCP servers), STATUS, and MANAGE actions (Disable/Remove buttons) at the bottom. Tabs: All / Installed / Available.

---

## Flow 6 — Pilot Update

### Design Requirements
1. Never show version numbers or semver
2. Updates must feel instant and safe
3. Changelog = "What's new for you"
4. One command (`pilot update`), no flags
5. Gentle nudge on launch if updates available
6. Aviation metaphor: "Flight systems upgraded"

### Update Modal (passive)
Appears on launch when update available. Shows "What's new" bullets with benefit descriptions. "Update Now" button + Skip. No version numbers.

### pilot update (active)

**Screen 1: Check**
- "Checking for updates..." spinner
- Results: "New crew skills available", "Plugin updates ready", "Performance improvements"
- "Apply updates? [Y/n]"

**Screen 2: Progress**
- "Upgrading your Pilot..."
- Checklist: ✓ Crew skills refreshed, ✓ Plugin updates applied, ⠸ Optimizing performance, ○ Finalizing
- Progress bar + "Almost ready..."

**Screen 3: Complete**
- All checks green
- "✈ Flight systems upgraded!"
- "What's new for you" card with 3-5 benefit bullets
- "Run pilot to start using new features"

---

## Crew System

AI agents as team members with roles, skills, and tools. Managed via `pilot crew`.

### Default Crew (v1)

| Role | Responsibilities |
|------|-----------------|
| Brand Lead | Learns brand voice, trains all other leads |
| Marketing Lead | Social posts, campaigns, content calendar |
| Tech Lead | Suite builds, deploys, code review, scaffolds nextmedal |
| CS Lead | Tickets, escalation, customer retention |
| Sales Lead | Outreach, pipeline, lead scoring |

### Crew Management
- Split-panel UI with tabs (same pattern as pilot up v2)
- View crew members, their bound skills, tools, and integrations
- Add/remove specialists (Video Specialist, Deploy Specialist, etc.)
- Skills bound to roles — never floating abstractions

### Portable Config
Crew configuration generates AGENTS.md and CLAUDE.md files. These work in:
- Pilot REPL
- Claude Code (via `/pilot` skill)
- Codex
- Any MCP-aware AI tool

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| TypeScript (strict) | Language |
| pnpm workspaces | Monorepo |
| React Ink | Terminal UI components |
| Commander.js | Command routing |
| Vercel AI SDK | AI layer — streaming, agent loop, tool calling, MCP |
| @ai-sdk/anthropic | Claude model provider |
| Zod | Config + plugin manifest validation |
| Vitest | Unit + integration testing |
| ink-testing-library | Component testing |
| Biome | Linting + formatting |

### Monorepo Structure
```
pilot/
├── packages/
│   ├── cli/          ← entry point, REPL, command routing, shared UI
│   └── plugins/
│       ├── kit/      ← machine management (@medalsocial/kit)
│       ├── sanity/   ← CMS integration (@medalsocial/sanity)
│       └── pencil/   ← design tools (@medalsocial/pencil)
├── package.json
└── pnpm-workspace.yaml
```

---

## UI Design Language

### Color Palette
- `#09090B` — terminal background
- `#18181B` — card/inset background
- `#2E2E33` — border
- `#9A6AC2` — purple (primary, active, pilot brand)
- `#2DD4BF` — teal (success, confirmed)
- `#FBBF24` — amber (in-progress, warning)
- `#EF4444` — red (error, destructive)
- `#F4F4F5` — white/primary text
- `#71717A` — muted/secondary text

### Font
Geist Mono for all terminal UI text.

### Split-Panel Pattern
The canonical UI pattern across pilot up, training, plugins, and crew:
- Left: sidebar list with items + status indicators
- Right: detail view with info cards, actions, and status
- Tabs at top for filtering/navigation
- Search bar below header
- Status bar at bottom

### Component Library (218 components in 05-cli.pen)
Terminal Shell (`BUv5B`), PromptLine, AIResponseBlock, ThinkingRow, ChecklistRow-Done, StatusBar, ProgressBar, Modal, PilotLogo (Large/Medium/Small), SelectPanel, and more.

---

## What's Out of v1

- Social template (`pilot up social`)
- Deploy template (`pilot up deploy`)
- Custom plugin development (`pilot plugin create`)
- Multi-machine management
- Public npm release
- Partner/community namespaces beyond @medalsocial/
- Push notifications from Medal Social
- Agent switching tabs (pilot | Medal Social | +add)

---

## Distribution

```bash
# Private install
curl -fsSL pilot.medalsocial.com/install | sh

# Or via npm (private org)
npm install -g @medalsocial/pilot
```
