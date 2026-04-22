# `pilot kit clean` — Design Spec

**Date:** 2026-04-22
**Status:** Approved

## Overview

A lightweight `pilot kit clean` subcommand that removes common macOS and developer junk in one shot. Mirrors CleanMyMac's "Smart Scan" basic clean cycle: scan known junk paths, show a size breakdown, confirm once, delete in parallel.

## Clean Targets

Scanned and deleted in parallel. Targets that don't exist are silently skipped.

| Category | Path(s) |
|---|---|
| System Caches | `~/Library/Caches/*` |
| System Logs | `~/Library/Logs/*` |
| Trash | `~/.Trash/*` |
| Xcode DerivedData | `~/Library/Developer/Xcode/DerivedData` |
| CoreSimulator Caches | `~/Library/Developer/CoreSimulator/Caches` |
| Homebrew cache | `$(brew --cache)` — skipped if `brew` not found |
| npm cache | `~/.npm/_cacache` |
| pnpm store | `~/.local/share/pnpm/store` |
| yarn cache | `~/.yarn/cache` |
| pip cache | `~/Library/Caches/pip` |
| Gradle caches | `~/.gradle/caches` |
| Maven repository | `~/.m2/repository` |
| Docker | `docker system prune -f` — skipped if Docker daemon not running |

## UX Flow

```
$ pilot kit clean

  Scanning your machine...

  ┌─────────────────────────────────────────┐
  │  System Caches        1.2 GB            │
  │  System Logs          340 MB            │
  │  Trash                88 MB             │
  │  Xcode DerivedData    4.1 GB            │
  │  Homebrew cache       620 MB            │
  │  npm cache            890 MB            │
  │  pnpm store           1.4 GB            │
  │  pip cache            210 MB            │
  │                                         │
  │  Total: 8.85 GB                         │
  └─────────────────────────────────────────┘

  Ready to clean 8.85 GB. Proceed? [y/N]

  ✓ System Caches        1.2 GB freed
  ✓ System Logs          340 MB freed
  ✓ Trash                88 MB freed
  ✓ Xcode DerivedData    4.1 GB freed
  ✓ Homebrew cache       620 MB freed
  ✓ npm cache            890 MB freed
  ✓ pnpm store           1.4 GB freed
  ✓ pip cache            210 MB freed

  8.85 GB freed. All clear.
```

- Categories with zero bytes found are excluded from the table entirely.
- Spinners animate per-row during deletion.
- If the user declines (`N`), exits cleanly with no changes made.

## Architecture

### New files

- `packages/plugins/kit/src/commands/clean.ts` — core scan + delete logic, exports `runClean(exec: Exec)`
- `packages/plugins/kit/src/commands/clean.test.ts` — unit tests with mocked `Exec` and `fs`
- `packages/plugins/kit/src/ui/CleanSummary.tsx` — Ink component: scan table, confirm prompt, deletion progress rows
- `packages/plugins/kit/src/ui/CleanSummary.test.tsx` — component tests via ink-testing-library

### Modified files

- `packages/plugins/kit/src/index.ts` — export `runClean`
- `packages/plugins/kit/plugin.toml` — add `"kit clean"` to `provides.commands`
- `packages/cli/src/commands/kit.ts` — wire `pilot kit clean` subcommand, call `runClean`

### Key internals

**Scan phase:**
- `du -sk <path>` per target, all in `Promise.all`
- Non-zero exit (path missing) → target excluded, no error
- Brew cache path resolved via `brew --cache` at scan time; brew missing → target excluded
- Docker daemon check: `docker info` before `docker system prune`; daemon not running → target excluded

**Delete phase:**
- File targets: `rm -rf <path>` (contents only for `~/Library/Caches/*`, `~/Library/Logs/*`, `~/.Trash/*`; full dir for caches like `~/.npm/_cacache`)
- Docker: `docker system prune -f` via exec
- File targets deleted in parallel; Docker runs sequentially after file deletions complete

**Testability:**
- `runClean` accepts `Exec` interface — no real shell in unit tests
- `CleanSummary` tested with ink-testing-library; confirm prompt stubbed

## Error Handling

- Individual target failure (e.g. permission denied on a cache file) → logged as a warning row, other targets continue
- Docker prune failure → warned, not fatal
- Brew resolution failure → target silently skipped

## What's Out of Scope

- App uninstall leftovers
- Privacy/browser history clearing
- Malware scanning
- Login item or launch agent management
- Configurable target lists
- Scheduled / automatic cleaning
