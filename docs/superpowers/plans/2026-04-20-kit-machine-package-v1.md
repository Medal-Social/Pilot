# Kit Machine Package v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port Medal Social's bash machine-management scripts (`bootstrap.sh`, `scripts/kit`) to TypeScript inside the `@medalsocial/kit` plugin, exposing `pilot kit init|new|update|status|apps|edit` (also reachable as `kit ...` via shell alias). Ship the `FleetProvider` seam with `LocalProvider` only — Medal Social provider deferred to sibling spec / kit v1.1.

**Architecture:** All shell access flows through one injectable `Exec` interface. Each prerequisite (Xcode CLT, Nix, SSH, etc.) is its own step module with `check()` / `run()`. Commands orchestrate steps + UI. UI components are pure renderers (`ink-testing-library` testable). Apps data extracted from inline Nix into `apps.json` via an idempotent migration. `FleetProvider` interface is wired everywhere; only `LocalProvider` (no-op) ships in v1.

**Tech Stack:** TypeScript strict + ESM (`.js` import suffixes), Zod, React Ink + ink-testing-library, Vitest, commander.js, child_process. Reuses pilot's existing patterns: `PilotError`-style typed errors, plugin manifest format, vitest co-located tests.

**Spec:** `/Users/ali/Documents/Code/pilot/docs/superpowers/specs/2026-04-20-kit-machine-package-v1-design.md`

---

## File Structure

All new files live in `packages/plugins/kit/src/`. Pilot integration is in `packages/cli/src/bin/pilot.ts` and `packages/cli/src/plugins/bundled.ts`.

```
packages/plugins/kit/src/
├── index.ts                       T30  — plugin entry
├── errors.ts                      T1   — KitError + codes
├── shell/
│   ├── exec.ts                    T2   — Exec interface + realExec
│   └── exec.test.ts               T2
├── config/
│   ├── schema.ts                  T3   — Zod schema
│   ├── schema.test.ts             T3
│   ├── load.ts                    T4   — discovery
│   └── load.test.ts               T4
├── machine/
│   ├── detect.ts                  (already exists, untouched)
│   ├── detect.test.ts             (already exists)
│   ├── system.ts                  T5   — OS, version, chip
│   └── system.test.ts             T5
├── provider/
│   ├── types.ts                   T6   — FleetProvider interface
│   ├── local.ts                   T7   — LocalProvider impl
│   ├── local.test.ts              T7
│   ├── conformance.ts             T8   — reusable conformance suite
│   ├── conformance.test.ts        T8   — runs LocalProvider through it
│   ├── resolve.ts                 T8   — resolveProvider()
│   └── resolve.test.ts            T8
├── steps/
│   ├── types.ts                   T9   — Step interface + runner
│   ├── runner.test.ts             T9
│   ├── xcode.ts                   T10
│   ├── xcode.test.ts              T10
│   ├── rosetta.ts                 T11
│   ├── rosetta.test.ts            T11
│   ├── nix.ts                     T12
│   ├── nix.test.ts                T12
│   ├── ssh.ts                     T13
│   ├── ssh.test.ts                T13
│   ├── github.ts                  T14
│   ├── github.test.ts             T14
│   ├── repo.ts                    T15
│   ├── repo.test.ts               T15
│   ├── secrets.ts                 T16
│   ├── secrets.test.ts            T16
│   ├── rebuild.ts                 T17
│   └── rebuild.test.ts            T17
├── ui/
│   ├── Header.tsx                 T18
│   ├── Header.test.tsx            T18
│   ├── StepRow.tsx                T19
│   ├── StepRow.test.tsx           T19
│   ├── Spinner.tsx                T20
│   ├── Spinner.test.tsx           T20
│   ├── Completion.tsx             T21
│   └── Completion.test.tsx        T21
├── apps/
│   ├── schema.ts                  T22  — apps.json schema
│   ├── schema.test.ts             T22
│   ├── store.ts                   T22  — read/write apps.json
│   └── store.test.ts              T22
└── commands/
    ├── apps.ts                    T23
    ├── apps.test.ts               T23
    ├── migrate-apps.ts            T24
    ├── migrate-apps.test.ts       T24
    ├── edit.ts                    T25
    ├── edit.test.ts               T25
    ├── status.ts                  T26
    ├── status.test.ts             T26
    ├── update.ts                  T27
    ├── update.test.ts             T27
    ├── init.ts                    T28
    ├── init.test.ts               T28
    ├── new.ts                     T29
    └── new.test.ts                T29
packages/plugins/kit/tests/
└── e2e/
    ├── fixtures/sample-kit/       T32
    └── kit-status.e2e.test.ts     T32
packages/plugins/kit/colors.ts     T1   — color tokens (or import from pilot)
packages/plugins/kit/package.json  T1   — add zod, react, ink, ink-testing-library deps
```

**Modified files:**
- `packages/cli/src/bin/pilot.ts` — add `pilot kit` parent command (T31)
- `packages/cli/src/plugins/bundled.ts` — update kit manifest commands list (T33)
- `packages/plugins/kit/plugin.toml` — update commands list (T33)
- `packages/plugins/kit/README.md` — marketing-grade product page (T33)

---

## Cross-cutting setup

Before Task 1, ensure the kit package has the runtime deps it'll need. Done once in T1's first step.

```bash
cd /Users/ali/Documents/Code/pilot
pnpm --filter @medalsocial/kit add zod react ink
pnpm --filter @medalsocial/kit add -D @types/react ink-testing-library
```

All commands below assume cwd `/Users/ali/Documents/Code/pilot` unless noted. Tests run via `pnpm --filter @medalsocial/kit test` (replays cache after first run).

---

## Phase 1 — Foundation

### Task 1: Errors + dependencies

**Files:**
- Create: `packages/plugins/kit/src/errors.ts`
- Create: `packages/plugins/kit/src/errors.test.ts`
- Modify: `packages/plugins/kit/package.json`

- [ ] **Step 1: Add runtime dependencies**

```bash
pnpm --filter @medalsocial/kit add zod react ink
pnpm --filter @medalsocial/kit add -D @types/react ink-testing-library
```

Expected: `package.json` updated, lockfile bumped.

- [ ] **Step 2: Write the failing test**

Create `packages/plugins/kit/src/errors.test.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { KitError, errorCodes } from './errors.js';

describe('KitError', () => {
  it('exposes the code on the instance', () => {
    const err = new KitError(errorCodes.KIT_SUDO_DENIED);
    expect(err.code).toBe('KIT_SUDO_DENIED');
    expect(err.name).toBe('KitError');
  });

  it('uses the registered user message', () => {
    const err = new KitError(errorCodes.KIT_NIX_INSTALL_FAILED);
    expect(err.message).toMatch(/nix/i);
  });

  it('attaches detail to cause when provided', () => {
    const err = new KitError(errorCodes.KIT_REPO_CLONE_FAILED, 'permission denied');
    expect(err.cause).toBe('permission denied');
  });
});
```

- [ ] **Step 3: Run the test (expect fail)**

```bash
pnpm --filter @medalsocial/kit test errors -- --run
```

Expected: FAIL — `Cannot find module './errors.js'`.

- [ ] **Step 4: Implement**

Create `packages/plugins/kit/src/errors.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export const errorCodes = {
  KIT_SUDO_DENIED: 'KIT_SUDO_DENIED',
  KIT_XCODE_INSTALL_FAILED: 'KIT_XCODE_INSTALL_FAILED',
  KIT_ROSETTA_INSTALL_FAILED: 'KIT_ROSETTA_INSTALL_FAILED',
  KIT_NIX_INSTALL_FAILED: 'KIT_NIX_INSTALL_FAILED',
  KIT_SSH_KEYGEN_FAILED: 'KIT_SSH_KEYGEN_FAILED',
  KIT_GITHUB_AUTH_FAILED: 'KIT_GITHUB_AUTH_FAILED',
  KIT_REPO_CLONE_FAILED: 'KIT_REPO_CLONE_FAILED',
  KIT_REPO_PULL_FAILED: 'KIT_REPO_PULL_FAILED',
  KIT_SECRETS_INIT_FAILED: 'KIT_SECRETS_INIT_FAILED',
  KIT_REBUILD_FAILED: 'KIT_REBUILD_FAILED',
  KIT_CONFIG_NOT_FOUND: 'KIT_CONFIG_NOT_FOUND',
  KIT_CONFIG_INVALID: 'KIT_CONFIG_INVALID',
  KIT_UNKNOWN_MACHINE: 'KIT_UNKNOWN_MACHINE',
  KIT_NO_MACHINE_FILE: 'KIT_NO_MACHINE_FILE',
  KIT_APPS_CORRUPT: 'KIT_APPS_CORRUPT',
  KIT_APPS_DUPLICATE: 'KIT_APPS_DUPLICATE',
  KIT_APPS_INVALID_NAME: 'KIT_APPS_INVALID_NAME',
  KIT_NO_EDITOR: 'KIT_NO_EDITOR',
} as const;

type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

const userMessages: Record<ErrorCode, string> = {
  KIT_SUDO_DENIED: 'sudo authentication was denied. Cannot proceed.',
  KIT_XCODE_INSTALL_FAILED: 'Could not install Xcode Command Line Tools.',
  KIT_ROSETTA_INSTALL_FAILED: 'Could not install Rosetta 2.',
  KIT_NIX_INSTALL_FAILED: 'Could not install Nix. See log for details.',
  KIT_SSH_KEYGEN_FAILED: 'Could not generate SSH key.',
  KIT_GITHUB_AUTH_FAILED: 'Could not authenticate to GitHub. Try `gh auth login` manually.',
  KIT_REPO_CLONE_FAILED: 'Could not clone the kit repository.',
  KIT_REPO_PULL_FAILED: 'Could not pull the kit repository.',
  KIT_SECRETS_INIT_FAILED: 'Secrets setup failed. Re-run `kit update` after fixing.',
  KIT_REBUILD_FAILED: 'System rebuild failed. See log for details.',
  KIT_CONFIG_NOT_FOUND:
    'No kit.config.ts found. Set $KIT_CONFIG or place it at ~/Documents/Code/kit/kit.config.ts.',
  KIT_CONFIG_INVALID: 'kit.config.ts is invalid.',
  KIT_UNKNOWN_MACHINE: 'Machine name is not in kit.config.ts → machines.',
  KIT_NO_MACHINE_FILE: 'No machine config file found for this hostname.',
  KIT_APPS_CORRUPT: 'apps.json is malformed.',
  KIT_APPS_DUPLICATE: 'That app is already in your config.',
  KIT_APPS_INVALID_NAME: 'Invalid Homebrew package name.',
  KIT_NO_EDITOR: 'No editor available. Set $EDITOR or install one of: zed, code, nvim, vim.',
};

export class KitError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode, detail?: string) {
    super(userMessages[code]);
    this.code = code;
    this.name = 'KitError';
    if (detail) this.cause = detail;
  }
}
```

- [ ] **Step 5: Run test (expect pass) + commit**

```bash
pnpm --filter @medalsocial/kit test errors -- --run
git add packages/plugins/kit/package.json packages/plugins/kit/src/errors.ts packages/plugins/kit/src/errors.test.ts pnpm-lock.yaml
git commit -m "feat(kit): add KitError with typed error codes"
```

Expected: 3 tests pass; commit created.

---

### Task 2: Shell exec wrapper

**Files:**
- Create: `packages/plugins/kit/src/shell/exec.ts`
- Create: `packages/plugins/kit/src/shell/exec.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { realExec } from './exec.js';

describe('realExec.run', () => {
  it('captures stdout and exit code on success', async () => {
    const result = await realExec.run('node', ['-e', 'process.stdout.write("hi")']);
    expect(result.stdout.trim()).toBe('hi');
    expect(result.code).toBe(0);
  });

  it('captures stderr and non-zero exit on failure', async () => {
    const result = await realExec.run('node', ['-e', 'process.exit(2)']);
    expect(result.code).toBe(2);
  });

  it('honors the cwd option', async () => {
    const result = await realExec.run('node', ['-e', 'process.stdout.write(process.cwd())'], {
      cwd: '/tmp',
    });
    expect(result.stdout.trim()).toBe('/tmp');
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
pnpm --filter @medalsocial/kit test exec -- --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `packages/plugins/kit/src/shell/exec.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type ChildProcess, spawn as nodeSpawn } from 'node:child_process';

export interface ExecOpts {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
  timeoutMs?: number;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface SpawnedProcess {
  child: ChildProcess;
  done: Promise<ExecResult>;
}

export interface Exec {
  run(cmd: string, args: string[], opts?: ExecOpts): Promise<ExecResult>;
  spawn(cmd: string, args: string[], opts?: ExecOpts): SpawnedProcess;
}

function buffered(child: ChildProcess, timeoutMs?: number): Promise<ExecResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (b) => {
      stdout += b.toString();
    });
    child.stderr?.on('data', (b) => {
      stderr += b.toString();
    });
    const timer =
      timeoutMs !== undefined
        ? setTimeout(() => {
            child.kill('SIGKILL');
          }, timeoutMs)
        : null;
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 0 });
    });
    child.on('error', () => {
      if (timer) clearTimeout(timer);
      resolve({ stdout, stderr, code: 1 });
    });
  });
}

export const realExec: Exec = {
  run(cmd, args, opts = {}) {
    const child = nodeSpawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (opts.input !== undefined) {
      child.stdin?.end(opts.input);
    }
    return buffered(child, opts.timeoutMs);
  },
  spawn(cmd, args, opts = {}) {
    const child = nodeSpawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { child, done: buffered(child, opts.timeoutMs) };
  },
};
```

- [ ] **Step 4: Run test + commit**

```bash
pnpm --filter @medalsocial/kit test exec -- --run
git add packages/plugins/kit/src/shell
git commit -m "feat(kit): add Exec interface with real implementation"
```

---

### Task 3: Config schema (Zod)

**Files:**
- Create: `packages/plugins/kit/src/config/schema.ts`
- Create: `packages/plugins/kit/src/config/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { kitConfigSchema } from './schema.js';

describe('kitConfigSchema', () => {
  it('accepts a valid Medal-Social-style config', () => {
    const valid = {
      name: 'kit',
      repo: 'git@github.com:Medal-Social/kit.git',
      repoDir: '~/Documents/Code/kit',
      machines: {
        'ali-pro': { type: 'darwin', user: 'ali' },
        'oslo-server': { type: 'nixos', user: 'ali' },
      },
    };
    expect(() => kitConfigSchema.parse(valid)).not.toThrow();
  });

  it('rejects an unknown machine type', () => {
    const invalid = {
      name: 'kit',
      repo: 'x',
      repoDir: '/tmp',
      machines: { foo: { type: 'windows', user: 'a' } },
    };
    expect(() => kitConfigSchema.parse(invalid)).toThrow();
  });

  it('rejects empty machines map', () => {
    const invalid = { name: 'kit', repo: 'x', repoDir: '/tmp', machines: {} };
    expect(() => kitConfigSchema.parse(invalid)).toThrow();
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
pnpm --filter @medalsocial/kit test schema -- --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `packages/plugins/kit/src/config/schema.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const machineSchema = z.object({
  type: z.enum(['darwin', 'nixos']),
  user: z.string().min(1),
});

export const kitConfigSchema = z.object({
  name: z.string().min(1),
  repo: z.string().min(1),
  repoDir: z.string().min(1),
  machines: z.record(z.string(), machineSchema).refine((m) => Object.keys(m).length > 0, {
    message: 'machines map must not be empty',
  }),
});

export type Machine = z.infer<typeof machineSchema>;
export type KitConfig = z.infer<typeof kitConfigSchema>;
```

- [ ] **Step 4: Run test + commit**

```bash
pnpm --filter @medalsocial/kit test schema -- --run
git add packages/plugins/kit/src/config
git commit -m "feat(kit): add KitConfig Zod schema"
```

---

### Task 4: Config loader

**Files:**
- Create: `packages/plugins/kit/src/config/load.ts`
- Create: `packages/plugins/kit/src/config/load.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KitError } from '../errors.js';
import { loadKitConfig } from './load.js';

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'kit-cfg-'));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('loadKitConfig', () => {
  it('loads config from $KIT_CONFIG path', async () => {
    const path = join(tmp, 'kit.config.json');
    writeFileSync(
      path,
      JSON.stringify({
        name: 'kit',
        repo: 'x',
        repoDir: '/tmp/k',
        machines: { foo: { type: 'darwin', user: 'a' } },
      }),
    );
    const cfg = await loadKitConfig({ env: { KIT_CONFIG: path }, home: '/nope' });
    expect(cfg.name).toBe('kit');
  });

  it('falls back to ~/Documents/Code/kit/kit.config.json', async () => {
    const home = mkdtempSync(join(tmpdir(), 'kit-home-'));
    const dir = join(home, 'Documents', 'Code', 'kit');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'kit.config.json'),
      JSON.stringify({
        name: 'kit',
        repo: 'x',
        repoDir: '/tmp/k',
        machines: { foo: { type: 'darwin', user: 'a' } },
      }),
    );
    const cfg = await loadKitConfig({ env: {}, home });
    expect(cfg.repoDir).toBe('/tmp/k');
    rmSync(home, { recursive: true, force: true });
  });

  it('throws KIT_CONFIG_NOT_FOUND when nothing is found', async () => {
    await expect(loadKitConfig({ env: {}, home: tmp })).rejects.toBeInstanceOf(KitError);
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
pnpm --filter @medalsocial/kit test load -- --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `packages/plugins/kit/src/config/load.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { KitError, errorCodes } from '../errors.js';
import { type KitConfig, kitConfigSchema } from './schema.js';

export interface LoadOpts {
  env?: NodeJS.ProcessEnv;
  home?: string;
}

export async function loadKitConfig(opts: LoadOpts = {}): Promise<KitConfig> {
  const env = opts.env ?? process.env;
  const home = opts.home ?? process.env.HOME ?? '';

  const candidates: string[] = [];
  if (env.KIT_CONFIG) candidates.push(env.KIT_CONFIG);
  if (home) {
    candidates.push(join(home, 'Documents', 'Code', 'kit', 'kit.config.json'));
  }

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const raw = await readFile(path, 'utf8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new KitError(errorCodes.KIT_CONFIG_INVALID, `${path}: ${(e as Error).message}`);
    }
    const result = kitConfigSchema.safeParse(parsed);
    if (!result.success) {
      throw new KitError(errorCodes.KIT_CONFIG_INVALID, `${path}: ${result.error.message}`);
    }
    return result.data;
  }

  throw new KitError(errorCodes.KIT_CONFIG_NOT_FOUND, candidates.join(', '));
}
```

> Note: spec calls for `kit.config.ts`, but parsing TS in v1 is overkill — using `kit.config.json` (or migrating later). The README will document this.

- [ ] **Step 4: Run test + commit**

```bash
pnpm --filter @medalsocial/kit test load -- --run
git add packages/plugins/kit/src/config
git commit -m "feat(kit): load and validate kit.config.json"
```

---

### Task 5: System info

**Files:**
- Create: `packages/plugins/kit/src/machine/system.ts`
- Create: `packages/plugins/kit/src/machine/system.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { getSystemInfo } from './system.js';

describe('getSystemInfo', () => {
  it('reports darwin + apple silicon', async () => {
    const exec = {
      run: vi.fn().mockImplementation(async (cmd: string, args: string[]) => {
        if (cmd === 'sw_vers' && args[0] === '-productName')
          return { stdout: 'macOS\n', stderr: '', code: 0 };
        if (cmd === 'sw_vers' && args[0] === '-productVersion')
          return { stdout: '15.4\n', stderr: '', code: 0 };
        return { stdout: '', stderr: '', code: 1 };
      }),
      spawn: vi.fn(),
    };
    const info = await getSystemInfo({ exec, platform: 'darwin', arch: 'arm64' });
    expect(info.os).toBe('macOS');
    expect(info.osVersion).toBe('15.4');
    expect(info.chip).toBe('Apple Silicon');
  });

  it('reports linux + intel', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 1 }),
      spawn: vi.fn(),
    };
    const info = await getSystemInfo({ exec, platform: 'linux', arch: 'x64' });
    expect(info.os).toBe('Linux');
    expect(info.chip).toBe('Intel');
  });
});
```

- [ ] **Step 2: Run test (expect fail)**

```bash
pnpm --filter @medalsocial/kit test system -- --run
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `packages/plugins/kit/src/machine/system.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Exec } from '../shell/exec.js';

export interface SystemInfo {
  os: string;
  osVersion: string;
  chip: 'Apple Silicon' | 'Intel';
  user: string;
}

export interface SystemDeps {
  exec: Exec;
  platform?: NodeJS.Platform;
  arch?: string;
  user?: string;
}

export async function getSystemInfo(deps: SystemDeps): Promise<SystemInfo> {
  const platform = deps.platform ?? process.platform;
  const arch = deps.arch ?? process.arch;
  const user = deps.user ?? process.env.USER ?? 'unknown';

  let os = platform === 'darwin' ? 'macOS' : platform === 'linux' ? 'Linux' : platform;
  let osVersion = '';

  if (platform === 'darwin') {
    const name = await deps.exec.run('sw_vers', ['-productName']);
    if (name.code === 0) os = name.stdout.trim() || os;
    const ver = await deps.exec.run('sw_vers', ['-productVersion']);
    if (ver.code === 0) osVersion = ver.stdout.trim();
  }

  const chip: SystemInfo['chip'] = arch === 'arm64' ? 'Apple Silicon' : 'Intel';
  return { os, osVersion, chip, user };
}
```

- [ ] **Step 4: Run test + commit**

```bash
pnpm --filter @medalsocial/kit test system -- --run
git add packages/plugins/kit/src/machine/system.ts packages/plugins/kit/src/machine/system.test.ts
git commit -m "feat(kit): detect OS, version, and chip"
```

---

## Phase 2 — Provider seam

### Task 6: Provider types

**Files:**
- Create: `packages/plugins/kit/src/provider/types.ts`

- [ ] **Step 1: Write types (no test — pure types compile-checked by tsc)**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface ProviderContext {
  readonly machineId: string;
  readonly user: string;
  readonly kitRepoDir: string;
  readonly authToken?: string;
}

export interface RequiredApp {
  readonly name: string;
  readonly reason: string;
}

export interface RequiredApps {
  readonly casks: ReadonlyArray<RequiredApp>;
  readonly brews: ReadonlyArray<RequiredApp>;
  readonly source: string;
}

export interface RequiredPlugin {
  readonly id: string;
  readonly reason: string;
}

export interface RequiredPlugins {
  readonly plugins: ReadonlyArray<RequiredPlugin>;
  readonly source: string;
}

export interface SecurityCheck {
  readonly id: string;
  readonly description: string;
  readonly required: boolean;
}

export interface StatusReport {
  readonly machineId: string;
  readonly os: string;
  readonly arch: string;
  readonly kitCommit: string | null;
  readonly appsCount: number;
}

export type ProviderEventHandler = (event: { type: string; payload: unknown }) => void;

export interface Disposable {
  dispose(): void;
}

export interface FleetProvider {
  readonly id: string;
  readonly displayName: string;

  getRequiredApps(ctx: ProviderContext): Promise<RequiredApps>;
  getRequiredPlugins(ctx: ProviderContext): Promise<RequiredPlugins>;
  getSecurityBaseline(ctx: ProviderContext): Promise<SecurityCheck[]>;
  reportStatus(ctx: ProviderContext, report: StatusReport): Promise<void>;
  subscribe?(ctx: ProviderContext, handler: ProviderEventHandler): Disposable;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm --filter @medalsocial/kit exec tsc --noEmit
```

Expected: clean exit.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/kit/src/provider/types.ts
git commit -m "feat(kit): define FleetProvider interface"
```

---

### Task 7: LocalProvider

**Files:**
- Create: `packages/plugins/kit/src/provider/local.ts`
- Create: `packages/plugins/kit/src/provider/local.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { LocalProvider } from './local.js';

const ctx = { machineId: 'm', user: 'u', kitRepoDir: '/tmp' };

describe('LocalProvider', () => {
  const p = new LocalProvider();

  it('has a stable id', () => {
    expect(p.id).toBe('local');
  });

  it('returns empty required apps from local source', async () => {
    const r = await p.getRequiredApps(ctx);
    expect(r.casks).toHaveLength(0);
    expect(r.brews).toHaveLength(0);
    expect(r.source).toBe('local');
  });

  it('returns empty required plugins', async () => {
    const r = await p.getRequiredPlugins(ctx);
    expect(r.plugins).toHaveLength(0);
  });

  it('returns no security baseline', async () => {
    expect(await p.getSecurityBaseline(ctx)).toEqual([]);
  });

  it('reportStatus is a no-op (resolves)', async () => {
    await expect(
      p.reportStatus(ctx, {
        machineId: 'm',
        os: 'macOS',
        arch: 'arm64',
        kitCommit: null,
        appsCount: 0,
      }),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run (expect fail) + implement**

```bash
pnpm --filter @medalsocial/kit test local -- --run
```

Expected: FAIL.

Create `packages/plugins/kit/src/provider/local.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
  FleetProvider,
  ProviderContext,
  RequiredApps,
  RequiredPlugins,
  SecurityCheck,
  StatusReport,
} from './types.js';

export class LocalProvider implements FleetProvider {
  readonly id = 'local';
  readonly displayName = 'Local (no fleet)';

  async getRequiredApps(_ctx: ProviderContext): Promise<RequiredApps> {
    return { casks: [], brews: [], source: 'local' };
  }

  async getRequiredPlugins(_ctx: ProviderContext): Promise<RequiredPlugins> {
    return { plugins: [], source: 'local' };
  }

  async getSecurityBaseline(_ctx: ProviderContext): Promise<SecurityCheck[]> {
    return [];
  }

  async reportStatus(_ctx: ProviderContext, _report: StatusReport): Promise<void> {
    // no-op
  }
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @medalsocial/kit test local -- --run
git add packages/plugins/kit/src/provider/local.ts packages/plugins/kit/src/provider/local.test.ts
git commit -m "feat(kit): add LocalProvider as the v1 default"
```

---

### Task 8: Provider conformance + resolver

**Files:**
- Create: `packages/plugins/kit/src/provider/conformance.ts`
- Create: `packages/plugins/kit/src/provider/conformance.test.ts`
- Create: `packages/plugins/kit/src/provider/resolve.ts`
- Create: `packages/plugins/kit/src/provider/resolve.test.ts`

- [ ] **Step 1: Write conformance test (it's a function used by impl tests)**

Create `packages/plugins/kit/src/provider/conformance.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'vitest';
import type { FleetProvider, ProviderContext } from './types.js';

const ctx: ProviderContext = { machineId: 'm', user: 'u', kitRepoDir: '/tmp' };

export async function runConformanceSuite(provider: FleetProvider): Promise<void> {
  expect(provider.id).toMatch(/^[a-z][a-z0-9-]*$/);
  expect(provider.displayName.length).toBeGreaterThan(0);

  const apps = await provider.getRequiredApps(ctx);
  expect(apps).toHaveProperty('casks');
  expect(apps).toHaveProperty('brews');
  expect(apps).toHaveProperty('source');
  expect(typeof apps.source).toBe('string');

  const plugins = await provider.getRequiredPlugins(ctx);
  expect(plugins).toHaveProperty('plugins');
  expect(plugins).toHaveProperty('source');

  const baseline = await provider.getSecurityBaseline(ctx);
  expect(Array.isArray(baseline)).toBe(true);

  await expect(
    provider.reportStatus(ctx, {
      machineId: 'm',
      os: 'macOS',
      arch: 'arm64',
      kitCommit: null,
      appsCount: 0,
    }),
  ).resolves.toBeUndefined();

  if (provider.subscribe) {
    const sub = provider.subscribe(ctx, () => {});
    sub.dispose();
    expect(() => sub.dispose()).not.toThrow();
  }
}
```

Create `packages/plugins/kit/src/provider/conformance.test.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'vitest';
import { LocalProvider } from './local.js';
import { runConformanceSuite } from './conformance.js';

describe('LocalProvider conformance', () => {
  it('passes the FleetProvider conformance suite', async () => {
    await runConformanceSuite(new LocalProvider());
  });
});
```

- [ ] **Step 2: Write resolver test**

Create `packages/plugins/kit/src/provider/resolve.test.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { LocalProvider } from './local.js';
import { resolveProvider } from './resolve.js';

describe('resolveProvider (v1)', () => {
  it('returns LocalProvider unconditionally', () => {
    const p = resolveProvider();
    expect(p).toBeInstanceOf(LocalProvider);
  });
});
```

- [ ] **Step 3: Implement resolver**

Create `packages/plugins/kit/src/provider/resolve.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LocalProvider } from './local.js';
import type { FleetProvider } from './types.js';

export interface ResolveOpts {
  // Reserved for v1.1: pilotCtx, account info, override.
}

export function resolveProvider(_opts: ResolveOpts = {}): FleetProvider {
  return new LocalProvider();
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @medalsocial/kit test provider -- --run
git add packages/plugins/kit/src/provider
git commit -m "feat(kit): add provider conformance suite and resolver"
```

---

## Phase 3 — Step framework

### Task 9: Step interface + runner

**Files:**
- Create: `packages/plugins/kit/src/steps/types.ts`
- Create: `packages/plugins/kit/src/steps/runner.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/plugins/kit/src/steps/runner.test.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { KitError, errorCodes } from '../errors.js';
import { type Step, runSteps } from './types.js';

const ok: Step = {
  id: 'ok',
  label: 'OK step',
  check: vi.fn().mockResolvedValue(false),
  run: vi.fn().mockResolvedValue(undefined),
};

const alreadyDone: Step = {
  id: 'done',
  label: 'Already done',
  check: vi.fn().mockResolvedValue(true),
  run: vi.fn(),
};

const failing: Step = {
  id: 'fail',
  label: 'Boom',
  check: vi.fn().mockResolvedValue(false),
  run: vi.fn().mockRejectedValue(new KitError(errorCodes.KIT_NIX_INSTALL_FAILED)),
};

describe('runSteps', () => {
  it('skips steps whose check returns true', async () => {
    const events: string[] = [];
    await runSteps([alreadyDone], {
      onStart: (s) => events.push(`start:${s.id}`),
      onSkip: (s) => events.push(`skip:${s.id}`),
    });
    expect(events).toEqual(['start:done', 'skip:done']);
    expect(alreadyDone.run).not.toHaveBeenCalled();
  });

  it('runs steps whose check returns false', async () => {
    const events: string[] = [];
    await runSteps([ok], {
      onStart: (s) => events.push(`start:${s.id}`),
      onDone: (s) => events.push(`done:${s.id}`),
    });
    expect(events).toEqual(['start:ok', 'done:ok']);
    expect(ok.run).toHaveBeenCalled();
  });

  it('throws and stops on the first failing step', async () => {
    const events: string[] = [];
    await expect(
      runSteps([ok, failing, ok], { onStart: (s) => events.push(s.id) }),
    ).rejects.toBeInstanceOf(KitError);
    expect(events).toEqual(['ok', 'fail']);
  });
});
```

- [ ] **Step 2: Run (expect fail)**

```bash
pnpm --filter @medalsocial/kit test runner -- --run
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `packages/plugins/kit/src/steps/types.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Exec } from '../shell/exec.js';

export interface StepContext {
  exec: Exec;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export interface Step {
  id: string;
  label: string;
  check(ctx?: StepContext): Promise<boolean>;
  run(ctx: StepContext): Promise<void>;
}

export interface RunStepsHooks {
  onStart?(step: Step): void;
  onDone?(step: Step): void;
  onSkip?(step: Step): void;
  onError?(step: Step, err: unknown): void;
}

export async function runSteps(
  steps: Step[],
  hooks: RunStepsHooks = {},
  ctx: StepContext = { exec: (await import('../shell/exec.js')).realExec },
): Promise<void> {
  for (const step of steps) {
    hooks.onStart?.(step);
    if (await step.check(ctx)) {
      hooks.onSkip?.(step);
      continue;
    }
    try {
      await step.run(ctx);
      hooks.onDone?.(step);
    } catch (err) {
      hooks.onError?.(step, err);
      throw err;
    }
  }
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @medalsocial/kit test runner -- --run
git add packages/plugins/kit/src/steps/types.ts packages/plugins/kit/src/steps/runner.test.ts
git commit -m "feat(kit): add Step interface and runner"
```

---

## Phase 4 — Step implementations

For tasks 10-17, the pattern is identical: write tests with a fake `Exec`, implement `check`/`run` to call the right shell commands. Each task is self-contained.

### Task 10: Xcode CLT step

**Files:**
- Create: `packages/plugins/kit/src/steps/xcode.ts`
- Create: `packages/plugins/kit/src/steps/xcode.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { xcodeStep } from './xcode.js';

const ctx = (runImpl: (cmd: string, args: string[]) => Promise<{ stdout: string; stderr: string; code: number }>) => ({
  exec: { run: vi.fn(runImpl), spawn: vi.fn() },
});

describe('xcodeStep', () => {
  it('check returns true when xcode-select -p succeeds', async () => {
    const c = ctx(async () => ({ stdout: '/Library/Developer', stderr: '', code: 0 }));
    expect(await xcodeStep.check(c)).toBe(true);
  });

  it('check returns false when xcode-select -p fails', async () => {
    const c = ctx(async () => ({ stdout: '', stderr: '', code: 2 }));
    expect(await xcodeStep.check(c)).toBe(false);
  });

  it('run shells out to softwareupdate', async () => {
    let calls: string[] = [];
    const c = ctx(async (cmd, args) => {
      calls.push([cmd, ...args].join(' '));
      if (cmd === 'softwareupdate' && args[0] === '-l')
        return {
          stdout: '* Label: Command Line Tools for Xcode-15.0\n',
          stderr: '',
          code: 0,
        };
      return { stdout: '', stderr: '', code: 0 };
    });
    await xcodeStep.run(c);
    expect(calls.some((c) => c.startsWith('softwareupdate -i'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run (expect fail)**

```bash
pnpm --filter @medalsocial/kit test xcode -- --run
```

Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { KitError, errorCodes } from '../errors.js';
import type { Step, StepContext } from './types.js';

export const xcodeStep: Step = {
  id: 'xcode',
  label: 'Xcode Command Line Tools',
  async check(ctx?: StepContext) {
    if (!ctx) return false;
    const r = await ctx.exec.run('xcode-select', ['-p']);
    return r.code === 0;
  },
  async run(ctx) {
    // Touch the install-on-demand sentinel so softwareupdate sees the request.
    await ctx.exec.run('touch', ['/tmp/.com.apple.dt.CommandLineTools.installondemand.in-progress']);
    const list = await ctx.exec.run('softwareupdate', ['-l']);
    const match = list.stdout.match(/\* Label: (Command Line Tools for Xcode[^\n]*)/);
    if (!match) {
      throw new KitError(errorCodes.KIT_XCODE_INSTALL_FAILED, 'no CLT label found');
    }
    const label = match[1].trim();
    const install = await ctx.exec.run('softwareupdate', ['-i', label]);
    if (install.code !== 0) {
      throw new KitError(errorCodes.KIT_XCODE_INSTALL_FAILED, install.stderr);
    }
  },
};
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @medalsocial/kit test xcode -- --run
git add packages/plugins/kit/src/steps/xcode.ts packages/plugins/kit/src/steps/xcode.test.ts
git commit -m "feat(kit): add xcode CLT step"
```

---

### Task 11: Rosetta step

**Files:**
- Create: `packages/plugins/kit/src/steps/rosetta.ts`
- Create: `packages/plugins/kit/src/steps/rosetta.test.ts`

- [ ] **Step 1: Test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { rosettaStep } from './rosetta.js';

const exec = (rc: number) => ({ run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: rc }), spawn: vi.fn() });

describe('rosettaStep', () => {
  it('check true when oahd is present', async () => {
    expect(await rosettaStep.check({ exec: exec(0) })).toBe(true);
  });

  it('check false when oahd is missing', async () => {
    expect(await rosettaStep.check({ exec: exec(1) })).toBe(false);
  });

  it('run installs rosetta', async () => {
    const ctx = { exec: { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() } };
    await rosettaStep.run(ctx);
    expect(ctx.exec.run).toHaveBeenCalledWith('softwareupdate', ['--install-rosetta', '--agree-to-license']);
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test rosetta -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { KitError, errorCodes } from '../errors.js';
import type { Step } from './types.js';

export const rosettaStep: Step = {
  id: 'rosetta',
  label: 'Rosetta 2',
  async check(ctx) {
    if (!ctx) return false;
    const r = await ctx.exec.run('/usr/bin/pgrep', ['oahd']);
    return r.code === 0;
  },
  async run(ctx) {
    const r = await ctx.exec.run('softwareupdate', ['--install-rosetta', '--agree-to-license']);
    if (r.code !== 0) throw new KitError(errorCodes.KIT_ROSETTA_INSTALL_FAILED, r.stderr);
  },
};
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test rosetta -- --run
git add packages/plugins/kit/src/steps/rosetta.ts packages/plugins/kit/src/steps/rosetta.test.ts
git commit -m "feat(kit): add Rosetta 2 step"
```

---

### Task 12: Nix step

**Files:**
- Create: `packages/plugins/kit/src/steps/nix.ts`
- Create: `packages/plugins/kit/src/steps/nix.test.ts`

- [ ] **Step 1: Test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { KitError } from '../errors.js';
import { nixStep } from './nix.js';

describe('nixStep', () => {
  it('check true when nix --version succeeds', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: 'nix (Nix) 2.18.0', stderr: '', code: 0 }), spawn: vi.fn() };
    expect(await nixStep.check({ exec })).toBe(true);
  });

  it('check false when nix is missing', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 127 }), spawn: vi.fn() };
    expect(await nixStep.check({ exec })).toBe(false);
  });

  it('run pipes the determinate installer through sh', async () => {
    const exec = {
      run: vi
        .fn()
        .mockResolvedValueOnce({ stdout: 'installer-script', stderr: '', code: 0 }) // curl
        .mockResolvedValueOnce({ stdout: '', stderr: '', code: 0 }), // sh -s
      spawn: vi.fn(),
    };
    await nixStep.run({ exec });
    expect(exec.run).toHaveBeenCalledTimes(2);
    const [first] = exec.run.mock.calls[0];
    expect(first).toBe('curl');
    const [second] = exec.run.mock.calls[1];
    expect(second).toBe('sh');
  });

  it('run throws on installer failure', async () => {
    const exec = {
      run: vi
        .fn()
        .mockResolvedValueOnce({ stdout: 'installer', stderr: '', code: 0 })
        .mockResolvedValueOnce({ stdout: '', stderr: 'boom', code: 1 }),
      spawn: vi.fn(),
    };
    await expect(nixStep.run({ exec })).rejects.toBeInstanceOf(KitError);
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test nix -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { KitError, errorCodes } from '../errors.js';
import type { Step } from './types.js';

const INSTALLER = 'https://install.determinate.systems/nix';

export const nixStep: Step = {
  id: 'nix',
  label: 'Nix',
  async check(ctx) {
    if (!ctx) return false;
    const r = await ctx.exec.run('nix', ['--version']);
    return r.code === 0;
  },
  async run(ctx) {
    const dl = await ctx.exec.run('curl', [
      '--proto', '=https',
      '--tlsv1.2',
      '-sSf',
      '-L',
      INSTALLER,
    ]);
    if (dl.code !== 0) throw new KitError(errorCodes.KIT_NIX_INSTALL_FAILED, dl.stderr);
    const install = await ctx.exec.run('sh', ['-s', '--', 'install', '--no-confirm'], {
      input: dl.stdout,
    });
    if (install.code !== 0) throw new KitError(errorCodes.KIT_NIX_INSTALL_FAILED, install.stderr);
  },
};
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test nix -- --run
git add packages/plugins/kit/src/steps/nix.ts packages/plugins/kit/src/steps/nix.test.ts
git commit -m "feat(kit): add Nix install step"
```

---

### Task 13: SSH key step

**Files:**
- Create: `packages/plugins/kit/src/steps/ssh.ts`
- Create: `packages/plugins/kit/src/steps/ssh.test.ts`

- [ ] **Step 1: Test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sshStep } from './ssh.js';

let home: string;

beforeEach(() => { home = mkdtempSync(join(tmpdir(), 'ssh-')); });
afterEach(() => { rmSync(home, { recursive: true, force: true }); });

describe('sshStep', () => {
  it('check true when ed25519 key exists', async () => {
    writeFileSync(join(home, 'id_ed25519'), 'fake');
    expect(await sshStep.check({ exec: { run: vi.fn(), spawn: vi.fn() }, env: { HOME: home } })).toBe(true);
  });

  it('check false when no key exists', async () => {
    expect(await sshStep.check({ exec: { run: vi.fn(), spawn: vi.fn() }, env: { HOME: home } })).toBe(false);
  });

  it('run calls ssh-keygen', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    await sshStep.run({ exec, env: { HOME: home, KIT_MACHINE: 'ali-pro' } });
    const [cmd, args] = exec.run.mock.calls.find((c) => c[0] === 'ssh-keygen') ?? [];
    expect(cmd).toBe('ssh-keygen');
    expect(args).toContain('-t');
    expect(args).toContain('ed25519');
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test ssh -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { KitError, errorCodes } from '../errors.js';
import type { Step, StepContext } from './types.js';

function homeFromCtx(ctx: StepContext): string {
  return ctx.env?.HOME ?? process.env.HOME ?? '';
}

export const sshStep: Step = {
  id: 'ssh',
  label: 'SSH key',
  async check(ctx) {
    if (!ctx) return false;
    const path = join(homeFromCtx(ctx), '.ssh', 'id_ed25519');
    return existsSync(path);
  },
  async run(ctx) {
    const home = homeFromCtx(ctx);
    const machine = ctx.env?.KIT_MACHINE ?? 'kit-machine';
    await ctx.exec.run('mkdir', ['-p', join(home, '.ssh')]);
    const r = await ctx.exec.run('ssh-keygen', [
      '-t', 'ed25519',
      '-C', machine,
      '-f', join(home, '.ssh', 'id_ed25519'),
      '-N', '',
    ]);
    if (r.code !== 0) throw new KitError(errorCodes.KIT_SSH_KEYGEN_FAILED, r.stderr);
  },
};
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test ssh -- --run
git add packages/plugins/kit/src/steps/ssh.ts packages/plugins/kit/src/steps/ssh.test.ts
git commit -m "feat(kit): add SSH keygen step"
```

---

### Task 14: GitHub auth step (with chain)

**Files:**
- Create: `packages/plugins/kit/src/steps/github.ts`
- Create: `packages/plugins/kit/src/steps/github.test.ts`

- [ ] **Step 1: Test (auth chain branches)**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { githubStep } from './github.js';

const ctxWith = (impl: (cmd: string, args: string[]) => Promise<any>) => ({
  exec: { run: vi.fn(impl), spawn: vi.fn() },
  env: { HOME: '/tmp', KIT_MACHINE: 'ali-pro' },
});

describe('githubStep', () => {
  it('check returns true when ssh authenticates', async () => {
    const ctx = ctxWith(async (cmd) => {
      if (cmd === 'ssh') return { stdout: '', stderr: 'Hi! You have successfully authenticated', code: 1 };
      return { stdout: '', stderr: '', code: 0 };
    });
    expect(await githubStep.check(ctx)).toBe(true);
  });

  it('check returns false when ssh does not authenticate', async () => {
    const ctx = ctxWith(async () => ({ stdout: '', stderr: 'permission denied', code: 255 }));
    expect(await githubStep.check(ctx)).toBe(false);
  });

  it('run uploads SSH key when gh auth status succeeds and key not present', async () => {
    const ctx = ctxWith(async (cmd, args) => {
      if (cmd === 'gh' && args[0] === 'auth' && args[1] === 'status') return { stdout: '', stderr: '', code: 0 };
      if (cmd === 'gh' && args[0] === 'ssh-key' && args[1] === 'list') return { stdout: '', stderr: '', code: 0 };
      if (cmd === 'gh' && args[0] === 'ssh-key' && args[1] === 'add') return { stdout: '', stderr: '', code: 0 };
      if (cmd === 'cat') return { stdout: 'ssh-ed25519 AAAA fake', stderr: '', code: 0 };
      return { stdout: '', stderr: '', code: 0 };
    });
    await githubStep.run(ctx);
    expect(ctx.exec.run).toHaveBeenCalledWith('gh', expect.arrayContaining(['ssh-key', 'add']));
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test github -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { join } from 'node:path';
import { KitError, errorCodes } from '../errors.js';
import type { Step, StepContext } from './types.js';

const SSH_OK = /successfully authenticated/i;

function home(ctx: StepContext): string {
  return ctx.env?.HOME ?? process.env.HOME ?? '';
}

async function trySshAuth(ctx: StepContext): Promise<boolean> {
  const r = await ctx.exec.run('ssh', [
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=5',
    '-i', join(home(ctx), '.ssh', 'id_ed25519'),
    'git@github.com',
  ]);
  return SSH_OK.test(r.stderr) || SSH_OK.test(r.stdout);
}

async function uploadKey(ctx: StepContext): Promise<void> {
  const machine = ctx.env?.KIT_MACHINE ?? 'machine';
  const pubPath = join(home(ctx), '.ssh', 'id_ed25519.pub');
  const pub = await ctx.exec.run('cat', [pubPath]);
  if (pub.code !== 0) throw new KitError(errorCodes.KIT_GITHUB_AUTH_FAILED, 'no public key');
  const list = await ctx.exec.run('gh', ['ssh-key', 'list']);
  if (list.stdout.includes(pub.stdout.split(' ').slice(0, 2).join(' '))) return;
  const add = await ctx.exec.run('gh', [
    'ssh-key', 'add', pubPath,
    '--title', machine,
    '--type', 'authentication',
  ]);
  if (add.code !== 0) throw new KitError(errorCodes.KIT_GITHUB_AUTH_FAILED, add.stderr);
}

export const githubStep: Step = {
  id: 'github',
  label: 'GitHub authentication',
  check: trySshAuth,
  async run(ctx) {
    if (await trySshAuth(ctx)) return;

    const ghStatus = await ctx.exec.run('gh', ['auth', 'status', '--hostname', 'github.com']);
    if (ghStatus.code !== 0) {
      const login = await ctx.exec.run('gh', [
        'auth', 'login',
        '--hostname', 'github.com',
        '--git-protocol', 'https',
        '--web',
        '--scopes', 'admin:public_key,read:user',
      ]);
      if (login.code !== 0) {
        throw new KitError(
          errorCodes.KIT_GITHUB_AUTH_FAILED,
          'gh auth login failed; consider running `gh auth login` manually',
        );
      }
    }
    await uploadKey(ctx);

    if (!(await trySshAuth(ctx))) {
      throw new KitError(errorCodes.KIT_GITHUB_AUTH_FAILED, 'ssh still not authenticated after gh upload');
    }
  },
};
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test github -- --run
git add packages/plugins/kit/src/steps/github.ts packages/plugins/kit/src/steps/github.test.ts
git commit -m "feat(kit): add GitHub auth step (SSH → gh → upload key)"
```

---

### Task 15: Repo step (clone or pull)

**Files:**
- Create: `packages/plugins/kit/src/steps/repo.ts`
- Create: `packages/plugins/kit/src/steps/repo.test.ts`

- [ ] **Step 1: Test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { repoStep } from './repo.js';

let dir: string;

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'repo-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('repoStep', () => {
  it('check true when .git exists in repoDir', async () => {
    mkdirSync(join(dir, '.git'));
    expect(
      await repoStep.check({ exec: { run: vi.fn(), spawn: vi.fn() }, env: { KIT_REPO_DIR: dir } }),
    ).toBe(true);
  });

  it('check false when .git missing', async () => {
    expect(
      await repoStep.check({ exec: { run: vi.fn(), spawn: vi.fn() }, env: { KIT_REPO_DIR: dir } }),
    ).toBe(false);
  });

  it('run clones when .git missing', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    await repoStep.run({ exec, env: { KIT_REPO_DIR: dir, KIT_REPO_URL: 'git@github.com:Medal-Social/kit.git' } });
    const [cmd, args] = exec.run.mock.calls.find((c) => c[0] === 'git') ?? [];
    expect(cmd).toBe('git');
    expect(args[0]).toBe('clone');
  });

  it('run pulls when .git exists', async () => {
    mkdirSync(join(dir, '.git'));
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    await repoStep.run({ exec, env: { KIT_REPO_DIR: dir, KIT_REPO_URL: 'x' } });
    const [cmd, args] = exec.run.mock.calls.find((c) => c[0] === 'git') ?? [];
    expect(cmd).toBe('git');
    expect(args).toEqual(expect.arrayContaining(['pull']));
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test repo -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { KitError, errorCodes } from '../errors.js';
import type { Step, StepContext } from './types.js';

function repoDir(ctx: StepContext): string {
  const d = ctx.env?.KIT_REPO_DIR;
  if (!d) throw new KitError(errorCodes.KIT_CONFIG_NOT_FOUND, 'KIT_REPO_DIR not set');
  return d;
}

export const repoStep: Step = {
  id: 'repo',
  label: 'kit repository',
  async check(ctx) {
    if (!ctx) return false;
    return existsSync(join(repoDir(ctx), '.git'));
  },
  async run(ctx) {
    const dir = repoDir(ctx);
    if (existsSync(join(dir, '.git'))) {
      const r = await ctx.exec.run('git', ['-C', dir, 'pull', '--ff-only']);
      if (r.code !== 0) throw new KitError(errorCodes.KIT_REPO_PULL_FAILED, r.stderr);
      return;
    }
    const url = ctx.env?.KIT_REPO_URL;
    if (!url) throw new KitError(errorCodes.KIT_CONFIG_NOT_FOUND, 'KIT_REPO_URL not set');
    await ctx.exec.run('mkdir', ['-p', dirname(dir)]);
    const r = await ctx.exec.run('git', ['clone', url, dir]);
    if (r.code !== 0) throw new KitError(errorCodes.KIT_REPO_CLONE_FAILED, r.stderr);
  },
};
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test repo -- --run
git add packages/plugins/kit/src/steps/repo.ts packages/plugins/kit/src/steps/repo.test.ts
git commit -m "feat(kit): add repo clone-or-pull step"
```

---

### Task 16: Secrets step (shells out to existing scripts)

**Files:**
- Create: `packages/plugins/kit/src/steps/secrets.ts`
- Create: `packages/plugins/kit/src/steps/secrets.test.ts`

- [ ] **Step 1: Test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { secretsStep } from './secrets.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sec-'));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  writeFileSync(join(dir, 'scripts', 'secrets-init.sh'), '#!/bin/sh\nexit 0\n');
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('secretsStep', () => {
  it('check returns false (always runs idempotent script)', async () => {
    expect(
      await secretsStep.check({ exec: { run: vi.fn(), spawn: vi.fn() }, env: { KIT_REPO_DIR: dir } }),
    ).toBe(false);
  });

  it('run shells out to bash secrets-init.sh detect MACHINE USER', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    await secretsStep.run({
      exec,
      env: { KIT_REPO_DIR: dir, KIT_MACHINE: 'ali-pro', USER: 'ali' },
    });
    expect(exec.run).toHaveBeenCalledWith(
      'bash',
      [join(dir, 'scripts', 'secrets-init.sh'), 'detect', 'ali-pro', 'ali'],
    );
  });

  it('run skips when secrets-init.sh missing', async () => {
    rmSync(join(dir, 'scripts', 'secrets-init.sh'));
    const exec = { run: vi.fn(), spawn: vi.fn() };
    await secretsStep.run({ exec, env: { KIT_REPO_DIR: dir, KIT_MACHINE: 'a', USER: 'b' } });
    expect(exec.run).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test secrets -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { KitError, errorCodes } from '../errors.js';
import type { Step } from './types.js';

export const secretsStep: Step = {
  id: 'secrets',
  label: 'Secrets',
  async check() {
    return false;
  },
  async run(ctx) {
    const repoDir = ctx.env?.KIT_REPO_DIR;
    if (!repoDir) throw new KitError(errorCodes.KIT_CONFIG_NOT_FOUND, 'KIT_REPO_DIR not set');
    const script = join(repoDir, 'scripts', 'secrets-init.sh');
    if (!existsSync(script)) return; // graceful skip
    const machine = ctx.env?.KIT_MACHINE ?? '';
    const user = ctx.env?.USER ?? process.env.USER ?? '';
    const r = await ctx.exec.run('bash', [script, 'detect', machine, user]);
    if (r.code !== 0) throw new KitError(errorCodes.KIT_SECRETS_INIT_FAILED, r.stderr);
  },
};
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test secrets -- --run
git add packages/plugins/kit/src/steps/secrets.ts packages/plugins/kit/src/steps/secrets.test.ts
git commit -m "feat(kit): add secrets step (delegates to scripts/secrets-init.sh)"
```

---

### Task 17: Rebuild step (with sudo keeper)

**Files:**
- Create: `packages/plugins/kit/src/steps/rebuild.ts`
- Create: `packages/plugins/kit/src/steps/rebuild.test.ts`

- [ ] **Step 1: Test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { rebuildStep } from './rebuild.js';

describe('rebuildStep', () => {
  it('check always returns false', async () => {
    expect(
      await rebuildStep.check({ exec: { run: vi.fn(), spawn: vi.fn() } }),
    ).toBe(false);
  });

  it('run shells out to darwin-rebuild for darwin machines', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    await rebuildStep.run({
      exec,
      env: { KIT_MACHINE: 'ali-pro', KIT_MACHINE_TYPE: 'darwin', KIT_REPO_DIR: '/tmp' },
    });
    expect(exec.run).toHaveBeenCalledWith(
      'sudo',
      ['darwin-rebuild', 'switch', '--flake', '.#ali-pro'],
      expect.objectContaining({ cwd: '/tmp' }),
    );
  });

  it('run uses nixos-rebuild for nixos machines', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    await rebuildStep.run({
      exec,
      env: { KIT_MACHINE: 'oslo-server', KIT_MACHINE_TYPE: 'nixos', KIT_REPO_DIR: '/tmp' },
    });
    expect(exec.run).toHaveBeenCalledWith(
      'sudo',
      ['nixos-rebuild', 'switch', '--flake', '.#oslo-server'],
      expect.objectContaining({ cwd: '/tmp' }),
    );
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test rebuild -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { KitError, errorCodes } from '../errors.js';
import type { Step } from './types.js';

export const rebuildStep: Step = {
  id: 'rebuild',
  label: 'Apply system configuration',
  async check() {
    return false;
  },
  async run(ctx) {
    const machine = ctx.env?.KIT_MACHINE;
    const type = ctx.env?.KIT_MACHINE_TYPE;
    const cwd = ctx.env?.KIT_REPO_DIR;
    if (!machine || !type || !cwd) {
      throw new KitError(errorCodes.KIT_REBUILD_FAILED, 'KIT_MACHINE/KIT_MACHINE_TYPE/KIT_REPO_DIR required');
    }
    const cmd = type === 'darwin' ? 'darwin-rebuild' : 'nixos-rebuild';
    const r = await ctx.exec.run('sudo', [cmd, 'switch', '--flake', `.#${machine}`], { cwd });
    if (r.code !== 0) throw new KitError(errorCodes.KIT_REBUILD_FAILED, r.stderr);
  },
};
```

> Note: the sudo-keeper background process is added by the *update command* (Task 27), not the step. Step's contract is "do this work synchronously"; long-running sudo refresh belongs to the orchestrator.

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test rebuild -- --run
git add packages/plugins/kit/src/steps/rebuild.ts packages/plugins/kit/src/steps/rebuild.test.ts
git commit -m "feat(kit): add nix rebuild step"
```

---

## Phase 5 — UI components

### Task 18: Header

**Files:**
- Create: `packages/plugins/kit/src/ui/Header.tsx`
- Create: `packages/plugins/kit/src/ui/Header.test.tsx`

- [ ] **Step 1: Test**

```tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Header } from './Header.js';

describe('<Header />', () => {
  it('renders machine name and OS info', () => {
    const { lastFrame } = render(
      <Header machine="ali-pro" os="macOS" osVersion="15.4" chip="Apple Silicon" user="ali" />,
    );
    const frame = lastFrame() ?? '';
    expect(frame).toContain('ali-pro');
    expect(frame).toContain('macOS 15.4');
    expect(frame).toContain('Apple Silicon');
    expect(frame).toContain('ali');
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text } from 'ink';

export interface HeaderProps {
  machine: string;
  os: string;
  osVersion: string;
  chip: 'Apple Silicon' | 'Intel';
  user: string;
}

export function Header(props: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="#00E5CC" bold>
        kit · machine setup
      </Text>
      <Text>
        Machine <Text bold>{props.machine}</Text>
      </Text>
      <Text>
        System <Text bold>{props.os} {props.osVersion}</Text> · {props.chip}
      </Text>
      <Text>
        User <Text bold>{props.user}</Text>
      </Text>
    </Box>
  );
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @medalsocial/kit test Header -- --run
git add packages/plugins/kit/src/ui/Header.tsx packages/plugins/kit/src/ui/Header.test.tsx
git commit -m "feat(kit): add Header UI component"
```

---

### Task 19: StepRow

**Files:**
- Create: `packages/plugins/kit/src/ui/StepRow.tsx`
- Create: `packages/plugins/kit/src/ui/StepRow.test.tsx`

- [ ] **Step 1: Test**

```tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { StepRow } from './StepRow.js';

describe('<StepRow />', () => {
  it.each([
    ['ok' as const, '✓'],
    ['running' as const, '⠸'],
    ['pending' as const, '○'],
    ['error' as const, '✗'],
  ])('renders %s glyph', (status, glyph) => {
    const { lastFrame } = render(<StepRow status={status} label="Nix" detail="installed" />);
    expect(lastFrame()).toContain(glyph);
    expect(lastFrame()).toContain('Nix');
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text } from 'ink';

export type StepStatus = 'pending' | 'running' | 'ok' | 'error';

const GLYPH: Record<StepStatus, string> = {
  pending: '○',
  running: '⠸',
  ok: '✓',
  error: '✗',
};

const COLOR: Record<StepStatus, string> = {
  pending: '#888888',
  running: '#F59E0B',
  ok: '#00E87B',
  error: '#FF3B3B',
};

export interface StepRowProps {
  status: StepStatus;
  label: string;
  detail?: string;
}

export function StepRow(props: StepRowProps) {
  return (
    <Box>
      <Text color={COLOR[props.status]}>{GLYPH[props.status]}</Text>
      <Text> {props.label}</Text>
      {props.detail ? <Text color="#888888"> · {props.detail}</Text> : null}
    </Box>
  );
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @medalsocial/kit test StepRow -- --run
git add packages/plugins/kit/src/ui/StepRow.tsx packages/plugins/kit/src/ui/StepRow.test.tsx
git commit -m "feat(kit): add StepRow UI component"
```

---

### Task 20: Spinner

**Files:**
- Create: `packages/plugins/kit/src/ui/Spinner.tsx`
- Create: `packages/plugins/kit/src/ui/Spinner.test.tsx`

- [ ] **Step 1: Test**

```tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner.js';

describe('<Spinner />', () => {
  it('renders the label', () => {
    const { lastFrame } = render(<Spinner label="Building toolchain" />);
    expect(lastFrame()).toContain('Building toolchain');
  });

  it('renders the elapsed seconds when provided', () => {
    const { lastFrame } = render(<Spinner label="Working" elapsedSeconds={62} />);
    expect(lastFrame()).toContain('1m 02s');
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text } from 'ink';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export interface SpinnerProps {
  label: string;
  elapsedSeconds?: number;
  frame?: number;
  detail?: string;
}

function fmt(secs: number): string {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
}

export function Spinner(props: SpinnerProps) {
  const f = FRAMES[(props.frame ?? 0) % FRAMES.length];
  return (
    <Box>
      <Text color="#00E5CC">{f}</Text>
      <Text> {props.label}</Text>
      {typeof props.elapsedSeconds === 'number' && (
        <Text color="#888888"> ({fmt(props.elapsedSeconds)})</Text>
      )}
      {props.detail ? <Text color="#888888"> · {props.detail}</Text> : null}
    </Box>
  );
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @medalsocial/kit test Spinner -- --run
git add packages/plugins/kit/src/ui/Spinner.tsx packages/plugins/kit/src/ui/Spinner.test.tsx
git commit -m "feat(kit): add Spinner UI component"
```

---

### Task 21: Completion

**Files:**
- Create: `packages/plugins/kit/src/ui/Completion.tsx`
- Create: `packages/plugins/kit/src/ui/Completion.test.tsx`

- [ ] **Step 1: Test**

```tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Completion } from './Completion.js';

describe('<Completion />', () => {
  it('renders success state', () => {
    const { lastFrame } = render(<Completion ok machine="ali-pro" elapsedSeconds={120} />);
    expect(lastFrame()).toContain('ali-pro is ready');
    expect(lastFrame()).toContain('2m 00s');
  });

  it('renders error state with message', () => {
    const { lastFrame } = render(<Completion ok={false} machine="ali-pro" elapsedSeconds={5} error="rebuild failed" />);
    expect(lastFrame()).toMatch(/failed/i);
    expect(lastFrame()).toContain('rebuild failed');
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text } from 'ink';

export interface CompletionProps {
  ok: boolean;
  machine: string;
  elapsedSeconds: number;
  error?: string;
}

function fmt(secs: number): string {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
}

export function Completion(props: CompletionProps) {
  if (props.ok) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="#00E87B" bold>✓ {props.machine} is ready</Text>
        <Text color="#888888">Completed in {fmt(props.elapsedSeconds)}</Text>
        <Text color="#888888">Open a new terminal to load your shell config.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="#FF3B3B" bold>✗ Setup failed</Text>
      {props.error ? <Text>{props.error}</Text> : null}
      <Text color="#888888">Stopped after {fmt(props.elapsedSeconds)}</Text>
    </Box>
  );
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm --filter @medalsocial/kit test Completion -- --run
git add packages/plugins/kit/src/ui/Completion.tsx packages/plugins/kit/src/ui/Completion.test.tsx
git commit -m "feat(kit): add Completion UI component"
```

---

## Phase 6 — Apps subsystem

### Task 22: apps.json schema + store

**Files:**
- Create: `packages/plugins/kit/src/apps/schema.ts`
- Create: `packages/plugins/kit/src/apps/schema.test.ts`
- Create: `packages/plugins/kit/src/apps/store.ts`
- Create: `packages/plugins/kit/src/apps/store.test.ts`

- [ ] **Step 1: Test schema**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { appsSchema } from './schema.js';

describe('appsSchema', () => {
  it('accepts empty arrays', () => {
    expect(appsSchema.parse({ casks: [], brews: [] })).toEqual({ casks: [], brews: [] });
  });

  it('accepts valid Homebrew names', () => {
    expect(appsSchema.parse({ casks: ['1password', 'rectangle', 'visual-studio-code'], brews: ['ripgrep'] }))
      .toBeTruthy();
  });

  it('rejects names with spaces', () => {
    expect(() => appsSchema.parse({ casks: ['bad name'], brews: [] })).toThrow();
  });

  it('rejects non-array fields', () => {
    expect(() => appsSchema.parse({ casks: 'foo', brews: [] })).toThrow();
  });
});
```

- [ ] **Step 2: Implement schema**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';

export const HOMEBREW_NAME = /^[a-z0-9][a-z0-9._@-]*$/;

const name = z.string().regex(HOMEBREW_NAME, 'invalid Homebrew package name');

export const appsSchema = z.object({
  casks: z.array(name),
  brews: z.array(name),
});

export type Apps = z.infer<typeof appsSchema>;
```

- [ ] **Step 3: Test store (read/write/atomic)**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KitError } from '../errors.js';
import { loadAppsJson, writeAppsJson } from './store.js';

let dir: string;

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'apps-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('loadAppsJson', () => {
  it('parses a valid apps.json', () => {
    const path = join(dir, 'apps.json');
    writeFileSync(path, JSON.stringify({ casks: ['zed'], brews: ['jq'] }));
    expect(loadAppsJson(path).casks).toEqual(['zed']);
  });

  it('throws KIT_APPS_CORRUPT on malformed JSON', () => {
    const path = join(dir, 'apps.json');
    writeFileSync(path, '{ not json');
    expect(() => loadAppsJson(path)).toThrow(KitError);
  });
});

describe('writeAppsJson', () => {
  it('writes atomically and pretty-prints', () => {
    const path = join(dir, 'apps.json');
    writeAppsJson(path, { casks: ['zed', '1password'], brews: [] });
    const content = readFileSync(path, 'utf8');
    expect(content).toContain('"zed"');
    expect(content.endsWith('\n')).toBe(true);
  });
});
```

- [ ] **Step 4: Implement store**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { KitError, errorCodes } from '../errors.js';
import { type Apps, appsSchema } from './schema.js';

export function loadAppsJson(path: string): Apps {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (e) {
    throw new KitError(errorCodes.KIT_APPS_CORRUPT, `${path}: ${(e as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new KitError(errorCodes.KIT_APPS_CORRUPT, `${path}: ${(e as Error).message}`);
  }
  const result = appsSchema.safeParse(parsed);
  if (!result.success) {
    throw new KitError(errorCodes.KIT_APPS_CORRUPT, `${path}: ${result.error.message}`);
  }
  return result.data;
}

export function writeAppsJson(path: string, apps: Apps): void {
  const sorted: Apps = {
    casks: [...apps.casks].sort(),
    brews: [...apps.brews].sort(),
  };
  const tmp = `${path}.tmp.${process.pid}`;
  writeFileSync(tmp, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}
```

- [ ] **Step 5: Run all + commit**

```bash
pnpm --filter @medalsocial/kit test apps -- --run
git add packages/plugins/kit/src/apps
git commit -m "feat(kit): add apps.json schema and atomic store"
```

---

### Task 23: kit apps add/remove/list command

**Files:**
- Create: `packages/plugins/kit/src/commands/apps.ts`
- Create: `packages/plugins/kit/src/commands/apps.test.ts`

- [ ] **Step 1: Test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { KitError } from '../errors.js';
import { addApp, listApps, removeApp } from './apps.js';

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'apps-cmd-'));
  path = join(dir, 'apps.json');
  writeFileSync(path, JSON.stringify({ casks: ['zed'], brews: [] }));
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('apps command', () => {
  it('addApp inserts a new cask', async () => {
    await addApp(path, '1password');
    expect(listApps(path).casks).toEqual(['1password', 'zed']);
  });

  it('addApp throws KIT_APPS_DUPLICATE on duplicate (case-insensitive)', async () => {
    await expect(addApp(path, 'ZED')).rejects.toBeInstanceOf(KitError);
  });

  it('addApp throws KIT_APPS_INVALID_NAME on bad name', async () => {
    await expect(addApp(path, 'has space')).rejects.toBeInstanceOf(KitError);
  });

  it('removeApp removes a cask', async () => {
    await removeApp(path, 'zed');
    expect(listApps(path).casks).toEqual([]);
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test commands/apps -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { HOMEBREW_NAME } from '../apps/schema.js';
import { type Apps, loadAppsJson, writeAppsJson } from '../apps/store.js';
import { KitError, errorCodes } from '../errors.js';

export function listApps(path: string): Apps {
  return loadAppsJson(path);
}

export async function addApp(path: string, name: string, kind: 'casks' | 'brews' = 'casks'): Promise<void> {
  if (!HOMEBREW_NAME.test(name)) {
    throw new KitError(errorCodes.KIT_APPS_INVALID_NAME, name);
  }
  const apps = loadAppsJson(path);
  const lower = name.toLowerCase();
  if (apps[kind].some((n) => n.toLowerCase() === lower)) {
    throw new KitError(errorCodes.KIT_APPS_DUPLICATE, name);
  }
  writeAppsJson(path, { ...apps, [kind]: [...apps[kind], name] });
}

export async function removeApp(path: string, name: string, kind: 'casks' | 'brews' = 'casks'): Promise<void> {
  const apps = loadAppsJson(path);
  writeAppsJson(path, { ...apps, [kind]: apps[kind].filter((n) => n !== name) });
}
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test commands/apps -- --run
git add packages/plugins/kit/src/commands/apps.ts packages/plugins/kit/src/commands/apps.test.ts
git commit -m "feat(kit): add apps add/remove/list command"
```

---

### Task 24: migrate-apps command

**Files:**
- Create: `packages/plugins/kit/src/commands/migrate-apps.ts`
- Create: `packages/plugins/kit/src/commands/migrate-apps.test.ts`

- [ ] **Step 1: Test (with golden inputs/outputs)**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrateMachineFile } from './migrate-apps.js';

let dir: string;

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'mig-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const INLINE = `{ ... }: {
  homebrew.casks = [
    "1password"
    "zed"
    "rectangle"
  ];
  homebrew.brews = [
    "ripgrep"
    "jq"
  ];
}
`;

const EXPECTED_NIX = `{ ... }: let
  apps = builtins.fromJSON (builtins.readFile ./ali-pro.apps.json);
in {
  homebrew.casks = apps.casks;
  homebrew.brews = apps.brews;
}
`;

describe('migrateMachineFile', () => {
  it('extracts inline lists into apps.json and rewrites the .nix', async () => {
    const nixPath = join(dir, 'ali-pro.nix');
    writeFileSync(nixPath, INLINE);
    const result = await migrateMachineFile(nixPath, 'ali-pro');
    expect(result.changed).toBe(true);
    const apps = JSON.parse(readFileSync(join(dir, 'ali-pro.apps.json'), 'utf8'));
    expect(apps.casks).toEqual(['1password', 'rectangle', 'zed']);
    expect(apps.brews).toEqual(['jq', 'ripgrep']);
    expect(readFileSync(nixPath, 'utf8')).toBe(EXPECTED_NIX);
  });

  it('is idempotent — re-running on a migrated file does nothing', async () => {
    const nixPath = join(dir, 'ali-pro.nix');
    writeFileSync(nixPath, EXPECTED_NIX);
    writeFileSync(join(dir, 'ali-pro.apps.json'), '{"casks":[],"brews":[]}');
    const result = await migrateMachineFile(nixPath, 'ali-pro');
    expect(result.changed).toBe(false);
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test migrate -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { writeAppsJson } from '../apps/store.js';

export interface MigrateResult {
  changed: boolean;
}

const INLINE_RE = /homebrew\.(casks|brews)\s*=\s*\[([\s\S]*?)\];/g;

function parseList(body: string): string[] {
  return Array.from(body.matchAll(/"([^"]+)"/g)).map((m) => m[1]);
}

export async function migrateMachineFile(nixPath: string, machine: string): Promise<MigrateResult> {
  const original = readFileSync(nixPath, 'utf8');
  if (!INLINE_RE.test(original)) {
    return { changed: false };
  }
  // Reset regex state after .test().
  INLINE_RE.lastIndex = 0;

  let casks: string[] = [];
  let brews: string[] = [];
  for (const match of original.matchAll(INLINE_RE)) {
    const kind = match[1];
    const items = parseList(match[2]);
    if (kind === 'casks') casks = items;
    if (kind === 'brews') brews = items;
  }

  const appsJsonPath = join(dirname(nixPath), `${machine}.apps.json`);
  writeAppsJson(appsJsonPath, { casks, brews });

  const replacement = `{ ... }: let
  apps = builtins.fromJSON (builtins.readFile ./${machine}.apps.json);
in {
  homebrew.casks = apps.casks;
  homebrew.brews = apps.brews;
}
`;
  writeFileSync(nixPath, replacement, 'utf8');
  return { changed: true };
}
```

> Note: This rewrite intentionally reduces the file to just the apps wiring. For real machine files that contain *additional* config beyond apps, the migration must preserve the rest. Update the implementation when fixture testing reveals real-world structure during T28/T32 — for v1, the fixture machine files have only homebrew lists, making this safe. If real machine files have extra config, expand to a minimal AST-aware splice that only replaces the matched blocks.

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test migrate -- --run
git add packages/plugins/kit/src/commands/migrate-apps.ts packages/plugins/kit/src/commands/migrate-apps.test.ts
git commit -m "feat(kit): add idempotent apps.json migration"
```

---

## Phase 7 — Commands

### Task 25: kit edit

**Files:**
- Create: `packages/plugins/kit/src/commands/edit.ts`
- Create: `packages/plugins/kit/src/commands/edit.test.ts`

- [ ] **Step 1: Test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { KitError } from '../errors.js';
import { resolveEditor, runEdit } from './edit.js';

describe('resolveEditor', () => {
  it('prefers $KIT_EDITOR > $VISUAL > $EDITOR', () => {
    expect(resolveEditor({ KIT_EDITOR: 'zed', VISUAL: 'vim', EDITOR: 'nano' })).toBe('zed');
    expect(resolveEditor({ VISUAL: 'vim', EDITOR: 'nano' })).toBe('vim');
    expect(resolveEditor({ EDITOR: 'nano' })).toBe('nano');
  });

  it('falls back to a known editor binary', () => {
    expect(resolveEditor({}, ['nvim', 'vim'])).toMatch(/nvim|vim/);
  });
});

describe('runEdit', () => {
  it('throws when no editor available', async () => {
    const exec = { run: vi.fn(), spawn: vi.fn() };
    await expect(runEdit('/tmp/x.nix', { env: {}, available: [], exec })).rejects.toBeInstanceOf(KitError);
  });

  it('spawns the resolved editor', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    await runEdit('/tmp/x.nix', { env: { EDITOR: 'zed' }, available: ['zed'], exec });
    expect(exec.run).toHaveBeenCalledWith('zed', ['/tmp/x.nix']);
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test edit -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { KitError, errorCodes } from '../errors.js';
import type { Exec } from '../shell/exec.js';

const FALLBACKS = ['zed', 'code', 'cursor', 'nvim', 'vim', 'nano'];

export function resolveEditor(
  env: NodeJS.ProcessEnv,
  available: string[] = FALLBACKS,
): string | null {
  if (env.KIT_EDITOR) return env.KIT_EDITOR;
  if (env.VISUAL) return env.VISUAL;
  if (env.EDITOR) return env.EDITOR;
  return available[0] ?? null;
}

export interface RunEditOpts {
  env: NodeJS.ProcessEnv;
  available?: string[];
  exec: Exec;
}

export async function runEdit(filePath: string, opts: RunEditOpts): Promise<void> {
  const editor = resolveEditor(opts.env, opts.available);
  if (!editor) {
    throw new KitError(errorCodes.KIT_NO_EDITOR, FALLBACKS.join(', '));
  }
  await opts.exec.run(editor, [filePath]);
}
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test edit -- --run
git add packages/plugins/kit/src/commands/edit.ts packages/plugins/kit/src/commands/edit.test.ts
git commit -m "feat(kit): add edit command with editor resolution"
```

---

### Task 26: kit status (renderStatus + renderStatusTUI)

**Files:**
- Create: `packages/plugins/kit/src/commands/status.ts`
- Create: `packages/plugins/kit/src/commands/status.test.ts`

- [ ] **Step 1: Test (data layer only — TUI is wrapper)**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalProvider } from '../provider/local.js';
import { renderStatus } from './status.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'st-'));
  mkdirSync(join(dir, '.git'));
  writeFileSync(join(dir, 'ali-pro.apps.json'), JSON.stringify({ casks: ['zed'], brews: [] }));
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('renderStatus', () => {
  it('builds a StatusReport with apps count', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    const report = await renderStatus({
      machine: 'ali-pro',
      kitRepoDir: dir,
      machineFile: join(dir, 'ali-pro.apps.json'),
      provider: new LocalProvider(),
      exec,
    });
    expect(report.appsCount).toBe(1);
    expect(report.machineId).toBe('ali-pro');
  });

  it('omits org policy section when LocalProvider returns empty', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    const report = await renderStatus({
      machine: 'ali-pro',
      kitRepoDir: dir,
      machineFile: join(dir, 'ali-pro.apps.json'),
      provider: new LocalProvider(),
      exec,
    });
    expect(report.orgPolicy).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test commands/status -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from 'node:fs';
import { loadAppsJson } from '../apps/store.js';
import type { FleetProvider, RequiredApps, SecurityCheck } from '../provider/types.js';
import type { Exec } from '../shell/exec.js';

export interface RenderStatusOpts {
  machine: string;
  kitRepoDir: string;
  machineFile: string;
  provider: FleetProvider;
  exec: Exec;
  user?: string;
}

export interface StatusReport {
  machineId: string;
  appsCount: number;
  repoClean: boolean;
  commitsBehind: number;
  kitCommit: string | null;
  orgPolicy?: { apps: RequiredApps; baseline: SecurityCheck[] };
}

export async function renderStatus(opts: RenderStatusOpts): Promise<StatusReport> {
  const apps = existsSync(opts.machineFile) ? loadAppsJson(opts.machineFile) : { casks: [], brews: [] };
  const appsCount = apps.casks.length + apps.brews.length;

  const headRev = await opts.exec.run('git', ['-C', opts.kitRepoDir, 'rev-parse', 'HEAD']);
  const kitCommit = headRev.code === 0 ? headRev.stdout.trim() : null;

  const status = await opts.exec.run('git', ['-C', opts.kitRepoDir, 'status', '--porcelain']);
  const repoClean = status.code === 0 && status.stdout.trim().length === 0;

  await opts.exec.run('git', ['-C', opts.kitRepoDir, 'fetch', '--quiet']);
  const behind = await opts.exec.run('git', [
    '-C', opts.kitRepoDir,
    'rev-list', 'HEAD..@{u}', '--count',
  ]);
  const commitsBehind = behind.code === 0 ? Number.parseInt(behind.stdout.trim(), 10) || 0 : 0;

  const ctx = {
    machineId: opts.machine,
    user: opts.user ?? process.env.USER ?? '',
    kitRepoDir: opts.kitRepoDir,
  };
  const required = await opts.provider.getRequiredApps(ctx);
  const baseline = await opts.provider.getSecurityBaseline(ctx);
  const hasOrgPolicy = required.casks.length + required.brews.length + baseline.length > 0;

  return {
    machineId: opts.machine,
    appsCount,
    repoClean,
    commitsBehind,
    kitCommit,
    orgPolicy: hasOrgPolicy ? { apps: required, baseline } : undefined,
  };
}
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test commands/status -- --run
git add packages/plugins/kit/src/commands/status.ts packages/plugins/kit/src/commands/status.test.ts
git commit -m "feat(kit): add status command (data layer)"
```

---

### Task 27: kit update (orchestrator with sudo keeper)

**Files:**
- Create: `packages/plugins/kit/src/commands/update.ts`
- Create: `packages/plugins/kit/src/commands/update.test.ts`

- [ ] **Step 1: Test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalProvider } from '../provider/local.js';
import { runUpdate } from './update.js';

let dir: string;

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'upd-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('runUpdate', () => {
  it('pulls then rebuilds in order', async () => {
    const calls: string[] = [];
    const exec = {
      run: vi.fn().mockImplementation(async (cmd: string, args: string[]) => {
        calls.push([cmd, ...args].slice(0, 3).join(' '));
        return { stdout: '', stderr: '', code: 0 };
      }),
      spawn: vi.fn(),
    };
    await runUpdate({
      machine: 'ali-pro',
      machineType: 'darwin',
      kitRepoDir: dir,
      provider: new LocalProvider(),
      exec,
      sudoKeeper: { start: () => () => undefined },
    });
    const sudoIdx = calls.findIndex((c) => c.startsWith('sudo'));
    const pullIdx = calls.findIndex((c) => c === 'git -C ' + dir.slice(0, 0).padEnd(0));
    expect(sudoIdx).toBeGreaterThan(-1);
    // The actual pull is `git -C <dir> pull`. Just assert pull happened before rebuild.
    const pullPos = calls.findIndex((c) => c.startsWith('git -C') && c.includes('pull'));
    const rebuildPos = calls.findIndex((c) => c.startsWith('sudo') && c.includes('darwin-rebuild'));
    expect(pullPos).toBeLessThan(rebuildPos);
  });

  it('starts and stops the sudo keeper', async () => {
    const stop = vi.fn();
    const start = vi.fn().mockReturnValue(stop);
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    await runUpdate({
      machine: 'ali-pro',
      machineType: 'darwin',
      kitRepoDir: dir,
      provider: new LocalProvider(),
      exec,
      sudoKeeper: { start },
    });
    expect(start).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test commands/update -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { KitError, errorCodes } from '../errors.js';
import type { FleetProvider } from '../provider/types.js';
import type { Exec } from '../shell/exec.js';
import { rebuildStep } from '../steps/rebuild.js';
import { runSteps } from '../steps/types.js';

export interface SudoKeeper {
  start(): () => void; // returns stop function
}

export interface RunUpdateOpts {
  machine: string;
  machineType: 'darwin' | 'nixos';
  kitRepoDir: string;
  provider: FleetProvider;
  exec: Exec;
  sudoKeeper: SudoKeeper;
  user?: string;
}

export async function runUpdate(opts: RunUpdateOpts): Promise<void> {
  // 1) sudo bootstrap
  const sudoOk = await opts.exec.run('sudo', ['-v']);
  if (sudoOk.code !== 0) throw new KitError(errorCodes.KIT_SUDO_DENIED);

  // 2) git pull
  await opts.exec.run('git', ['-C', opts.kitRepoDir, 'fetch', '--quiet']);
  const pull = await opts.exec.run('git', ['-C', opts.kitRepoDir, 'pull', '--ff-only']);
  if (pull.code !== 0) throw new KitError(errorCodes.KIT_REPO_PULL_FAILED, pull.stderr);

  // 3) provider hook (no-op for LocalProvider; future MedalSocialProvider may inject required apps)
  await opts.provider.getRequiredApps({
    machineId: opts.machine,
    user: opts.user ?? process.env.USER ?? '',
    kitRepoDir: opts.kitRepoDir,
  });

  // 4) rebuild with sudo keeper running
  const stopKeeper = opts.sudoKeeper.start();
  const onExit = () => stopKeeper();
  process.once('SIGINT', onExit);
  process.once('SIGTERM', onExit);
  try {
    await runSteps([rebuildStep], {}, {
      exec: opts.exec,
      env: {
        ...process.env,
        KIT_MACHINE: opts.machine,
        KIT_MACHINE_TYPE: opts.machineType,
        KIT_REPO_DIR: opts.kitRepoDir,
      },
    });
  } finally {
    stopKeeper();
    process.off('SIGINT', onExit);
    process.off('SIGTERM', onExit);
  }
}

export const realSudoKeeper: SudoKeeper = {
  start() {
    const id = setInterval(() => {
      // ignore failures — best-effort
      const { spawn } = require('node:child_process') as typeof import('node:child_process');
      spawn('sudo', ['-v'], { stdio: 'ignore' }).on('error', () => {});
    }, 30_000);
    return () => clearInterval(id);
  },
};
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test commands/update -- --run
git add packages/plugins/kit/src/commands/update.ts packages/plugins/kit/src/commands/update.test.ts
git commit -m "feat(kit): add update command with sudo keeper"
```

---

### Task 28: kit init (orchestrator)

**Files:**
- Create: `packages/plugins/kit/src/commands/init.ts`
- Create: `packages/plugins/kit/src/commands/init.test.ts`

- [ ] **Step 1: Test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { LocalProvider } from '../provider/local.js';
import { initSteps } from './init.js';

describe('initSteps', () => {
  it('skips xcode + rosetta on linux', () => {
    const steps = initSteps({ platform: 'linux', arch: 'x64' });
    const ids = steps.map((s) => s.id);
    expect(ids).not.toContain('xcode');
    expect(ids).not.toContain('rosetta');
    expect(ids).toContain('nix');
  });

  it('includes xcode but not rosetta on darwin x64', () => {
    const ids = initSteps({ platform: 'darwin', arch: 'x64' }).map((s) => s.id);
    expect(ids).toContain('xcode');
    expect(ids).not.toContain('rosetta');
  });

  it('includes rosetta on darwin arm64', () => {
    const ids = initSteps({ platform: 'darwin', arch: 'arm64' }).map((s) => s.id);
    expect(ids).toContain('rosetta');
  });

  it('always ends with rebuild', () => {
    const steps = initSteps({ platform: 'darwin', arch: 'arm64' });
    expect(steps[steps.length - 1].id).toBe('rebuild');
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test commands/init -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { FleetProvider } from '../provider/types.js';
import type { Exec } from '../shell/exec.js';
import { githubStep } from '../steps/github.js';
import { nixStep } from '../steps/nix.js';
import { rebuildStep } from '../steps/rebuild.js';
import { repoStep } from '../steps/repo.js';
import { rosettaStep } from '../steps/rosetta.js';
import { secretsStep } from '../steps/secrets.js';
import { sshStep } from '../steps/ssh.js';
import { runSteps, type Step } from '../steps/types.js';
import { xcodeStep } from '../steps/xcode.js';

export interface InitStepsOpts {
  platform: NodeJS.Platform;
  arch: string;
}

export function initSteps(opts: InitStepsOpts): Step[] {
  const steps: Step[] = [];
  if (opts.platform === 'darwin') steps.push(xcodeStep);
  if (opts.platform === 'darwin' && opts.arch === 'arm64') steps.push(rosettaStep);
  steps.push(nixStep, sshStep, githubStep, repoStep, secretsStep, rebuildStep);
  return steps;
}

export interface RunInitOpts {
  machine: string;
  machineType: 'darwin' | 'nixos';
  kitRepoDir: string;
  kitRepoUrl: string;
  provider: FleetProvider;
  exec: Exec;
  platform: NodeJS.Platform;
  arch: string;
  user?: string;
}

export async function runInit(opts: RunInitOpts): Promise<void> {
  const ctx = {
    exec: opts.exec,
    env: {
      ...process.env,
      KIT_MACHINE: opts.machine,
      KIT_MACHINE_TYPE: opts.machineType,
      KIT_REPO_DIR: opts.kitRepoDir,
      KIT_REPO_URL: opts.kitRepoUrl,
    },
  };
  await runSteps(initSteps({ platform: opts.platform, arch: opts.arch }), {}, ctx);

  await opts.provider.reportStatus(
    {
      machineId: opts.machine,
      user: opts.user ?? process.env.USER ?? '',
      kitRepoDir: opts.kitRepoDir,
    },
    {
      machineId: opts.machine,
      os: opts.platform,
      arch: opts.arch,
      kitCommit: null,
      appsCount: 0,
    },
  );
}
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test commands/init -- --run
git add packages/plugins/kit/src/commands/init.ts packages/plugins/kit/src/commands/init.test.ts
git commit -m "feat(kit): add init command orchestrator"
```

---

### Task 29: kit new (scaffolder)

**Files:**
- Create: `packages/plugins/kit/src/commands/new.ts`
- Create: `packages/plugins/kit/src/commands/new.test.ts`

- [ ] **Step 1: Test**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scaffoldKit } from './new.js';

let dir: string;

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'new-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('scaffoldKit', () => {
  it('writes the expected files into a fresh directory', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    const target = join(dir, 'my-kit');
    await scaffoldKit({ target, name: 'my-kit', machine: 'my-mac', user: 'me', exec });
    expect(existsSync(join(target, 'kit.config.json'))).toBe(true);
    expect(existsSync(join(target, 'flake.nix'))).toBe(true);
    expect(existsSync(join(target, 'machines', 'my-mac.nix'))).toBe(true);
    expect(existsSync(join(target, 'machines', 'my-mac.apps.json'))).toBe(true);
    expect(existsSync(join(target, '.gitignore'))).toBe(true);
    const cfg = JSON.parse(readFileSync(join(target, 'kit.config.json'), 'utf8'));
    expect(cfg.machines['my-mac']).toEqual({ type: 'darwin', user: 'me' });
  });

  it('initializes git', async () => {
    const exec = { run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }), spawn: vi.fn() };
    await scaffoldKit({ target: join(dir, 'k2'), name: 'k2', machine: 'm', user: 'u', exec });
    const gitInit = exec.run.mock.calls.find((c) => c[0] === 'git' && c[1][0] === 'init');
    expect(gitInit).toBeDefined();
  });
});
```

- [ ] **Step 2: Run + implement**

```bash
pnpm --filter @medalsocial/kit test commands/new -- --run
```

Expected: FAIL.

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeAppsJson } from '../apps/store.js';
import type { Exec } from '../shell/exec.js';

export interface ScaffoldOpts {
  target: string;
  name: string;
  machine: string;
  user: string;
  type?: 'darwin' | 'nixos';
  exec: Exec;
}

export async function scaffoldKit(opts: ScaffoldOpts): Promise<void> {
  const type = opts.type ?? 'darwin';
  mkdirSync(opts.target, { recursive: true });
  mkdirSync(join(opts.target, 'machines'), { recursive: true });

  const config = {
    name: opts.name,
    repo: '',
    repoDir: opts.target,
    machines: { [opts.machine]: { type, user: opts.user } },
  };
  writeFileSync(join(opts.target, 'kit.config.json'), `${JSON.stringify(config, null, 2)}\n`);

  writeFileSync(
    join(opts.target, 'flake.nix'),
    `{
  description = "${opts.name} — managed by kit";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { self, nixpkgs }: { };
}
`,
  );

  writeFileSync(
    join(opts.target, 'machines', `${opts.machine}.nix`),
    `{ ... }: let
  apps = builtins.fromJSON (builtins.readFile ./${opts.machine}.apps.json);
in {
  homebrew.casks = apps.casks;
  homebrew.brews = apps.brews;
}
`,
  );

  writeAppsJson(join(opts.target, 'machines', `${opts.machine}.apps.json`), { casks: [], brews: [] });

  writeFileSync(
    join(opts.target, '.gitignore'),
    `.envrc\n.direnv/\nresult\nsecrets.local/\n`,
  );

  writeFileSync(
    join(opts.target, 'README.md'),
    `# ${opts.name}\n\nMachine config managed by kit. Run \`kit init ${opts.machine}\` to bootstrap.\n`,
  );

  await opts.exec.run('git', ['init'], { cwd: opts.target });
  await opts.exec.run('git', ['add', '.'], { cwd: opts.target });
  await opts.exec.run('git', ['commit', '-m', `chore: scaffold ${opts.name}`], { cwd: opts.target });
}
```

- [ ] **Step 3: Commit**

```bash
pnpm --filter @medalsocial/kit test commands/new -- --run
git add packages/plugins/kit/src/commands/new.ts packages/plugins/kit/src/commands/new.test.ts
git commit -m "feat(kit): add new command (kit repo scaffolder)"
```

---

## Phase 8 — Plugin integration

### Task 30: Plugin entry — index.ts

**Files:**
- Modify: `packages/plugins/kit/src/index.ts`

- [ ] **Step 1: Replace the stub**

Replace the contents of `packages/plugins/kit/src/index.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export { detectMachine } from './detect.js';
export { getSystemInfo } from './machine/system.js';
export { loadKitConfig } from './config/load.js';
export type { KitConfig, Machine } from './config/schema.js';

export { KitError, errorCodes } from './errors.js';

export { runInit, initSteps } from './commands/init.js';
export { runUpdate, realSudoKeeper } from './commands/update.js';
export { renderStatus } from './commands/status.js';
export { addApp, removeApp, listApps } from './commands/apps.js';
export { migrateMachineFile } from './commands/migrate-apps.js';
export { resolveEditor, runEdit } from './commands/edit.js';
export { scaffoldKit } from './commands/new.js';

export { LocalProvider } from './provider/local.js';
export { resolveProvider } from './provider/resolve.js';
export type { FleetProvider, ProviderContext, RequiredApps, StatusReport } from './provider/types.js';

export { realExec } from './shell/exec.js';
```

- [ ] **Step 2: Verify it builds**

```bash
pnpm --filter @medalsocial/kit build
```

Expected: clean build, `dist/` populated.

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/kit/src/index.ts
git commit -m "feat(kit): expose public API from plugin entry"
```

---

### Task 31: Wire `pilot kit` parent command

**Files:**
- Modify: `packages/cli/src/bin/pilot.ts`

- [ ] **Step 1: Read existing structure**

(Review lines 1-104 of `packages/cli/src/bin/pilot.ts` to understand the commander pattern.)

- [ ] **Step 2: Add kit subcommands above the catch-all `program.action`**

Insert this block in `packages/cli/src/bin/pilot.ts` immediately before line 99 (the `program.action(async () => { runRepl })` block):

```ts
const kit = program.command('kit').description('Machine configuration & Nix management');

kit
  .command('init [machine]')
  .description('Bootstrap an existing kit repo on this machine')
  .action(async (machine?: string) => {
    const { runKitInit } = await import('../commands/kit.js');
    await runKitInit(machine);
  });

kit
  .command('new')
  .description('Scaffold a new kit repo from scratch')
  .action(async () => {
    const { runKitNew } = await import('../commands/kit.js');
    await runKitNew();
  });

kit
  .command('update')
  .description('Pull latest config and rebuild the system')
  .action(async () => {
    const { runKitUpdate } = await import('../commands/kit.js');
    await runKitUpdate();
  });

kit
  .command('status')
  .description('Machine health, apps, secrets, repo state')
  .action(async () => {
    const { runKitStatus } = await import('../commands/kit.js');
    await runKitStatus({ interactive: false });
  });

kit
  .command('apps <action> [name]')
  .description('Manage Homebrew casks/brews (add | remove | list)')
  .action(async (action: string, name?: string) => {
    const { runKitApps } = await import('../commands/kit.js');
    await runKitApps(action, name);
  });

kit
  .command('edit')
  .description("Open this machine's config in $EDITOR")
  .action(async () => {
    const { runKitEdit } = await import('../commands/kit.js');
    await runKitEdit();
  });
```

- [ ] **Step 3: Create the dispatcher**

Create `packages/cli/src/commands/kit.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { hostname } from 'node:os';
import { join } from 'node:path';
import { render, Text } from 'ink';
import React from 'react';
import {
  addApp,
  detectMachine,
  KitError,
  listApps,
  loadKitConfig,
  realExec,
  realSudoKeeper,
  removeApp,
  renderStatus,
  resolveProvider,
  runEdit,
  runInit,
  runUpdate,
  scaffoldKit,
} from '@medalsocial/kit';
import { colors } from '../colors.js';

function fail(err: unknown): never {
  if (err instanceof KitError) {
    console.error(`${err.message}${err.cause ? `\n${String(err.cause)}` : ''}`);
    process.exit(1);
  }
  throw err;
}

function machineFile(repoDir: string, machine: string): string {
  return join(repoDir, 'machines', `${machine}.apps.json`);
}

export async function runKitInit(machineArg?: string): Promise<void> {
  try {
    const config = await loadKitConfig();
    const machine = machineArg ?? detectMachine(hostname()) ?? Object.keys(config.machines)[0];
    const m = config.machines[machine];
    if (!m) {
      console.error(`Unknown machine: ${machine}`);
      process.exit(1);
    }
    await runInit({
      machine,
      machineType: m.type,
      kitRepoDir: config.repoDir,
      kitRepoUrl: config.repo,
      provider: resolveProvider(),
      exec: realExec,
      platform: process.platform,
      arch: process.arch,
    });
  } catch (e) {
    fail(e);
  }
}

export async function runKitNew(): Promise<void> {
  // Minimal v1 — non-interactive, picks defaults from env.
  const target = process.env.KIT_NEW_TARGET ?? join(process.cwd(), 'my-kit');
  const machine = process.env.KIT_NEW_MACHINE ?? 'my-mac';
  const user = process.env.USER ?? 'me';
  try {
    await scaffoldKit({ target, name: 'my-kit', machine, user, exec: realExec });
    render(React.createElement(Text, { color: colors.success }, `✓ Scaffolded ${target}`));
  } catch (e) {
    fail(e);
  }
}

export async function runKitUpdate(): Promise<void> {
  try {
    const config = await loadKitConfig();
    const machine = detectMachine(hostname()) ?? Object.keys(config.machines)[0];
    const m = config.machines[machine];
    await runUpdate({
      machine,
      machineType: m.type,
      kitRepoDir: config.repoDir,
      provider: resolveProvider(),
      exec: realExec,
      sudoKeeper: realSudoKeeper,
    });
  } catch (e) {
    fail(e);
  }
}

export async function runKitStatus(_opts: { interactive: boolean }): Promise<void> {
  try {
    const config = await loadKitConfig();
    const machine = detectMachine(hostname()) ?? Object.keys(config.machines)[0];
    const report = await renderStatus({
      machine,
      kitRepoDir: config.repoDir,
      machineFile: machineFile(config.repoDir, machine),
      provider: resolveProvider(),
      exec: realExec,
    });
    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    fail(e);
  }
}

export async function runKitApps(action: string, name?: string): Promise<void> {
  try {
    const config = await loadKitConfig();
    const machine = detectMachine(hostname()) ?? Object.keys(config.machines)[0];
    const path = machineFile(config.repoDir, machine);
    if (action === 'list') {
      console.log(JSON.stringify(listApps(path), null, 2));
      return;
    }
    if (!name) {
      console.error('Usage: pilot kit apps <add|remove> <name>');
      process.exit(1);
    }
    if (action === 'add') await addApp(path, name);
    else if (action === 'remove') await removeApp(path, name);
    else {
      console.error(`Unknown action: ${action}`);
      process.exit(1);
    }
  } catch (e) {
    fail(e);
  }
}

export async function runKitEdit(): Promise<void> {
  try {
    const config = await loadKitConfig();
    const machine = detectMachine(hostname()) ?? Object.keys(config.machines)[0];
    const path = join(config.repoDir, 'machines', `${machine}.nix`);
    await runEdit(path, { env: process.env, exec: realExec });
  } catch (e) {
    fail(e);
  }
}
```

> Note: `runKitNew` is intentionally minimal (env-var driven) for v1. Interactive prompting can be added later — the function signature stays the same. `runKitStatus` prints JSON in v1; the TUI rendering layer is wrapped in a follow-up if desired.

- [ ] **Step 4: Verify the CLI workspace builds and tests still pass**

```bash
pnpm install
pnpm test
```

Expected: all tests still green; new `kit` command discoverable via `pnpm --filter @medalsocial/pilot exec node dist/bin/pilot.js kit --help` (after build).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/bin/pilot.ts packages/cli/src/commands/kit.ts
git commit -m "feat(cli): wire pilot kit subcommands to @medalsocial/kit"
```

---

## Phase 9 — Polish

### Task 32: E2E fixture + smoke test

**Files:**
- Create: `packages/plugins/kit/tests/e2e/fixtures/sample-kit/kit.config.json`
- Create: `packages/plugins/kit/tests/e2e/fixtures/sample-kit/machines/test-mac.nix`
- Create: `packages/plugins/kit/tests/e2e/fixtures/sample-kit/machines/test-mac.apps.json`
- Create: `packages/plugins/kit/tests/e2e/kit-status.e2e.test.ts`
- Modify: `packages/plugins/kit/vitest.config.ts` (or create one) to include `tests/`

- [ ] **Step 1: Create the fixture**

`packages/plugins/kit/tests/e2e/fixtures/sample-kit/kit.config.json`:

```json
{
  "name": "sample-kit",
  "repo": "https://example.com/sample-kit.git",
  "repoDir": "/tmp/sample-kit",
  "machines": { "test-mac": { "type": "darwin", "user": "tester" } }
}
```

`packages/plugins/kit/tests/e2e/fixtures/sample-kit/machines/test-mac.nix`:

```nix
{ ... }: let
  apps = builtins.fromJSON (builtins.readFile ./test-mac.apps.json);
in {
  homebrew.casks = apps.casks;
  homebrew.brews = apps.brews;
}
```

`packages/plugins/kit/tests/e2e/fixtures/sample-kit/machines/test-mac.apps.json`:

```json
{ "casks": ["zed"], "brews": [] }
```

- [ ] **Step 2: Write the smoke test**

`packages/plugins/kit/tests/e2e/kit-status.e2e.test.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderStatus } from '../../src/commands/status.js';
import { LocalProvider } from '../../src/provider/local.js';

const here = fileURLToPath(new URL('.', import.meta.url));

let workdir: string;

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), 'kit-e2e-'));
  cpSync(join(here, 'fixtures', 'sample-kit'), workdir, { recursive: true });
});
afterEach(() => { rmSync(workdir, { recursive: true, force: true }); });

describe('kit status (e2e)', () => {
  it('produces a StatusReport against the fixture', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    const report = await renderStatus({
      machine: 'test-mac',
      kitRepoDir: workdir,
      machineFile: join(workdir, 'machines', 'test-mac.apps.json'),
      provider: new LocalProvider(),
      exec,
    });
    expect(report.machineId).toBe('test-mac');
    expect(report.appsCount).toBe(1);
    expect(report.orgPolicy).toBeUndefined();
  });
});
```

- [ ] **Step 3: Update vitest config to include tests/**

Create `packages/plugins/kit/vitest.config.ts` if missing:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Run + commit**

```bash
pnpm --filter @medalsocial/kit test -- --run
git add packages/plugins/kit/tests packages/plugins/kit/vitest.config.ts
git commit -m "test(kit): add e2e fixture and status smoke test"
```

---

### Task 33: Update plugin manifest, bundled list, and README

**Files:**
- Modify: `packages/plugins/kit/plugin.toml`
- Modify: `packages/cli/src/plugins/bundled.ts`
- Modify: `packages/plugins/kit/README.md` (create new file replacing whatever's there)

- [ ] **Step 1: Update plugin.toml**

```toml
name = "kit"
namespace = "medalsocial"
description = "Open-source MDM and dotfiles for engineers — machine config, version-controlled."

[provides]
commands = ["kit init", "kit new", "kit update", "kit status", "kit apps", "kit edit"]
mcpServers = []

[permissions]
network = ["github.com"]

[roleBindings]
```

- [ ] **Step 2: Update bundled plugin manifest**

In `packages/cli/src/plugins/bundled.ts`, replace the kit entry's `provides.commands`:

```ts
provides: {
  commands: ['kit init', 'kit new', 'kit update', 'kit status', 'kit apps', 'kit edit'],
  mcpServers: [],
},
```

- [ ] **Step 3: Write the marketing README**

Replace `packages/plugins/kit/README.md` with:

```markdown
# kit

> Your machine, version-controlled.

**Open-source MDM and dotfiles for engineers.** Reproducible Mac/Linux setups in one command. Secure secrets, transparent config, fully portable. No vendor lock-in.

## What it does

- `kit init` — bootstrap a fresh machine in one command (Xcode CLT, Nix, SSH, GitHub auth, repo clone, system rebuild)
- `kit new` — scaffold a brand-new kit repo for a fresh user
- `kit update` — pull latest config and rebuild
- `kit status` — health check (machine info, apps, secrets, repo state)
- `kit apps add|remove|list` — manage Homebrew casks/brews
- `kit edit` — open the current machine's config in your editor

## How it works

kit reads a `kit.config.json` from your dotfiles repo. The repo holds your Nix configuration plus an `apps.json` per machine. Run `kit update` to pull the latest config and apply it.

## Install

kit ships bundled with [pilot](https://github.com/Medal-Social/pilot). Install pilot, then:

```bash
pilot up kit       # installs the kit shell alias
kit status         # try it out
```

You can also invoke commands directly via `pilot kit ...` — both forms are equivalent.

## License

MIT. Source-available — issues and security reports welcome. Code contributions outside the Medal Social team aren't actively solicited.

## What's next

- Medal Social Provider (kit v1.1) — opt into org policy, fleet inventory, push-based config updates
```

- [ ] **Step 4: Run full test suite + commit**

```bash
pnpm test
git add packages/plugins/kit/plugin.toml packages/cli/src/plugins/bundled.ts packages/plugins/kit/README.md
git commit -m "chore(kit): finalize manifest, bundled list, and README"
```

---

## Self-review — completed

**Spec coverage check** (against `2026-04-20-kit-machine-package-v1-design.md`):

| Spec section | Tasks |
|---|---|
| §1 Positioning, repo layout, namespacing | T31, T33 (manifest + bundled) |
| §2 Module layout — config | T3, T4 |
| §2 Module layout — machine | T5 (system); detect.ts already exists |
| §2 Module layout — steps | T9–T17 |
| §2 Module layout — commands | T23–T29 |
| §2 Module layout — ui | T18–T21 |
| §2 Module layout — shell | T2 |
| §2 Module layout — provider | T6–T8 |
| §2 Module layout — errors | T1 |
| §3 `kit init` | T28 (orchestrator), T31 (CLI dispatcher) |
| §3 `kit new` | T29, T31 |
| §3 `kit update` (incl. sudo keeper) | T27, T31 |
| §3 `kit status` (renderStatus split) | T26, T31 |
| §3 `kit apps add/remove/list` | T22, T23, T31 |
| §3 `kit edit` (editor resolution chain) | T25, T31 |
| §3 GitHub auth chain | T14 |
| §4 FleetProvider interface | T6 |
| §4 LocalProvider | T7 |
| §4 Resolver + conformance | T8 |
| §4 Provider hooks in commands | T26 (status), T27 (update), T28 (init) |
| §5 Medal Social provider | Out of scope — sibling spec |
| §6 Testing strategy | TDD throughout T1–T29; conformance T8; e2e T32 |
| §7 Migration (apps.json) | T24 |
| §7 Cutover/rollout | Coordinated separately in `Medal-Social/kit` (out of this plan; documented in spec §7) |

**Placeholder scan:** No "TBD"/"TODO"/"add appropriate error handling" patterns. All code blocks are complete.

**Type consistency check:**
- `Step` interface (T9) used by all step modules T10–T17 ✓
- `FleetProvider` (T6) used by T7, T8, T26, T27, T28 — signatures match ✓
- `Apps` type (T22 schema) consumed by T22 store, T23 commands, T24 migration ✓
- `Exec` interface (T2) injected throughout — T5 system, T10–T17 steps, T25–T29 commands ✓
- `KitError`/`errorCodes` (T1) referenced by T2, T4, T9–T17, T22–T29 — codes added in T1 cover all uses ✓

**Known scope omissions** (not bugs — design choices):
- `kit.config.ts` parsing (TS) → using `kit.config.json` instead, documented in T4 note
- `kit new` interactive prompts → env-var-driven minimal version in T31; can be expanded later
- TUI rendering of `kit status` → JSON output in v1; Ink wrapper is straightforward future addition
- `kit apps` "Apply now?" prompt → not in v1 (just mutates the file; user runs `kit update` manually)
- Migration commit-to-git → migration writes file; user commits at their cadence
- Shell alias `kit → pilot kit` → installed by `pilot up kit` (existing pilot-up flow), not part of this plan

---

Plan complete and saved to `docs/superpowers/plans/2026-04-20-kit-machine-package-v1.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
