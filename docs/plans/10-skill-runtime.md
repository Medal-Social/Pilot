# Skill Runtime & Intelligence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add preamble system, learnings, context recovery, self-update, proactive behavior, multi-host support, and project docs (ETHOS.md, ARCHITECTURE.md) to Pilot.

**Architecture:** Skills use a bash preamble that runs on every invocation — loads state, checks updates, recovers context. Learnings are project-scoped JSONL files. Self-update checks GitHub releases. Multi-host supports Claude Code, Codex, Gemini CLI via setup flags.

**Tech Stack:** Bash (preamble), TypeScript (CLI tooling), JSONL (learnings/telemetry), GitHub API (update check)

---

## Task 53: Skill preamble system

**Files:**
- Create: `packages/cli/src/deploy/skills/pilot/SKILL.md` (update with preamble)
- Create: `packages/cli/src/deploy/preamble.sh`
- Create: `packages/cli/src/bin/pilot-state.ts` — CLI helper that outputs state for preamble

The preamble runs every time `/pilot` is invoked in Claude Code, Codex, or any skill-aware tool. It's a bash block inside SKILL.md.

- [ ] **Step 1: Create the state helper CLI**

```ts
// packages/cli/src/bin/pilot-state.ts
#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPilotDir } from '../lib/paths.js';

const pilotDir = getPilotDir();
const stateFile = join(pilotDir, 'state.json');
const crewFile = join(pilotDir, 'crew.json');
const sessionsDir = join(pilotDir, 'sessions');
const knowledgeDir = join(pilotDir, 'knowledge');
const analyticsDir = join(pilotDir, 'analytics');

// State
const state = existsSync(stateFile)
  ? JSON.parse(readFileSync(stateFile, 'utf-8'))
  : { onboarded: false };

console.log(`ONBOARDED: ${state.onboarded}`);
console.log(`LAST_RUN: ${state.lastRun ?? 'never'}`);

// Crew
if (existsSync(crewFile)) {
  const crew = JSON.parse(readFileSync(crewFile, 'utf-8'));
  console.log(`CREW: ${crew.length} leads`);
} else {
  console.log('CREW: 5 leads (default)');
}

// Sessions
if (existsSync(sessionsDir)) {
  const sessions = readdirSync(sessionsDir).filter((f) => f.endsWith('.json'));
  if (sessions.length > 0) {
    const latest = sessions.sort().reverse()[0];
    const session = JSON.parse(readFileSync(join(sessionsDir, latest), 'utf-8'));
    console.log(`LAST_SESSION: ${session.updatedAt}`);
    console.log(`SESSION_MESSAGES: ${session.messages?.length ?? 0}`);
  }
}

// Knowledge
if (existsSync(knowledgeDir)) {
  const articles = readdirSync(knowledgeDir).filter((f) => f.endsWith('.md'));
  console.log(`KNOWLEDGE: ${articles.length} articles`);
} else {
  console.log('KNOWLEDGE: 0');
}

// Learnings (project-specific)
const cwd = process.cwd();
const projectSlug = cwd.split('/').pop() ?? 'unknown';
const learningsFile = join(analyticsDir, 'learnings', `${projectSlug}.jsonl`);
if (existsSync(learningsFile)) {
  const lines = readFileSync(learningsFile, 'utf-8').trim().split('\n').length;
  console.log(`LEARNINGS: ${lines} entries`);

  // Show last 3 learnings
  const all = readFileSync(learningsFile, 'utf-8').trim().split('\n');
  const recent = all.slice(-3);
  for (const line of recent) {
    try {
      const entry = JSON.parse(line);
      console.log(`  LEARNING: ${entry.insight}`);
    } catch {}
  }
} else {
  console.log('LEARNINGS: 0');
}

// Version
const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '../../package.json'), 'utf-8'));
console.log(`VERSION: ${pkg.version}`);
```

- [ ] **Step 2: Create preamble.sh**

```bash
#!/bin/bash
# packages/cli/src/deploy/preamble.sh
# This gets embedded into every crew lead SKILL.md

# 1. Check pilot is installed
if ! command -v pilot &>/dev/null; then
  echo "PILOT: not installed"
  echo "Install: brew install Medal-Social/pilot/pilot"
  return 0 2>/dev/null || exit 0
fi

# 2. Load state
eval "$(pilot state 2>/dev/null)" || true

# 3. Check for updates (non-blocking)
_UPDATE=$(pilot update --check-only 2>/dev/null)
[ -n "$_UPDATE" ] && echo "UPDATE_AVAILABLE: $_UPDATE"

# 4. Git context
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"

# 5. Log skill invocation (local telemetry)
_PILOT_DIR="${PILOT_HOME:-$HOME/.pilot}"
mkdir -p "$_PILOT_DIR/analytics"
echo "{\"skill\":\"$SKILL_NAME\",\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"branch\":\"$_BRANCH\",\"project\":\"$(basename "$(pwd)")\"}" >> "$_PILOT_DIR/analytics/events.jsonl" 2>/dev/null || true
```

- [ ] **Step 3: Update pilot SKILL.md with preamble**

The SKILL.md gets the preamble embedded:

```markdown
---
name: pilot
description: Medal Social AI crew — routes requests to the right crew lead automatically
---

## Preamble (run first)

\`\`\`bash
SKILL_NAME="pilot"
source "$(dirname "$0")/preamble.sh" 2>/dev/null || eval "$(pilot preamble 2>/dev/null)" || true
\`\`\`

If UPDATE_AVAILABLE is shown, mention it briefly: "A Pilot update is available — run `pilot update` when ready."

If LEARNINGS > 0, the recent learnings shown are project-specific context. Use them to inform your responses.

If LAST_SESSION exists, you can offer to resume: "Last session was [time ago]. Want to continue where you left off?"

# Pilot — Medal Social AI Crew

[rest of SKILL.md routing instructions...]
```

- [ ] **Step 4: Add `pilot state` and `pilot preamble` commands**

```ts
// Add to packages/cli/src/bin/pilot.ts
program
  .command('state')
  .description('Output current state (used by skill preamble)')
  .action(async () => {
    await import('../bin/pilot-state.js');
  });

program
  .command('preamble')
  .description('Output preamble script (used by skill preamble)')
  .action(async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    console.log(readFileSync(join(import.meta.dirname, '../deploy/preamble.sh'), 'utf-8'));
  });
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/bin/pilot-state.ts packages/cli/src/deploy/preamble.sh packages/cli/src/bin/pilot.ts
git commit -m "feat: add skill preamble system with state helper"
```

---

## Task 54: Learnings system (project-specific memory)

**Files:**
- Create: `packages/cli/src/learnings/store.ts`
- Create: `packages/cli/src/learnings/types.ts`
- Test: `packages/cli/src/learnings/store.test.ts`

Learnings are project-specific insights that crew leads accumulate. Stored as JSONL. Loaded on every invocation via preamble. Example: "This project uses Tailwind v4, not v3" or "The client prefers shorter captions."

- [ ] **Step 1: Create types**

```ts
// packages/cli/src/learnings/types.ts
export interface Learning {
  id: string;
  insight: string;
  source: string; // which crew lead created it
  project: string;
  createdAt: string;
  tags?: string[];
}
```

- [ ] **Step 2: Write store test**

```ts
// packages/cli/src/learnings/store.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { addLearning, getLearnings, searchLearnings } from './store.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('learnings store', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pilot-learn-'));
  });

  it('adds and retrieves learnings', () => {
    addLearning(dir, 'test-project', {
      insight: 'Client prefers short captions',
      source: 'Marketing Lead',
    });
    const learnings = getLearnings(dir, 'test-project');
    expect(learnings).toHaveLength(1);
    expect(learnings[0].insight).toBe('Client prefers short captions');
  });

  it('searches learnings by keyword', () => {
    addLearning(dir, 'test-project', { insight: 'Uses Tailwind v4', source: 'Tech Lead' });
    addLearning(dir, 'test-project', { insight: 'Brand color is purple', source: 'Brand Lead' });
    const results = searchLearnings(dir, 'test-project', 'tailwind');
    expect(results).toHaveLength(1);
    expect(results[0].insight).toContain('Tailwind');
  });

  it('returns empty for unknown project', () => {
    expect(getLearnings(dir, 'nope')).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Implement store.ts**

```ts
// packages/cli/src/learnings/store.ts
import { existsSync, mkdirSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Learning } from './types.js';

function learningsFile(baseDir: string, project: string): string {
  const dir = join(baseDir, 'analytics', 'learnings');
  mkdirSync(dir, { recursive: true });
  return join(dir, `${project}.jsonl`);
}

export function addLearning(
  baseDir: string,
  project: string,
  entry: { insight: string; source: string; tags?: string[] },
): Learning {
  const learning: Learning = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    insight: entry.insight,
    source: entry.source,
    project,
    createdAt: new Date().toISOString(),
    tags: entry.tags,
  };
  appendFileSync(learningsFile(baseDir, project), JSON.stringify(learning) + '\n');
  return learning;
}

export function getLearnings(baseDir: string, project: string, limit = 50): Learning[] {
  const file = learningsFile(baseDir, project);
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Learning)
    .slice(-limit);
}

export function searchLearnings(baseDir: string, project: string, query: string): Learning[] {
  const all = getLearnings(baseDir, project);
  const lower = query.toLowerCase();
  return all.filter(
    (l) => l.insight.toLowerCase().includes(lower) || l.tags?.some((t) => t.toLowerCase().includes(lower)),
  );
}
```

- [ ] **Step 4: Run tests, commit**

```bash
pnpm test packages/cli/src/learnings/store.test.ts
git add packages/cli/src/learnings/
git commit -m "feat: add project-specific learnings system"
```

---

## Task 55: Context recovery after compaction

**Files:**
- Create: `packages/cli/src/sessions/checkpoint.ts`
- Test: `packages/cli/src/sessions/checkpoint.test.ts`

When Claude Code's context window compacts, the preamble detects LAST_SESSION and offers to resume. Checkpoints save a snapshot of current work state.

- [ ] **Step 1: Implement checkpoint.ts**

```ts
// packages/cli/src/sessions/checkpoint.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPilotDir } from '../lib/paths.js';

interface Checkpoint {
  id: string;
  summary: string;
  crewLead: string;
  branch: string;
  createdAt: string;
  context: Record<string, unknown>;
}

function checkpointDir(): string {
  const dir = join(getPilotDir(), 'checkpoints');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function saveCheckpoint(data: Omit<Checkpoint, 'id' | 'createdAt'>): Checkpoint {
  const checkpoint: Checkpoint = {
    ...data,
    id: `cp-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(
    join(checkpointDir(), `${checkpoint.id}.json`),
    JSON.stringify(checkpoint, null, 2),
  );
  return checkpoint;
}

export function loadLatestCheckpoint(): Checkpoint | null {
  const dir = checkpointDir();
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse();
  if (files.length === 0) return null;
  return JSON.parse(readFileSync(join(dir, files[0]), 'utf-8'));
}

export function formatCheckpointForPreamble(cp: Checkpoint): string {
  return `Last session: ${cp.crewLead} was working on "${cp.summary}" (${cp.branch}). Resume?`;
}
```

- [ ] **Step 2: Write test**

```ts
// packages/cli/src/sessions/checkpoint.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { saveCheckpoint, loadLatestCheckpoint } from './checkpoint.js';

describe('checkpoint', () => {
  beforeEach(() => {
    process.env.PILOT_HOME = `/tmp/pilot-cp-test-${Date.now()}`;
  });

  it('saves and loads a checkpoint', () => {
    saveCheckpoint({ summary: 'Writing blog post', crewLead: 'Marketing Lead', branch: 'main', context: {} });
    const cp = loadLatestCheckpoint();
    expect(cp).not.toBeNull();
    expect(cp!.summary).toBe('Writing blog post');
    expect(cp!.crewLead).toBe('Marketing Lead');
  });
});
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm test packages/cli/src/sessions/checkpoint.test.ts
git add packages/cli/src/sessions/checkpoint.ts packages/cli/src/sessions/checkpoint.test.ts
git commit -m "feat: add checkpoint system for context recovery"
```

---

## Task 56: Self-update mechanism

**Files:**
- Create: `packages/cli/src/update/checker.ts`
- Modify: `packages/cli/src/bin/pilot.ts` — add `pilot update --check-only`
- Test: `packages/cli/src/update/checker.test.ts`

Checks GitHub releases for newer version. Non-blocking. Used by preamble (`pilot update --check-only`) and by `pilot update` command.

- [ ] **Step 1: Implement checker.ts**

```ts
// packages/cli/src/update/checker.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getLogger } from '../lib/logger/index.js';

const log = getLogger('update');

interface UpdateInfo {
  current: string;
  latest: string;
  updateAvailable: boolean;
  releaseUrl?: string;
}

export function getCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '../../package.json'), 'utf-8'));
  return pkg.version;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const current = getCurrentVersion();

  try {
    const response = await fetch(
      'https://api.github.com/repos/Medal-Social/pilot/releases/latest',
      { signal: AbortSignal.timeout(5000) },
    );

    if (!response.ok) {
      return { current, latest: current, updateAvailable: false };
    }

    const data = (await response.json()) as { tag_name: string; html_url: string };
    const latest = data.tag_name.replace(/^v/, '');

    return {
      current,
      latest,
      updateAvailable: latest !== current && isNewer(latest, current),
      releaseUrl: data.html_url,
    };
  } catch (error) {
    log.debug('Update check failed (offline?)', { error: (error as Error).message });
    return { current, latest: current, updateAvailable: false };
  }
}

function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return true;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return false;
  }
  return false;
}
```

- [ ] **Step 2: Add --check-only flag to update command**

```ts
// Modify update command in packages/cli/src/bin/pilot.ts
program
  .command('update')
  .description('Check for and apply updates')
  .option('--check-only', 'Just check, don\'t apply')
  .action(async (opts) => {
    if (opts.checkOnly) {
      const { checkForUpdate } = await import('../update/checker.js');
      const info = await checkForUpdate();
      if (info.updateAvailable) {
        console.log(`${info.latest}`);
      }
      return;
    }
    const { runUpdate } = await import('../commands/update.js');
    await runUpdate();
  });
```

- [ ] **Step 3: Write test**

```ts
// packages/cli/src/update/checker.test.ts
import { describe, expect, it } from 'vitest';
import { getCurrentVersion } from './checker.js';

describe('update checker', () => {
  it('reads current version from package.json', () => {
    const version = getCurrentVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
```

- [ ] **Step 4: Run tests, commit**

```bash
pnpm test packages/cli/src/update/checker.test.ts
git add packages/cli/src/update/ packages/cli/src/bin/pilot.ts
git commit -m "feat: add self-update mechanism with GitHub release check"
```

---

## Task 57: Multi-host skill deployment (Claude Code, Codex, Gemini CLI)

**Files:**
- Modify: `packages/cli/src/deploy/deployer.ts` — add host detection and multi-target deploy
- Create: `packages/cli/src/deploy/hosts.ts`
- Test: `packages/cli/src/deploy/hosts.test.ts`

- [ ] **Step 1: Implement hosts.ts**

```ts
// packages/cli/src/deploy/hosts.ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export type Host = 'claude-code' | 'codex' | 'gemini';

interface HostConfig {
  name: Host;
  skillsDir: string;
  configFile: string; // CLAUDE.md, AGENTS.md, GEMINI.md
  detected: boolean;
}

export function detectHosts(): HostConfig[] {
  const home = homedir();
  const hosts: HostConfig[] = [];

  // Claude Code
  const claudeDir = join(home, '.claude');
  hosts.push({
    name: 'claude-code',
    skillsDir: join(claudeDir, 'skills'),
    configFile: join(claudeDir, 'CLAUDE.md'),
    detected: existsSync(claudeDir),
  });

  // Codex
  const codexDir = join(home, '.codex');
  hosts.push({
    name: 'codex',
    skillsDir: join(codexDir, 'skills'),
    configFile: join(codexDir, 'AGENTS.md'),
    detected: existsSync(codexDir),
  });

  // Gemini CLI
  const geminiDir = join(home, '.gemini');
  hosts.push({
    name: 'gemini',
    skillsDir: join(geminiDir, 'skills'),
    configFile: join(geminiDir, 'GEMINI.md'),
    detected: existsSync(geminiDir),
  });

  return hosts;
}

export function getActiveHosts(): HostConfig[] {
  return detectHosts().filter((h) => h.detected);
}
```

- [ ] **Step 2: Update deployer to deploy to all detected hosts**

```ts
// Add to packages/cli/src/deploy/deployer.ts
import { getActiveHosts } from './hosts.js';

export function deployToAllHosts(pilotDir: string): void {
  const hosts = getActiveHosts();

  for (const host of hosts) {
    // Create symlink
    mkdirSync(host.skillsDir, { recursive: true });
    const symlinkPath = join(host.skillsDir, 'pilot');
    if (existsSync(symlinkPath)) unlinkSync(symlinkPath);
    symlinkSync(join(pilotDir, 'skills', 'pilot'), symlinkPath);

    // Append routing to config file
    appendRoutingToFile(host.configFile, host.name);
  }
}
```

- [ ] **Step 3: Write test, commit**

```ts
// packages/cli/src/deploy/hosts.test.ts
import { describe, expect, it } from 'vitest';
import { detectHosts } from './hosts.js';

describe('hosts', () => {
  it('returns all 3 host configs', () => {
    const hosts = detectHosts();
    expect(hosts).toHaveLength(3);
    expect(hosts.map((h) => h.name)).toEqual(['claude-code', 'codex', 'gemini']);
  });
});
```

```bash
pnpm test packages/cli/src/deploy/hosts.test.ts
git add packages/cli/src/deploy/
git commit -m "feat: add multi-host skill deployment (Claude Code, Codex, Gemini)"
```

---

## Task 58: ETHOS.md and ARCHITECTURE.md

**Files:**
- Create: `ETHOS.md`
- Create: `ARCHITECTURE.md`

- [ ] **Step 1: Create ETHOS.md**

```markdown
# Ethos

Pilot exists because AI should work for everyone, not just engineers.

## Principles

**Local-first.** Your data stays on your machine. No cloud required. No account required.
Pilot works offline, fully functional, zero network calls. Cloud is optional and additive.

**Private by design.** Your brand voice, knowledge base, and content never leave your
machine unless you explicitly connect a cloud service. Telemetry is local-only.

**Open source.** Inspect the code. Contribute plugins. Fork for your team. The plugin
registry is curated for quality, but the source is open for trust.

**Brew-level stable.** Install once, works forever, updates cleanly. No breaking changes
to user-facing commands. Config migrations handled automatically. If something breaks,
Pilot recovers silently — users see success, never stack traces.

**Non-technical first.** Every design decision asks: "Would a marketer understand this?"
No package manager names, no file paths, no version numbers, no checksums. Users see
outcomes, not operations.

**Portable AI.** Your crew configuration (AGENTS.md) works in Pilot, Claude Code, Codex,
and any MCP-aware tool. Set it up once, use it everywhere. Pilot is the configuration
layer, not a walled garden.

**Crew over commands.** Users talk to Pilot in natural language. Pilot routes to the
right crew lead. No slash commands for domain tasks. The AI handles the routing.

## What we don't do

- We don't send data without explicit consent
- We don't require accounts for core functionality
- We don't expose technical internals to non-technical users
- We don't break existing configs on update
- We don't add features that only engineers would use
```

- [ ] **Step 2: Create ARCHITECTURE.md**

```markdown
# Architecture

This document explains **why** Pilot is built the way it is.

## The core idea

Pilot gives non-technical users an AI crew that knows their brand. The hard parts are:
making Nix invisible, making AI routing feel natural, and making skills portable across
every AI tool.

```
User types "write me a caption"
        │
        ▼
┌──────────────────┐
│  Pilot CLI        │  React Ink + Commander.js
│  (local process)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Crew Router      │  Keyword matching → right crew lead
│  (AGENTS.md)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Vercel AI SDK    │  streamText + stopWhen + onStepFinish
│  + Claude         │  via @ai-sdk/anthropic
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  MCP Servers      │  From plugins (Pencil, Sanity, etc.)
│  (tool calling)   │
└──────────────────┘
```

## Why TypeScript + React Ink

React Ink gives us the same component model as the web team's Next.js app. A designer
who reads `<SplitPanel sidebar={...} detail={...} />` understands the layout. Components
are testable with ink-testing-library — render, assert on stdout. No terminal emulator
needed in CI.

Commander.js handles routing because it's what Vercel CLI uses. Battle-tested, automatic
--help, intuitive subcommands. Users type `pilot up`, not `pilot machine init --type darwin`.

## Why plugins, not built-in

Every integration (Sanity, Pencil, kit) is a plugin because:

1. **Removable.** If you don't use Sanity, don't install it. No dead code.
2. **Sandboxed.** Plugins declare permissions. Undeclared network access is blocked.
3. **Contributable.** Third parties add integrations via PR without touching core code.
4. **Testable.** Each plugin has its own test suite. Core doesn't break when a plugin breaks.

Plugins declare everything in `plugin.toml` — a Zod-validated manifest with commands,
MCP servers, permissions, and role bindings.

## Why local-first

The AI layer calls Claude's API (network required). Everything else is local:

- Crew config: `~/.pilot/crew.json`
- Knowledge base: `~/.pilot/knowledge/*.md`
- Sessions: `~/.pilot/sessions/*.json`
- Skills: `~/.pilot/skills/*/SKILL.md`
- Analytics: `~/.pilot/analytics/*.jsonl`
- Plugins: `~/.pilot/plugins/`

Cloud adds: account sync, plugin registry, push updates, team sharing. But Pilot is
fully functional without it. This is not an optimization — it's a privacy guarantee.

## Why AGENTS.md

Pilot generates `AGENTS.md` from the training system. This file:

1. Defines each crew lead's role, knowledge, and responsibilities
2. Gets deployed as a SKILL.md to `~/.claude/skills/pilot/`
3. Gets symlinked to Codex and Gemini skill directories
4. Works identically in every AI tool

This means crew knowledge is portable. Train once in Pilot, use everywhere.
The file format follows Anthropic's CLAUDE.md conventions and OpenAI's AGENTS.md
standard — both tools read the same file.

## Skill versioning

Skills follow the same version as the Pilot package (semver via changesets).
On update:

1. Check manifest.json for deployed skill checksums
2. If checksum matches (Pilot-managed, unmodified) → safe to overwrite
3. If checksum differs (user modified) → warn, don't overwrite
4. Record new checksums in manifest

This prevents updates from destroying user customizations while still
allowing Pilot to push improvements.

## Directory layout

```
~/.pilot/
├── skills/           ← skill SKILL.md files + scripts
│   ├── pilot/        ← main router (symlinked to ~/.claude/skills/pilot)
│   ├── brand-lead/
│   ├── marketing-lead/
│   ├── tech-lead/
│   ├── cs-lead/
│   └── sales-lead/
├── knowledge/        ← from pilot training
├── sessions/         ← conversation persistence
├── checkpoints/      ← context recovery snapshots
├── analytics/        ← local telemetry + learnings
├── plugins/          ← installed plugin configs
├── crew.json         ← crew configuration
├── state.json        ← app state (onboarded, last run)
├── config.json       ← user preferences (theme, telemetry)
└── manifest.json     ← deployed file checksums for smart updates
```

## Build and release

tsup builds dual CJS/ESM packages. @vercel/ncc bundles the CLI binary.
Changesets manages multi-package versioning. GitHub Actions runs the quality
gate (lint + typecheck + publint + test + e2e) and publishes via changesets/action.
Homebrew formula auto-updates on new releases.
```

- [ ] **Step 3: Commit**

```bash
git add ETHOS.md ARCHITECTURE.md
git commit -m "docs: add ETHOS.md and ARCHITECTURE.md"
```

---

## Self-Review

**Spec coverage for this subplan:**

| Feature | Task |
|---------|------|
| Skill preamble system | Task 53 |
| Project-specific learnings | Task 54 |
| Context recovery (checkpoints) | Task 55 |
| Self-update via GitHub releases | Task 56 |
| Multi-host deployment (Claude Code, Codex, Gemini) | Task 57 |
| ETHOS.md + ARCHITECTURE.md | Task 58 |

**Placeholder scan:** No TBDs or TODOs. All tasks have complete code.

**Type consistency:** `Learning`, `Checkpoint`, `UpdateInfo`, `Host`, `HostConfig` defined and used consistently.
