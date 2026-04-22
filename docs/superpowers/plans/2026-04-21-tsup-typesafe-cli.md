# tsup + Type-Safe CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace bare `tsc` with `tsup` in both packages, eliminate `inject-version.sh`, and introduce a `defineCommand` abstraction so Zod schemas drive Commander registration and action handler types.

**Architecture:** `packages/plugins/kit` gets a library-only tsup config; `packages/cli` gets a split config — fully bundled binary at `dist/bin/pilot.js` and typed library at `dist/index.js`. A `defineCommand` identity function + `registerCommand` wiring function replace all inline Commander `.action()` callbacks in `bin/pilot.ts`.

**Tech Stack:** tsup 8.x, esbuild (via tsup), Commander 14, Zod 4, Vitest

---

## File Map

**New files:**
- `packages/plugins/kit/tsup.config.ts` — kit library build config
- `packages/cli/tsup.config.ts` — CLI binary + library build config
- `packages/cli/src/command.ts` — `defineCommand` + `CommandDef` types
- `packages/cli/src/command-registry.ts` — `registerCommand`, `registerGroup`, `defineCommandGroup`
- `packages/cli/src/command.test.ts` — tests for both of the above
- `packages/cli/src/commands/kit/impl.ts` — all kit implementation logic (moved from `commands/kit.ts`)
- `packages/cli/src/commands/kit/index.ts` — `kitGroup` export
- `packages/cli/src/commands/kit/init.ts` — kit init defineCommand
- `packages/cli/src/commands/kit/new.ts` — kit new defineCommand
- `packages/cli/src/commands/kit/update.ts` — kit update defineCommand
- `packages/cli/src/commands/kit/status.ts` — kit status defineCommand
- `packages/cli/src/commands/kit/apps.ts` — kit apps defineCommand
- `packages/cli/src/commands/kit/edit.ts` — kit edit defineCommand
- `packages/cli/src/commands/kit/config/show.ts` — kit config show defineCommand
- `packages/cli/src/commands/kit/config/path.ts` — kit config path defineCommand

**Modified files:**
- `packages/plugins/kit/package.json` — add tsup devDep, update build script
- `packages/cli/package.json` — add tsup devDep, update build scripts
- `packages/cli/src/version.ts` — replace shell-script injection with tsup define + dev fallback
- `packages/cli/src/commands/status.ts` — add `defineCommand` default export
- `packages/cli/src/commands/up.ts` — add `defineCommand` default export
- `packages/cli/src/commands/down.ts` — add `defineCommand` default export
- `packages/cli/src/commands/completions.ts` — add `defineCommand` default export
- `packages/cli/src/commands/crew.ts` — add `defineCommand` default export
- `packages/cli/src/commands/training.ts` — add `defineCommand` default export
- `packages/cli/src/commands/plugins.ts` — add `defineCommand` default export
- `packages/cli/src/commands/update.ts` — add `defineCommand` default export
- `packages/cli/src/commands/help.ts` — add `defineCommand` default export
- `packages/cli/src/commands/uninstall.ts` — add `defineCommand` default export
- `packages/cli/src/commands/admin.ts` — add `defineCommand` default export
- `packages/cli/src/bin/pilot.ts` — rewrite as pure registration file

**Deleted files:**
- `packages/cli/scripts/inject-version.sh`
- `packages/cli/src/commands/kit.ts` (replaced by `commands/kit/` directory)

---

## Task 1: Add tsup to packages/plugins/kit

**Files:**
- Create: `packages/plugins/kit/tsup.config.ts`
- Modify: `packages/plugins/kit/package.json`

- [ ] **Step 1: Install tsup in kit**

```bash
cd packages/plugins/kit && pnpm add -D tsup
```

- [ ] **Step 2: Write `packages/plugins/kit/tsup.config.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  outDir: 'dist',
  format: ['esm'],
  dts: true,
  external: ['ink', 'react', 'zod'],
  platform: 'node',
  target: 'node24',
  clean: true,
});
```

- [ ] **Step 3: Update `packages/plugins/kit/package.json` build script**

Change:
```json
"build": "tsc"
```
To:
```json
"build": "tsup"
```

- [ ] **Step 4: Verify kit builds with tsup**

```bash
pnpm --filter @medalsocial/kit build
```

Expected: `dist/index.js` and `dist/index.d.ts` present, no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/kit/tsup.config.ts packages/plugins/kit/package.json
git commit -m "build(kit): switch from tsc to tsup"
```

---

## Task 2: Add tsup to packages/cli + replace version injection

**Files:**
- Create: `packages/cli/tsup.config.ts`
- Modify: `packages/cli/package.json`
- Modify: `packages/cli/src/version.ts`
- Delete: `packages/cli/scripts/inject-version.sh`

- [ ] **Step 1: Install tsup in cli**

```bash
cd packages/cli && pnpm add -D tsup
```

- [ ] **Step 2: Write `packages/cli/tsup.config.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { pilot: 'src/bin/pilot.ts' },
    outDir: 'dist/bin',
    format: ['esm'],
    bundle: true,
    noExternal: [/.*/],
    platform: 'node',
    target: 'node24',
    banner: { js: '#!/usr/bin/env node' },
    define: { __PILOT_VERSION__: JSON.stringify(process.env.npm_package_version) },
    clean: true,
  },
  {
    entry: { index: 'src/index.ts' },
    outDir: 'dist',
    format: ['esm'],
    dts: true,
    external: ['ink', 'react', 'commander', 'zod', 'smol-toml', '@medalsocial/kit'],
    platform: 'node',
    target: 'node24',
  },
]);
```

- [ ] **Step 3: Update `packages/cli/package.json` scripts**

Change:
```json
"build": "sh scripts/inject-version.sh && tsc",
"prepublishOnly": "sh scripts/inject-version.sh && tsc"
```
To:
```json
"build": "tsup",
"prepublishOnly": "tsup"
```

- [ ] **Step 4: Replace `packages/cli/src/version.ts`**

Full file content (replaces existing):
```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// __PILOT_VERSION__ is injected by tsup define at build time.
// During `pnpm dev` (tsx, no tsup), fall back to npm_package_version or 'dev'.
declare const __PILOT_VERSION__: string | undefined;
export const VERSION =
  typeof __PILOT_VERSION__ !== 'undefined'
    ? __PILOT_VERSION__
    : (process.env.npm_package_version ?? 'dev');
```

- [ ] **Step 5: Delete inject-version.sh**

```bash
rm packages/cli/scripts/inject-version.sh
```

- [ ] **Step 6: Verify cli builds with tsup**

```bash
pnpm --filter @medalsocial/pilot build
```

Expected: `dist/bin/pilot.js` and `dist/index.js` + `dist/index.d.ts` present, no errors.

- [ ] **Step 7: Smoke test the binary**

```bash
node packages/cli/dist/bin/pilot.js --version
```

Expected: prints the version string from `package.json` (e.g. `0.1.7`), not `undefined` or `dev`.

- [ ] **Step 8: Commit**

```bash
git add packages/cli/tsup.config.ts packages/cli/package.json packages/cli/src/version.ts
git rm packages/cli/scripts/inject-version.sh
git commit -m "build(cli): switch from tsc to tsup, replace inject-version.sh with define"
```

---

## Task 3: Write defineCommand + registerCommand (TDD)

**Files:**
- Create: `packages/cli/src/command.ts`
- Create: `packages/cli/src/command-registry.ts`
- Create: `packages/cli/src/command.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/cli/src/command.test.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineCommand } from './command.js';
import { defineCommandGroup, registerCommand, registerGroup } from './command-registry.js';

describe('defineCommand', () => {
  it('returns the definition unchanged', () => {
    const def = defineCommand({
      name: 'test',
      description: 'test cmd',
      action: async () => {},
    });
    expect(def.name).toBe('test');
    expect(def.description).toBe('test cmd');
  });

  it('action receives typed options', async () => {
    let captured: { json: boolean } | null = null;
    const def = defineCommand({
      name: 'status',
      description: 'status',
      options: { json: z.boolean().default(false) },
      action: async ({ options }) => {
        captured = options;
      },
    });
    await def.action({ args: {}, options: { json: true } });
    expect(captured).toEqual({ json: true });
  });

  it('action receives typed positional args', async () => {
    let captured: { template: string | undefined } | null = null;
    const def = defineCommand({
      name: 'up',
      description: 'setup',
      args: { template: z.string().optional() },
      action: async ({ args }) => {
        captured = args;
      },
    });
    await def.action({ args: { template: 'pencil' }, options: {} });
    expect(captured).toEqual({ template: 'pencil' });
  });
});

describe('registerCommand', () => {
  it('registers the command name and description with Commander', () => {
    const program = new Command();
    program.exitOverride();
    const def = defineCommand({
      name: 'status',
      description: 'machine health',
      options: { json: z.boolean().default(false) },
      action: async () => {},
    });
    registerCommand(program, def);
    const cmd = program.commands.find((c) => c.name() === 'status');
    expect(cmd).toBeDefined();
    expect(cmd?.description()).toBe('machine health');
  });

  it('registers a boolean option as --flag (no value)', () => {
    const program = new Command();
    program.exitOverride();
    const def = defineCommand({
      name: 'status',
      description: 'status',
      options: { json: z.boolean().default(false) },
      action: async () => {},
    });
    registerCommand(program, def);
    const cmd = program.commands.find((c) => c.name() === 'status')!;
    const opt = cmd.options.find((o) => o.long === '--json');
    expect(opt).toBeDefined();
    expect(opt?.required).toBe(false); // boolean flags have no value
  });

  it('registers an optional positional arg as [name]', () => {
    const program = new Command();
    program.exitOverride();
    const def = defineCommand({
      name: 'up',
      description: 'setup',
      args: { template: z.string().optional() },
      action: async () => {},
    });
    registerCommand(program, def);
    const cmd = program.commands.find((c) => c.name() === 'up')!;
    expect(cmd.registeredArguments[0].name()).toBe('template');
    expect(cmd.registeredArguments[0].required).toBe(false);
  });

  it('registers a required positional arg as <name>', () => {
    const program = new Command();
    program.exitOverride();
    const def = defineCommand({
      name: 'down',
      description: 'remove',
      args: { template: z.string() },
      action: async () => {},
    });
    registerCommand(program, def);
    const cmd = program.commands.find((c) => c.name() === 'down')!;
    expect(cmd.registeredArguments[0].required).toBe(true);
  });

  it('parses and validates options via Zod before calling action', async () => {
    const program = new Command();
    program.exitOverride();
    let captured: { json: boolean } | null = null;
    const def = defineCommand({
      name: 'status',
      description: 'status',
      options: { json: z.boolean().default(false) },
      action: async ({ options }) => {
        captured = options;
      },
    });
    registerCommand(program, def);
    await program.parseAsync(['status', '--json'], { from: 'user' });
    expect(captured).toEqual({ json: true });
  });

  it('Zod schema rejects invalid option values', () => {
    const def = defineCommand({
      name: 'status',
      description: 'status',
      options: { json: z.boolean().default(false) },
      action: async () => {},
    });
    expect(() => z.object(def.options!).parse({ json: 'yes' })).toThrow();
  });

  it('unwraps ZodDefault wrapping ZodBoolean correctly', () => {
    const program = new Command();
    program.exitOverride();
    const def = defineCommand({
      name: 'cmd',
      description: 'cmd',
      options: { verbose: z.boolean().default(false) }, // ZodDefault > ZodBoolean
      action: async () => {},
    });
    registerCommand(program, def);
    const cmd = program.commands.find((c) => c.name() === 'cmd')!;
    const opt = cmd.options.find((o) => o.long === '--verbose');
    expect(opt?.required).toBe(false); // boolean flag, no <value>
  });
});

describe('defineCommandGroup + registerGroup', () => {
  it('creates a group with name, description, and children', () => {
    const child = defineCommand({ name: 'init', description: 'init', action: async () => {} });
    const group = defineCommandGroup('kit', 'Machine config', [child]);
    expect(group.type).toBe('group');
    expect(group.name).toBe('kit');
    expect(group.children).toHaveLength(1);
  });

  it('registerGroup wires parent and child commands with Commander', () => {
    const program = new Command();
    program.exitOverride();
    const child = defineCommand({ name: 'init', description: 'init', action: async () => {} });
    const group = defineCommandGroup('kit', 'Machine config', [child]);
    registerGroup(program, group);
    const kitCmd = program.commands.find((c) => c.name() === 'kit');
    expect(kitCmd).toBeDefined();
    expect(kitCmd?.commands.find((c) => c.name() === 'init')).toBeDefined();
  });

  it('registerGroup handles nested groups (kit config show)', () => {
    const program = new Command();
    program.exitOverride();
    const showCmd = defineCommand({ name: 'show', description: 'show', action: async () => {} });
    const configGroup = defineCommandGroup('config', 'Config', [showCmd]);
    const kitGroup = defineCommandGroup('kit', 'Kit', [configGroup]);
    registerGroup(program, kitGroup);
    const kit = program.commands.find((c) => c.name() === 'kit')!;
    const config = kit.commands.find((c) => c.name() === 'config')!;
    expect(config.commands.find((c) => c.name() === 'show')).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @medalsocial/pilot test command -- --run
```

Expected: multiple failures — `command.ts` and `command-registry.ts` don't exist yet.

- [ ] **Step 3: Write `packages/cli/src/command.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { z } from 'zod';

type ZodShape = Record<string, z.ZodTypeAny>;

export interface CommandDef<A extends ZodShape, O extends ZodShape> {
  name: string;
  description: string;
  args?: A;
  options?: O;
  action: (ctx: {
    args: z.infer<z.ZodObject<A>>;
    options: z.infer<z.ZodObject<O>>;
  }) => Promise<void>;
}

export function defineCommand<A extends ZodShape, O extends ZodShape>(
  def: CommandDef<A, O>
): CommandDef<A, O> {
  return def;
}
```

- [ ] **Step 4: Write `packages/cli/src/command-registry.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Command } from 'commander';
import { z } from 'zod';
import type { CommandDef } from './command.js';

export interface CommandGroup {
  type: 'group';
  name: string;
  description: string;
  children: (CommandDef<any, any> | CommandGroup)[];
}

export function defineCommandGroup(
  name: string,
  description: string,
  children: (CommandDef<any, any> | CommandGroup)[]
): CommandGroup {
  return { type: 'group', name, description, children };
}

function unwrapSchema(s: z.ZodTypeAny): z.ZodTypeAny {
  if (s instanceof z.ZodDefault || s instanceof z.ZodOptional || s instanceof z.ZodNullable) {
    return unwrapSchema(s._def.innerType as z.ZodTypeAny);
  }
  return s;
}

export function registerCommand(parent: Command, def: CommandDef<any, any>): void {
  const cmd = parent.command(def.name).description(def.description);

  for (const [key, schema] of Object.entries(def.args ?? {})) {
    const isOptional = schema.isOptional();
    cmd.argument(isOptional ? `[${key}]` : `<${key}>`, schema.description ?? '');
  }

  for (const [key, schema] of Object.entries(def.options ?? {})) {
    const inner = unwrapSchema(schema);
    if (inner instanceof z.ZodBoolean) {
      cmd.option(`--${key}`, schema.description ?? '');
    } else {
      cmd.option(`--${key} <value>`, schema.description ?? '');
    }
  }

  cmd.action(async (...rawArgs) => {
    const positional = rawArgs.slice(0, -1);
    const rawOpts = cmd.opts();

    const argsKeys = Object.keys(def.args ?? {});
    const rawArgsObj = Object.fromEntries(argsKeys.map((k, i) => [k, positional[i]]));

    const args = def.args ? z.object(def.args).parse(rawArgsObj) : {};
    const options = def.options ? z.object(def.options).parse(rawOpts) : {};

    await def.action({ args, options } as any);
  });
}

export function registerGroup(parent: Command, group: CommandGroup): void {
  const cmd = parent.command(group.name).description(group.description);
  for (const child of group.children) {
    if ('type' in child && child.type === 'group') registerGroup(cmd, child);
    else registerCommand(cmd, child as CommandDef<any, any>);
  }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
pnpm --filter @medalsocial/pilot test command -- --run
```

Expected: all tests in `command.test.ts` pass.

- [ ] **Step 6: Run full test suite to confirm nothing broke**

```bash
pnpm --filter @medalsocial/pilot test -- --run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/command.ts packages/cli/src/command-registry.ts packages/cli/src/command.test.ts
git commit -m "feat(cli): add defineCommand and registerCommand API"
```

---

## Task 4: Migrate no-arg/no-option commands

Each of these commands takes no positional args and no options. The pattern is identical for all — add a `defineCommand` default export that wraps the existing `runX()` function.

**Files (modify each):**
- `packages/cli/src/commands/crew.ts`
- `packages/cli/src/commands/training.ts`
- `packages/cli/src/commands/plugins.ts`
- `packages/cli/src/commands/help.ts`
- `packages/cli/src/commands/update.ts`
- `packages/cli/src/commands/uninstall.ts`
- `packages/cli/src/commands/admin.ts`

- [ ] **Step 1: Write failing tests for each command's default export**

Create `packages/cli/src/commands/crew.test.ts` (add alongside existing test if one exists, otherwise create):

Check if a test file already exists:
```bash
ls packages/cli/src/commands/*.test.ts
```

For each command that doesn't have an existing test, we add to its test file. Since these commands have no existing test files, create them:

`packages/cli/src/commands/crew.test.ts`:
```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import crewCmd from './crew.js';

describe('crew command definition', () => {
  it('has correct name and description', () => {
    expect(crewCmd.name).toBe('crew');
    expect(crewCmd.description).toBe('Manage your AI crew');
  });
});
```

`packages/cli/src/commands/training.test.ts`:
```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import trainingCmd from './training.js';

describe('training command definition', () => {
  it('has correct name and description', () => {
    expect(trainingCmd.name).toBe('training');
    expect(trainingCmd.description).toBe('Knowledge base — teach your crew about your brand');
  });
});
```

`packages/cli/src/commands/plugins.test.ts`:
```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import pluginsCmd from './plugins.js';

describe('plugins command definition', () => {
  it('has correct name and description', () => {
    expect(pluginsCmd.name).toBe('plugins');
    expect(pluginsCmd.description).toBe('Browse and manage plugins');
  });
});
```

`packages/cli/src/commands/help.test.ts`:
```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import helpCmd from './help.js';

describe('help command definition', () => {
  it('has correct name and description', () => {
    expect(helpCmd.name).toBe('help');
    expect(helpCmd.description).toBe('Help reference');
  });
});
```

`packages/cli/src/commands/update.test.ts`:
```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import updateCmd from './update.js';

describe('update command definition', () => {
  it('has correct name and description', () => {
    expect(updateCmd.name).toBe('update');
    expect(updateCmd.description).toBe('Check for and apply updates');
  });
});
```

`packages/cli/src/commands/uninstall.test.ts`:
```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import uninstallCmd from './uninstall.js';

describe('uninstall command definition', () => {
  it('has correct name and description', () => {
    expect(uninstallCmd.name).toBe('uninstall');
    expect(uninstallCmd.description).toBe('Remove Pilot and all its files from your machine');
  });
});
```

`packages/cli/src/commands/admin.test.ts` (file already exists — add to it):
```ts
// Add this describe block to the existing admin.test.ts file:
import adminCmd from './admin.js';

describe('admin command definition', () => {
  it('has correct name and description', () => {
    expect(adminCmd.name).toBe('admin');
    expect(adminCmd.description).toBe('Admin dashboard and command center');
  });
});
```

- [ ] **Step 2: Run new tests to confirm they fail**

```bash
pnpm --filter @medalsocial/pilot test crew training plugins help update uninstall admin -- --run
```

Expected: fails — no default export from these files yet.

- [ ] **Step 3: Add `defineCommand` default export to `commands/crew.ts`**

Add to the bottom of `packages/cli/src/commands/crew.ts`:
```ts
import { defineCommand } from '../command.js';

export default defineCommand({
  name: 'crew',
  description: 'Manage your AI crew',
  action: async () => {
    await runCrew();
  },
});
```

- [ ] **Step 4: Add `defineCommand` default export to `commands/training.ts`**

Add to the bottom of `packages/cli/src/commands/training.ts`:
```ts
import { defineCommand } from '../command.js';

export default defineCommand({
  name: 'training',
  description: 'Knowledge base — teach your crew about your brand',
  action: async () => {
    await runTraining();
  },
});
```

- [ ] **Step 5: Add `defineCommand` default export to `commands/plugins.ts`**

Add to the bottom of `packages/cli/src/commands/plugins.ts`:
```ts
import { defineCommand } from '../command.js';

export default defineCommand({
  name: 'plugins',
  description: 'Browse and manage plugins',
  action: async () => {
    await runPlugins();
  },
});
```

- [ ] **Step 6: Add `defineCommand` default export to `commands/help.ts`**

Add to the bottom of `packages/cli/src/commands/help.ts`:
```ts
import { defineCommand } from '../command.js';

export default defineCommand({
  name: 'help',
  description: 'Help reference',
  action: async () => {
    await runHelp();
  },
});
```

- [ ] **Step 7: Add `defineCommand` default export to `commands/update.ts`**

Add to the bottom of `packages/cli/src/commands/update.ts`:
```ts
import { defineCommand } from '../command.js';

export default defineCommand({
  name: 'update',
  description: 'Check for and apply updates',
  action: async () => {
    await runUpdate();
  },
});
```

- [ ] **Step 8: Add `defineCommand` default export to `commands/uninstall.ts`**

Add to the bottom of `packages/cli/src/commands/uninstall.ts`:
```ts
import { defineCommand } from '../command.js';

export default defineCommand({
  name: 'uninstall',
  description: 'Remove Pilot and all its files from your machine',
  action: async () => {
    await runUninstall();
  },
});
```

- [ ] **Step 9: Add `defineCommand` default export to `commands/admin.ts`**

Add to the bottom of `packages/cli/src/commands/admin.ts`:
```ts
import { defineCommand } from '../command.js';

export default defineCommand({
  name: 'admin',
  description: 'Admin dashboard and command center',
  action: async () => {
    await runAdmin();
  },
});
```

- [ ] **Step 10: Run tests to confirm they pass**

```bash
pnpm --filter @medalsocial/pilot test crew training plugins help update uninstall admin -- --run
```

Expected: all new tests pass.

- [ ] **Step 11: Commit**

```bash
git add packages/cli/src/commands/crew.ts packages/cli/src/commands/crew.test.ts \
        packages/cli/src/commands/training.ts packages/cli/src/commands/training.test.ts \
        packages/cli/src/commands/plugins.ts packages/cli/src/commands/plugins.test.ts \
        packages/cli/src/commands/help.ts packages/cli/src/commands/help.test.ts \
        packages/cli/src/commands/update.ts packages/cli/src/commands/update.test.ts \
        packages/cli/src/commands/uninstall.ts packages/cli/src/commands/uninstall.test.ts \
        packages/cli/src/commands/admin.ts packages/cli/src/commands/admin.test.ts
git commit -m "feat(cli): add defineCommand exports to no-arg commands"
```

---

## Task 5: Migrate status command (--json option)

**Files:**
- Modify: `packages/cli/src/commands/status.ts`
- Modify: `packages/cli/src/commands/status.test.ts`

- [ ] **Step 1: Add test for typed action invocation**

In `packages/cli/src/commands/status.test.ts`, add:

```ts
import { describe, expect, it, vi } from 'vitest';
import statusCmd from './status.js';

describe('status command definition', () => {
  it('has correct name, description, and json option', () => {
    expect(statusCmd.name).toBe('status');
    expect(statusCmd.options?.json).toBeDefined();
  });

  it('action calls runStatus with json: true when option is set', async () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
      writes.push(String(s));
      return true;
    });

    await statusCmd.action({ args: {}, options: { json: true } });

    expect(writes.length).toBeGreaterThan(0);
    const parsed = JSON.parse(writes[0]);
    expect(parsed).toMatchObject({ pilot: expect.any(String), node: expect.any(String) });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @medalsocial/pilot test status -- --run
```

Expected: fails — no default export from `status.ts` yet.

- [ ] **Step 3: Add `defineCommand` default export to `commands/status.ts`**

Add to the bottom of `packages/cli/src/commands/status.ts`:
```ts
import { z } from 'zod';
import { defineCommand } from '../command.js';

export default defineCommand({
  name: 'status',
  description: 'Machine and system health',
  options: {
    json: z.boolean().default(false).describe('Output status as JSON'),
  },
  action: async ({ options }) => {
    await runStatus(options);
  },
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @medalsocial/pilot test status -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/status.ts packages/cli/src/commands/status.test.ts
git commit -m "feat(cli): add defineCommand export to status command"
```

---

## Task 6: Migrate up command (optional positional arg)

**Files:**
- Modify: `packages/cli/src/commands/up.ts`
- Create: `packages/cli/src/commands/up.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/cli/src/commands/up.test.ts`:
```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import upCmd from './up.js';

describe('up command definition', () => {
  it('has correct name and description', () => {
    expect(upCmd.name).toBe('up');
    expect(upCmd.description).toBe('One-click setup — install templates, skills, crew bindings');
  });

  it('template arg is optional', () => {
    expect(upCmd.args?.template.isOptional()).toBe(true);
  });

  it('action can be called without template', async () => {
    await expect(upCmd.action({ args: { template: undefined }, options: {} })).resolves.not.toThrow();
  });

  it('action can be called with a template', async () => {
    await expect(upCmd.action({ args: { template: 'pencil' }, options: {} })).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @medalsocial/pilot test src/commands/up -- --run
```

Expected: fails — no default export yet.

- [ ] **Step 3: Add `defineCommand` default export to `commands/up.ts`**

Add to the bottom of `packages/cli/src/commands/up.ts`:
```ts
import { z } from 'zod';
import { defineCommand } from '../command.js';

export default defineCommand({
  name: 'up',
  description: 'One-click setup — install templates, skills, crew bindings',
  args: {
    template: z.string().optional().describe('Template name'),
  },
  action: async ({ args }) => {
    await runUp(args.template);
  },
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @medalsocial/pilot test src/commands/up -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/up.ts packages/cli/src/commands/up.test.ts
git commit -m "feat(cli): add defineCommand export to up command"
```

---

## Task 7: Migrate down command (required positional arg)

**Files:**
- Modify: `packages/cli/src/commands/down.ts`
- Create: `packages/cli/src/commands/down.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/cli/src/commands/down.test.ts`:
```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import downCmd from './down.js';

describe('down command definition', () => {
  it('has correct name and description', () => {
    expect(downCmd.name).toBe('down');
    expect(downCmd.description).toBe("Remove a template's installed tools (inverse of pilot up)");
  });

  it('template arg is required', () => {
    expect(downCmd.args?.template.isOptional()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @medalsocial/pilot test src/commands/down -- --run
```

Expected: fails — no default export yet.

- [ ] **Step 3: Add `defineCommand` default export to `commands/down.ts`**

Add to the bottom of `packages/cli/src/commands/down.ts`:
```ts
import { z } from 'zod';
import { defineCommand } from '../command.js';

export default defineCommand({
  name: 'down',
  description: "Remove a template's installed tools (inverse of pilot up)",
  args: {
    template: z.string().describe('Template name'),
  },
  action: async ({ args }) => {
    await runDown(args.template);
  },
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @medalsocial/pilot test src/commands/down -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/down.ts packages/cli/src/commands/down.test.ts
git commit -m "feat(cli): add defineCommand export to down command"
```

---

## Task 8: Migrate completions command (required positional arg)

**Files:**
- Modify: `packages/cli/src/commands/completions.ts`
- Modify: `packages/cli/src/commands/completions.test.ts` (file exists)

- [ ] **Step 1: Add test to existing `completions.test.ts`**

Open `packages/cli/src/commands/completions.test.ts` and add:

```ts
import completionsCmd from './completions.js';

describe('completions command definition', () => {
  it('has correct name and description', () => {
    expect(completionsCmd.name).toBe('completions');
    expect(completionsCmd.description).toBe('Output shell completion script (bash, zsh, fish)');
  });

  it('shell arg is required', () => {
    expect(completionsCmd.args?.shell.isOptional()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm --filter @medalsocial/pilot test completions -- --run
```

Expected: new tests fail — no default export yet.

- [ ] **Step 3: Add `defineCommand` default export to `commands/completions.ts`**

Add to the bottom of `packages/cli/src/commands/completions.ts`:
```ts
import { z } from 'zod';
import { defineCommand } from '../command.js';

export default defineCommand({
  name: 'completions',
  description: 'Output shell completion script (bash, zsh, fish)',
  args: {
    shell: z.string().describe('Shell (bash | zsh | fish)'),
  },
  action: async ({ args }) => {
    await runCompletions(args.shell);
  },
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm --filter @medalsocial/pilot test completions -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/completions.ts packages/cli/src/commands/completions.test.ts
git commit -m "feat(cli): add defineCommand export to completions command"
```

---

## Task 9: Extract kit commands into commands/kit/ directory

The current `packages/cli/src/commands/kit.ts` is a 388-line file containing all kit command implementations and helpers. We move the implementation to `commands/kit/impl.ts` and create thin `defineCommand` wrapper files.

**Files:**
- Create: `packages/cli/src/commands/kit/impl.ts` (moved from `commands/kit.ts`)
- Create: `packages/cli/src/commands/kit/index.ts`
- Create: `packages/cli/src/commands/kit/init.ts`
- Create: `packages/cli/src/commands/kit/new.ts`
- Create: `packages/cli/src/commands/kit/update.ts`
- Create: `packages/cli/src/commands/kit/status.ts`
- Create: `packages/cli/src/commands/kit/apps.ts`
- Create: `packages/cli/src/commands/kit/edit.ts`
- Create: `packages/cli/src/commands/kit/config/show.ts`
- Create: `packages/cli/src/commands/kit/config/path.ts`
- Delete: `packages/cli/src/commands/kit.ts`
- Modify: `packages/cli/src/commands/kit.test.ts` (update import path)

- [ ] **Step 1: Create the kit directory and copy impl.ts**

Copy the entire contents of `packages/cli/src/commands/kit.ts` to `packages/cli/src/commands/kit/impl.ts`. No changes to the functions — only the file location changes.

```bash
mkdir -p packages/cli/src/commands/kit/config
cp packages/cli/src/commands/kit.ts packages/cli/src/commands/kit/impl.ts
```

- [ ] **Step 2: Write failing tests for kit command definitions**

Create `packages/cli/src/commands/kit/kit-commands.test.ts`:

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { kitGroup } from './index.js';
import initCmd from './init.js';
import newCmd from './new.js';
import updateCmd from './update.js';
import statusCmd from './status.js';
import appsCmd from './apps.js';
import editCmd from './edit.js';
import configShowCmd from './config/show.js';
import configPathCmd from './config/path.js';

describe('kit command definitions', () => {
  it('init: name + description correct', () => {
    expect(initCmd.name).toBe('init');
    expect(initCmd.description).toBe('Bootstrap an existing kit repo on this machine');
  });

  it('init: machine arg is optional', () => {
    expect(initCmd.args?.machine.isOptional()).toBe(true);
  });

  it('new: name + description correct', () => {
    expect(newCmd.name).toBe('new');
    expect(newCmd.description).toBe('Scaffold a new kit repo from scratch');
  });

  it('update: name + description correct', () => {
    expect(updateCmd.name).toBe('update');
    expect(updateCmd.description).toBe('Pull latest config and rebuild the system');
  });

  it('status: has json option', () => {
    expect(statusCmd.name).toBe('status');
    expect(statusCmd.options?.json).toBeDefined();
  });

  it('apps: action arg is required', () => {
    expect(appsCmd.args?.action.isOptional()).toBe(false);
  });

  it('apps: name arg is optional', () => {
    expect(appsCmd.args?.name.isOptional()).toBe(true);
  });

  it('edit: name + description correct', () => {
    expect(editCmd.name).toBe('edit');
  });

  it('config show: name correct', () => {
    expect(configShowCmd.name).toBe('show');
  });

  it('config path: name correct', () => {
    expect(configPathCmd.name).toBe('path');
  });

  it('kitGroup: type is group with name kit', () => {
    expect(kitGroup.type).toBe('group');
    expect(kitGroup.name).toBe('kit');
  });

  it('kitGroup: contains expected child commands', () => {
    const names = kitGroup.children.map((c) => c.name);
    expect(names).toContain('init');
    expect(names).toContain('new');
    expect(names).toContain('update');
    expect(names).toContain('status');
    expect(names).toContain('apps');
    expect(names).toContain('edit');
    expect(names).toContain('config');
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
pnpm --filter @medalsocial/pilot test kit-commands -- --run
```

Expected: fails — the new files don't exist yet.

- [ ] **Step 4: Write `commands/kit/init.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { defineCommand } from '../../command.js';
import { runKitInit } from './impl.js';

export default defineCommand({
  name: 'init',
  description: 'Bootstrap an existing kit repo on this machine',
  args: {
    machine: z.string().optional().describe('Machine name (defaults to current hostname)'),
  },
  action: async ({ args }) => {
    await runKitInit(args.machine);
  },
});
```

- [ ] **Step 5: Write `commands/kit/new.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineCommand } from '../../command.js';
import { runKitNew } from './impl.js';

export default defineCommand({
  name: 'new',
  description: 'Scaffold a new kit repo from scratch',
  action: async () => {
    await runKitNew();
  },
});
```

- [ ] **Step 6: Write `commands/kit/update.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineCommand } from '../../command.js';
import { runKitUpdate } from './impl.js';

export default defineCommand({
  name: 'update',
  description: 'Pull latest config and rebuild the system',
  action: async () => {
    await runKitUpdate();
  },
});
```

- [ ] **Step 7: Write `commands/kit/status.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { defineCommand } from '../../command.js';
import { runKitStatus } from './impl.js';

export default defineCommand({
  name: 'status',
  description: 'Machine health, apps, secrets, repo state',
  options: {
    json: z.boolean().default(false).describe('Output status as JSON'),
  },
  action: async ({ options }) => {
    await runKitStatus(options);
  },
});
```

- [ ] **Step 8: Write `commands/kit/apps.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import { defineCommand } from '../../command.js';
import { runKitApps } from './impl.js';

export default defineCommand({
  name: 'apps',
  description: 'Manage Homebrew casks/brews (add | remove | list)',
  args: {
    action: z.enum(['add', 'remove', 'list']).describe('Action to perform'),
    name: z.string().optional().describe('Package name (cask:NAME or brew:NAME)'),
  },
  action: async ({ args }) => {
    await runKitApps(args.action, args.name);
  },
});
```

- [ ] **Step 9: Write `commands/kit/edit.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineCommand } from '../../command.js';
import { runKitEdit } from './impl.js';

export default defineCommand({
  name: 'edit',
  description: "Open this machine's config in $EDITOR",
  action: async () => {
    await runKitEdit();
  },
});
```

- [ ] **Step 10: Write `commands/kit/config/show.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineCommand } from '../../../command.js';
import { runKitConfigShow } from '../impl.js';

export default defineCommand({
  name: 'show',
  description: 'Show the loaded config and where it was loaded from',
  action: async () => {
    await runKitConfigShow();
  },
});
```

- [ ] **Step 11: Write `commands/kit/config/path.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineCommand } from '../../../command.js';
import { runKitConfigPath } from '../impl.js';

export default defineCommand({
  name: 'path',
  description: 'Print the absolute path to the loaded kit.config.json',
  action: async () => {
    await runKitConfigPath();
  },
});
```

- [ ] **Step 12: Write `commands/kit/index.ts`**

```ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { defineCommandGroup } from '../../command-registry.js';
import appsCmd from './apps.js';
import editCmd from './edit.js';
import initCmd from './init.js';
import newCmd from './new.js';
import statusCmd from './status.js';
import updateCmd from './update.js';
import configPathCmd from './config/path.js';
import configShowCmd from './config/show.js';

const configGroup = defineCommandGroup('config', 'Inspect the loaded kit.config.json', [
  configShowCmd,
  configPathCmd,
]);

export const kitGroup = defineCommandGroup('kit', 'Machine configuration & Nix management', [
  initCmd,
  newCmd,
  updateCmd,
  statusCmd,
  appsCmd,
  editCmd,
  configGroup,
]);
```

- [ ] **Step 13: Run new tests to confirm they pass**

```bash
pnpm --filter @medalsocial/pilot test kit-commands -- --run
```

Expected: all tests pass.

- [ ] **Step 14: Update `commands/kit.test.ts` import path**

Open `packages/cli/src/commands/kit.test.ts`. Change imports from:
```ts
import { parseAppsTarget, resolveMachine, ... } from './kit.js';
```
To:
```ts
import { parseAppsTarget, resolveMachine, ... } from './kit/impl.js';
```

- [ ] **Step 15: Run the existing kit tests to confirm they pass**

```bash
pnpm --filter @medalsocial/pilot test src/commands/kit.test -- --run
```

Expected: all existing kit tests pass.

- [ ] **Step 16: Delete the old kit.ts**

```bash
git rm packages/cli/src/commands/kit.ts
```

- [ ] **Step 17: Run full test suite to confirm nothing broke**

```bash
pnpm --filter @medalsocial/pilot test -- --run
```

Expected: all tests pass.

- [ ] **Step 18: Commit**

```bash
git add packages/cli/src/commands/kit/
git add packages/cli/src/commands/kit.test.ts
git commit -m "refactor(cli): extract kit commands into commands/kit/ with defineCommand exports"
```

---

## Task 10: Rewrite bin/pilot.ts as pure registration file

**Files:**
- Modify: `packages/cli/src/bin/pilot.ts`

- [ ] **Step 1: Rewrite `packages/cli/src/bin/pilot.ts`**

Replace the entire file with:

```ts
#!/usr/bin/env node
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { program } from 'commander';
import { registerCommand, registerGroup } from '../command-registry.js';
import { loadSettings } from '../settings.js';
import { VERSION } from '../version.js';

import adminCmd from '../commands/admin.js';
import completionsCmd from '../commands/completions.js';
import crewCmd from '../commands/crew.js';
import downCmd from '../commands/down.js';
import helpCmd from '../commands/help.js';
import pluginsCmd from '../commands/plugins.js';
import statusCmd from '../commands/status.js';
import trainingCmd from '../commands/training.js';
import uninstallCmd from '../commands/uninstall.js';
import updateCmd from '../commands/update.js';
import upCmd from '../commands/up.js';

program.name('pilot').description('Your AI crew, ready to fly.').version(VERSION, '-v, --version');

registerCommand(program, upCmd);
registerCommand(program, crewCmd);
registerCommand(program, trainingCmd);
registerCommand(program, pluginsCmd);
registerCommand(program, updateCmd);
registerCommand(program, statusCmd);
registerCommand(program, helpCmd);
registerCommand(program, uninstallCmd);
registerCommand(program, downCmd);
registerCommand(program, completionsCmd);
registerCommand(program, adminCmd);

const settings = loadSettings();
if (settings.plugins['@medalsocial/kit']?.enabled !== false) {
  const { kitGroup } = await import('../commands/kit/index.js');
  registerGroup(program, kitGroup);
}

program.action(async () => {
  const { runRepl } = await import('../commands/repl.js');
  await runRepl();
});

program.parseAsync();
```

- [ ] **Step 2: Build and smoke test**

```bash
pnpm --filter @medalsocial/pilot build
node packages/cli/dist/bin/pilot.js --help
```

Expected: help output lists all commands (up, crew, training, plugins, update, status, help, uninstall, down, completions, admin, kit).

```bash
node packages/cli/dist/bin/pilot.js --version
```

Expected: prints version from package.json (e.g. `0.1.7`).

```bash
node packages/cli/dist/bin/pilot.js status --json
```

Expected: prints JSON with `pilot`, `node`, `platform`, `arch` keys.

```bash
node packages/cli/dist/bin/pilot.js completions zsh
```

Expected: prints zsh completion script.

- [ ] **Step 3: Check `commands/commands.test.ts` for broken imports**

```bash
cat packages/cli/src/commands/commands.test.ts
```

If it imports directly from `pilot.ts` or hard-codes the command list, update it to match the new registration pattern. If it already tests commands in isolation, no change needed.

- [ ] **Step 4: Run full test suite**

```bash
pnpm --filter @medalsocial/pilot test -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/bin/pilot.ts
git commit -m "refactor(cli): rewrite bin/pilot.ts as pure registration using defineCommand"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full workspace build**

```bash
pnpm build
```

Expected: both `@medalsocial/kit` and `@medalsocial/pilot` build with no errors.

- [ ] **Step 2: Typecheck both packages**

```bash
pnpm --filter @medalsocial/pilot typecheck
pnpm --filter @medalsocial/kit typecheck
```

Expected: no TypeScript errors.

- [ ] **Step 3: Full test suite**

```bash
pnpm test
```

Expected: all tests pass across the workspace.

- [ ] **Step 4: Verify binary is self-contained**

```bash
node packages/cli/dist/bin/pilot.js kit --help
node packages/cli/dist/bin/pilot.js kit status --json
node packages/cli/dist/bin/pilot.js completions bash
node packages/cli/dist/bin/pilot.js completions zsh
node packages/cli/dist/bin/pilot.js completions fish
```

Expected: all commands respond correctly.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: verify tsup + typesafe CLI migration complete"
```
