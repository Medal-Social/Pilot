# Screen Interactivity Design

> **Date:** 2026-04-10
> **Status:** Draft
> **Scope:** Make Plugins and Update screens fully functional, add keyboard navigation to Training, consolidate state into settings.json

## Problem

The screens built in 02-screens render correctly but are non-interactive:
- **Plugins:** Hardcoded plugin list, tabs and selection never change
- **Update:** Confirm prompt has no input handler — screen stalls at "Apply updates? [Y/n]"
- **Training:** Tabs and source selection never change

Additionally, runtime state is stored in `~/.pilot/state.json` via `state.ts` — this should be consolidated into a single `~/.pilot/settings.json`.

## Design

### 1. Settings Consolidation (`state.ts` → `settings.ts`)

Replace `~/.pilot/state.json` with `~/.pilot/settings.json`. Single file, single source of truth.

```ts
interface PilotSettings {
  onboarded: boolean;
  lastRun?: string;
  plugins: Record<string, { enabled: boolean }>;
}
```

- `loadSettings()` / `saveSettings()` replace `loadState()` / `saveState()`
- `markOnboarded()` stays as a convenience helper
- All references to `state.ts` updated (Repl.tsx, Repl.test.tsx mock path)

### 2. Shared Keyboard Navigation Hook (`useListNav`)

A reusable hook for all three screens:

```ts
interface UseListNavOptions {
  listLength: number;
  tabs: Tab[];
  initialTab?: TabId;
}

interface UseListNavResult {
  selected: number;
  activeTab: TabId;
}
```

- **Arrow up/down** — move selection within current list, wraps at boundaries
- **Number keys (1/2/3/...)** — switch tabs by position
- **Enter** — available for screen-specific actions via separate `useInput`
- Returns `{ selected, activeTab }` as reactive state
- TabBar component gets wired to use its existing `onSelect` prop

### 3. Plugins Screen — Real Data

#### Plugin Discovery

New `discoverPlugins()` function:
- Scans `packages/plugins/*/plugin.toml` (bundled plugins)
- Scans `~/.pilot/plugins/*/plugin.toml` (user-installed, future)
- Parses each with existing `parseManifest()`
- Merges with enable/disable state from `settings.json`
- Returns `LoadedPlugin[]`

Bundled plugin path is resolved relative to the CLI package root (via `import.meta.url` or `__dirname`), so it works both in dev (`packages/plugins/`) and when installed globally. Requires adding a TOML parser dependency (e.g., `smol-toml`).

#### Screen Behavior

- Loads real plugins on mount via `discoverPlugins()`
- Arrow keys navigate the plugin list
- Number keys switch All/Installed/Available tabs
- `d` key to disable selected plugin, `e` key to enable — persisted to `settings.json`
- Remove omitted for now (destructive action needs confirmation UX)

#### Tests

- Mock filesystem to avoid hitting real `~/.pilot/`
- Test navigation, tab filtering, enable/disable state changes

### 4. Update Screen — Real Version Check & Apply

#### Version Check

New `checkForUpdates()` function:
- Reads current version from `package.json`
- Runs `npm view @medalsocial/pilot version` to get latest from npm registry
- Compares with semver
- Returns `{ current, latest, hasUpdate }`
- If package not published (404), returns `{ hasUpdate: false }`

#### Update Apply

New `applyUpdate()` function:
- Runs `npm install -g @medalsocial/pilot@latest`
- Returns success/failure

#### Screen Phases (6 total)

1. **checking** — spinner while `checkForUpdates()` runs
2. **up-to-date** — no update available, show "Flight systems are current"
3. **confirm** — shows current version → latest version, `useInput` handles Y/n
4. **updating** — runs `applyUpdate()`, shows Step components with progress
5. **complete** — success message
6. **error** — update failed, suggests manual install

#### Offline Handling

If `npm view` fails (no network), show "Unable to check for updates — are you online?" instead of crashing.

#### Tests

- Mock `child_process` to simulate npm responses
- Test all 6 phase transitions

### 5. Training Screen — Keyboard Nav Only

Minimal interactivity, no backend:
- Number keys (1/2/3) switch Sources / Articles / Runs tabs
- Arrow up/down navigate source list in sidebar
- Data stays hardcoded — real sources come with training engine (Phase 4+)
- Articles tab shows "No articles yet — connect a source to get started"
- Runs tab shows "No training runs yet — start one from the Sources tab"

#### Tests

- Test tab switching and source selection respond to keyboard input

## Dependencies

- `smol-toml` — parse plugin.toml files (lightweight, zero-dep TOML parser)
- No other new dependencies

## Files Changed

| File | Action |
|------|--------|
| `packages/cli/src/state.ts` | Delete (replaced by settings.ts) |
| `packages/cli/src/settings.ts` | Create |
| `packages/cli/src/hooks/useListNav.ts` | Create |
| `packages/cli/src/hooks/useListNav.test.ts` | Create |
| `packages/cli/src/plugins/discover.ts` | Create |
| `packages/cli/src/plugins/discover.test.ts` | Create |
| `packages/cli/src/update/checker.ts` | Create |
| `packages/cli/src/update/checker.test.ts` | Create |
| `packages/cli/src/screens/Plugins.tsx` | Rewrite (real data) |
| `packages/cli/src/screens/Plugins.test.tsx` | Rewrite (mock fs) |
| `packages/cli/src/screens/Update.tsx` | Rewrite (real phases) |
| `packages/cli/src/screens/Update.test.tsx` | Rewrite (mock child_process) |
| `packages/cli/src/screens/Training.tsx` | Update (add useListNav) |
| `packages/cli/src/screens/Training.test.tsx` | Update (test navigation) |
| `packages/cli/src/screens/Repl.tsx` | Update (settings import) |
| `packages/cli/src/screens/Repl.test.tsx` | Update (mock path) |
| `packages/cli/src/components/TabBar.tsx` | Update (wire onSelect) |

## Out of Scope

- Plugin removal (needs confirmation UX)
- User-installed plugins in `~/.pilot/plugins/` (no install mechanism yet)
- Training data sources, sync, runs (Phase 4+)
- Homebrew/binary update mechanism (Phase 13-14)
- Release notes / changelog display (no releases yet)
