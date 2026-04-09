# Pilot CLI

Medal Social's AI-powered CLI platform. Your AI crew, ready to fly.

## Project Overview

- **Monorepo**: pnpm workspaces + Turborepo
- **CLI**: React Ink + Commander.js
- **AI**: Vercel AI SDK + @ai-sdk/anthropic (Codex)
- **Plugins**: @medalsocial/kit, @medalsocial/sanity, @medalsocial/pencil
- **Build**: tsup (dual CJS/ESM) + @vercel/ncc (binary)
- **Test**: Vitest + ink-testing-library + E2E
- **Lint**: Biome (strict, matching medal-monorepo)
- **Release**: Changesets + GitHub Actions

## Code Conventions

- TypeScript strict mode, no `any` (use `unknown` + type narrowing)
- Use `import type` for type-only imports (enforced by Biome)
- Single quotes, 2-space indent, 100-char line width, trailing commas ES5
- No console.log — use the structured logger (`getLogger('scope')`)
- Error codes via `PilotError(errorCodes.CODE, 'message')`, never raw throws to users
- All colors via design token system (`colors.ts`), never hardcoded hex in components

## Testing

- TDD: write failing test first, then implement
- Co-located tests: `Step.tsx` → `Step.test.tsx`
- ink-testing-library for component tests
- E2E tests in `tests/e2e/` with isolated `PILOT_HOME`
- Coverage thresholds: 80% statements, 75% branches

## Architecture

```
packages/
  cli/              ← entry point, REPL, screens, components, AI layer
  plugins/
    kit/            ← @medalsocial/kit (machine management)
    sanity/         ← @medalsocial/sanity (CMS)
    pencil/         ← @medalsocial/pencil (design tools)
```

## Key Patterns

- **Split-panel UI**: canonical layout for pilot up, training, plugins, crew (SplitPanel + TabBar)
- **Plugin manifest**: `plugin.toml` with Zod validation, declares commands + MCP servers + permissions
- **Crew routing**: root agent auto-routes to crew leads (Brand, Marketing, Tech, CS, Sales)
- **Skill deployment**: `~/.pilot/skills/` with symlink to `~/.Codex/skills/pilot`
- **AGENTS.md routing**: appended during install, routes `/pilot` to crew
- **Smart updates**: manifest.json checksums protect user-modified files
- **Design tokens**: from Pencil (05-cli.pen), light/dark theme via T:mode

## User-Facing Language

- Never expose: package managers (Nix, npm), file paths, version numbers, checksums
- Frame as benefits: "Design editor ready" not "Installed @pencil/core v3.2.1"
- Aviation metaphor: crew, flight, cockpit, takeoff
- Medal-branded names: `pilot up pencil` not `pilot up figma-plugin`

## Feature Tracker

When a new spec or plan is created, update the Feature Tracker table in README.md:
- Add new features with status (Planned / In Progress / Done)
- Link to the relevant spec or plan document
- Update status as features are implemented and merged

The tracker is the single source of truth for what Pilot can do and what's coming next.

## Skill Routing

When the user's request matches Pilot functionality, invoke /pilot.
Pilot routes to the right crew lead automatically.

Key routing rules:
- Brand voice, tone, style, guidelines → invoke /pilot
- Social posts, campaigns, content, email → invoke /pilot
- Build, deploy, scaffold, code review → invoke /pilot
- Support tickets, customer issues → invoke /pilot
- Sales outreach, pipeline → invoke /pilot
- Machine setup, dev tools → invoke /pilot
