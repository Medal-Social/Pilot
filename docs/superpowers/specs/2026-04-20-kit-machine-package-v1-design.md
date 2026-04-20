# Kit — Machine Package v1 Design

> **Status:** Approved · April 20, 2026
> **Author:** Ali (with brainstorming partner)
> **Source spec it builds on:** `Medal-Social/kit:docs/specs/2026-04-08-pilot-cli-design.md` § "Machine Package — v1 Scope"
> **Sibling spec (deferred):** Medal Social Provider — Phase A (to be written separately, ships as kit v1.1)

---

## 1. Product Positioning & Architecture

### What kit is

**Kit** is Medal Social's machine management plugin for Pilot. It replaces the current bash bootstrap and `kit` shell script with a TypeScript implementation that lives inside the pilot monorepo and is exposed as the official `@medalsocial/kit` plugin.

**Marketing pitch (README headline):**

> **kit** — your machine, version-controlled.
> Open source MDM and dotfiles for engineers. Reproducible Mac/Linux setups in one command. Secure secrets, transparent config, fully portable. No vendor lock-in.

### Three-layer composition

```
┌─────────────────────────────────────────────────────────┐
│  Medal Social Cloud (optional, paid, pluggable)         │
│  AI Gateway · CRM · Fleet management · Skill sync       │
└─────────────────────────────────────────────────────────┘
                        ▲ HTTPS, authed
┌─────────────────────────────────────────────────────────┐
│  Pilot (the CLI host, source-available)                 │
│  REPL · plugin loader · AI agent · provider host        │
└─────────────────────────────────────────────────────────┘
                        ▲ plugin protocol
┌─────────────────────────────────────────────────────────┐
│  Kit (machine management plugin, source-available)      │
│  init · new · update · status · apps · edit             │
│  Reads ~/Documents/Code/<your-kit-repo>                 │
└─────────────────────────────────────────────────────────┘
```

Each layer adds value to the one above; each works without the others. Pilot is provider-agnostic (Medal Social is the official/reference provider, others can be built). Kit is fully self-contained and never *requires* a provider, but can opt into one for org-policy overlay.

### Source-available, not contribution-open

The pilot repo (and therefore kit's source) is public on GitHub under MIT. Anyone can read, audit, fork, and verify what runs on their machine. External code contributions are allowed but not actively solicited — the maintenance burden of running a true contribution-open OSS project is not what we're optimising for. The README states this clearly.

### Repo layout

```
Medal-Social/pilot                          ← public, MIT
└── packages/plugins/kit/                   ← kit's source lives here
Medal-Social/kit                            ← Ali's personal dotfiles repo (existing, separate)
Medal-Social/kit-template                   ← v1 deliverable: starter for new users
```

There is no separate npm package for kit. Pilot is the binary; kit ships bundled. The shell command `kit` is a thin alias to `pilot kit`, installed by `pilot up kit`.

### Two distinct uses of "kit"

To avoid confusion in the rest of this doc:

- **kit (the tool)** — the pilot plugin; source at `pilot/packages/plugins/kit/`.
- **a kit repo** — a user's machine config repo (dotfiles + Nix). `Medal-Social/kit` is one example; an OpenClaw engineer would have their own.

### Command surface — namespaced, not top-level

The original spec listed `pilot init`, `pilot update`, `pilot status` as top-level commands. We deviate: those names are too generic for a plugin host (`pilot update` should mean "update pilot itself," matching `npm update -g`). Canonical form is `pilot kit <command>`; the `kit` shell alias preserves muscle memory and supports kit's standalone branding.

```
pilot kit init [machine]    # bootstrap an existing kit repo on this machine
pilot kit new               # scaffold a brand-new kit repo for a new user
pilot kit update            # pull + rebuild
pilot kit status            # health check (non-interactive)
pilot kit apps add|remove|list [cask]
pilot kit edit              # open machine config in $EDITOR
kit                         # alias for `pilot kit`; bare = interactive status
kit update                  # alias for `pilot kit update`; etc.
```

---

## 2. Module Layout

What lives inside `packages/plugins/kit/src/`. Principle: each module has one clear job, a documented interface, and can be tested in isolation. Shell scripts are flat by necessity; TypeScript should not be.

```
packages/plugins/kit/
├── src/
│   ├── index.ts                    ← plugin entry; registers commands with pilot
│   ├── config/
│   │   ├── schema.ts               ← Zod schema for kit.config.ts
│   │   ├── load.ts                 ← discovery: $KIT_CONFIG → ~/Documents/Code/kit → fail
│   │   └── load.test.ts
│   ├── machine/
│   │   ├── detect.ts               ← already exists; expand to read scutil + hostname
│   │   ├── detect.test.ts          ← already exists
│   │   ├── system.ts               ← OS, version, chip, user
│   │   └── system.test.ts
│   ├── steps/                      ← each prerequisite is a step module
│   │   ├── types.ts                ← Step interface: { id, label, check, run }
│   │   ├── xcode.ts                ← Xcode CLT
│   │   ├── rosetta.ts              ← Rosetta 2
│   │   ├── nix.ts                  ← Determinate Systems installer
│   │   ├── ssh.ts                  ← SSH key generation
│   │   ├── github.ts               ← gh CLI auth + key upload + HTTPS PAT fallback
│   │   ├── repo.ts                 ← clone or pull (any git remote)
│   │   ├── secrets.ts              ← shells out to scripts/secrets-init.sh (v1)
│   │   ├── rebuild.ts              ← darwin-rebuild / nixos-rebuild with progress
│   │   └── *.test.ts
│   ├── commands/
│   │   ├── init.ts                 ← orchestrates steps for first-run setup
│   │   ├── new.ts                  ← scaffold a new kit repo
│   │   ├── update.ts               ← pull + rebuild
│   │   ├── status.ts               ← health check + repo state + secrets state
│   │   ├── apps.ts                 ← add/remove/list against apps.json
│   │   ├── edit.ts                 ← open machine config in $EDITOR
│   │   ├── migrate-apps.ts         ← one-shot migration from inline Nix → apps.json
│   │   └── *.test.ts
│   ├── ui/                         ← React Ink components for live UI
│   │   ├── Header.tsx              ← branded ASCII + machine info
│   │   ├── StepRow.tsx             ← ✓/⠸/○/✗ + label + detail
│   │   ├── Spinner.tsx             ← elapsed time + log tail
│   │   ├── Completion.tsx          ← success/error final screen
│   │   └── *.test.tsx
│   ├── shell/
│   │   ├── exec.ts                 ← typed wrapper around child_process; the only place that spawns
│   │   ├── exec.test.ts
│   │   └── log-stream.ts           ← writes stdout to tmpfile, parses last meaningful Nix line
│   ├── provider/
│   │   ├── types.ts                ← FleetProvider interface (the seam)
│   │   ├── local.ts                ← LocalProvider — no-op, returns empty policy
│   │   ├── resolve.ts              ← single entry point; v1 always returns LocalProvider
│   │   └── *.test.ts
│   └── errors.ts                   ← KitError with codes (mirrors PilotError pattern)
├── plugin.toml                     ← updated commands list
├── package.json
├── README.md                       ← marketing-grade product page
└── LICENSE                         ← MIT
```

### Key architectural boundaries

- **`shell/exec.ts`** is the only place that touches `child_process`. Every step calls it via dependency injection. This is what makes the whole thing testable without spawning real processes.
- **`steps/`** — each step exports `{ id, label, check(): Promise<boolean>, run(ctx): Promise<void> }`. The init command is just a list of steps to walk; adding a new prerequisite (e.g., 1Password CLI) means adding one file.
- **`provider/`** — the seam for future fleet management (Section 4). `LocalProvider` is the only impl in v1; it returns "no org policy" for everything.
- **`commands/`** are thin — they wire steps + UI together. No business logic.
- **`ui/`** components have no I/O. They receive props, render. The commands own state, the UI just shows it. Testable via `ink-testing-library`.

### What stays as shell for v1

Pragmatic carve-outs to keep v1 scope sane:

- `scripts/secrets-init.sh`, `scripts/yubikey-setup.sh`, `scripts/github-keys.sh` — gnarly, well-tested, tied to `age`/`sops`/YubiKey tooling. The TS `secrets.ts` and `github.ts` steps shell out to them. Port to TS in v2 if the seam pays off.
- `bootstrap.sh` and `scripts/kit` — stay in the kit repo as fallback during the rollout (Section 7). Removed in Phase 3, only after parity is proven.

---

## 3. Command Behaviors

The contract for each command: inputs, outputs, side effects, failure modes.

### `kit init` (also `pilot kit init`)

**Purpose:** Bootstrap an existing kit repo on a fresh machine. Replaces `bootstrap.sh`.

**Inputs:** Optional `[machine-name]` arg. If omitted, auto-detect via hostname + `scutil`.

**Flow:**

1. Render `<Header />` with detected machine name + OS + chip
2. If auto-detected: confirm with user (Y/n). If declined or undetected: render selection list from `kit.config.ts → machines`
3. Run steps in order, each rendering as `<StepRow />`:
   - Xcode CLT (Darwin only)
   - Rosetta 2 (Apple Silicon only)
   - Nix (Determinate installer, requires sudo)
   - SSH key generation (ed25519, if missing)
   - GitHub authentication (SSH → `gh` device-code → HTTPS PAT fallback)
   - Clone or pull the kit repo (any git remote URL)
   - Secrets (shells out to `scripts/secrets-init.sh detect $MACHINE $USER`)
   - Apply config (`darwin-rebuild switch --flake ".#$MACHINE"` or `nixos-rebuild`)
4. Render `<Completion />` with elapsed time

**Idempotency:** Each step's `check()` returns true if already done; the runner shows it as ✓ "already installed" without re-running.

**Failure mode:** Any step failure → `<StepRow status="error" />` + tail of last 40 log lines + `KitError` with code → exit 1.

**Sudo lifecycle:** Single `sudo -v` upfront; if denied, abort with `KIT_SUDO_DENIED`. During long rebuilds, spawn a `sudo -v` keeper that runs every 30s. Keeper is tracked as a child PID; on `SIGINT`, `SIGTERM`, or main exit, kill the keeper. Tested by injecting a fake `Exec` and asserting the keeper PID is killed in all three exit paths.

### `kit new`

**Purpose:** Scaffold a brand-new kit repo for a user starting from scratch (no existing repo to clone).

**Flow:**

1. Interactive prompts: repo name, primary machine name, optional GitHub remote URL
2. Generate scaffold files locally:
   - `kit.config.ts` (with the machine list pre-filled from prompts)
   - `flake.nix` (minimal nix-darwin or NixOS skeleton)
   - `machines/<host>.nix` (one example machine, mostly empty)
   - `apps.json` (empty arrays)
   - `.gitignore` (sane defaults: `.envrc`, `.direnv/`, secrets)
   - `README.md` (one-pager pointing to kit docs)
3. `git init` and make the first commit
4. If GitHub remote provided and `gh` is available: optionally `gh repo create` to push
5. Print next steps: "Run `kit init` to bootstrap your first machine"

**Equivalent to:** clicking "Use this template" on `Medal-Social/kit-template`. The CLI flow exists for terminal-first users; the template repo exists for users who want to browse first.

### `kit update` (also `pilot kit update`)

**Purpose:** Pull latest config and rebuild.

**Inputs:** None.

**Flow:**

1. `cd` into `kit.config.repoDir`
2. `<StepRow />` "Authenticating" — `sudo -v`
3. `<StepRow />` "Checking credentials" — YubiKey check + age key presence
4. `<StepRow />` "Pulling latest" — `git fetch`, count commits behind, `git pull` if behind
5. **Provider hook (no-op in v1):** `await provider.getRequiredApps(ctx)`. If org policy diverges from local apps.json, render diff and prompt before applying. `LocalProvider` returns empty so nothing renders.
6. `<StepRow />` "Rebuilding system" — `darwin-rebuild switch` with spinner + log tail
7. `<StepRow />` "Registering SSH keys" — shells out to `scripts/github-keys.sh --check`
8. `<StepRow />` "Migrating apps to apps.json" — runs `commands/migrate-apps.ts` idempotently (Section 7)
9. Summary line with elapsed time

### `kit status` (also `pilot kit status`; bare `kit` is interactive variant)

**Purpose:** Show machine health at a glance. Read-only by default; interactive prompts only when invoked bare.

**Two distinct entry points** (cleaner than a boolean flag):

```ts
// commands/status.ts
export const renderStatus    = (ctx: KitContext) => Promise<StatusReport>;
export const renderStatusTUI = (ctx: KitContext) => Promise<void>;  // wraps renderStatus + prompts
```

- `kit status` and `pilot kit status` → call `renderStatus`, print, exit. CI-friendly.
- bare `kit` → call `renderStatusTUI`, which prints and then prompts based on report state.

**Output sections:**

- **Machine** — name, OS, chip, last rebuild timestamp
- **Apps** — count of machine + shared apps (read from apps.json + shared apps.json)
- **Secrets** — age key present? encrypted with YubiKey/passphrase/none? secrets decrypted count? revocation check
- **Repo** — uncommitted changes count, commits behind origin
- **Provider** — only renders if non-empty. v1 LocalProvider never produces anything; future providers populate org policy compliance and pending org updates.

**Interactive mode prompts** (bare `kit` only):

- If age key missing: "Set up secrets now?"
- If commits behind: "Pull and rebuild?"
- Otherwise: print and exit

### `kit apps <add|remove|list> [cask]`

**Purpose:** Manage Homebrew casks/brews. **Architectural change vs bash version:** data lives in `apps.json`, not inline in the Nix file.

**Architecture: separate data from config.**

```nix
# machines/personal/ali-pro.nix
{ ... }:
let
  apps = builtins.fromJSON (builtins.readFile ./apps.json);
in {
  homebrew.casks = apps.casks;
  homebrew.brews = apps.brews;
  # ... rest of machine config stays as Nix
}
```

```json
// machines/personal/ali-pro.apps.json
{
  "casks": ["1password", "rectangle", "zed"],
  "brews": ["ripgrep", "jq"]
}
```

**Why this wins:**

- Mutation is typed JSON read/write — zero parsing risk
- Schema validation via Zod on read (catches typos, injection, malformed entries)
- Clean diff in git
- Programmatic access for future tools (Medal Social policy editor, `kit apps export`)
- The Nix logic is unchanged — same store paths

**Migration** (handled by `kit update` on first run after upgrade):

- Detect machine files with inline `homebrew.casks = [ ... ];`
- Extract lists, write `<machine>.apps.json`, rewrite the Nix file to import it
- Idempotent — re-running on already-migrated machines is a no-op
- Migration is a separate module (`commands/migrate-apps.ts`) with golden-file tests against real machine configs from the kit repo

**`kit apps add` flow:**

1. `loadAppsJson(machine)` → Zod-validated `Apps` object
2. Check for duplicate (case-insensitive)
3. Validate cask name against `/^[a-z0-9][a-z0-9._@-]*$/` (matches Homebrew's actual rules)
4. Push to list, sort alphabetically
5. `writeAppsJson(machine, updated)` — atomic write via temp file + rename
6. Prompt "Apply now?" → `kit update` if yes

**`kit apps list`:**

1. Read `<machine>.apps.json` (machine-specific) and `modules/platform/darwin/homebrew.json` (shared)
2. Render as tree with counts. No parsing needed.

**Failure modes:**

- Apps file missing → run migration first, then retry
- Apps file invalid JSON or fails Zod → `KitError(KIT_APPS_CORRUPT, "...")` with file path and exact validation error
- Write fails mid-rename → temp file cleanup in finally, original untouched

### `kit edit`

**Purpose:** Open the current machine's Nix file in `$EDITOR`.

**Editor resolution chain (specified, not vibes):**

1. `$KIT_EDITOR` if set
2. `$VISUAL` if set
3. `$EDITOR` if set
4. First available of: `zed`, `code`, `cursor`, `nvim`, `vim`, `nano`
5. Fail with `KIT_NO_EDITOR` listing what was tried

### `kit help` / `kit --help`

Auto-generated by commander.js. Shows commands + the kit tagline + a link to docs.

### GitHub auth chain (`steps/github.ts`)

Specified explicitly:

1. **Try SSH:** `ssh -o BatchMode=yes -o ConnectTimeout=5 -i ~/.ssh/id_ed25519 git@github.com` → look for "successfully authenticated"
2. **If fails:** check for `gh` binary; if missing, fetch ephemerally via `nix shell --quiet nixpkgs#gh -c gh ...`
3. **`gh auth login`** with `--web --scopes admin:public_key,read:user` (explicit scopes, web flow)
4. **After auth:** `gh ssh-key list` to check duplicate, then `gh ssh-key add ~/.ssh/id_ed25519.pub --title $MACHINE --type authentication`
5. **If `gh` flow fails or user cancels:** HTTPS PAT fallback via stdin prompt (no echo)

Each branch is its own testable function returning a typed `AuthResult` discriminated union.

---

## 4. Provider Interface (the seam)

This is the load-bearing abstraction that makes future fleet management possible without re-architecting kit. Worth getting right today even though only `LocalProvider` ships in v1.

### `provider/types.ts`

```ts
export interface FleetProvider {
  readonly id: string;             // 'local', 'medal-social', 'self-hosted', etc.
  readonly displayName: string;

  /** Org-mandated apps that should be installed on every machine in scope. */
  getRequiredApps(ctx: ProviderContext): Promise<RequiredApps>;

  /** Org-mandated pilot plugins. */
  getRequiredPlugins(ctx: ProviderContext): Promise<RequiredPlugins>;

  /** Org-defined security baseline checks. */
  getSecurityBaseline(ctx: ProviderContext): Promise<SecurityCheck[]>;

  /** Report machine state to provider. No-op for local. */
  reportStatus(ctx: ProviderContext, report: StatusReport): Promise<void>;

  /** Optional: subscribe to push events (config changed, update required). */
  subscribe?(ctx: ProviderContext, handler: ProviderEventHandler): Disposable;
}

export interface ProviderContext {
  readonly machineId: string;       // hostname
  readonly user: string;
  readonly kitRepoDir: string;
  readonly authToken?: string;      // populated by pilot's account system, when present
}

export interface RequiredApps {
  readonly casks: ReadonlyArray<{ name: string; reason: string }>;
  readonly brews: ReadonlyArray<{ name: string; reason: string }>;
  readonly source: string;          // 'local' or 'org:<provider-id>'
}
// Similar shapes for RequiredPlugins, SecurityCheck, StatusReport.
```

**Three things this gives us:**

1. **Provenance.** Every required item carries a `reason` and `source`. `kit status` can show *why* something is required ("Required by Medal Social: SOC2 audit logging"), not just "this is missing." Critical for trust.
2. **Async by default.** Even local impls are async, so swapping to a network provider doesn't change call sites.
3. **Optional subscription.** Push-based providers (websocket, SSE) implement `subscribe`; pull-only providers don't. Kit doesn't care.

### `provider/local.ts` — the only v1 impl

```ts
export class LocalProvider implements FleetProvider {
  readonly id = 'local';
  readonly displayName = 'Local (no fleet)';

  async getRequiredApps()         { return { casks: [], brews: [], source: 'local' }; }
  async getRequiredPlugins()      { return { plugins: [], source: 'local' }; }
  async getSecurityBaseline()     { return []; }
  async reportStatus()            { /* no-op */ }
}
```

Trivial. The null object — its job is to make every code path work without `if (provider)` branches.

### `provider/resolve.ts`

```ts
export function resolveProvider(config: KitConfig, pilotCtx?: PilotContext): FleetProvider {
  // v1: always LocalProvider.
  // v1.1+: read pilotCtx.account.provider to pick MedalSocialProvider when connected.
  return new LocalProvider();
}
```

The single entry point. v1 hardcoded; v1.1 picks up `pilotCtx.account.provider` when pilot's account system reports a connected provider.

### Where it gets called in v1

Three spots, all rendering nothing extra because `LocalProvider` returns empty:

- **`kit status`** — after building the local `StatusReport`, call `provider.getRequiredApps()` + `getSecurityBaseline()` and merge. Render an "Org Policy" section *only if* non-empty.
- **`kit update`** — after `git pull`, before `darwin-rebuild`, call `provider.getRequiredApps()`. If anything missing locally, prompt: "Org policy requires: 1Password (SOC2). Add to apps.json?"
- **`kit init`** — at the end, call `provider.reportStatus()` so an org learns this machine exists.

### Where impls live

The `FleetProvider` *interface* lives in kit (it's the consumer). *Implementations* live elsewhere:

- `LocalProvider` ships with kit (zero dependencies on any provider).
- `MedalSocialProvider` ships from a separate package (sibling spec; v1.1) and depends on the Medal Social SDK.
- Community providers can be authored without touching kit.

### What v1 explicitly does not include

- `MedalSocialProvider` itself — sibling spec, ships as kit v1.1
- Push subscription wiring — `subscribe()` is in the interface but no impl uses it yet
- Org policy *enforcement* (vs *advisory*) — v1 always prompts; never silently mutates

---

## 5. Medal Social Provider — designed-for, deferred to sibling spec

This section maps the future MedalSocialProvider so the v1 seam (Section 4) is right. Implementation lives in a separate spec ("Medal Social Provider — Phase A"), ships as kit v1.1, in a sequential release after kit v1.

### Foundation that already exists

- **Worker** (`apps/workers/devices/` in `medal-monorepo`): `WorkspaceHub` Durable Object — per-workspace state, WebSocket connections, JWT auth (HS256), register/heartbeat/ack protocol, REST heartbeat at `POST /api/devices/:workspaceId`.
- **SDK** (`packages/sdk/src/resources/devices.ts`): user-tier `Devices` resource. Currently typed for Picasso products (`frame | canvas | studio | handset`).

### Conceptual generalization

Picasso devices and developer machines are both "long-lived agents that heartbeat to a workspace hub and receive commands." The transport is identical. We **generalize the existing fleet infrastructure** rather than building parallel infra:

```ts
// Add to packages/sdk/src/types/devices.ts
export type DeviceKind = 'frame' | 'canvas' | 'studio' | 'handset' | 'machine';

export interface MachineDevice extends BaseDevice {
  kind: 'machine';
  os: 'darwin' | 'linux' | 'nixos';
  os_version: string;
  arch: 'arm64' | 'x86_64';
  hostname: string;
  kit_repo: string;
  kit_commit: string | null;
  apps_count: number;
  agent: 'kit';
  agent_version: string;
}
```

Existing `Device` becomes a discriminated union on `kind`. The Worker doesn't need to care about schema — it stores and routes. SDK consumers narrow by `kind`.

### Phase A scope (kit v1.1, sibling spec)

**Wire the pipe end-to-end with no UI work:**

- `MedalSocialProvider` class implementing `FleetProvider`
- `pilot account connect` device-code OAuth flow
- Keychain token storage (macOS Keychain / libsecret on Linux)
- SDK additions: `MachinePolicy` resource + `MachineDevice` discriminated union
- Convex schema: `workspace.machinePolicy` + `workspace.machines` tables
- Worker route: `GET /api/v1/workspaces/:id/machine-policy`
- Status reporting via existing `/api/devices/:workspaceId` heartbeat endpoint
- Policy edited directly in Convex by admins (no UI yet — Convex's built-in dashboard or `npx convex run`)
- `kit status` shows org policy ✓/✗ rows when a provider is connected
- `kit update` prompts to add missing required apps

### Phase B (deferred, separate spec)

- Admin UI in web dashboard for editing machine policy
- Machine inventory view (filtered to `kind: 'machine'`)
- Per-team / per-user targeting

### Phase C (deferred, separate spec)

- WebSocket subscription with sleep/wake reconnect handling
- `policy.updated` push messages → kit auto-pulls
- Enforcement modes (advisory / required / blocking)
- Audit log

### Auth model

Pilot already needs an account-connect flow (in the parent spec). MedalSocialProvider piggybacks:

1. User runs `pilot account connect` → device-code OAuth against Medal Social
2. Pilot receives a long-lived refresh token, stored in keychain
3. On every kit operation needing the provider, MedalSocialProvider exchanges refresh → short-lived JWT (5min TTL) for the WS hub
4. No raw secrets in `kit.config.ts`, no API keys in dotfiles

### Risks to validate before building Phase A

- **Workspace-vs-user model.** WorkspaceHub assumes one workspace per device. Confirm fit for developer machines (likely fine — JWT carries workspace ID).
- **Heartbeat cadence.** Picasso devices probably heartbeat every few seconds. Machines should heartbeat every 5–10 minutes or on-demand. Make cadence per-`kind`.
- **Sleep/wake.** A Mac's WS connection drops constantly. Provider needs graceful reconnect, and policy fetch must work via plain HTTPS too — `kit status` on a freshly-woken machine can't wait for WS.

### Coupling and shipping

Phase A touches two repos (pilot, medal-monorepo) and requires Convex migrations. **Decision: ship sequentially.** Kit v1 ships with `LocalProvider` only. Kit v1.1 ships Phase A the week (or weeks) after. Lower coupling, faster initial ship, MedalSocialProvider becomes a much lower-pressure follow-up.

---

## 6. Testing Strategy

The pilot CLAUDE.md mandates: TDD throughout, co-located tests, 100% coverage target with hard floor 95% statements / 90% branches / 100% functions / 95% lines. Here's how that maps to kit's specific shape.

### Test layers

**1. Pure logic — unit tests, near-100% coverage achievable**

| Module | Tested by |
|---|---|
| `config/schema.ts` | Zod parses valid configs, rejects malformed (golden inputs/outputs) |
| `config/load.ts` | Discovery order: env → default path → fail. Mock filesystem. |
| `machine/detect.ts` | Already tested. Add cases for new patterns. |
| `machine/system.ts` | Mock `os` module; assert OS/arch/chip detection across darwin/linux/intel/arm |
| `provider/local.ts` | Trivial — every method returns the empty shape |
| `provider/resolve.ts` | v1 returns LocalProvider unconditionally; future test cases for branching |
| `errors.ts` | Error codes are stable; messages format correctly |
| `commands/apps.ts` | Golden-file tests on real machine apps.json |
| `commands/migrate-apps.ts` | Golden-file tests on real machine .nix files (before/after) |

**2. Shell-touching modules — `shell/exec.ts` is the only place that spawns processes**

```ts
// shell/exec.ts
export interface Exec {
  run(cmd: string, args: string[], opts?: ExecOpts): Promise<ExecResult>;
  spawn(cmd: string, args: string[], opts?: ExecOpts): SpawnedProcess;
}
export const realExec: Exec = { /* child_process impl */ };

// In tests:
const fakeExec: Exec = {
  run: vi.fn().mockResolvedValue({ stdout: '...', stderr: '', code: 0 }),
  spawn: vi.fn().mockReturnValue(fakeProcess),
};
```

Every step module takes `Exec` in its context. Tests assert: "the rebuild step calls `darwin-rebuild switch --flake .#ali-pro` with sudo" — without spawning anything.

**3. Step modules — each step tested in isolation**

For each `steps/*.ts`:

- `check()` returns true when satisfied (mock the relevant probe)
- `check()` returns false when not satisfied
- `run()` issues the right shell commands in the right order
- `run()` propagates failures as `KitError` with the right code
- Idempotency: `check()` after a successful `run()` returns true

**4. Command orchestration — integration tests with fake Exec**

For `commands/init.ts`, `update.ts`, `status.ts`, `new.ts`:

- Inject a fake `Exec` and a fake filesystem (memfs or tmpdir)
- Assert the *sequence* of operations
- Test failure paths: "if nix install fails, init exits with `KIT_NIX_INSTALL_FAILED` and skips remaining steps"
- Test idempotency: "running init twice on a fully-configured machine performs zero shell calls"
- Test sudo keeper teardown: assert keeper PID is killed on `SIGINT`, `SIGTERM`, and main exit

**5. UI components — `ink-testing-library`**

For each `ui/*.tsx`:

- Render with each status state (`pending | running | ok | error`)
- Snapshot critical layouts (header, completion screen)
- Assert specific text appears for each prop combination

**6. Provider seam — interface conformance**

A `provider/conformance.test.ts` test suite that any `FleetProvider` impl can run:

- `getRequiredApps` returns a valid `RequiredApps` shape
- All methods are async (return promises)
- `subscribe` (if implemented) returns a `Disposable` whose `dispose()` is idempotent

`LocalProvider` runs through this suite in v1. `MedalSocialProvider` runs through the same suite when it ships. Catches drift.

**7. End-to-end (kit-package level)**

A `tests/e2e/` folder in the kit package:

- A *fixture kit repo* checked into `tests/fixtures/sample-kit/` (machine configs, modules, no secrets)
- Tests spawn the actual `kit` binary against the fixture repo, asserting output
- These do NOT spawn real `nix` / `darwin-rebuild` — the fixture's `kit.config.ts` overrides commands to no-op shell stubs
- Runs on CI (Linux + macOS matrix)

### What we don't test

- Real Nix builds (too slow, environment-dependent)
- Real GitHub auth (auth flows tested with mocked `gh` responses)
- Real sudo prompts (sudo invocation pattern asserted; actual elevation isn't tested)
- The bash scripts we shell out to (`secrets-init.sh` etc.) — those have their own existing testing or lack thereof; not kit's responsibility

### Coverage gates

In `vitest.config.ts` for the kit package:

```ts
coverage: {
  provider: 'v8',
  thresholds: { statements: 95, branches: 90, functions: 100, lines: 95 },
  exclude: ['**/*.test.*', 'src/**/index.ts'],
}
```

Index re-export files excluded as they're trivial.

### TDD discipline

Every step module, every command, every UI component:

1. Write the failing test first (red)
2. Implement minimum to pass (green)
3. Refactor with confidence (still green)

Documented in the implementation plan as a hard rule per task.

---

## 7. Rollout & Migration

How we get from "shell scripts work today" to "TypeScript ships and shell scripts retire" without breaking anyone in between.

### Principle: parallel safe → cutover → cleanup

Three phases. Each is reversible. Nothing gets deleted until parity is proven.

### Phase 1 — Parallel safe (during development)

**State:** Both implementations exist. Shell scripts remain authoritative.

- TypeScript implementation in `pilot/packages/plugins/kit/src/`
- Bash `bootstrap.sh`, `scripts/kit`, etc. — **untouched** in `Medal-Social/kit`
- `kit` shell alias in `home/shared/shell.nix` still points to `bash $KIT_DIR/scripts/kit`
- `pilot kit ...` is invokable but flagged experimental in CLI `--help`

**Validation gate before Phase 2:**

- All commands at parity with bash equivalents (manual diff session)
- Each Medal Social engineer (you, Ada) runs `pilot kit status` and `pilot kit update` against their own machine ≥ 3 times across normal use
- E2E test suite green on Linux and macOS CI runners
- Coverage gates met (95/90/100/95)

### Phase 2 — Cutover (the day v1 ships)

**State:** TypeScript becomes authoritative; bash scripts become fallback.

Done in two PRs, one per repo:

**PR in `Medal-Social/pilot`:**

- Mark `@medalsocial/kit` plugin as stable in `plugin.toml` + bump to 1.0.0
- Update CLI `--help` to remove "experimental"
- Publish updated pilot binary

**PR in `Medal-Social/kit`:**

- Add a one-line shim to `bootstrap.sh`:
  ```bash
  if command -v pilot &>/dev/null && pilot kit init --help &>/dev/null; then
    exec pilot kit init "$@"
  fi
  # ... existing bash code below as fallback
  ```
- Same shim pattern in `scripts/kit`
- Update `home/shared/shell.nix`:
  ```nix
  shellAliases.kit = "command -v pilot >/dev/null && pilot kit || $KIT_DIR/scripts/kit";
  ```
- README updated to recommend installing pilot first
- Bash scripts stay in place — they still work for someone who hasn't installed pilot yet

**Migration handled automatically on first `kit update` after cutover:**

- `commands/migrate-apps.ts` runs idempotently on every `update`
- Detects machine files with inline `homebrew.casks = [ ... ];` and converts to `apps.json` + Nix-import wrapper
- Commits the migration to the user's local kit repo with message `kit: migrate apps to apps.json`
- Prompts user to push the commit (does not push automatically — user owns their repo)

### Phase 3 — Cleanup (3–4 weeks after Phase 2, only if no regressions)

**State:** Bash scripts deleted. TypeScript is the only path.

- Delete `bootstrap.sh`, `scripts/kit`. Retain `scripts/secrets-init.sh` and friends (kit still shells out to those for v1)
- Update kit repo README to remove references to bash entry points
- Tag a v1.0 release on `Medal-Social/kit` marking the bash-free milestone

**Hard gate:** Zero regressions reported across all 6 machines for 3 weeks of normal use.

### Distribution

- Pilot binary publishes via existing pilot release pipeline (Changesets + GitHub Actions)
- Kit ships bundled — no separate npm publish
- Versioning follows pilot's Changesets workflow; kit's `package.json` version bumps with pilot releases
- Standalone `kit` binary is unnecessary; the `kit` shell alias dispatches to `pilot kit`

### Template repo (v1 deliverable)

- **`Medal-Social/kit-template`** — minimal, opinionated starter
- One example machine, sensible Nix defaults (Geist mono, Zed, ripgrep, fd, gh, common dev tools — "what most engineers want on day one")
- License MIT, intended to be forked
- GitHub "Use this template" button works → user gets `their-name/dotfiles` instantly
- Has its own README explaining the kit philosophy
- Equivalent to the result of `pilot kit new`; both onboarding paths converge

### Rollback plan

If Phase 2 ships and something breaks badly:

1. Revert the `home/shared/shell.nix` alias change in `Medal-Social/kit`, push to master
2. Affected machines run `kit update` (using the now-reverted alias which routes back to bash) → back to known-good state
3. The TypeScript implementation stays in the repo; we just don't route to it until fixed

The `apps.json` migration is the only thing not trivially reversible. Mitigation:

- Migration commits to git with a clear message — easy to identify
- If we need to revert: `git revert <migration-commit>` in the user's kit repo restores the inline form
- Migration is gated to the cutover, not Phase 1 — first exposure is when v1 ships

### Communication

- Slack announcement to the team the day before Phase 2 ships
- One-paragraph note in the README change
- Office hours / "I'm available to help" for the first 48 hours after cutover

### What this rollout explicitly does NOT do

- Force anyone to migrate immediately — bash fallback works indefinitely until Phase 3
- Touch external customers (there are none yet for kit)
- Couple to MedalSocialProvider Phase A — that has its own rollout in its own spec
- Auto-push migration commits to user repos — the user owns their git history

---

## Out of v1 (explicit)

- `MedalSocialProvider` impl (sibling spec, kit v1.1)
- Web dashboard for fleet management (Phase B, separate spec)
- WebSocket push for live policy updates (Phase C, separate spec)
- Remote command execution from a Medal Social admin
- TypeScript port of `secrets-init.sh` / `yubikey-setup.sh` / `github-keys.sh`
- Multi-config support (kit managing machines across multiple repos simultaneously)
- Public-facing kit documentation site (kit's README is the docs for v1)
- Encrypted policy bundles
- Multi-tenant policy inheritance

---

## Machines supported in v1

| Machine | Type | Config |
|---------|------|--------|
| ali-pro | macOS (Apple Silicon) | `nix-darwin` |
| ali-mini | macOS (Apple Silicon) | `nix-darwin` |
| ali-studio | macOS (Apple Silicon) | `nix-darwin` |
| ada-air | macOS (Apple Silicon) | `nix-darwin` |
| oslo-server | Linux | `NixOS` |
| us-server | Linux | `NixOS` |

---

## Definition of done for v1

- [ ] `pilot kit init` reaches parity with `bootstrap.sh` on all 6 machines
- [ ] `pilot kit update` reaches parity with `scripts/kit update` on all 6 machines
- [ ] `pilot kit status` reaches parity with `scripts/kit status` on all 6 machines
- [ ] `pilot kit apps add/remove/list` reaches parity with `scripts/kit apps` on all 6 machines
- [ ] `pilot kit edit` opens the right file in the right editor
- [ ] `pilot kit new` scaffolds a working kit repo from scratch
- [ ] `Medal-Social/kit-template` published, "Use this template" button works
- [ ] `apps.json` migration is idempotent and tested against all 6 real machine configs
- [ ] `FleetProvider` interface defined; `LocalProvider` implements it; conformance suite passes
- [ ] Coverage gates (95/90/100/95) met across the kit package
- [ ] E2E tests green on Linux and macOS CI runners
- [ ] Cutover PRs merged in both `Medal-Social/pilot` and `Medal-Social/kit`
- [ ] Sibling spec for "Medal Social Provider — Phase A" written, ready to start as kit v1.1
