# Pilot CLI — Masterplan

> **Design spec:** [../specs/2026-04-09-pilot-cli-v2-design.md](../specs/2026-04-09-pilot-cli-v2-design.md)

## Overview

Pilot is Medal Social's AI-powered CLI platform — open source, local-first. It provides crew management, a plugin system, knowledge training, and portable AI config generation. Built as a pnpm monorepo with React Ink + Commander.js, Vercel AI SDK, and a curated plugin registry.

## Build Order

Foundation first, then screens, then AI, then hardening, then distribution.

```
Phase 1-2: Foundation (monorepo, core UI, plugin system)
    |
    v
Phase 3: Screens (Welcome, Home, REPL, Plugins, Training, Update)
    |
    v
Phase 4: AI Layer + Crew (Vercel AI SDK, routing, AGENTS.md generator, Chat)
    |
    v
Phase 5-6: pilot up + Kit + Plugin Scaffolds (browse, install, preflight, sanity, pencil)
    |
    v
Phase 7: Skill Deployment (SKILL.md files, deployer, symlinks, CLAUDE.md routing)
    |
    v
Phase 8-12: Production Hardening (toolchain, logging, errors, AI robustness, config migration, binary, E2E, ErrorBoundary)
    |
    v
Phase 13-14: Platform + Release (XDG, NO_COLOR, completions, tsup, changesets, CI)
    |
    v
Phase 15: Sessions + Distribution (persistence, print mode, context management, Homebrew)
```

## Phase Dependency Graph

```
01-foundation ─────────────┐
                           v
02-screens ────────> 03-ai-crew
                           |
                           v
              04-pilot-up-kit ────> 05-skill-deployment
                                          |
                                          v
                              06-production-hardening
                                          |
                                          v
                              07-skill-security
                                          |
                                          v
                              08-skill-runtime
                                          |
                                          v
                              09-platform-distribution
                                          |
                                          v
                              10-sessions-distribution
```

## Phase Summary

| # | Subplan | Phases | Tasks | Status | Link |
|---|---------|--------|-------|--------|------|
| 01 | Foundation | 1-2: Monorepo + Core, Plugin System | 1-9 | Not started | [01-foundation.md](01-foundation.md) |
| 02 | Screens | 3: Welcome, Home, REPL, Plugins, Training, Update | 10-15 | Not started | [02-screens.md](02-screens.md) |
| 03 | AI + Crew | 4: AI Layer + Crew | 16-19 | Not started | [03-ai-crew.md](03-ai-crew.md) |
| 04 | pilot up + Kit | 5-6: pilot up, Kit Integration, Plugin Scaffolds | 20-25 | Not started | [04-pilot-up-kit.md](04-pilot-up-kit.md) |
| 05 | Skill Deployment | 7: Skill Deployment + Smart Updates | 26-28 | Not started | [05-skill-deployment.md](05-skill-deployment.md) |
| 06 | Production Hardening | 8-12: Toolchain, Logging, AI Robustness, Config, Binary, E2E, ErrorBoundary, Output Scanning, Audit Trail | 29-37, 59, 61 | Not started | [06-production-hardening.md](06-production-hardening.md) |
| 07 | Skill Security | Validation, Signing + Integrity, Script Safety, Sync, Versioning, Compartmentalization, URL Safety | 48-52, 60 | Not started | [09-skill-security.md](09-skill-security.md) |
| 08 | Skill Runtime | Preamble, Learnings, Context Recovery, Self-Update, Multi-Host, Docs | 53-58 | Not started | [10-skill-runtime.md](10-skill-runtime.md) |
| 09 | Platform + Distribution | 13-14: XDG, NO_COLOR, Completions, tsup, Changesets, CI | 38-43 | Not started | [07-platform-distribution.md](07-platform-distribution.md) |
| 10 | Sessions + Distribution | 15: Sessions, Print Mode, Context Management, Homebrew | 44-47 | Not started | [08-sessions-distribution.md](08-sessions-distribution.md) |

**Total scope: 61 tasks across 10 subplans.**
