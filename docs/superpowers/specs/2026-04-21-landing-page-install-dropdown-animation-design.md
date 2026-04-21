# Landing Page: Install Dropdown + Terminal Animation

**Date:** 2026-04-21  
**Status:** Approved  
**File:** `workers/pilot-landing/src/index.ts`

## Context

The landing page at `pilot.medalsocial.com` currently shows a single curl install command with `npm install` as a small afterthought line below. Three real installation paths exist (curl script, npm, Homebrew) but only one is promoted. The page also has no visual demo of what Pilot actually does. This update adds a first-class install method switcher and an animated terminal demo to make the page more compelling to developers evaluating the tool.

Inspiration: [github.com/features/copilot/cli](https://github.com/features/copilot/cli)

## Changes

### 1. Install Dropdown (replaces existing install box)

A single-row widget replacing the current `.install-box` + `.npm-fallback` elements:

```
[ Install with Script ▼ ]   curl -fsSL https://pilot.medalsocial.com/install | sh   [ Copy ]
```

**Layout:**
- Left: dropdown trigger button — label + chevron, bordered, pill-style, opens a menu below
- Center: monospace command text, truncates with ellipsis if viewport is narrow
- Right: solid `brand-500` (`#7E3FAC`) Copy button with copy icon, turns green on success

**Dropdown options (in order):**
1. Install with Script → `curl -fsSL https://pilot.medalsocial.com/install | sh`
2. Install with npm → `npm install -g @medalsocial/pilot`
3. Install with Homebrew → `brew install Medal-Social/pilot/pilot`

Default selection: **Script**. Each option shows a contextual hint below the widget (e.g. "Works on macOS and Linux" / "Requires Node.js 24+" / "Recommended for macOS. Auto-updates with brew upgrade.").

Closes on outside click. Pure vanilla JS, no dependencies.

### 2. Terminal Animation

A CSS-animated terminal window placed **below the install dropdown** within the hero section, showing `pilot up` in action.

**Sequence (timing in ms from start):**

| Delay | Line |
|-------|------|
| 0 | `~/projects/acme $ pilot up` |
| 700 | `◆ Pilot — by Medal Social` (brand-400) |
| 1100 | `→ Connecting to Claude...` |
| 2300 | `✓ Claude connected` |
| 2800 | `→ Installing skills...` |
| 3900 | `✓ 15 skills ready` |
| 4400 | `→ Deploying crew...` |
| 5100 | `✓ Brand Lead` (brand-400 `#9A6AC2`) + `voice & tone` |
| 5550 | `✓ Marketing Lead` (success-400 `#2DD4BF`) + `content & campaigns` |
| 6000 | `✓ Tech Lead` (info-400 `#60A5FA`) + `builds & deploys` |
| 6450 | `✓ CS Lead` (warning-400 `#FBBF24`) + `tickets & retention` |
| 6900 | `✓ Sales Lead` (error-400 `#FB7185`) + `outreach & pipeline` |
| 7500 | `◆ Your crew is airborne. Run pilot to fly.` |
| 8300 | Next prompt with blinking cursor |

**Implementation:** Lines fade in sequentially via `opacity` + `translateY` CSS transitions triggered by `setTimeout`. Auto-loops after 12s. No GIFs, no external assets, no canvas — pure HTML/CSS/JS inline in the worker string.

**Terminal chrome:** macOS-style dot header (red/yellow/green), `zsh` title, dark card background (`#0d0d12`), `Geist Mono` font matching existing page.

**Crew lead colors** — from `00-design-system.lib.pen` dark-mode tokens:
- Brand Lead: `brand-400` = `#9A6AC2`
- Marketing Lead: `success-400` = `#2DD4BF`  
- Tech Lead: `info-400` = `#60A5FA`
- CS Lead: `warning-400` = `#FBBF24`
- Sales Lead: `error-400` = `#FB7185` (rose, not the harsher `#EF4444` in `colors.ts`)

### 3. Layout

No structural changes. Hero remains centered single-column. Feature grid unchanged. The terminal sits between the install widget and the features section, within `<main>`.

## File to Modify

- `workers/pilot-landing/src/index.ts` — all HTML/CSS/JS is in the `buildLandingPage()` function as a template string. The install box markup and the new terminal are added within the `<section class="hero">` block. New CSS is added to the `<style>` block.

## Verification

1. `cd workers/pilot-landing && pnpm wrangler dev` — open localhost and verify:
   - Dropdown opens and closes, commands swap correctly, hint text updates
   - Copy button copies the correct command for each method
   - Terminal animation plays on load, loops after ~12s
   - Colors match the Pencil design system swatches
2. Resize to mobile (< 640px) — command text truncates gracefully, Copy button remains accessible
3. `curl localhost:PORT/install` still returns the shell script unchanged
