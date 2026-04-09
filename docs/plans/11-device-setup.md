# Sub-plan 11 — Device Setup: Detection, Dependencies & Nix Installation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a user runs `pilot up <template>`, Pilot detects their device, resolves what the template needs, installs missing packages via Nix (invisibly), and shows benefit-oriented progress. Users never see Nix, npm, package names, file paths, or version numbers — only outcomes.

**Architecture:** A four-layer pipeline: device detection -> template manifest lookup -> Nix abstraction layer -> orchestrating installer. State is persisted to `~/.pilot/templates.json` for idempotent re-runs. All shell commands use `execFileNoThrow` from `src/utils/execFileNoThrow.ts` to prevent injection.

**Tech Stack:** TypeScript, Node.js `child_process.execFile` (via the codebase's `execFileNoThrow` utility), Vitest (TDD), Nix (Determinate Systems installer), nix-darwin, NixOS.

---

## Task 59: Device detection system

**Create:**
- `packages/cli/src/device/types.ts`
- `packages/cli/src/device/detect.ts`

**Test:**
- `packages/cli/src/device/detect.test.ts`

### 59.1 — Define `DeviceInfo` type

Create `packages/cli/src/device/types.ts`:

```ts
export interface DeviceInfo {
  os: 'darwin' | 'linux';
  arch: 'arm64' | 'x64';
  chip: string;              // "Apple Silicon", "Intel", "AMD"
  hostname: string;
  nixInstalled: boolean;
  nixVersion?: string;
  nixDarwin: boolean;
  installedTools: Map<string, string | boolean>; // tool name -> version or true/false
}
```

### 59.2 — Write tests first

Create `packages/cli/src/device/detect.test.ts`. Mock `execFileNoThrow` and `os` module. Test cases:

- Returns `os: 'darwin'` on macOS, `os: 'linux'` on Linux.
- Returns `arch: 'arm64'` for Apple Silicon, `arch: 'x64'` for Intel.
- Derives `chip` label: `"Apple Silicon"` when darwin + arm64, `"Intel"` when darwin + x64, `"AMD"` or `"Intel"` on Linux (check `/proc/cpuinfo` mock).
- Returns hostname from `os.hostname()`.
- Detects Nix installed when `command -v nix` succeeds; captures version from `nix --version`.
- Detects nix-darwin when `command -v darwin-rebuild` succeeds.
- Checks each tool in the list (`node`, `pnpm`, `git`, `nix`, `ffmpeg`, `chromium`, `zed`) via `command -v`. Captures version where the tool supports `--version`.
- Completes detection in < 2 seconds (run tool checks in parallel with `Promise.all`).

### 59.3 — Implement `detectDevice()`

Create `packages/cli/src/device/detect.ts`:

```ts
import os from 'node:os';
import { execFileNoThrow } from '../utils/execFileNoThrow.js';
import type { DeviceInfo } from './types.js';

const TOOLS = ['node', 'pnpm', 'git', 'nix', 'ffmpeg', 'chromium', 'zed'] as const;

export async function detectDevice(): Promise<DeviceInfo> {
  const platform = os.platform();
  const osName = platform === 'darwin' ? 'darwin' : 'linux';
  const arch = os.arch() === 'arm64' ? 'arm64' : 'x64';
  const chip = deriveChipLabel(osName, arch);
  const hostname = os.hostname();

  // Run all tool checks in parallel
  const [nixInfo, installedTools] = await Promise.all([
    checkNix(),
    checkTools(),
  ]);

  return {
    os: osName,
    arch,
    chip,
    hostname,
    ...nixInfo,
    installedTools,
  };
}
```

Key implementation details:
- `deriveChipLabel()`: On darwin, arm64 = "Apple Silicon", x64 = "Intel". On Linux, read `/proc/cpuinfo` for "AMD" or "Intel".
- `checkNix()`: Run `command -v nix` then `nix --version`, run `command -v darwin-rebuild`. Return `{ nixInstalled, nixVersion, nixDarwin }`.
- `checkTools()`: For each tool, run `command -v <tool>` via `execFileNoThrow`. If found, try `<tool> --version` to extract version string. Return `Map<string, string | boolean>`.
- Use `execFileNoThrow` for all shell calls — never use raw `exec`.

### 59.4 — Verify all tests pass, commit

```
device: add device detection system

Detect OS, architecture, chip label, hostname, Nix status,
and installed tools. All checks run in parallel for <2s total.
```

---

## Task 60: Template dependency manifests

**Create:**
- `packages/cli/src/device/templates.ts`

**Test:**
- `packages/cli/src/device/templates.test.ts`

### 60.1 — Define manifest types

Add to `packages/cli/src/device/types.ts`:

```ts
export interface TemplateDependency {
  tool: string;           // internal name: "ffmpeg", "node", "chromium"
  benefitLabel: string;   // user-facing: "Video engine", "Web framework"
  required: boolean;
  checkCommand: string;   // how to verify: "which ffmpeg"
  nixPackage: string;     // Nix package name: "ffmpeg"
  platforms: ('darwin' | 'linux')[];
}

export interface TemplateManifest {
  name: string;            // "remotion", "pencil", "nextmedal"
  displayName: string;     // "Video Studio", "Design Studio", "Web App"
  setupMessage: string;    // "Setting up your video studio..."
  dependencies: TemplateDependency[];
  skills: Array<{ name: string; binding: string }>;
}
```

### 60.2 — Write tests first

Create `packages/cli/src/device/templates.test.ts`. Test cases:

- `getTemplateManifest('pencil')` returns a manifest with `displayName: 'Design Studio'`.
- `getTemplateManifest('remotion')` returns a manifest containing ffmpeg, node, and chromium dependencies.
- `getTemplateManifest('nextmedal')` returns a manifest with node and pnpm dependencies.
- Every dependency has a non-empty `benefitLabel` (no technical jargon check: must not contain words like "install", "package", "binary").
- Every dependency has a valid `checkCommand` starting with `which` or `command -v`.
- Every dependency has a non-empty `nixPackage`.
- `getTemplateManifest('nonexistent')` throws `PilotError`.
- All templates have at least one skill binding.

### 60.3 — Implement template manifests

Create `packages/cli/src/device/templates.ts`:

```ts
import type { TemplateManifest } from './types.js';

const TEMPLATES: Record<string, TemplateManifest> = {
  pencil: {
    name: 'pencil',
    displayName: 'Design Studio',
    setupMessage: 'Setting up your design studio...',
    dependencies: [
      {
        tool: 'pencil-mcp',
        benefitLabel: 'Design engine',
        required: true,
        checkCommand: 'which pencil-mcp',
        nixPackage: 'pencil-mcp',
        platforms: ['darwin', 'linux'],
      },
      {
        tool: 'zed',
        benefitLabel: 'Code editor with design extensions',
        required: false,
        checkCommand: 'which zed',
        nixPackage: 'zed-editor',
        platforms: ['darwin', 'linux'],
      },
      // Geist fonts, color tokens
    ],
    skills: [
      { name: 'Designer', binding: 'pencil' },
      { name: 'Brand', binding: 'brand' },
    ],
  },

  remotion: {
    name: 'remotion',
    displayName: 'Video Studio',
    setupMessage: 'Setting up your video studio...',
    dependencies: [
      {
        tool: 'node',
        benefitLabel: 'Runtime engine',
        required: true,
        checkCommand: 'which node',
        nixPackage: 'nodejs',
        platforms: ['darwin', 'linux'],
      },
      {
        tool: 'ffmpeg',
        benefitLabel: 'Video engine',
        required: true,
        checkCommand: 'which ffmpeg',
        nixPackage: 'ffmpeg',
        platforms: ['darwin', 'linux'],
      },
      {
        tool: 'chromium',
        benefitLabel: 'Render engine',
        required: true,
        checkCommand: 'which chromium',
        nixPackage: 'chromium',
        platforms: ['darwin', 'linux'],
      },
    ],
    skills: [
      { name: 'Motion Designer', binding: 'remotion' },
      { name: 'Video Editor', binding: 'ffmpeg' },
    ],
  },

  nextmedal: {
    name: 'nextmedal',
    displayName: 'Web App',
    setupMessage: 'Setting up your web app...',
    dependencies: [
      {
        tool: 'node',
        benefitLabel: 'Runtime engine',
        required: true,
        checkCommand: 'which node',
        nixPackage: 'nodejs',
        platforms: ['darwin', 'linux'],
      },
      {
        tool: 'pnpm',
        benefitLabel: 'Package coordinator',
        required: true,
        checkCommand: 'which pnpm',
        nixPackage: 'pnpm',
        platforms: ['darwin', 'linux'],
      },
    ],
    skills: [
      { name: 'Tech Lead', binding: 'nextjs' },
      { name: 'Database Admin', binding: 'database' },
    ],
  },
};

export function getTemplateManifest(name: string): TemplateManifest {
  const manifest = TEMPLATES[name];
  if (!manifest) {
    throw new PilotError(
      `Unknown template: "${name}". Available: ${Object.keys(TEMPLATES).join(', ')}`,
    );
  }
  return manifest;
}

export function listTemplates(): string[] {
  return Object.keys(TEMPLATES);
}
```

### 60.4 — Verify all tests pass, commit

```
device: add template dependency manifests

Define pencil, remotion, and nextmedal manifests with
benefit labels, Nix packages, and skill bindings.
```

---

## Task 61: Nix abstraction layer

**Create:**
- `packages/cli/src/device/nix.ts`

**Test:**
- `packages/cli/src/device/nix.test.ts`

### 61.1 — Write tests first

Create `packages/cli/src/device/nix.test.ts`. All tests mock `execFileNoThrow` — never run real Nix commands. Test cases:

- `isNixInstalled()` returns `true` when `command -v nix` succeeds.
- `isNixInstalled()` returns `false` when `command -v nix` fails.
- `installNix()` calls `execFileNoThrow` with the Determinate Systems installer URL and `--no-confirm` flag.
- `installNix()` calls `onProgress` with status messages during installation.
- `installNix()` throws `PilotError` with a friendly message if the installer fails.
- `nixInstall(['ffmpeg', 'nodejs'])` calls `execFileNoThrow` with `nix-env -iA` for each package.
- `nixInstall()` calls `onProgress` with `'installing'` then `'done'` for each package.
- `nixInstall()` throws `PilotError` if a package fails to install.
- `darwinRebuild('ali-pro')` calls `execFileNoThrow` with `darwin-rebuild switch --flake ".#ali-pro"`.
- `darwinRebuild()` throws `PilotError` if rebuild fails.
- `nixosRebuild('server')` calls `execFileNoThrow` with `sudo nixos-rebuild switch --flake ".#server"`.
- No test actually invokes Nix (all mocked).

### 61.2 — Implement Nix abstraction

Create `packages/cli/src/device/nix.ts`:

```ts
import { execFileNoThrow } from '../utils/execFileNoThrow.js';

export async function isNixInstalled(): Promise<boolean> {
  const result = await execFileNoThrow('sh', ['-c', 'command -v nix']);
  return result.status === 0;
}

export async function installNix(
  onProgress: (msg: string) => void,
): Promise<void> {
  onProgress('Preparing your environment');
  const result = await execFileNoThrow('sh', [
    '-c',
    'curl --proto "=https" --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install --no-confirm',
  ]);
  if (result.status !== 0) {
    throw new PilotError(
      'Could not prepare your environment. Check your internet connection and try again.',
    );
  }
  onProgress('Environment ready');
}

export async function nixInstall(
  packages: string[],
  onProgress: (pkg: string, status: 'installing' | 'done') => void,
): Promise<void> {
  for (const pkg of packages) {
    onProgress(pkg, 'installing');
    const result = await execFileNoThrow('nix-env', ['-iA', `nixpkgs.${pkg}`]);
    if (result.status !== 0) {
      throw new PilotError(
        `Could not set up ${pkg}. Try running "pilot up" again.`,
      );
    }
    onProgress(pkg, 'done');
  }
}

export async function darwinRebuild(
  machine: string,
  onProgress: (msg: string) => void,
): Promise<void> {
  onProgress('Applying machine configuration');
  const result = await execFileNoThrow('darwin-rebuild', [
    'switch', '--flake', `.#${machine}`,
  ]);
  if (result.status !== 0) {
    throw new PilotError(
      'Could not apply machine configuration. Check your flake and try again.',
    );
  }
  onProgress('Machine configured');
}

export async function nixosRebuild(
  machine: string,
  onProgress: (msg: string) => void,
): Promise<void> {
  onProgress('Applying server configuration');
  const result = await execFileNoThrow('sudo', [
    'nixos-rebuild', 'switch', '--flake', `.#${machine}`,
  ]);
  if (result.status !== 0) {
    throw new PilotError(
      'Could not apply server configuration. Check your flake and try again.',
    );
  }
  onProgress('Server configured');
}
```

Key rules:
- Always use `execFileNoThrow` from the codebase utility — never use raw `exec`.
- All error messages are user-friendly — no technical details leaked to the user.
- Progress callbacks let the UI layer show benefit-oriented messages.

### 61.3 — Verify all tests pass, commit

```
device: add nix abstraction layer

Bridge between Pilot and Nix. Handles install, package setup,
darwin-rebuild, and nixos-rebuild with friendly error messages.
```

---

## Task 62: Template installer (orchestrator)

**Create:**
- `packages/cli/src/device/installer.ts`

**Modify:**
- `packages/cli/src/commands/up.ts` — wire installer into `pilot up` flow

**Test:**
- `packages/cli/src/device/installer.test.ts`

### 62.1 — Define `StepItem` type

Add to `packages/cli/src/device/types.ts`:

```ts
export interface StepItem {
  label: string;
  status: 'waiting' | 'active' | 'done' | 'error';
  detail?: string;
}
```

### 62.2 — Write tests first

Create `packages/cli/src/device/installer.test.ts`. Mock `detectDevice`, `getTemplateManifest`, `isNixInstalled`, `nixInstall`, and `installNix`. Test cases:

- Installs all missing dependencies for a template.
- Skips dependencies already installed on the device.
- Skips dependencies not matching the current platform.
- Installs Nix first if missing and there are packages to install.
- Does not install Nix if all dependencies are already present.
- Calls `onStep` with `'waiting'` for missing deps, `'done'` for installed deps.
- Calls `onStep` with `'active'` then `'done'` as each dep is installed.
- Binds skills after dependencies are installed.
- Throws `PilotError` if template is unknown.
- Throws `PilotError` with friendly message if Nix install fails.

### 62.3 — Implement `installTemplate()`

Create `packages/cli/src/device/installer.ts`:

```ts
import { detectDevice } from './detect.js';
import { getTemplateManifest } from './templates.js';
import { isNixInstalled, installNix, nixInstall } from './nix.js';
import type { StepItem, TemplateDependency } from './types.js';

export async function installTemplate(
  templateName: string,
  onStep: (step: StepItem) => void,
  onProgress: (message: string) => void,
): Promise<void> {
  // 1. Detect device
  const device = await detectDevice();

  // 2. Get template manifest
  const manifest = getTemplateManifest(templateName);
  onProgress(manifest.setupMessage);

  // 3. Check each dependency against device
  const missing: TemplateDependency[] = [];
  for (const dep of manifest.dependencies) {
    if (!dep.platforms.includes(device.os)) continue;

    const installed = device.installedTools.has(dep.tool) &&
      device.installedTools.get(dep.tool) !== false;

    if (installed) {
      onStep({ label: dep.benefitLabel, status: 'done', detail: 'ready' });
    } else {
      missing.push(dep);
      onStep({ label: dep.benefitLabel, status: 'waiting' });
    }
  }

  // 4. Ensure Nix is installed if we need to install anything
  if (missing.length > 0 && !device.nixInstalled) {
    onStep({ label: 'Preparing your environment', status: 'active' });
    await installNix(onProgress);
    onStep({ label: 'Preparing your environment', status: 'done' });
  }

  // 5. Install missing packages
  for (const dep of missing) {
    onStep({ label: dep.benefitLabel, status: 'active' });
    await nixInstall([dep.nixPackage], (pkg, status) => {
      if (status === 'done') {
        onStep({ label: dep.benefitLabel, status: 'done', detail: 'ready' });
      }
    });
  }

  // 6. Bind skills
  for (const skill of manifest.skills) {
    onStep({ label: `${skill.name}`, status: 'done', detail: 'bound' });
  }
}
```

### 62.4 — Wire into `pilot up`

Modify `packages/cli/src/commands/up.ts` to call `installTemplate()` after parsing the template argument. Pass Ink-compatible `onStep` and `onProgress` callbacks that update the existing step list UI.

### 62.5 — Verify all tests pass, commit

```
device: add template installer and wire into pilot up

Orchestrates detection, dependency resolution, Nix install,
and skill binding with benefit-oriented progress display.
```

---

## Task 63: Re-run detection (idempotency)

**Modify:**
- `packages/cli/src/device/installer.ts` — add idempotent re-run logic

**Create:**
- `packages/cli/src/device/state.ts`

**Test (add to existing):**
- `packages/cli/src/device/installer.test.ts`

### 63.1 — Define state types

Create `packages/cli/src/device/state.ts`:

```ts
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface InstalledTemplate {
  name: string;
  installedAt: string;      // ISO timestamp
  lastChecked: string;       // ISO timestamp
  dependencies: Record<string, boolean>; // tool -> installed
}

interface PilotState {
  templates: Record<string, InstalledTemplate>;
}

const STATE_DIR = join(homedir(), '.pilot');
const STATE_FILE = join(STATE_DIR, 'templates.json');

export async function loadState(): Promise<PilotState> {
  try {
    const data = await readFile(STATE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { templates: {} };
  }
}

export async function saveState(state: PilotState): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

export async function markTemplateInstalled(
  name: string,
  dependencies: Record<string, boolean>,
): Promise<void> {
  const state = await loadState();
  const now = new Date().toISOString();
  state.templates[name] = {
    name,
    installedAt: state.templates[name]?.installedAt ?? now,
    lastChecked: now,
    dependencies,
  };
  await saveState(state);
}

export async function getInstalledTemplate(
  name: string,
): Promise<InstalledTemplate | undefined> {
  const state = await loadState();
  return state.templates[name];
}
```

### 63.2 — Write tests

Add to `packages/cli/src/device/installer.test.ts`:

- When template was previously installed and all deps are still present, shows "Already set up" for each dep.
- When template was previously installed but a dep was removed, re-installs only that dep.
- Updates `lastChecked` timestamp on re-run.
- Preserves original `installedAt` timestamp on re-run.

### 63.3 — Update installer for idempotency

Modify `installTemplate()` in `packages/cli/src/device/installer.ts`:

- After completing installation, call `markTemplateInstalled()` with current dependency status.
- At the start, load previous state. If template exists in state, still re-check all deps (something may have been uninstalled).
- When a dep is found installed on re-run, show `{ label: dep.benefitLabel, status: 'done', detail: 'ready' }`.

### 63.4 — Verify all tests pass, commit

```
device: add idempotent re-run and state persistence

Track installed templates in ~/.pilot/templates.json.
Re-runs check for removed tools and only install what's missing.
```

---

## Task 64: Device profile display (`pilot status`)

**Modify:**
- `packages/cli/src/screens/Status.tsx` — show device info and installed templates

### 64.1 — Write tests

Add tests for the Status screen that verify:

- Displays machine hostname, OS version, and chip label.
- Lists installed templates with checkmarks.
- Shows "Missing: none" when all deps are satisfied.
- Shows missing dep names (benefit labels, not technical names) when deps are missing.
- Shows last update time in relative format ("2h ago").

### 64.2 — Implement device profile in Status screen

Modify `packages/cli/src/screens/Status.tsx` to call `detectDevice()` and `loadState()`, then render:

```
Machine: {hostname} · {osLabel} · {chip}
Templates: {installed templates with checkmarks}
Missing: {missing deps or "none"}
Last update: {relative time} · commit {short hash}
```

All labels are benefit-oriented. The OS label is human-readable ("macOS 15.4" not "darwin"). The commit hash comes from git.

### 64.3 — Verify all tests pass, commit

```
device: show device profile and templates in pilot status

Display machine info, installed templates, and missing
dependencies using benefit labels in the status screen.
```

---

## Important notes for all tasks

- **TDD throughout:** Write tests first, implement second. Tests must pass before committing.
- **Security:** Use `execFileNoThrow` from `src/utils/execFileNoThrow.ts` for all shell commands. Never use raw `exec` or string interpolation in commands.
- **User-facing text:** Benefit labels only. Never expose Nix, npm, package names, file paths, or version numbers to users.
- **Errors:** Wrap in `PilotError` with friendly, actionable messages. Log technical details internally.
- **Nix in tests:** All Nix interactions are mocked. Tests never invoke real Nix commands.
- **Commit after each task** with a descriptive message.
- **After all tasks:** Update `README.md` Feature Tracker status from `Planned` to `Done` for: device detection, template manifests, Nix abstraction, template installer, re-run detection, and device profile display.

---

## Files summary

| Action | Path |
|--------|------|
| Create | `packages/cli/src/device/types.ts` |
| Create | `packages/cli/src/device/detect.ts` |
| Create | `packages/cli/src/device/detect.test.ts` |
| Create | `packages/cli/src/device/templates.ts` |
| Create | `packages/cli/src/device/templates.test.ts` |
| Create | `packages/cli/src/device/nix.ts` |
| Create | `packages/cli/src/device/nix.test.ts` |
| Create | `packages/cli/src/device/installer.ts` |
| Create | `packages/cli/src/device/installer.test.ts` |
| Create | `packages/cli/src/device/state.ts` |
| Modify | `packages/cli/src/commands/up.ts` |
| Modify | `packages/cli/src/screens/Status.tsx` |
| Modify | `README.md` |
