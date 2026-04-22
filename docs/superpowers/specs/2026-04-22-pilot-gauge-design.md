# Pilot Gauge — Design Spec

**Date:** 2026-04-22  
**Status:** Draft

## Overview

Gauge is a native macOS menu bar plugin for Pilot that shows AI usage across all providers at a glance. It surfaces the data already collected by `pilot usage` — Claude Code JSONL files and Codex session files — in a persistent, low-resource status bar widget. No API keys, no network calls, no new data sources.

The name fits the aviation metaphor: a gauge is the instrument a pilot reads to know their fuel state.

## User Experience

### Menu Bar Icon

A monochrome ring (circular progress indicator) with this week's total cost beside it. No color — the icon is white or black and adapts to macOS light/dark mode automatically. The ring fill represents cost spent against a user-configurable weekly budget (default: $50/week). If no budget is configured, the ring stays at a fixed partial fill as a visual indicator and the cost number is the primary signal.

```
○ $2.47   ◕ $18.32   ● $47.80
```

States:
- **Idle**: static ring + weekly cost, system monochrome
- **Refreshing**: ring slowly rotates once (single animation), then snaps to new value
- **Stale** (>10 min old): ring dims slightly, tooltip shows "Stale — click to refresh"

The icon never uses color. Color only appears inside the popover.

### Popover

Opens on click. A tab bar at the top switches between two views within the same fixed-size popover.

#### Tab 1 — Summary (default)

```
┌─────────────────────────────────────┐
│  Summary          │  Scorecard      │
│══════════════════════════════════════│
│  ○ $18.32 this week      2m ago  ↺  │
│                                      │
│  CLAUDE                              │
│  This week            ████████░ $14.20│
│  Today                █░░░░░░░░  $1.83│
│  ──────────────────────────────────  │
│  CODEX                               │
│  This week            ███░░░░░░  $4.12│
│  Today                ░░░░░░░░░  $0.00│
│  ──────────────────────────────────  │
│  ✈ Preferences              Cache 94%│
└─────────────────────────────────────┘
```

Progress bars fill relative to a user-configurable weekly budget per provider (set in Gauge Preferences). If no budget is set, bars fill relative to the highest-spend week in recent history so there is always a visual signal.

Progress bar colors (% of configured budget, or relative to recent peak):
- 0–70%: blue (`#3b82f6`)
- 71–89%: yellow (`#facc15`)
- 90–100%: red (`#ef4444`)

The ↺ button triggers a manual refresh and is disabled for 5 seconds after completing.

#### Tab 2 — Scorecard

```
┌─────────────────────────────────────┐
│  Summary          │  Scorecard      │
│══════════════════════════════════════│
│  Today · Week · Month · All time    │
│  ──────────────────────────────────  │
│  Date     Model        Tokens  Cost │
│  Apr 22   opus-4       12.7M  $28.46│
│  Apr 21   opus-4      118.1M $248.98│
│  Apr 20   sonnet-4.6   29.1M  $63.90│
│  Apr 19   opus-4        6.6M  $16.55│
│  Apr 18   opus-4       39.6M  $86.42│
│  ──────────────────────────────────  │
│  Total                207M  $444.31 │
└─────────────────────────────────────┘
```

The table is scrollable within a fixed-height area. Columns: Date, Model (color-coded badge per model family), Total Tokens, Cost (USD). High-cost rows are tinted yellow. A time period picker (Today / Week / Month / All time) at the top filters rows client-side without re-running a refresh. The popover height stays constant when switching tabs — no layout jump.

### Commands

Gauge reuses the existing `pilot up` / `pilot down` command surface:

```
pilot up gauge        # install + start, add to macOS login items
pilot down gauge      # quit + remove from login items
```

`pilot plugins` lists Gauge like any other plugin with its running status.

No other Gauge-specific commands exist.

## Architecture

### Components

```
packages/plugins/gauge/
  plugin.toml           # manifest: binary name, autostart, registry metadata
  Sources/
    AppDelegate.swift   # NSStatusItem + NSPopover setup, login item registration
    UsagePoller.swift   # runs `pilot usage --global --json`, parses result
    PopoverView.swift   # SwiftUI popover content
    UsageModel.swift    # Codable structs matching the JSON output schema
  Package.swift         # Swift Package Manager (no Xcode project required)
```

The app is a Swift Package, not an Xcode project. This keeps the repo clean and makes CI straightforward — `swift build -c release` on a macOS runner produces the binary.

### Data Flow

```
~/.claude/projects/**/*.jsonl    ─┐
~/.codex/sessions/*.jsonl         ├─▶  pilot usage --global --json  ─▶  UsagePoller  ─▶  PopoverView
                                  ┘
```

`UsagePoller` runs `pilot usage --global --json` as a subprocess via Swift's `Process` API. It captures stdout, decodes the JSON into `UsageModel` structs, and publishes the result via Combine `@Published` for SwiftUI to pick up.

The binary path for `pilot` is resolved at startup: check `~/.pilot/bin/pilot`, then fall back to `which pilot`.

### Refresh Strategy

| Trigger | Behaviour |
|---------|-----------|
| App launch | Immediate refresh |
| Background timer | Every 5 minutes while awake |
| Mac wake from sleep | Refresh immediately (NSWorkspace `willSleepNotification` / `didWakeNotification`) |
| Popover click | If data is ≥60 seconds old, refresh before showing; otherwise open instantly |
| Manual ↺ button | Immediate refresh; button disabled for 5 seconds after |
| Data age >10 min | Icon dims, tooltip says "Stale — click to refresh" |

The background timer is paused while the Mac is sleeping. No refresh runs when the popover is closed and data is fresh — idle cost is zero.

Because `pilot usage --global --json` is a pure local disk read (no network, no API calls), each refresh takes under 100ms. At the 5-minute interval this amounts to at most ~288 reads per day with negligible I/O.

### Resource Budget

- Memory: <15 MB RSS at idle (SwiftUI + AppKit baseline)
- CPU: <0.1% at idle; brief spike (<1%) during a refresh
- Disk I/O: ~288 small JSONL reads per day
- No network activity

## Changes Required to `pilot usage`

Two small additions to the existing `pilot usage` implementation plan:

### 1. `--global` flag

`findClaudeProjectDir(cwd)` currently resolves only the current project's Claude directory. With `--global`, the reader instead enumerates **every** subdirectory of `~/.claude/projects/` and reads all their JSONL files. Codex is already global (reads all of `~/.codex/sessions/`), so no change needed there.

CLI signature addition:
```
pilot usage --global [--week|--month|--since YYYYMMDD] [--json]
```

### 2. `refreshedAt` in JSON output

The JSON output gains one top-level field:
```json
{
  "refreshedAt": "2026-04-22T00:49:42.000Z",
  ...
}
```

Gauge uses this to compute "Updated X min ago" without maintaining its own clock.

## Plugin Distribution

Gauge is distributed through the Pilot plugin registry as a pre-built signed `.app`.

`plugin.toml`:
```toml
[plugin]
name = "gauge"
version = "1.0.0"
description = "AI usage in your menu bar"
platform = ["darwin"]

[menubar]
binary = "PilotGauge.app"
autostart = true
```

GitHub Actions builds `PilotGauge.app` on a macOS runner, code-signs it with the Medal Social developer certificate, zips it, and attaches it to the plugin registry release. `pilot up gauge` downloads the zip, unzips to `~/.pilot/apps/PilotGauge.app`, and launches it with `open -a`.

`pilot up` currently handles template installation. Handling native `.app` binaries requires a small extension: when the plugin manifest declares `[menubar]`, `pilot up` downloads from the registry release URL, unzips, and uses `NSWorkspace.open` / `open -a` rather than the template installer. This extension is a dependency for Gauge and must be implemented as part of the Gauge plan.

## Non-Goals

- **Windows / Linux**: Out of scope for v1. A Tauri-based cross-platform version can follow once the macOS app is stable.
- **Real-time streaming**: Usage data is refreshed on a timer, not streamed. Sub-minute granularity is not needed for a usage monitor.
- **API-based plan limits**: The Claude desktop app's "Plan 82%" display requires an authenticated Anthropic API call to fetch plan quota. Gauge v1 shows cost and token totals from local files only — no API calls, no auth. Budget-relative % bars are configurable by the user in Preferences.
- **Notifications**: No OS notifications when limits are hit in v1. Can be added later as a preference.
- **Configurable providers**: v1 shows Claude and Codex only. The popover hides sections for providers with no data.

## Future Work

- Configurable refresh interval in Gauge Preferences
- macOS notifications when a limit crosses 90%
- Tauri port for Windows / Linux
- Additional providers (Gemini, etc.) as `pilot usage` gains support for them
