# Socket.dev Score Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise Socket.dev score for `@medalsocial/pilot` from ~83 to ~90+ by adding a README, upgrading React 18→19, and enabling provenance.

**Architecture:** Three code changes to `packages/cli/` (new README, package.json dep bump, publishConfig toggle), followed by lockfile update, test validation, and publish via GitHub Actions.

**Tech Stack:** React 19, ink 5, pnpm, Vitest, GitHub Actions

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `packages/cli/README.md` | npm-facing README (Quality score) |
| Modify | `packages/cli/package.json` | React 19 deps + provenance toggle |
| Modify | `pnpm-lock.yaml` | Lockfile update after dep change |

---

### Task 1: Add package README

**Files:**
- Create: `packages/cli/README.md`

- [ ] **Step 1: Create the README**

Create `packages/cli/README.md` with the following content:

```markdown
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
```

- [ ] **Step 2: Verify README is included in package tarball**

Run: `cd /Users/ali/Documents/Code/pilot/packages/cli && npm pack --dry-run 2>&1 | grep README`

Expected output should show `README.md` in the file list. npm automatically includes README.md from the package root even without listing it in `files`.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/README.md
git commit -m "docs: add npm-facing README for @medalsocial/pilot"
```

---

### Task 2: Upgrade React 18 to React 19

**Files:**
- Modify: `packages/cli/package.json:30` (react dependency)
- Modify: `packages/cli/package.json:39` (@types/react devDependency)
- Modify: `pnpm-lock.yaml` (lockfile regeneration)

- [ ] **Step 1: Update react dependency**

In `packages/cli/package.json`, change line 34:

```diff
-    "react": "^18.3.0",
+    "react": "^19.0.0",
```

- [ ] **Step 2: Update @types/react devDependency**

In `packages/cli/package.json`, change line 39:

```diff
-    "@types/react": "^18.3.0",
+    "@types/react": "^19.0.0",
```

- [ ] **Step 3: Install updated dependencies**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm install`

Expected: pnpm resolves react@19.x.x and @types/react@19.x.x. No peer dependency errors (ink@5 accepts `react >=18`, ink-text-input@6 accepts `react >=18`).

- [ ] **Step 4: Verify loose-envify is gone**

Run: `pnpm ls --filter @medalsocial/pilot --depth=10 2>/dev/null | grep loose-envify`

Expected: No output. `loose-envify` should no longer appear in the dependency tree. React 19 removed it entirely.

- [ ] **Step 5: Run the full test suite**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm --filter @medalsocial/pilot test -- --run`

Expected: All 14 test files pass. Key tests to watch:
- `Welcome.test.tsx` — renders React components
- `Home.test.tsx` — renders React components
- `SplitPanel.test.tsx` — renders React components with ink
- `Repl.test.tsx` — renders React components

If any test fails, it will be a React 19 breaking change that needs investigation (most likely `react-reconciler` compatibility with ink).

- [ ] **Step 6: Build the package**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm --filter @medalsocial/pilot build`

Expected: TypeScript compilation succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/package.json pnpm-lock.yaml
git commit -m "chore: upgrade react 18 to 19, removes loose-envify supply chain alerts"
```

---

### Task 3: Enable npm provenance

**Files:**
- Modify: `packages/cli/package.json:20` (publishConfig.provenance)

- [ ] **Step 1: Set provenance to true**

In `packages/cli/package.json`, change line 20:

```diff
-    "provenance": false
+    "provenance": true
```

- [ ] **Step 2: Verify release workflow supports provenance**

Read `.github/workflows/release.yml` and confirm:
- `permissions.id-token: write` is set (line 10) ✓
- `npm publish --provenance` is used (line 36) ✓

Both are already in place. The workflow will produce SLSA attestation on the next publish.

Note: Local publishes (not from GitHub Actions) will need `npm publish --no-provenance` to avoid OIDC errors.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/package.json
git commit -m "chore: enable npm provenance for supply chain attestation"
```

---

### Task 4: Publish new version

- [ ] **Step 1: Verify all changes are committed and pushed**

Run: `git status`

Expected: Clean working tree, all changes committed.

Run: `git push origin feat/02-screens` (or current branch)

- [ ] **Step 2: Tag and push for release**

After merging to main (via PR or direct push):

```bash
git tag v0.1.4
git push origin v0.1.4
```

This triggers the GitHub Actions release workflow which will:
1. Install dependencies
2. Build the package
3. Run tests
4. Publish to npm with `--provenance`

- [ ] **Step 3: Verify provenance on npm**

After the workflow completes, check: `npm view @medalsocial/pilot`

Look for a `signature` or provenance attestation in the output.

- [ ] **Step 4: Add second maintainer (manual)**

Run: `npm owner add medal-pilot @medalsocial/pilot`

(Already completed by user — verify with `npm owner ls @medalsocial/pilot`)

- [ ] **Step 5: Verify Socket.dev scores**

Check https://socket.dev/npm/package/@medalsocial/pilot after the new version is published.

Expected improvements:
- Quality: 69 → ~90+ (README added)
- Supply Chain: 75 → ~80-85 (fewer env var alerts, provenance)
- Maintenance: 86 → ~90+ (second maintainer, more versions)
- Overall: ~83 → ~90+
