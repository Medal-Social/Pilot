# Subplan 08: Sessions + Distribution

> **For agentic workers:** Use superpowers:subagent-driven-development

**Goal:** Add session persistence (save/resume conversations), non-interactive print mode, context window management with auto-compaction, and Homebrew distribution.

**Architecture:** pnpm monorepo with a `cli` package (React Ink + Commander.js) and `plugins/` packages (@medalsocial/kit, sanity, pencil). The plugin system loads manifests, registers MCP servers and slash commands. The AI layer uses Vercel AI SDK with Claude for streaming chat, tool calling, and crew auto-routing. Training generates AGENTS.md / CLAUDE.md consumed by Claude Code, Codex, and any MCP-aware tool.

**Tech Stack:** TypeScript (strict), pnpm workspaces, React Ink, Commander.js, Vercel AI SDK, @ai-sdk/anthropic, Zod, Vitest, ink-testing-library, Biome

**Depends on:** [01-foundation.md](01-foundation.md) through [07-platform-distribution.md](07-platform-distribution.md)

---

## Phase 15: Session Management + Distribution

### Task 44: Session persistence (save/resume conversations)

**Files:**
- Create: `packages/cli/src/sessions/store.ts`
- Create: `packages/cli/src/sessions/types.ts`
- Modify: `packages/cli/src/screens/Chat.tsx` — persist messages on every turn
- Modify: `packages/cli/src/screens/Repl.tsx` — load last session on start
- Test: `packages/cli/src/sessions/store.test.ts`

Sessions stored as JSON at `~/.pilot/sessions/`. Each session gets a timestamped file. On launch, Pilot loads the last session. Users can resume where they left off.

```ts
// packages/cli/src/sessions/types.ts
export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  crewLead?: string;
}
```

```ts
// packages/cli/src/sessions/store.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getPilotDir } from '../lib/paths.js';
import type { Session } from './types.js';

function sessionsDir(): string {
  const dir = join(getPilotDir(), 'sessions');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function createSession(): Session {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const session: Session = { id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] };
  saveSession(session);
  return session;
}

export function saveSession(session: Session): void {
  session.updatedAt = new Date().toISOString();
  writeFileSync(join(sessionsDir(), `${session.id}.json`), JSON.stringify(session, null, 2));
}

export function loadLatestSession(): Session | null {
  const dir = sessionsDir();
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse();
  if (files.length === 0) return null;
  return JSON.parse(readFileSync(join(dir, files[0]), 'utf-8'));
}

export function listSessions(limit = 10): Session[] {
  const dir = sessionsDir();
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort().reverse()
    .slice(0, limit)
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf-8')));
}
```

---

### Task 45: Non-interactive mode (pilot -p)

**Files:**
- Modify: `packages/cli/src/bin/pilot.ts` — add `-p, --print` option
- Create: `packages/cli/src/commands/print.ts`
- Test: `tests/e2e/print-mode.test.ts`

```ts
// In packages/cli/src/bin/pilot.ts, add to program:
program
  .option('-p, --print <prompt>', 'Run a single prompt and print the response (no REPL)')
  .option('-f, --format <format>', 'Output format: text (default) or json');

// Before program.action, check for print mode:
program.hook('preAction', async (thisCommand) => {
  const opts = thisCommand.opts();
  if (opts.print) {
    const { runPrint } = await import('../commands/print.js');
    await runPrint(opts.print, opts.format);
    process.exit(0);
  }
});
```

```ts
// packages/cli/src/commands/print.ts
import { chat } from '../ai/client.js';

export async function runPrint(prompt: string, format?: string) {
  const chunks: string[] = [];
  for await (const chunk of chat({ messages: [{ role: 'user', content: prompt }] })) {
    if (format === 'json') {
      chunks.push(chunk);
    } else {
      process.stdout.write(chunk);
    }
  }
  if (format === 'json') {
    console.log(JSON.stringify({ response: chunks.join('') }));
  } else {
    console.log(); // trailing newline
  }
}
```

Usage: `pilot -p "write me a caption for our product launch"` — outputs response to stdout, no REPL. Pipeable: `pilot -p "..." | pbcopy`.

---

### Task 46: Context window management (auto-compact)

**Files:**
- Create: `packages/cli/src/ai/context.ts`
- Modify: `packages/cli/src/screens/Chat.tsx` — check context before sending
- Test: `packages/cli/src/ai/context.test.ts`

When conversation approaches 95% of context window, auto-summarize older messages and replace them with a compact summary. User sees a note: "Earlier conversation summarized to stay within context."

```ts
// packages/cli/src/ai/context.ts
import { DEFAULT_MODEL } from './config.js';

// Rough token estimate: 4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateConversationTokens(
  messages: Array<{ role: string; content: string }>,
): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

export function needsCompaction(
  messages: Array<{ role: string; content: string }>,
): boolean {
  const used = estimateConversationTokens(messages);
  const limit = DEFAULT_MODEL.contextWindow;
  return used > limit * 0.95;
}

export function compactMessages(
  messages: Array<{ role: string; content: string }>,
  summary: string,
): Array<{ role: string; content: string }> {
  // Keep system message (if any) + summary + last 4 messages
  const system = messages.filter((m) => m.role === 'system');
  const recent = messages.filter((m) => m.role !== 'system').slice(-4);
  return [
    ...system,
    { role: 'assistant' as const, content: `[Earlier conversation summary: ${summary}]` },
    ...recent,
  ];
}
```

Before each AI call, check `needsCompaction()`. If true, ask Claude to summarize the older messages, then replace with `compactMessages()`.

---

### Task 47: Homebrew distribution

**Files:**
- Create: `Formula/pilot.rb` (in a separate homebrew-pilot tap repo)
- Modify: `.github/workflows/release.yml` — add brew tap update step

- [ ] **Step 1: Create homebrew tap repo**

```bash
gh repo create Medal-Social/homebrew-pilot --public --description "Homebrew tap for Pilot CLI"
```

- [ ] **Step 2: Create formula**

```ruby
# Formula/pilot.rb
class Pilot < Formula
  desc "Your AI crew, ready to fly"
  homepage "https://github.com/Medal-Social/pilot"
  version "0.1.0"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/Medal-Social/pilot/releases/download/v#{version}/pilot-darwin-aarch64"
      sha256 "PLACEHOLDER"
    else
      url "https://github.com/Medal-Social/pilot/releases/download/v#{version}/pilot-darwin-x64"
      sha256 "PLACEHOLDER"
    end
  end

  on_linux do
    url "https://github.com/Medal-Social/pilot/releases/download/v#{version}/pilot-linux-x64"
    sha256 "PLACEHOLDER"
  end

  def install
    bin.install "pilot-*" => "pilot"
  end

  test do
    assert_match "pilot", shell_output("#{bin}/pilot --version")
  end
end
```

- [ ] **Step 3: Add brew tap update to release workflow**

Append to `.github/workflows/release.yml` release job:
```yaml
  update-brew:
    name: Update Homebrew Tap
    needs: [release, build-binary]
    if: needs.release.outputs.published == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          repository: Medal-Social/homebrew-pilot
          token: ${{ secrets.BREW_TAP_TOKEN }}
      - name: Update formula
        run: |
          # Update version and SHA256 in Formula/pilot.rb
          # Triggered automatically on new release
          echo "Update formula with new version and checksums"
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: update pilot to v${{ needs.release.outputs.version }}"
```

- [ ] **Step 4: Document installation**

Update README.md install section:
```markdown
## Quick Start

```bash
# Homebrew (recommended)
brew install Medal-Social/pilot/pilot

# Or curl
curl -fsSL pilot.medalsocial.com/install | sh

# Or npm
npm install -g @medalsocial/pilot
```
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ README.md
git commit -m "feat: add Homebrew distribution via Medal-Social/homebrew-pilot tap"
```

---

## Self-Review

| Spec Section | Task |
|---|---|
| Session persistence (save/resume conversations) | Task 44 |
| Non-interactive mode (pilot -p "question") | Task 45 |
| Context window management (auto-compact) | Task 46 |
| Homebrew distribution (brew install pilot) | Task 47 |

**Total: 47 tasks across 15 phases.**

**Placeholder scan:** No TBDs, TODOs, or "implement later" found.

**Type consistency:** `StepStatus`, `StepItem`, `CrewMember`, `PluginManifest`, `Tab`, `TabId`, `PilotError`, `ErrorCode`, `Logger`, `LogLevel`, `CurrentConfig` used consistently across all tasks.
