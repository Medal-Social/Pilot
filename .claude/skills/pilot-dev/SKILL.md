---
name: pilot-dev
description: Contributor guide for developing the Pilot CLI monorepo — architecture, conventions, testing, and patterns
trigger: When working on Pilot CLI code, adding features, fixing bugs, or onboarding as a contributor
---

# Pilot Dev — Contributor Skill

You are developing **Pilot CLI**, Medal Social's AI-powered CLI platform.

## Monorepo Structure

```
packages/
  cli/                  ← Main package (@medalsocial/pilot)
    src/
      commands/         ← Commander.js command definitions
      screens/          ← React Ink full-screen UIs (split-panel pattern)
      components/       ← Reusable Ink components (TabBar, SplitPanel, StatusBar)
      ai/               ← AI layer (Vercel AI SDK + Claude)
      crew/             ← Crew routing — Brand, Marketing, Tech, CS, Sales leads
      lib/              ← Shared utilities, logger, errors, config
      theme/            ← Design tokens, colors, typography
    tests/
      e2e/              ← End-to-end tests with isolated PILOT_HOME
  plugins/
    kit/                ← @medalsocial/kit — machine setup, dev environment
    sanity/             ← @medalsocial/sanity — CMS integration
    pencil/             ← @medalsocial/pencil — design tool integration
```

## Adding a New Command

1. Create `packages/cli/src/commands/<name>.ts`
2. Export a function that registers with Commander.js
3. Wire it in `packages/cli/src/commands/index.ts`
4. If it needs a screen, create `packages/cli/src/screens/<Name>.tsx`
5. Write tests first (TDD) — co-located: `<Name>.test.tsx`

## Adding a New Screen

Screens use the **split-panel layout** (SplitPanel + TabBar):

1. Create `packages/cli/src/screens/<Name>.tsx`
2. Use `SplitPanel` for the canonical two-column layout
3. Use `TabBar` for navigation between sections
4. Import colors from the design token system, never hardcode hex values
5. Co-locate test: `<Name>.test.tsx`

## Adding a Component

1. Create in `packages/cli/src/components/<Name>.tsx`
2. Use design tokens from `theme/colors.ts` for all colors
3. Support light/dark via the `T:mode` token system
4. Co-locate test: `<Name>.test.tsx`

## Plugin Development

Plugins live in `packages/plugins/<name>/` and follow this pattern:

1. `plugin.toml` — manifest with Zod validation, declares:
   - Commands the plugin adds
   - MCP servers it needs
   - Permissions it requires
2. `src/index.ts` — plugin entry point
3. Package name: `@medalsocial/<name>`

## Code Conventions

- **TypeScript strict mode** — no `any`, use `unknown` + type narrowing
- **`import type`** for type-only imports (Biome enforced)
- **Formatting**: single quotes, 2-space indent, 100-char lines, trailing commas ES5
- **Logging**: `getLogger('scope')` — never `console.log`
- **Errors**: `PilotError(errorCodes.CODE, 'message')` — never raw throws to users
- **Colors**: design token system only — never hardcoded hex in components

## Testing

- **TDD**: write the failing test first, then implement
- **Co-located**: `Step.tsx` → `Step.test.tsx`
- **Component tests**: ink-testing-library
- **E2E tests**: `tests/e2e/` with isolated `PILOT_HOME`
- **Coverage target**: 90% statements, 80% branches
- **Run tests**: `pnpm test` (Vitest)
- **Run single**: `pnpm test -- <pattern>`

## Build

- **Dev**: `pnpm dev` — tsup watch mode
- **Build**: `pnpm build` — tsup (dual CJS/ESM)
- **Binary**: `@vercel/ncc` for single-file distribution
- **Lint**: `pnpm lint` — Biome (strict mode)

## Commit Conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- Scope optional: `feat(kit): add nix flake detection`
- Keep messages concise — one line summary, details in body if needed
- No AI attribution in commits

## User-Facing Language

When writing user-facing messages:
- Never expose: package managers, file paths, version numbers, checksums
- Frame as benefits: "Design editor ready" not "Installed @pencil/core v3.2.1"
- Aviation metaphor: crew, flight, cockpit, takeoff
- Medal-branded names: `pilot up pencil` not `pilot up figma-plugin`

## Key Patterns to Follow

- **Split-panel UI** is the canonical layout — don't invent new layouts
- **Crew routing** — root agent auto-routes to crew leads, don't bypass
- **Plugin manifest** — `plugin.toml` with Zod validation, always
- **Smart updates** — `manifest.json` checksums protect user-modified files
- **Design tokens** — sourced from Pencil (05-cli.pen), light/dark via `T:mode`
