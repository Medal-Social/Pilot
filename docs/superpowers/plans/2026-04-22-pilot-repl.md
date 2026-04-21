# Pilot REPL — Conversational Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static Home screen with a full-screen conversational REPL that delegates to whichever AI harness (Claude Code, Codex) or direct API provider the user has installed.

**Architecture:** A `PilotProvider` interface abstracts all AI backends. On startup, `resolveProvider()` runs a detection waterfall (Claude Code → Codex → MedalSocial stub → Direct API) and saves the first available provider to settings. The `<Chat>` screen wires `<ChatHeader>`, `<MessageList>`, `<ChatInput>`, and `<SlashCommandMenu>`; slash commands route to existing screens or the `/account` picker.

**Tech Stack:** React 19, Ink 7, ink-text-input, Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`), Vitest, ink-testing-library

---

## File Map

```
packages/cli/src/
  ai/
    provider.ts              ← PilotProvider interface, Message, Chunk, ProviderKey types
    format.ts                ← shared formatMessages() used by CLI adapters
    resolve.ts               ← resolveProvider() waterfall + adapterFor()
    adapters/
      claude-code.ts         ← ClaudeCodeAdapter
      claude-code.test.ts
      codex.ts               ← CodexAdapter
      codex.test.ts
      medalsocial.ts         ← MedalSocialAdapter (stub)
      medalsocial.test.ts
      direct-api.ts          ← DirectAPIAdapter (Vercel AI SDK)
      direct-api.test.ts
    resolve.test.ts
  components/
    ChatHeader.tsx            ← provider name + model header bar
    ChatHeader.test.tsx
    MessageList.tsx           ← scrollable message history, streaming cursor
    MessageList.test.tsx
    ChatInput.tsx             ← bottom text input, slash command detection
    ChatInput.test.tsx
    SlashCommandMenu.tsx      ← overlay command picker
    SlashCommandMenu.test.tsx
  screens/
    Chat.tsx                  ← full-screen chat (conversation loop + routing)
    Chat.test.tsx
    account/
      AccountPicker.tsx       ← /account inline screen
      AccountPicker.test.tsx
    Repl.tsx                  ← MODIFIED: provider detection, screen routing
    Repl.test.tsx             ← MODIFIED: updated mocks
    Home.tsx                  ← DELETE (replaced by Chat)
    Home.test.tsx             ← DELETE
  settings.ts                 ← MODIFIED: add ai field to PilotSettings
```

---

### Task 1: Extend PilotSettings + add NO_PROVIDER error code

**Files:**
- Modify: `packages/cli/src/settings.ts`
- Modify: error codes file (find it first)

- [ ] **Step 1: Find the error codes file**

```bash
grep -r 'PilotError\|errorCodes' packages/cli/src/ --include='*.ts' -l
```

Read the file found. Note the pattern for adding new codes.

- [ ] **Step 2: Write failing test**

In `packages/cli/src/settings.test.ts`, add:

```typescript
it('loadSettings returns default ai config when field absent', () => {
  const s = loadSettings()
  expect(s.ai).toEqual({ provider: null, apiKey: null })
})
```

- [ ] **Step 3: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test settings -- --run
```

Expected: FAIL — `s.ai` is `undefined`

- [ ] **Step 4: Extend settings.ts**

Add `AiSettings` interface and update `PilotSettings` and `DEFAULT_SETTINGS`:

```typescript
export interface AiSettings {
  provider: string | null
  apiKey: string | null
}

export interface PilotSettings {
  onboarded: boolean
  lastRun?: string
  plugins: Record<string, { enabled: boolean }>
  mcpServers: Record<string, { command: string }>
  crew: { specialists: Record<string, SpecialistEntry> }
  ai: AiSettings
}

const DEFAULT_SETTINGS: PilotSettings = {
  onboarded: false,
  plugins: {},
  mcpServers: {},
  crew: { specialists: {} },
  ai: { provider: null, apiKey: null },
}
```

Update the merge in `loadSettings()`:

```typescript
return {
  ...DEFAULT_SETTINGS,
  ...raw,
  mcpServers: raw.mcpServers ?? {},
  crew: { specialists: raw.crew?.specialists ?? {} },
  ai: {
    provider: raw.ai?.provider ?? null,
    apiKey: raw.ai?.apiKey ?? null,
  },
}
```

- [ ] **Step 5: Add NO_PROVIDER to the error codes file found in Step 1**

Following the existing pattern, add:

```typescript
NO_PROVIDER: 'NO_PROVIDER',
```

- [ ] **Step 6: Run to verify pass**

```bash
pnpm --filter @medalsocial/pilot test settings -- --run
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/settings.ts packages/cli/src/settings.test.ts
git add $(grep -rl 'errorCodes' packages/cli/src/ --include='*.ts' -l)
git commit -m "feat(repl): extend PilotSettings with ai config, add NO_PROVIDER error code"
```

---

### Task 2: PilotProvider interface + shared format utility

**Files:**
- Create: `packages/cli/src/ai/provider.ts`
- Create: `packages/cli/src/ai/format.ts`

- [ ] **Step 1: Create provider.ts**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface Chunk {
  type: 'text' | 'done' | 'error'
  text?: string
  error?: string
}

export type ProviderKey =
  | 'claude-code'
  | 'codex'
  | 'medalsocial'
  | 'anthropic'
  | 'openrouter'
  | 'ollama'

export interface PilotProvider {
  readonly name: string
  readonly model: string
  available(): Promise<boolean>
  stream(messages: Message[]): AsyncIterable<Chunk>
}
```

- [ ] **Step 2: Create format.ts**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Message } from './provider.js'

export function formatMessages(messages: Message[]): string {
  return messages
    .map((m) => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
    .join('\n\n')
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/ai/provider.ts packages/cli/src/ai/format.ts
git commit -m "feat(repl): add PilotProvider interface and formatMessages utility"
```

---

### Task 3: ClaudeCodeAdapter

**Files:**
- Create: `packages/cli/src/ai/adapters/claude-code.ts`
- Create: `packages/cli/src/ai/adapters/claude-code.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/cli/src/ai/adapters/claude-code.test.ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import type { Exec } from '../../installer/exec.js'
import { ClaudeCodeAdapter } from './claude-code.js'

function makeExec(result: { stdout: string; stderr: string; code: number }): Exec {
  return { run: vi.fn().mockResolvedValue(result) }
}

describe('ClaudeCodeAdapter', () => {
  it('reports unavailable when which claude returns non-zero', async () => {
    const adapter = new ClaudeCodeAdapter(makeExec({ stdout: '', stderr: '', code: 1 }))
    expect(await adapter.available()).toBe(false)
  })

  it('reports available when which claude returns zero', async () => {
    const adapter = new ClaudeCodeAdapter(makeExec({ stdout: '/usr/local/bin/claude\n', stderr: '', code: 0 }))
    expect(await adapter.available()).toBe(true)
  })

  it('yields text chunk then done on success', async () => {
    const adapter = new ClaudeCodeAdapter(makeExec({ stdout: 'Hello from Claude', stderr: '', code: 0 }))
    const chunks: { type: string; text?: string }[] = []
    for await (const c of adapter.stream([{ role: 'user', content: 'hi' }])) chunks.push(c)
    expect(chunks).toEqual([{ type: 'text', text: 'Hello from Claude' }, { type: 'done' }])
  })

  it('yields error chunk on non-zero exit', async () => {
    const adapter = new ClaudeCodeAdapter(makeExec({ stdout: '', stderr: 'auth error', code: 1 }))
    const chunks: { type: string }[] = []
    for await (const c of adapter.stream([{ role: 'user', content: 'hi' }])) chunks.push(c)
    expect(chunks[0].type).toBe('error')
  })

  it('passes formatted multi-turn conversation as prompt', async () => {
    const exec = makeExec({ stdout: 'ok', stderr: '', code: 0 })
    const adapter = new ClaudeCodeAdapter(exec)
    await Array.fromAsync(adapter.stream([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'reply' },
      { role: 'user', content: 'follow up' },
    ]))
    const prompt = (exec.run as ReturnType<typeof vi.fn>).mock.calls[0][1][1] as string
    expect(prompt).toContain('first')
    expect(prompt).toContain('reply')
    expect(prompt).toContain('follow up')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test adapters/claude-code -- --run
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// packages/cli/src/ai/adapters/claude-code.ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { realExec, type Exec } from '../../installer/exec.js'
import { formatMessages } from '../format.js'
import type { Chunk, Message, PilotProvider } from '../provider.js'

export class ClaudeCodeAdapter implements PilotProvider {
  readonly name = 'Claude Code'
  readonly model = 'unknown'

  constructor(private exec: Exec = realExec) {}

  async available(): Promise<boolean> {
    const r = await this.exec.run('which', ['claude'])
    return r.code === 0
  }

  async *stream(messages: Message[]): AsyncIterable<Chunk> {
    const prompt = formatMessages(messages)
    // Exact flags: verify with `claude --help` during implementation
    const r = await this.exec.run('claude', ['--print', prompt])
    if (r.code !== 0) {
      yield { type: 'error', error: `Claude Code exited with code ${r.code}` }
      return
    }
    if (r.stdout) yield { type: 'text', text: r.stdout }
    yield { type: 'done' }
  }
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm --filter @medalsocial/pilot test adapters/claude-code -- --run
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/ai/adapters/claude-code.ts packages/cli/src/ai/adapters/claude-code.test.ts
git commit -m "feat(repl): add ClaudeCodeAdapter"
```

---

### Task 4: CodexAdapter

**Files:**
- Create: `packages/cli/src/ai/adapters/codex.ts`
- Create: `packages/cli/src/ai/adapters/codex.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/cli/src/ai/adapters/codex.test.ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import type { Exec } from '../../installer/exec.js'
import { CodexAdapter } from './codex.js'

function makeExec(result: { stdout: string; stderr: string; code: number }): Exec {
  return { run: vi.fn().mockResolvedValue(result) }
}

describe('CodexAdapter', () => {
  it('reports unavailable when which codex returns non-zero', async () => {
    const adapter = new CodexAdapter(makeExec({ stdout: '', stderr: '', code: 1 }))
    expect(await adapter.available()).toBe(false)
  })

  it('reports available when which codex returns zero', async () => {
    const adapter = new CodexAdapter(makeExec({ stdout: '/usr/local/bin/codex\n', stderr: '', code: 0 }))
    expect(await adapter.available()).toBe(true)
  })

  it('yields text chunk then done on success', async () => {
    const adapter = new CodexAdapter(makeExec({ stdout: 'Hello from Codex', stderr: '', code: 0 }))
    const chunks: { type: string; text?: string }[] = []
    for await (const c of adapter.stream([{ role: 'user', content: 'hi' }])) chunks.push(c)
    expect(chunks).toEqual([{ type: 'text', text: 'Hello from Codex' }, { type: 'done' }])
  })

  it('yields error chunk on non-zero exit', async () => {
    const adapter = new CodexAdapter(makeExec({ stdout: '', stderr: 'err', code: 1 }))
    const chunks: { type: string }[] = []
    for await (const c of adapter.stream([{ role: 'user', content: 'hi' }])) chunks.push(c)
    expect(chunks[0].type).toBe('error')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test adapters/codex -- --run
```

- [ ] **Step 3: Implement**

```typescript
// packages/cli/src/ai/adapters/codex.ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { realExec, type Exec } from '../../installer/exec.js'
import { formatMessages } from '../format.js'
import type { Chunk, Message, PilotProvider } from '../provider.js'

export class CodexAdapter implements PilotProvider {
  readonly name = 'Codex'
  readonly model = 'unknown'

  constructor(private exec: Exec = realExec) {}

  async available(): Promise<boolean> {
    const r = await this.exec.run('which', ['codex'])
    return r.code === 0
  }

  async *stream(messages: Message[]): AsyncIterable<Chunk> {
    const prompt = formatMessages(messages)
    // Exact flags: verify with `codex --help` during implementation
    const r = await this.exec.run('codex', ['exec', prompt])
    if (r.code !== 0) {
      yield { type: 'error', error: `Codex exited with code ${r.code}` }
      return
    }
    if (r.stdout) yield { type: 'text', text: r.stdout }
    yield { type: 'done' }
  }
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm --filter @medalsocial/pilot test adapters/codex -- --run
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/ai/adapters/codex.ts packages/cli/src/ai/adapters/codex.test.ts
git commit -m "feat(repl): add CodexAdapter"
```

---

### Task 5: MedalSocialAdapter stub

**Files:**
- Create: `packages/cli/src/ai/adapters/medalsocial.ts`
- Create: `packages/cli/src/ai/adapters/medalsocial.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/cli/src/ai/adapters/medalsocial.test.ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { MedalSocialAdapter } from './medalsocial.js'

describe('MedalSocialAdapter', () => {
  it('is never available', async () => {
    expect(await new MedalSocialAdapter().available()).toBe(false)
  })
  it('has name MedalSocial', () => {
    expect(new MedalSocialAdapter().name).toBe('MedalSocial')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test adapters/medalsocial -- --run
```

- [ ] **Step 3: Implement**

```typescript
// packages/cli/src/ai/adapters/medalsocial.ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Chunk, Message, PilotProvider } from '../provider.js'

export class MedalSocialAdapter implements PilotProvider {
  readonly name = 'MedalSocial'
  readonly model = 'unknown'

  async available(): Promise<boolean> {
    return false
  }

  async *stream(_messages: Message[]): AsyncIterable<Chunk> {
    throw new Error('MedalSocial provider not yet implemented')
  }
}
```

- [ ] **Step 4: Run to verify pass + commit**

```bash
pnpm --filter @medalsocial/pilot test adapters/medalsocial -- --run
git add packages/cli/src/ai/adapters/medalsocial.ts packages/cli/src/ai/adapters/medalsocial.test.ts
git commit -m "feat(repl): add MedalSocialAdapter stub"
```

---

### Task 6: DirectAPIAdapter + Vercel AI SDK deps

**Files:**
- Modify: `packages/cli/package.json`
- Create: `packages/cli/src/ai/adapters/direct-api.ts`
- Create: `packages/cli/src/ai/adapters/direct-api.test.ts`

- [ ] **Step 1: Install dependencies**

```bash
pnpm --filter @medalsocial/pilot add ai @ai-sdk/anthropic @ai-sdk/openai
```

- [ ] **Step 2: Write failing tests**

```typescript
// packages/cli/src/ai/adapters/direct-api.test.ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { DirectAPIAdapter } from './direct-api.js'

vi.mock('ai', () => ({
  streamText: vi.fn().mockResolvedValue({
    textStream: (async function* () { yield 'Hello' })(),
  }),
}))
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: vi.fn().mockReturnValue(() => ({})) }))
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: vi.fn().mockReturnValue(() => ({})) }))

describe('DirectAPIAdapter', () => {
  it('unavailable when no API key', async () => {
    expect(await new DirectAPIAdapter('anthropic', '').available()).toBe(false)
  })
  it('available when API key provided', async () => {
    expect(await new DirectAPIAdapter('anthropic', 'sk-test').available()).toBe(true)
  })
  it('streams text then done', async () => {
    const chunks: { type: string; text?: string }[] = []
    for await (const c of new DirectAPIAdapter('anthropic', 'sk-test').stream([{ role: 'user', content: 'hi' }])) {
      chunks.push(c)
    }
    expect(chunks).toContainEqual({ type: 'text', text: 'Hello' })
    expect(chunks.at(-1)).toEqual({ type: 'done' })
  })
  it('names anthropic correctly', () => {
    expect(new DirectAPIAdapter('anthropic', 'x').name).toBe('Anthropic API')
  })
  it('names openrouter correctly', () => {
    expect(new DirectAPIAdapter('openrouter', 'x').name).toBe('OpenRouter')
  })
})
```

- [ ] **Step 3: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test adapters/direct-api -- --run
```

- [ ] **Step 4: Implement**

```typescript
// packages/cli/src/ai/adapters/direct-api.ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import type { Chunk, Message, PilotProvider, ProviderKey } from '../provider.js'

type DirectKey = Extract<ProviderKey, 'anthropic' | 'openrouter' | 'ollama'>

const NAMES: Record<DirectKey, string> = {
  anthropic: 'Anthropic API',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
}

const MODELS: Record<DirectKey, string> = {
  anthropic: 'claude-opus-4-5-20251101',
  openrouter: 'anthropic/claude-3-5-sonnet',
  ollama: 'llama3.2',
}

const OPENAI_BASES: Partial<Record<DirectKey, string>> = {
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434/v1',
}

export class DirectAPIAdapter implements PilotProvider {
  readonly name: string
  readonly model: string

  constructor(private type: DirectKey, private apiKey: string) {
    this.name = NAMES[type]
    this.model = MODELS[type]
  }

  async available(): Promise<boolean> {
    return Boolean(this.apiKey)
  }

  async *stream(messages: Message[]): AsyncIterable<Chunk> {
    const sdkMessages = messages.map((m) => ({ role: m.role, content: m.content }))
    let result: Awaited<ReturnType<typeof streamText>>

    if (this.type === 'anthropic') {
      const p = createAnthropic({ apiKey: this.apiKey })
      result = await streamText({ model: p(this.model), messages: sdkMessages })
    } else {
      const p = createOpenAI({ baseURL: OPENAI_BASES[this.type], apiKey: this.apiKey })
      result = await streamText({ model: p(this.model), messages: sdkMessages })
    }

    for await (const delta of result.textStream) {
      yield { type: 'text', text: delta }
    }
    yield { type: 'done' }
  }
}
```

- [ ] **Step 5: Run to verify pass**

```bash
pnpm --filter @medalsocial/pilot test adapters/direct-api -- --run
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli/package.json pnpm-lock.yaml packages/cli/src/ai/adapters/direct-api.ts packages/cli/src/ai/adapters/direct-api.test.ts
git commit -m "feat(repl): add DirectAPIAdapter (Anthropic, OpenRouter, Ollama) via Vercel AI SDK"
```

---

### Task 7: resolveProvider() waterfall

**Files:**
- Create: `packages/cli/src/ai/resolve.ts`
- Create: `packages/cli/src/ai/resolve.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/cli/src/ai/resolve.test.ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import type { PilotProvider } from './provider.js'
import { resolveProvider } from './resolve.js'
import type { PilotSettings } from '../settings.js'

function settings(ai: Partial<{ provider: string | null; apiKey: string | null }> = {}): PilotSettings {
  return {
    onboarded: true, plugins: {}, mcpServers: {}, crew: { specialists: {} },
    ai: { provider: null, apiKey: null, ...ai },
  }
}

function mockAdapter(available: boolean): PilotProvider {
  return { name: 'mock', model: 'x', available: vi.fn().mockResolvedValue(available), stream: vi.fn() }
}

describe('resolveProvider', () => {
  it('returns first available adapter from priority list', async () => {
    const second = mockAdapter(true)
    const result = await resolveProvider(settings(), [mockAdapter(false), second])
    expect(result).toBe(second)
  })

  it('throws NO_PROVIDER when nothing available', async () => {
    await expect(resolveProvider(settings(), [mockAdapter(false)])).rejects.toThrow('NO_PROVIDER')
  })

  it('skips saved provider if unavailable and falls through', async () => {
    const fallback = mockAdapter(true)
    const result = await resolveProvider(settings({ provider: 'claude-code' }), [mockAdapter(false), fallback])
    expect(result).toBe(fallback)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test resolve -- --run
```

- [ ] **Step 3: Implement**

```typescript
// packages/cli/src/ai/resolve.ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PilotError, errorCodes } from '../errors.js'
import type { PilotSettings } from '../settings.js'
import { ClaudeCodeAdapter } from './adapters/claude-code.js'
import { CodexAdapter } from './adapters/codex.js'
import { DirectAPIAdapter } from './adapters/direct-api.js'
import { MedalSocialAdapter } from './adapters/medalsocial.js'
import type { PilotProvider, ProviderKey } from './provider.js'

export function adapterFor(key: ProviderKey, settings: PilotSettings): PilotProvider {
  switch (key) {
    case 'claude-code': return new ClaudeCodeAdapter()
    case 'codex': return new CodexAdapter()
    case 'medalsocial': return new MedalSocialAdapter()
    case 'anthropic': return new DirectAPIAdapter('anthropic', settings.ai.apiKey ?? '')
    case 'openrouter': return new DirectAPIAdapter('openrouter', settings.ai.apiKey ?? '')
    case 'ollama': return new DirectAPIAdapter('ollama', settings.ai.apiKey ?? '')
    default: throw new PilotError(errorCodes.NO_PROVIDER, `Unknown provider: ${key}`)
  }
}

const DEFAULT_PRIORITY: PilotProvider[] = [
  new ClaudeCodeAdapter(),
  new CodexAdapter(),
  new MedalSocialAdapter(),
]

export async function resolveProvider(
  settings: PilotSettings,
  priorityOrder: PilotProvider[] = DEFAULT_PRIORITY,
): Promise<PilotProvider> {
  const saved = settings.ai.provider
  if (saved) {
    const adapter = adapterFor(saved as ProviderKey, settings)
    if (await adapter.available()) return adapter
  }
  for (const adapter of priorityOrder) {
    if (await adapter.available()) return adapter
  }
  throw new PilotError(errorCodes.NO_PROVIDER, 'No AI provider available. Run /account to set one up.')
}
```

- [ ] **Step 4: Run to verify pass + commit**

```bash
pnpm --filter @medalsocial/pilot test resolve -- --run
git add packages/cli/src/ai/resolve.ts packages/cli/src/ai/resolve.test.ts
git commit -m "feat(repl): add resolveProvider waterfall"
```

---

### Task 8: ChatHeader component

**Files:**
- Create: `packages/cli/src/components/ChatHeader.tsx`
- Create: `packages/cli/src/components/ChatHeader.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/cli/src/components/ChatHeader.test.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'
import { ChatHeader } from './ChatHeader.js'

describe('ChatHeader', () => {
  it('shows pilot', () => {
    const { lastFrame } = render(<ChatHeader providerName="Claude Code" model="claude-opus-4" />)
    expect(lastFrame()).toContain('pilot')
  })
  it('shows provider name', () => {
    const { lastFrame } = render(<ChatHeader providerName="Claude Code" model="claude-opus-4" />)
    expect(lastFrame()).toContain('Claude Code')
  })
  it('shows model when not unknown', () => {
    const { lastFrame } = render(<ChatHeader providerName="Claude Code" model="claude-opus-4" />)
    expect(lastFrame()).toContain('claude-opus-4')
  })
  it('omits model label when model is unknown', () => {
    const { lastFrame } = render(<ChatHeader providerName="Codex" model="unknown" />)
    expect(lastFrame()).not.toContain('unknown')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test ChatHeader -- --run
```

- [ ] **Step 3: Implement**

```typescript
// packages/cli/src/components/ChatHeader.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text } from 'ink'
import { colors } from '../colors.js'

interface ChatHeaderProps {
  providerName: string
  model: string
  crewLead?: string
}

export function ChatHeader({ providerName, model, crewLead }: ChatHeaderProps) {
  return (
    <Box
      borderStyle="single"
      borderTop={false}
      borderLeft={false}
      borderRight={false}
      borderColor={colors.border}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box gap={1}>
        <Text bold color={colors.primary}>pilot</Text>
        {crewLead && <><Text color={colors.muted}>·</Text><Text color={colors.muted}>{crewLead}</Text></>}
      </Box>
      <Box gap={1}>
        <Text color={colors.success}>●</Text>
        <Text color={colors.muted}>{providerName}</Text>
        {model !== 'unknown' && <><Text color={colors.muted}>·</Text><Text color={colors.muted}>{model}</Text></>}
      </Box>
    </Box>
  )
}
```

- [ ] **Step 4: Run to verify pass + commit**

```bash
pnpm --filter @medalsocial/pilot test ChatHeader -- --run
git add packages/cli/src/components/ChatHeader.tsx packages/cli/src/components/ChatHeader.test.tsx
git commit -m "feat(repl): add ChatHeader component"
```

---

### Task 9: MessageList component

**Files:**
- Create: `packages/cli/src/components/MessageList.tsx`
- Create: `packages/cli/src/components/MessageList.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/cli/src/components/MessageList.test.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library'
import { describe, expect, it } from 'vitest'
import type { Message } from '../ai/provider.js'
import { MessageList } from './MessageList.js'

describe('MessageList', () => {
  it('shows empty state hint when no messages', () => {
    const { lastFrame } = render(<MessageList messages={[]} streaming={false} />)
    expect(lastFrame()).toContain('Type anything')
  })
  it('renders user message with "you" label', () => {
    const { lastFrame } = render(
      <MessageList messages={[{ role: 'user', content: 'Hello there' }]} streaming={false} />
    )
    expect(lastFrame()).toContain('you')
    expect(lastFrame()).toContain('Hello there')
  })
  it('renders assistant message content', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'How can I help?' },
    ]
    const { lastFrame } = render(<MessageList messages={messages} streaming={false} />)
    expect(lastFrame()).toContain('How can I help?')
  })
  it('shows streaming cursor when streaming and last assistant message is empty', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: '' },
    ]
    const { lastFrame } = render(<MessageList messages={messages} streaming={true} />)
    expect(lastFrame()).toContain('▋')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test MessageList -- --run
```

- [ ] **Step 3: Implement**

```typescript
// packages/cli/src/components/MessageList.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text } from 'ink'
import type { Message } from '../ai/provider.js'
import { colors } from '../colors.js'

interface MessageListProps {
  messages: Message[]
  streaming: boolean
  crewLead?: string
}

export function MessageList({ messages, streaming, crewLead = 'pilot' }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <Box flexGrow={1} flexDirection="column" justifyContent="center" alignItems="center">
        <Text color={colors.muted}>
          Type anything to start, or <Text color={colors.primary}>/</Text> for commands
        </Text>
      </Box>
    )
  }

  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1} paddingY={1} gap={1} overflowY="scroll">
      {messages.map((msg, i) => {
        const isLastAssistant = i === messages.length - 1 && msg.role === 'assistant'
        const showCursor = isLastAssistant && streaming && msg.content === ''
        return (
          <Box key={i} flexDirection="column">
            <Text color={msg.role === 'user' ? colors.muted : colors.primary}>
              {msg.role === 'user' ? 'you' : crewLead}
            </Text>
            <Text color={colors.text}>
              {msg.content}{showCursor ? '▋' : ''}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
```

- [ ] **Step 4: Run to verify pass + commit**

```bash
pnpm --filter @medalsocial/pilot test MessageList -- --run
git add packages/cli/src/components/MessageList.tsx packages/cli/src/components/MessageList.test.tsx
git commit -m "feat(repl): add MessageList component with streaming cursor"
```

---

### Task 10: ChatInput component

**Files:**
- Create: `packages/cli/src/components/ChatInput.tsx`
- Create: `packages/cli/src/components/ChatInput.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/cli/src/components/ChatInput.test.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'
import { ChatInput } from './ChatInput.js'

describe('ChatInput', () => {
  it('shows placeholder with crew lead name', () => {
    const { lastFrame } = render(
      <ChatInput value="" onChange={vi.fn()} onSubmit={vi.fn()} disabled={false} crewLead="Tech Lead" />
    )
    expect(lastFrame()).toContain('Tech Lead')
  })
  it('shows esc hint and disabled state when streaming', () => {
    const { lastFrame } = render(
      <ChatInput value="" onChange={vi.fn()} onSubmit={vi.fn()} disabled={true} crewLead="pilot" />
    )
    expect(lastFrame()).toContain('esc to stop')
  })
  it('shows prompt arrow', () => {
    const { lastFrame } = render(
      <ChatInput value="" onChange={vi.fn()} onSubmit={vi.fn()} disabled={false} crewLead="pilot" />
    )
    expect(lastFrame()).toContain('›')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test ChatInput -- --run
```

- [ ] **Step 3: Implement**

```typescript
// packages/cli/src/components/ChatInput.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import { colors } from '../colors.js'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  disabled: boolean
  crewLead: string
}

export function ChatInput({ value, onChange, onSubmit, disabled, crewLead }: ChatInputProps) {
  return (
    <Box
      borderStyle="single"
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      borderColor={colors.border}
      paddingX={1}
      gap={1}
    >
      <Text color={colors.primary}>›</Text>
      {disabled ? (
        <Box flexGrow={1} justifyContent="space-between">
          <Text color={colors.muted}>Thinking...</Text>
          <Text color={colors.muted}>esc to stop</Text>
        </Box>
      ) : (
        <Box flexGrow={1}>
          <TextInput
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            placeholder={`Message ${crewLead}, or / for commands`}
          />
        </Box>
      )}
    </Box>
  )
}
```

- [ ] **Step 4: Run to verify pass + commit**

```bash
pnpm --filter @medalsocial/pilot test ChatInput -- --run
git add packages/cli/src/components/ChatInput.tsx packages/cli/src/components/ChatInput.test.tsx
git commit -m "feat(repl): add ChatInput component"
```

---

### Task 11: SlashCommandMenu component

**Files:**
- Create: `packages/cli/src/components/SlashCommandMenu.tsx`
- Create: `packages/cli/src/components/SlashCommandMenu.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/cli/src/components/SlashCommandMenu.test.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'
import { SlashCommandMenu } from './SlashCommandMenu.js'

const CMDS = [
  { key: '/account', description: 'Switch provider' },
  { key: '/crew', description: 'Manage crew' },
  { key: '/training', description: 'Training runs' },
]

describe('SlashCommandMenu', () => {
  it('renders all command keys', () => {
    const { lastFrame } = render(
      <SlashCommandMenu commands={CMDS} selectedIndex={0} onSelect={vi.fn()} />
    )
    expect(lastFrame()).toContain('/account')
    expect(lastFrame()).toContain('/crew')
    expect(lastFrame()).toContain('/training')
  })
  it('renders command descriptions', () => {
    const { lastFrame } = render(
      <SlashCommandMenu commands={CMDS} selectedIndex={0} onSelect={vi.fn()} />
    )
    expect(lastFrame()).toContain('Switch provider')
  })
  it('highlights selected index', () => {
    const { lastFrame } = render(
      <SlashCommandMenu commands={CMDS} selectedIndex={1} onSelect={vi.fn()} />
    )
    expect(lastFrame()).toContain('/crew')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test SlashCommandMenu -- --run
```

- [ ] **Step 3: Implement**

```typescript
// packages/cli/src/components/SlashCommandMenu.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text, useInput } from 'ink'
import { colors } from '../colors.js'

export interface SlashCommand {
  key: string
  description: string
}

interface SlashCommandMenuProps {
  commands: SlashCommand[]
  selectedIndex: number
  onSelect: (command: SlashCommand) => void
}

export function SlashCommandMenu({ commands, selectedIndex, onSelect }: SlashCommandMenuProps) {
  useInput((_input, key) => {
    if (key.return) {
      const cmd = commands[selectedIndex]
      if (cmd) onSelect(cmd)
    }
  })

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={colors.border} marginX={1}>
      {commands.map((cmd, i) => {
        const active = i === selectedIndex
        return (
          <Box key={cmd.key} paddingX={1} justifyContent="space-between">
            <Text color={active ? colors.primary : colors.text} bold={active}>
              {active ? '▸ ' : '  '}{cmd.key}
            </Text>
            <Text color={colors.muted}>{cmd.description}</Text>
          </Box>
        )
      })}
    </Box>
  )
}
```

- [ ] **Step 4: Run to verify pass + commit**

```bash
pnpm --filter @medalsocial/pilot test SlashCommandMenu -- --run
git add packages/cli/src/components/SlashCommandMenu.tsx packages/cli/src/components/SlashCommandMenu.test.tsx
git commit -m "feat(repl): add SlashCommandMenu component"
```

---

### Task 12: AccountPicker screen

**Files:**
- Create: `packages/cli/src/screens/account/AccountPicker.tsx`
- Create: `packages/cli/src/screens/account/AccountPicker.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/cli/src/screens/account/AccountPicker.test.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'
import { AccountPicker, type ProviderOption } from './AccountPicker.js'

const PROVIDERS: ProviderOption[] = [
  { key: 'claude-code', name: 'Claude Code', model: 'unknown', detected: true },
  { key: 'codex', name: 'Codex', model: 'unknown', detected: false },
  { key: 'medalsocial', name: 'MedalSocial', model: 'unknown', detected: false, comingSoon: true },
  { key: 'openrouter', name: 'OpenRouter', model: 'unknown', detected: false },
  { key: 'anthropic', name: 'Anthropic API', model: 'unknown', detected: false },
]

describe('AccountPicker', () => {
  it('shows DETECTED section', () => {
    const { lastFrame } = render(
      <AccountPicker providers={PROVIDERS} activeProvider="claude-code" selectedIndex={0} onSelect={vi.fn()} onBack={vi.fn()} />
    )
    expect(lastFrame()).toContain('DETECTED')
  })
  it('shows DIRECT PROVIDERS section', () => {
    const { lastFrame } = render(
      <AccountPicker providers={PROVIDERS} activeProvider="claude-code" selectedIndex={0} onSelect={vi.fn()} onBack={vi.fn()} />
    )
    expect(lastFrame()).toContain('DIRECT PROVIDERS')
  })
  it('marks active provider', () => {
    const { lastFrame } = render(
      <AccountPicker providers={PROVIDERS} activeProvider="claude-code" selectedIndex={0} onSelect={vi.fn()} onBack={vi.fn()} />
    )
    expect(lastFrame()).toContain('active')
  })
  it('marks MedalSocial as coming soon', () => {
    const { lastFrame } = render(
      <AccountPicker providers={PROVIDERS} activeProvider="claude-code" selectedIndex={0} onSelect={vi.fn()} onBack={vi.fn()} />
    )
    expect(lastFrame()).toContain('coming soon')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test AccountPicker -- --run
```

- [ ] **Step 3: Implement**

```typescript
// packages/cli/src/screens/account/AccountPicker.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text, useInput } from 'ink'
import { colors } from '../../colors.js'
import type { ProviderKey } from '../../ai/provider.js'

export interface ProviderOption {
  key: ProviderKey
  name: string
  model: string
  detected: boolean
  comingSoon?: boolean
}

interface AccountPickerProps {
  providers: ProviderOption[]
  activeProvider: string | null
  selectedIndex: number
  onSelect: (provider: ProviderOption) => void
  onBack: () => void
}

export function AccountPicker({ providers, activeProvider, selectedIndex, onSelect, onBack }: AccountPickerProps) {
  useInput((_input, key) => {
    if (key.escape) onBack()
    if (key.return) {
      const p = providers[selectedIndex]
      if (p && !p.comingSoon) onSelect(p)
    }
  })

  const detected = providers.filter((p) => p.detected)
  const direct = providers.filter((p) => !p.detected)

  function renderRow(p: ProviderOption) {
    const idx = providers.indexOf(p)
    const isActive = p.key === activeProvider
    const isSel = idx === selectedIndex
    return (
      <Box key={p.key} paddingX={1} justifyContent="space-between">
        <Box gap={1}>
          <Text color={isSel ? colors.primary : colors.muted}>{isSel ? '▸' : ' '}</Text>
          <Text color={isActive ? colors.success : colors.muted}>{isActive ? '●' : '○'}</Text>
          <Text color={isSel ? colors.text : colors.muted} bold={isSel}>{p.name}</Text>
        </Box>
        {isActive && <Text color={colors.success}>active</Text>}
        {!isActive && p.detected && !p.comingSoon && <Text color={colors.muted}>detected</Text>}
        {p.comingSoon && <Text color={colors.warning}>coming soon</Text>}
        {!isActive && !p.detected && !p.comingSoon && <Text color={colors.muted}>add API key →</Text>}
      </Box>
    )
  }

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1} gap={1}>
      <Box justifyContent="space-between">
        <Text bold color={colors.text}>Account &amp; Provider</Text>
        <Text color={colors.muted}>esc to go back</Text>
      </Box>
      {detected.length > 0 && (
        <Box flexDirection="column">
          <Text color={colors.primary} bold>DETECTED ON THIS MACHINE</Text>
          <Box flexDirection="column" borderStyle="single" borderColor={colors.border}>
            {detected.map(renderRow)}
          </Box>
        </Box>
      )}
      <Box flexDirection="column">
        <Text color={colors.primary} bold>DIRECT PROVIDERS</Text>
        <Box flexDirection="column" borderStyle="single" borderColor={colors.border}>
          {direct.map(renderRow)}
        </Box>
      </Box>
      <Text color={colors.muted}>↑↓ select · enter to activate</Text>
    </Box>
  )
}
```

- [ ] **Step 4: Run to verify pass + commit**

```bash
pnpm --filter @medalsocial/pilot test AccountPicker -- --run
git add packages/cli/src/screens/account/AccountPicker.tsx packages/cli/src/screens/account/AccountPicker.test.tsx
git commit -m "feat(repl): add AccountPicker screen"
```

---

### Task 13: Chat screen (conversation loop)

**Files:**
- Create: `packages/cli/src/screens/Chat.tsx`
- Create: `packages/cli/src/screens/Chat.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// packages/cli/src/screens/Chat.test.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'
import type { PilotProvider } from '../ai/provider.js'
import { Chat } from './Chat.js'

function mockProvider(): PilotProvider {
  return {
    name: 'Mock', model: 'mock-model',
    available: vi.fn().mockResolvedValue(true),
    async *stream() { yield { type: 'text' as const, text: 'hi' }; yield { type: 'done' as const } },
  }
}

describe('Chat', () => {
  it('renders header with provider name', () => {
    const { lastFrame } = render(<Chat provider={mockProvider()} onNavigate={vi.fn()} onAccountOpen={vi.fn()} />)
    expect(lastFrame()).toContain('Mock')
  })
  it('shows empty state', () => {
    const { lastFrame } = render(<Chat provider={mockProvider()} onNavigate={vi.fn()} onAccountOpen={vi.fn()} />)
    expect(lastFrame()).toContain('Type anything')
  })
  it('shows slash menu when input is /', () => {
    const { lastFrame, stdin } = render(<Chat provider={mockProvider()} onNavigate={vi.fn()} onAccountOpen={vi.fn()} />)
    stdin.write('/')
    expect(lastFrame()).toContain('/account')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm --filter @medalsocial/pilot test screens/Chat -- --run
```

- [ ] **Step 3: Implement**

```typescript
// packages/cli/src/screens/Chat.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, useInput } from 'ink'
import { useCallback, useRef, useState } from 'react'
import type { Message, PilotProvider } from '../ai/provider.js'
import { ChatHeader } from '../components/ChatHeader.js'
import { ChatInput } from '../components/ChatInput.js'
import { MessageList } from '../components/MessageList.js'
import { SlashCommandMenu, type SlashCommand } from '../components/SlashCommandMenu.js'

const SLASH_COMMANDS: SlashCommand[] = [
  { key: '/account', description: 'Switch provider or harness' },
  { key: '/crew', description: 'Manage crew members' },
  { key: '/training', description: 'Knowledge base & training runs' },
  { key: '/plugins', description: 'Browse & manage plugins' },
  { key: '/admin', description: 'Dashboard & settings' },
  { key: '/help', description: 'Show all commands' },
]

const NAVIGABLE = new Set(['training', 'plugins', 'admin'])

interface ChatProps {
  provider: PilotProvider
  onNavigate: (screen: string) => void
  onAccountOpen: () => void
}

export function Chat({ provider, onNavigate, onAccountOpen }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [menuIndex, setMenuIndex] = useState(0)
  const mountedRef = useRef(true)

  const showMenu = input.startsWith('/') && !streaming

  useInput((_char, key) => {
    if (showMenu) {
      if (key.downArrow) setMenuIndex((i) => (i + 1) % SLASH_COMMANDS.length)
      if (key.upArrow) setMenuIndex((i) => (i - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length)
      if (key.escape) setInput('')
    }
    if (streaming && key.escape) setStreaming(false)
  })

  const handleCommand = useCallback((cmd: SlashCommand) => {
    setInput('')
    if (cmd.key === '/account') { onAccountOpen(); return }
    if (cmd.key === '/help') {
      const help = SLASH_COMMANDS.map((c) => `${c.key} — ${c.description}`).join('\n')
      setMessages((prev) => [...prev, { role: 'assistant', content: help }])
      return
    }
    const screen = cmd.key.slice(1)
    if (NAVIGABLE.has(screen)) {
      onNavigate(screen)
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', content: `${cmd.key} — coming soon` }])
    }
  }, [onAccountOpen, onNavigate])

  const handleSubmit = useCallback((value: string) => {
    if (!value.trim() || streaming) return
    if (value.startsWith('/')) {
      const cmd = SLASH_COMMANDS.find((c) => c.key === value.trim())
      if (cmd) handleCommand(cmd)
      setInput('')
      return
    }
    void (async () => {
      const userMsg: Message = { role: 'user', content: value }
      const next = [...messages, userMsg]
      setMessages([...next, { role: 'assistant', content: '' }])
      setInput('')
      setStreaming(true)
      for await (const chunk of provider.stream(next)) {
        if (!mountedRef.current) return
        if (chunk.type === 'text') {
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            updated[updated.length - 1] = { ...last, content: last.content + (chunk.text ?? '') }
            return updated
          })
        } else if (chunk.type === 'done') {
          setStreaming(false)
        } else if (chunk.type === 'error') {
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'assistant', content: `Error: ${chunk.error}` }
            return updated
          })
          setStreaming(false)
        }
      }
    })()
  }, [messages, streaming, provider, handleCommand])

  return (
    <Box flexDirection="column" height="100%">
      <ChatHeader providerName={provider.name} model={provider.model} />
      <MessageList messages={messages} streaming={streaming} />
      {showMenu && (
        <SlashCommandMenu commands={SLASH_COMMANDS} selectedIndex={menuIndex} onSelect={handleCommand} />
      )}
      <ChatInput value={input} onChange={setInput} onSubmit={handleSubmit} disabled={streaming} crewLead="pilot" />
    </Box>
  )
}
```

- [ ] **Step 4: Run to verify pass + commit**

```bash
pnpm --filter @medalsocial/pilot test screens/Chat -- --run
git add packages/cli/src/screens/Chat.tsx packages/cli/src/screens/Chat.test.tsx
git commit -m "feat(repl): add Chat screen with conversation loop and slash command routing"
```

---

### Task 14: Update Repl.tsx — provider detection + screen routing

**Files:**
- Modify: `packages/cli/src/screens/Repl.tsx`
- Modify: `packages/cli/src/screens/Repl.test.tsx`
- Delete: `packages/cli/src/screens/Home.tsx`
- Delete: `packages/cli/src/screens/Home.test.tsx`

- [ ] **Step 1: Read current Repl.tsx and Repl.test.tsx**

```bash
cat packages/cli/src/screens/Repl.tsx
cat packages/cli/src/screens/Repl.test.tsx
```

- [ ] **Step 2: Replace Repl.tsx**

```typescript
// packages/cli/src/screens/Repl.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text } from 'ink'
import { useEffect, useState } from 'react'
import type { PilotProvider } from '../ai/provider.js'
import { resolveProvider } from '../ai/resolve.js'
import { colors } from '../colors.js'
import { loadSettings, markOnboarded, saveSettings } from '../settings.js'
import { AccountPicker, type ProviderOption } from './account/AccountPicker.js'
import { Admin } from './Admin.js'
import { Chat } from './Chat.js'
import { Plugins } from './Plugins.js'
import { Training } from './Training.js'
import { Welcome } from './Welcome.js'

type Screen = 'welcome' | 'detecting' | 'chat' | 'account' | 'training' | 'plugins' | 'admin'

const ALL_PROVIDERS: ProviderOption[] = [
  { key: 'claude-code', name: 'Claude Code', model: 'unknown', detected: false },
  { key: 'codex', name: 'Codex', model: 'unknown', detected: false },
  { key: 'medalsocial', name: 'MedalSocial', model: 'unknown', detected: false, comingSoon: true },
  { key: 'openrouter', name: 'OpenRouter', model: 'unknown', detected: false },
  { key: 'anthropic', name: 'Anthropic API', model: 'unknown', detected: false },
]

export function Repl() {
  const [settings, setSettings] = useState(loadSettings)
  const [screen, setScreen] = useState<Screen>(settings.onboarded ? 'detecting' : 'welcome')
  const [provider, setProvider] = useState<PilotProvider | null>(null)
  const [providers, setProviders] = useState<ProviderOption[]>(ALL_PROVIDERS)
  const [accountIndex, setAccountIndex] = useState(0)

  useEffect(() => {
    if (screen !== 'detecting') return
    resolveProvider(settings)
      .then((p) => {
        setProvider(p)
        setProviders((prev) => prev.map((opt) => opt.name === p.name ? { ...opt, detected: true } : opt))
        setScreen('chat')
      })
      .catch(() => setScreen('account'))
  }, [screen, settings])

  if (screen === 'welcome') {
    return <Welcome onContinue={() => { markOnboarded(); setScreen('detecting') }} />
  }

  if (screen === 'detecting') {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text color={colors.muted}>Detecting AI providers...</Text>
      </Box>
    )
  }

  if (screen === 'account') {
    return (
      <AccountPicker
        providers={providers}
        activeProvider={settings.ai.provider}
        selectedIndex={accountIndex}
        onSelect={(p) => {
          const updated = { ...settings, ai: { ...settings.ai, provider: p.key } }
          saveSettings(updated)
          setSettings(updated)
          setProvider(null)
          setScreen('detecting')
        }}
        onBack={() => setScreen(provider ? 'chat' : 'account')}
      />
    )
  }

  if (screen === 'training') return <Training />
  if (screen === 'plugins') return <Plugins />
  if (screen === 'admin') return <Admin />

  if (!provider) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text color={colors.muted}>Detecting AI providers...</Text>
      </Box>
    )
  }

  return (
    <Chat
      provider={provider}
      onNavigate={(name) => setScreen(name as Screen)}
      onAccountOpen={() => setScreen('account')}
    />
  )
}
```

- [ ] **Step 3: Replace Repl.test.tsx**

```typescript
// packages/cli/src/screens/Repl.test.tsx
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Repl } from './Repl.js'

vi.mock('../settings.js', () => ({
  loadSettings: vi.fn().mockReturnValue({
    onboarded: false, plugins: {}, mcpServers: {}, crew: { specialists: {} },
    ai: { provider: null, apiKey: null },
  }),
  markOnboarded: vi.fn(),
  saveSettings: vi.fn(),
}))

vi.mock('../ai/resolve.js', () => ({
  resolveProvider: vi.fn().mockResolvedValue({
    name: 'Claude Code', model: 'unknown',
    available: vi.fn().mockResolvedValue(true),
    stream: vi.fn(),
  }),
}))

describe('Repl', () => {
  it('shows welcome screen for new users', () => {
    const { lastFrame } = render(<Repl />)
    expect(lastFrame()).toContain('Welcome')
  })
})
```

- [ ] **Step 4: Delete Home screens**

```bash
git rm packages/cli/src/screens/Home.tsx packages/cli/src/screens/Home.test.tsx
```

- [ ] **Step 5: Run all tests**

```bash
pnpm --filter @medalsocial/pilot test -- --run
```

Fix any remaining imports referencing `Home`. Check with:

```bash
grep -r 'from.*Home' packages/cli/src/ --include='*.ts' --include='*.tsx'
```

- [ ] **Step 6: Typecheck**

```bash
pnpm --filter @medalsocial/pilot exec tsc --noEmit
```

Fix all type errors before committing.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/screens/Repl.tsx packages/cli/src/screens/Repl.test.tsx
git commit -m "feat(repl): wire Chat into Repl with provider detection, screen routing, remove Home"
```

---

### Task 15: Full suite + E2E smoke test

**Files:**
- Create: `tests/e2e/repl-chat.test.ts`

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all passing. Fix anything red before proceeding.

- [ ] **Step 2: Build**

```bash
pnpm build
```

- [ ] **Step 3: Write E2E smoke test**

```typescript
// tests/e2e/repl-chat.test.ts
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const PILOT_BIN = join(import.meta.dirname, '../../packages/cli/dist/bin/pilot.js')

describe('REPL E2E', () => {
  let pilotHome: string

  beforeEach(() => {
    pilotHome = join(tmpdir(), `pilot-e2e-${Date.now()}`)
    mkdirSync(pilotHome, { recursive: true })
    writeFileSync(
      join(pilotHome, 'settings.json'),
      JSON.stringify({
        onboarded: true, plugins: {}, mcpServers: {}, crew: { specialists: {} },
        ai: { provider: null, apiKey: null },
      })
    )
  })

  afterEach(() => rmSync(pilotHome, { recursive: true, force: true }))

  it('no longer shows the old static home screen', async () => {
    const child = spawn('node', [PILOT_BIN], {
      env: { ...process.env, PILOT_HOME: pilotHome },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', (d: Buffer) => { output += d.toString() })
    await new Promise<void>((resolve) => setTimeout(resolve, 800))
    child.kill()
    expect(output).not.toContain('What would you like to work on?')
  })
})
```

- [ ] **Step 4: Run E2E test**

```bash
pnpm --filter @medalsocial/pilot test tests/e2e/repl-chat -- --run
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/repl-chat.test.ts
git commit -m "test(repl): add E2E smoke test for chat REPL"
```
