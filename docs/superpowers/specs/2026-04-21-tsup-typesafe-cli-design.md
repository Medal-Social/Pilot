# tsup + Type-Safe CLI Design

**Date:** 2026-04-21
**Status:** Approved
**Scope:** `packages/cli` and `packages/plugins/kit`; establishes cross-repo pattern

---

## Problem

Both packages build with bare `tsc`. This means:

- No bundling — `dist/bin/pilot.js` requires `node_modules` at runtime
- `inject-version.sh` shell script injects `VERSION` at build time (fragile, platform-dependent)
- Commander commands are wired with untyped string params — `action: string`, `name?: string`, `opts: { json?: boolean }` are all manually typed, with no guarantee they match what Commander actually parsed
- `moduleResolution: "bundler"` in tsconfig already assumes a bundler but none is present

---

## Goals

1. Replace `tsc` with `tsup` in both packages — one build tool, faster builds, correct bundling
2. Produce a fully bundled `dist/bin/pilot.js` (all deps inlined, zero `node_modules` needed at runtime)
3. Produce a typed library export (`dist/index.js` + `.d.ts`) for programmatic use
4. Replace `inject-version.sh` with tsup's `define`
5. Introduce a `defineCommand` abstraction: Zod schemas drive Commander registration AND action handler types, with runtime validation of parsed CLI input

---

## Non-Goals

- Replacing Commander.js (stays as implementation detail)
- Changing any `runX()` implementation functions (they are unchanged)
- Applying `defineCommand` to kit plugin internals (kit is not a CLI entry point)
- Designing Picasso or NextMedal build systems (separate specs)

---

## Architecture

### Build System

**`packages/cli/tsup.config.ts`:**

```ts
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    // Fully bundled binary — all deps inlined, no node_modules needed at runtime
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
    // Library export — external deps, typed declarations
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

**`packages/plugins/kit/tsup.config.ts`:**

```ts
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

**`packages/cli/package.json` script changes:**

```json
"build": "tsup",
"prepublishOnly": "tsup"
```

**`src/version.ts` replaces `inject-version.sh`:**

```ts
// __PILOT_VERSION__ is injected by tsup define at build time.
// During `pnpm dev` (tsx, no tsup), fall back to npm_package_version or 'dev'.
declare const __PILOT_VERSION__: string | undefined;
export const VERSION =
  typeof __PILOT_VERSION__ !== 'undefined'
    ? __PILOT_VERSION__
    : (process.env.npm_package_version ?? 'dev');
```

**Deleted:** `packages/cli/scripts/inject-version.sh`

**Typechecking** (`tsc --noEmit`) is kept as a separate CI step — tsup uses esbuild which strips types without checking them.

---

### `defineCommand` API

**`src/command.ts`:**

```ts
import { z } from 'zod';

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

// Identity function — exists purely to narrow types at definition site
export function defineCommand<A extends ZodShape, O extends ZodShape>(
  def: CommandDef<A, O>
): CommandDef<A, O> {
  return def;
}
```

**`src/command-registry.ts`:**

```ts
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

export function registerCommand(parent: Command, def: CommandDef<any, any>): void {
  const cmd = parent.command(def.name).description(def.description);

  // Positional args — z.string().optional() → [arg], z.string() → <arg>
  for (const [key, schema] of Object.entries(def.args ?? {})) {
    const isOptional = schema.isOptional();
    cmd.argument(isOptional ? `[${key}]` : `<${key}>`, schema.description ?? '');
  }

  // Named options — z.boolean() → --flag, anything else → --flag <value>
  // unwrapSchema strips ZodDefault/ZodOptional/ZodNullable wrappers to reach the inner type
  function unwrapSchema(s: z.ZodTypeAny): z.ZodTypeAny {
    if (s instanceof z.ZodDefault || s instanceof z.ZodOptional || s instanceof z.ZodNullable) {
      return unwrapSchema(s._def.innerType);
    }
    return s;
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
    const positional = rawArgs.slice(0, -1); // Commander appends the Command instance as last arg
    const rawOpts = cmd.opts();

    const argsKeys = Object.keys(def.args ?? {});
    const rawArgsObj = Object.fromEntries(argsKeys.map((k, i) => [k, positional[i]]));

    // Runtime validation — Zod parse throws on invalid input with a clean error
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

---

### Command File Structure

Each command file exports a `defineCommand` default. The existing `runX()` implementation functions stay inside the same file — the `defineCommand` wraps them.

```
src/
  command.ts
  command-registry.ts
  bin/pilot.ts              ← pure registration, no inline actions
  commands/
    status.ts               ← export default defineCommand({...})
    up.ts
    down.ts
    completions.ts
    crew.ts
    training.ts
    plugins.ts
    update.ts
    help.ts
    uninstall.ts
    admin.ts
    kit/
      index.ts              ← defineCommandGroup('kit', ...)
      init.ts
      new.ts
      update.ts
      status.ts
      apps.ts
      edit.ts
      config/
        show.ts
        path.ts
```

**Example — `commands/status.ts`:**

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
    // options.json: boolean — inferred, no cast
    await runStatusImpl(options);
  },
});
```

**`bin/pilot.ts` after migration:**

```ts
import { program } from 'commander';
import { registerCommand, registerGroup } from '../command-registry.js';
import { loadSettings } from '../settings.js';
import { VERSION } from '../version.js';

import upCmd from '../commands/up.js';
import crewCmd from '../commands/crew.js';
import statusCmd from '../commands/status.js';
// ... all other commands

program.name('pilot').description('Your AI crew, ready to fly.').version(VERSION, '-v, --version');

registerCommand(program, upCmd);
registerCommand(program, crewCmd);
registerCommand(program, statusCmd);
// ...

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

---

## Testing

The action handler is a plain `async function` — testable without Commander, without process.argv, without spawning a subprocess.

```ts
import statusCmd from '../commands/status.js';

it('outputs JSON when json: true', async () => {
  const writes: string[] = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
    writes.push(String(s));
    return true;
  });

  await statusCmd.action({ args: {}, options: { json: true } });

  expect(JSON.parse(writes[0])).toMatchObject({ machineId: expect.any(String) });
});
```

Zod schemas are also directly testable:

```ts
it('rejects non-boolean json option', () => {
  const schema = z.object(statusCmd.options!);
  expect(() => schema.parse({ json: 'yes' })).toThrow();
});
```

Existing tests that call `runX()` functions directly are unchanged — `defineCommand` wraps them without modifying them.

---

## Cross-Repo Pattern

This spec defines the standard. Apply to each open-source repo as a separate implementation task:

| Repo | tsup config | defineCommand |
|---|---|---|
| `pilot/packages/cli` | bundled binary + library split | yes — all commands |
| `pilot/packages/plugins/kit` | library only | no |
| `MedalSocial-sdk` | library only (already has tsup) | no |
| `Picasso` | TBD — own spec when reached | TBD |
| `NextMedal` | N/A (Next.js app) | N/A |

---

## Migration Checklist

- [ ] Add `tsup` to devDependencies in `packages/cli` and `packages/plugins/kit`
- [ ] Write `packages/cli/tsup.config.ts`
- [ ] Write `packages/plugins/kit/tsup.config.ts`
- [ ] Update `packages/cli/package.json` build scripts
- [ ] Update `packages/plugins/kit/package.json` build scripts
- [ ] Replace `src/version.ts` content (remove shell script dependency)
- [ ] Delete `packages/cli/scripts/inject-version.sh`
- [ ] Write `src/command.ts` (defineCommand)
- [ ] Write `src/command-registry.ts` (registerCommand, registerGroup, defineCommandGroup)
- [ ] Migrate each command file to `export default defineCommand({...})`
- [ ] Reorganise `commands/kit/` into subfiles with a group index
- [ ] Rewrite `bin/pilot.ts` as a pure registration file
- [ ] Verify `pnpm build` passes in both packages
- [ ] Verify `pnpm typecheck` passes
- [ ] Verify existing tests pass
- [ ] Remove `@vercel/ncc` from devDependencies if present
