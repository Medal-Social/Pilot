# Uninstall & Down Commands Design

> **Date:** 2026-04-10
> **Status:** Draft
> **Scope:** `pilot uninstall` (interactive self-removal) and `pilot down <template>` (selective tool removal)

## Problem

Pilot creates files across multiple locations on the user's machine (`~/.pilot/`, `~/.claude/`, Nix-installed tools, npm global binary). There is no way to cleanly remove Pilot or selectively uninstall tools set up via `pilot up`.

## Goals

1. `pilot uninstall` — interactive walkthrough that removes everything Pilot created, with per-category opt-out
2. `pilot down <template>` — remove a specific template's Nix-installed dependencies (inverse of `pilot up`)
3. Shared `uninstaller.ts` module reused by both commands

## Design

### 1. Reusable Nix Uninstaller (`src/device/uninstaller.ts`)

Shared module that removes Nix-installed packages by template name. Used by both `pilot uninstall` (step 4) and `pilot down`.

```ts
interface UninstallResult {
  template: string;
  removed: string[];    // dependency labels that were removed
  failed: string[];     // dependency labels that failed
  skipped: string[];    // dependencies not installed
}

/** Remove all Nix dependencies for a template */
function uninstallTemplate(template: string): Promise<UninstallResult>;

/** Remove specific Nix dependencies by label */
function uninstallDependencies(deps: string[]): Promise<UninstallResult>;
```

- Reads `templates.ts` manifests to resolve template → Nix packages (same manifests `installer.ts` uses)
- Reads `~/.pilot/templates.json` to check what's actually installed before attempting removal
- Updates `~/.pilot/templates.json` after successful removal (removes the template entry)
- Uses the structured logger, never `console.log`
- Errors are `PilotError` with appropriate error codes

### 2. `pilot uninstall` Command (`src/commands/uninstall.ts`)

Interactive 5-step walkthrough. Each step shows what will be removed and asks for confirmation.

**Step 1: Knowledge & Sessions**
- `~/.pilot/knowledge/` — brand voice, products, custom knowledge
- `~/.pilot/sessions/` — REPL session history
- `~/.pilot/audit.log` — audit trail
- Always backs up `~/.pilot/knowledge/` to `~/pilot-backup-<YYYY-MM-DD>/` before removal, regardless of user's choice (safety net)

**Step 2: Crew Skills & Plugins**
- `~/.pilot/skills/` — all crew lead SKILL.md files
- `~/.pilot/plugins/` — user-installed plugins
- `~/.pilot/manifest.json` — smart update checksums

**Step 3: Claude Integration**
- `~/.claude/skills/pilot` — remove symlink only (not the target, which is already gone from step 2)
- `~/.claude/CLAUDE.md` — remove only the `## Pilot routing` section and everything below it until the next `## ` heading or EOF. Preserve all other content.

**Step 4: Installed Tools**
- Read `~/.pilot/templates.json` to list installed templates
- Show multi-select checkbox list (toggle with arrow keys + space)
- Selected templates are removed via `uninstaller.ts`
- If no templates installed, skip this step

**Step 5: Pilot CLI**
- Remove `~/.pilot/settings.json` and `~/.pilot/` directory (whatever remains)
- Run `npm uninstall -g @medalsocial/pilot` as the final action
- If npm uninstall fails (permissions), print: `Run: sudo npm uninstall -g @medalsocial/pilot`

**Backup behavior:**
- Before step 1, copy `~/.pilot/knowledge/` → `~/pilot-backup-<YYYY-MM-DD>/`
- Print backup location at the start and at the end
- If backup directory already exists (ran uninstall twice same day), append `-2`, `-3`, etc.

### 3. `pilot down <template>` Command (`src/commands/down.ts`)

Selective removal of a single template's dependencies. Inverse of `pilot up <template>`.

```
$ pilot down pencil

Removing Pencil design tools...
  ✓ Design engine removed
  ✓ Template state updated

Done. Run `pilot up pencil` to reinstall.
```

- Validates template name against known templates
- Calls `uninstaller.ts` → `uninstallTemplate(template)`
- Shows progress with success/failure per dependency
- If template not installed, show friendly message: "Pencil is not installed. Nothing to remove."

### 4. Screen UI (`src/screens/Uninstall.tsx`)

React Ink screen for the interactive uninstall flow.

**Components:**
- Reuse existing `useListNav` hook for checkbox navigation in step 4
- Each step renders: description of what will be removed, file count, confirmation prompt
- Step 4 uses multi-select checkboxes (all checked by default)
- Progress indicator while removal is in progress
- Final summary: what was removed, what was skipped, backup location

**State machine:**
```
Backup → Step1 → Step2 → Step3 → Step4 → Step5 → Done
              ↓       ↓       ↓       ↓       ↓
           (skip)  (skip)  (skip)  (skip)  (skip)
```

Each step can be skipped (user says N), which advances to the next step.

### 5. CLAUDE.md Surgery

The routing section appended by `deployer.ts` follows a known pattern:

```markdown
## Pilot routing

When the user's request matches Pilot functionality, invoke /pilot.
...
```

Removal strategy:
1. Read `~/.claude/CLAUDE.md`
2. Find the line starting with `## Pilot routing`
3. Remove everything from that line to the next `## ` heading or EOF
4. Write the file back (trim trailing whitespace/newlines)
5. If the heading isn't found, skip and log a warning (user may have removed it manually)

This logic lives in `deployer.ts` as `removeRoutingFromClaudeMd()` — colocated with `appendRoutingToClaudeMd()`.

## Error Handling

- If any step fails, log the error, report it to the user, and continue with remaining steps
- Never exit early on a single failure — best-effort removal of everything the user opted into
- If `~/.pilot/` doesn't exist at all, show: "Pilot is not installed. Nothing to remove." and exit
- If CLAUDE.md parsing fails or the routing section can't be cleanly identified, skip and tell the user: "Could not automatically clean CLAUDE.md. Remove the '## Pilot routing' section manually."
- npm uninstall failure → print sudo command as fallback

## File Changes

**New files:**
- `src/device/uninstaller.ts` — shared Nix package removal
- `src/commands/uninstall.ts` — uninstall command registration
- `src/commands/down.ts` — down command registration
- `src/screens/Uninstall.tsx` — interactive uninstall UI

**Modified files:**
- `src/bin/pilot.ts` — register `uninstall` and `down` commands
- `src/deploy/deployer.ts` — add `removeRoutingFromClaudeMd()` function

**Test files:**
- `src/device/uninstaller.test.ts`
- `src/commands/down.test.ts`
- `src/screens/Uninstall.test.tsx`
- `src/deploy/deployer.test.ts` — test for routing removal
