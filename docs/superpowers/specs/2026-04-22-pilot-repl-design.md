# Pilot REPL — Conversational Interface Design

**Date:** 2026-04-22
**Status:** Draft

## Overview

Replace Pilot's static Home screen with a full-screen conversational REPL powered by whichever AI harness or provider the user already has installed. The REPL is the primary interface for Pilot — all other screens (Crew, Training, Plugins, Admin) are accessible via slash commands from within it.

The key design principle: **Pilot delegates to the AI runtime the user already has.** It detects installed CLI harnesses (Claude Code, Codex) before prompting for API keys, mirroring how the Kit plugin detects package managers (Nix → Homebrew → npm).

## Goals

- Give Pilot a real conversational interface backed by Claude, Codex, or future providers
- Work out of the box for users who already have Claude Code or Codex CLI installed (no API key needed)
- Make the provider layer fully modular so MedalSocial and other providers can be added later
- Keep all slash command routing to existing screens intact

## Out of Scope

- Tool calling / AI taking autonomous file or shell actions (approval workflows) — separate spec
- Crew member routing (Tech Lead, Brand Lead, etc.) — separate spec, builds on this
- MedalSocial provider implementation — not yet built, stubbed here as coming soon

---

## Provider Architecture

### Detection Waterfall (startup)

On every `pilot` launch, the AI layer runs detection in priority order and uses the first available:

| Priority | Harness / Provider | Detection | Notes |
|---|---|---|---|
| 1 | **Claude Code** | `which claude` | No API key needed |
| 2 | **Codex CLI** | `which codex` | No API key needed |
| 3 | **MedalSocial** | auth token in settings | Planned — stubbed for now |
| 4 | **Direct API** | API key in settings | Anthropic, OpenRouter, Ollama |

The detected provider is saved to `~/.pilot/settings.json` on first run. On subsequent runs the saved value is used directly — detection only re-runs if the saved provider is no longer available.

### `PilotProvider` Interface

All adapters implement a single interface. The REPL never imports an adapter directly — it receives a `PilotProvider` instance from the provider resolution layer.

```typescript
// packages/cli/src/ai/provider.ts

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface Chunk {
  type: 'text' | 'done' | 'error'
  text?: string
  error?: string
}

export interface PilotProvider {
  readonly name: string    // "Claude Code" | "Codex" | "MedalSocial" | "Anthropic" | ...
  readonly model: string   // reported model, may be "unknown" for CLI harnesses
  available(): Promise<boolean>
  stream(messages: Message[]): AsyncIterable<Chunk>
}
```

### Adapters

**`ClaudeCodeAdapter`** (`packages/cli/src/ai/adapters/claude-code.ts`)
- Detection: `which claude`
- `stream()`: spawns `claude` in non-interactive/print mode, reads stdout line by line, emits `Chunk` objects. Exact flags confirmed during implementation.
- No API key. Uses Claude Code's own authentication and model selection.

**`CodexAdapter`** (`packages/cli/src/ai/adapters/codex.ts`)
- Detection: `which codex`
- `stream()`: spawns `codex` in non-interactive mode, reads stdout, emits chunks. Exact flags confirmed during implementation.
- No API key. Uses Codex CLI's own authentication.

**`MedalSocialAdapter`** (`packages/cli/src/ai/adapters/medalsocial.ts`)
- Detection: auth token present in settings
- Stubbed — `available()` always returns `false` until the MedalSocial platform is built
- Displays as "Coming soon" in the `/account` picker

**`DirectAPIAdapter`** (`packages/cli/src/ai/adapters/direct-api.ts`)
- Wraps Vercel AI SDK (`@ai-sdk/anthropic`, `@ai-sdk/openai`)
- `@ai-sdk/openai` with a custom `baseURL` covers OpenRouter and Ollama
- Requires an API key stored in `settings.ai.apiKey`

### Provider Resolution

```typescript
// packages/cli/src/ai/resolve.ts
export async function resolveProvider(settings: PilotSettings): Promise<PilotProvider> {
  const saved = settings.ai?.provider
  if (saved) {
    const adapter = adapterFor(saved, settings)
    if (await adapter.available()) return adapter
    // saved provider gone — fall through to detection
  }
  for (const adapter of PRIORITY_ORDER) {
    if (await adapter.available()) return adapter
  }
  throw new PilotError(errorCodes.NO_PROVIDER, 'No AI provider available. Run /account to set one up.')
}
```

### Settings Schema (additions to `~/.pilot/settings.json`)

```json
{
  "ai": {
    "provider": "claude-code",
    "apiKey": null
  }
}
```

`provider` values: `"claude-code"` | `"codex"` | `"medalsocial"` | `"anthropic"` | `"openrouter"` | `"ollama"`
`apiKey` is `null` for CLI harnesses, a string for direct API providers.

---

## REPL UI

### Component Structure

```
<Repl>                         ← entry point, replaces current Home screen
  <ChatHeader />               ← active crew lead + provider name + model
  <MessageList />              ← scrollable message history
  <SlashCommandMenu />         ← overlay, visible when input starts with /
  <ChatInput />                ← bottom input, always focused
```

All components are React Ink. The `<Repl>` component is rendered by `commands/repl.ts` when the user is onboarded and a provider is available.

### ChatHeader

```
pilot  ·  Tech Lead                              ● Claude Code  ·  claude-opus-4
```

- Left: app name + active crew lead (defaults to "Pilot" until crew is implemented)
- Right: provider indicator dot (green = connected) + provider name + model
- One line, always visible

### MessageList

- Scrollable, messages render top-to-bottom
- User messages: dimmed role label "you", white content
- Assistant messages: colored role label (crew lead name), white content
- Streaming: last assistant message updates in-place as chunks arrive

### ChatInput

- Single line at bottom, always focused after mount
- Placeholder: `Message [crew lead name], or type / for commands`
- `enter` submits, `esc` cancels in-flight stream
- When input starts with `/`, `<SlashCommandMenu>` overlays above input

### SlashCommandMenu

Appears on `/` keypress, dismissed on `esc` or after selecting a command. Arrow keys navigate, `enter` selects.

| Command | Action |
|---|---|
| `/account` | Open provider picker (inline screen) |
| `/crew` | Navigate to Crew screen |
| `/training` | Navigate to Training screen |
| `/plugins` | Navigate to Plugins screen |
| `/admin` | Navigate to Admin screen |
| `/help` | Print help text inline in chat |

Navigation commands (all except `/account` and `/help`) replace the full REPL screen with the existing React Ink screen component. Pressing `esc` in those screens returns to the REPL.

### `/account` — Provider Picker

Renders as an inline screen (replaces `<MessageList>` content, keeps header and input). Layout:

```
Account & Provider                                         esc to go back

DETECTED ON THIS MACHINE
● Claude Code  ·  claude-opus-4                                      active
○ Codex CLI    ·  gpt-5.4-codex                                    detected

DIRECT PROVIDERS
○ MedalSocial                                                   coming soon
○ OpenRouter                                                   add API key →
○ Anthropic API                                                add API key →

↑↓ select  ·  enter to activate  ·  a to add API key
```

- Detected CLIs are listed first and pre-filled — no key entry needed
- Selecting a detected CLI saves `settings.ai.provider` and returns to chat instantly
- Selecting a direct provider prompts for an API key (text input, masked)
- MedalSocial row is non-selectable, shown for awareness

---

## Conversation Loop

1. User submits a message → appended to `messages[]` as `{ role: 'user', content }`
2. `provider.stream(messages)` is called → returns `AsyncIterable<Chunk>`
3. An empty assistant message is appended to the list
4. Each `{ type: 'text', text }` chunk is appended to the last assistant message (streaming render)
5. `{ type: 'done' }` finalizes the message, re-enables input
6. `{ type: 'error' }` displays an error inline and re-enables input
7. Full `messages[]` array is kept in memory for the session (no persistence in this phase)

For CLI harness adapters, the subprocess stdout is the stream source. For direct API adapters, the Vercel AI SDK `streamText` call provides the iterable.

---

## First Launch Onboarding

When `settings.ai.provider` is not set (new install), the REPL runs detection before showing the chat:

1. Show a brief "Detecting AI providers..." spinner
2. Display what was found:
   - If CLI harness found: "Found Claude Code — using it as your AI. Type anything to start."
   - If nothing found: show the `/account` picker immediately, prompt to add an API key
3. Save to settings and proceed to chat

This runs once. After that, the saved provider is used on every launch.

---

## File Structure

```
packages/cli/src/
  ai/
    provider.ts              ← PilotProvider interface + Message/Chunk types
    resolve.ts               ← resolveProvider() waterfall
    adapters/
      claude-code.ts         ← ClaudeCodeAdapter
      codex.ts               ← CodexAdapter
      medalsocial.ts         ← MedalSocialAdapter (stub)
      direct-api.ts          ← DirectAPIAdapter (Vercel AI SDK)
  screens/
    Repl.tsx                 ← replaces current Home.tsx as the default screen
    Repl.test.tsx
    account/
      AccountPicker.tsx      ← /account inline screen
      AccountPicker.test.tsx
  components/
    ChatHeader.tsx
    ChatHeader.test.tsx
    MessageList.tsx
    MessageList.test.tsx
    ChatInput.tsx
    ChatInput.test.tsx
    SlashCommandMenu.tsx
    SlashCommandMenu.test.tsx
```

---

## Testing

- Unit tests for each adapter's `available()` and `stream()` using mocked child processes / fetch
- Component tests (ink-testing-library) for `ChatHeader`, `MessageList`, `ChatInput`, `SlashCommandMenu`
- Integration test for `resolveProvider()` waterfall with mocked detection results
- E2E test: launch REPL with `PILOT_HOME` isolation + a mock provider, send a message, verify response renders
- Coverage targets: 95% statements, 90% branches, 100% functions (matching existing minimums)

---

## Dependencies to Add

| Package | Purpose |
|---|---|
| `@ai-sdk/anthropic` | Direct Anthropic API provider |
| `@ai-sdk/openai` | Direct OpenAI / OpenRouter / Ollama provider |
| `ai` | Vercel AI SDK core (`streamText`) |

CLI harness adapters use Node's `child_process` via the existing `Exec` interface in `installer/exec.ts` — no new dependency.
