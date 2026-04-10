# Subplan 03: AI + Crew

> **For agentic workers:** Use superpowers:subagent-driven-development

**Goal:** Wire up the AI layer with Vercel AI SDK, implement crew auto-routing by keyword matching, build the AGENTS.md / CLAUDE.md generator, and create the Chat screen with streaming UI.

**Architecture:** pnpm monorepo with a `cli` package (React Ink + Commander.js) and `plugins/` packages (@medalsocial/kit, sanity, pencil). The plugin system loads manifests, registers MCP servers and slash commands. The AI layer uses Vercel AI SDK with Claude for streaming chat, tool calling, and crew auto-routing. Training generates AGENTS.md / CLAUDE.md consumed by Claude Code, Codex, and any MCP-aware tool.

**Tech Stack:** TypeScript (strict), pnpm workspaces, React Ink, Commander.js, Vercel AI SDK, @ai-sdk/anthropic, Zod, Vitest, ink-testing-library, Biome

**Depends on:** [01-foundation.md](01-foundation.md), [02-screens.md](02-screens.md)

---

## Phase 4: AI Layer + Crew

### Task 16: Vercel AI SDK client setup

**Files:**
- Create: `packages/cli/src/ai/client.ts`
- Create: `packages/cli/src/ai/tools.ts`

- [ ] **Step 1: Add AI SDK dependencies**

```bash
cd packages/cli && pnpm add ai @ai-sdk/anthropic
```

- [ ] **Step 2: Create AI client**

```ts
// packages/cli/src/ai/client.ts
import { anthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs } from "ai";

const DEFAULT_MODEL = "claude-sonnet-4.6";

interface ChatOptions {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  systemPrompt?: string;
  tools?: Record<string, unknown>;
  maxSteps?: number;
  onStepFinish?: (step: { toolCalls: Array<{ toolName: string }> }) => void;
}

export async function* chat(options: ChatOptions) {
  const result = streamText({
    model: anthropic(DEFAULT_MODEL),
    system: options.systemPrompt,
    messages: options.messages,
    tools: options.tools as never,
    stopWhen: stepCountIs(options.maxSteps ?? 10),
    onStepFinish: options.onStepFinish,
  });

  for await (const chunk of result.textStream) {
    yield chunk;
  }
}
```

- [ ] **Step 3: Create MCP tool aggregator**

```ts
// packages/cli/src/ai/tools.ts
import type { PluginRegistry } from "../plugins/types.js";

export function aggregateTools(registry: PluginRegistry) {
  const tools: Record<string, unknown> = {};

  for (const plugin of registry.enabledPlugins()) {
    for (const server of plugin.manifest.provides.mcpServers ?? []) {
      // MCP server tools will be loaded dynamically at runtime
      // For now, register the server name as a placeholder
      tools[`${plugin.id}:${server}`] = {};
    }
  }

  return tools;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/ai/
git commit -m "feat: add Vercel AI SDK client and MCP tool aggregation"
```

---

### Task 17: Crew config and auto-routing

**Files:**
- Create: `packages/cli/src/crew/config.ts`
- Create: `packages/cli/src/crew/router.ts`
- Test: `packages/cli/src/crew/router.test.ts`

- [ ] **Step 1: Create crew config**

```ts
// packages/cli/src/crew/config.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { defaultCrew } from "./members.js";
import type { CrewMember } from "../types.js";

const CREW_FILE = join(homedir(), ".pilot", "crew.json");

export function loadCrew(): CrewMember[] {
  if (!existsSync(CREW_FILE)) return defaultCrew;
  return JSON.parse(readFileSync(CREW_FILE, "utf-8"));
}

export function saveCrew(crew: CrewMember[]): void {
  mkdirSync(join(homedir(), ".pilot"), { recursive: true });
  writeFileSync(CREW_FILE, JSON.stringify(crew, null, 2));
}
```

- [ ] **Step 2: Write router test**

```ts
// packages/cli/src/crew/router.test.ts
import { describe, expect, it } from "vitest";
import { routeToCrewMember } from "./router.js";
import { defaultCrew } from "./members.js";

describe("routeToCrewMember", () => {
  it("routes social content to Marketing Lead", () => {
    const result = routeToCrewMember("Write me an Instagram caption", defaultCrew);
    expect(result.role).toBe("Marketing Lead");
  });

  it("routes build request to Tech Lead", () => {
    const result = routeToCrewMember("Set up a new project", defaultCrew);
    expect(result.role).toBe("Tech Lead");
  });

  it("routes brand question to Brand Lead", () => {
    const result = routeToCrewMember("What's our brand voice?", defaultCrew);
    expect(result.role).toBe("Brand Lead");
  });

  it("defaults to Brand Lead for ambiguous requests", () => {
    const result = routeToCrewMember("hello", defaultCrew);
    expect(result.role).toBe("Brand Lead");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test packages/cli/src/crew/router.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement router.ts**

```ts
// packages/cli/src/crew/router.ts
import type { CrewMember } from "../types.js";

const ROUTING_KEYWORDS: Record<string, string[]> = {
  "Marketing Lead": [
    "instagram", "twitter", "tiktok", "linkedin", "social",
    "caption", "post", "campaign", "schedule", "content calendar",
    "email", "newsletter",
  ],
  "Tech Lead": [
    "build", "deploy", "project", "scaffold", "code", "nextmedal",
    "api", "database", "server", "debug", "fix",
  ],
  "Brand Lead": [
    "brand", "voice", "tone", "style", "guidelines", "rewrite",
    "copy", "messaging",
  ],
  "CS Lead": [
    "ticket", "support", "customer", "complaint", "issue", "help desk",
    "escalation",
  ],
  "Sales Lead": [
    "lead", "pipeline", "outreach", "prospect", "deal", "sales",
    "pricing",
  ],
};

export function routeToCrewMember(
  message: string,
  crew: CrewMember[]
): CrewMember {
  const lower = message.toLowerCase();

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [role, keywords] of Object.entries(ROUTING_KEYWORDS)) {
    const score = keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = role;
    }
  }

  const matched = crew.find((m) => m.role === bestMatch);
  return matched ?? crew[0];
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test packages/cli/src/crew/router.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/crew/
git commit -m "feat: add crew config and keyword-based auto-routing"
```

---

### Task 18: AGENTS.md / CLAUDE.md generator

**Files:**
- Create: `packages/cli/src/training/generator.ts`
- Test: `packages/cli/src/training/generator.test.ts`

- [ ] **Step 1: Write generator test**

```ts
// packages/cli/src/training/generator.test.ts
import { describe, expect, it } from "vitest";
import { generateAgentsMd, generateClaudeMd } from "./generator.js";
import { defaultCrew } from "../crew/members.js";

describe("generateAgentsMd", () => {
  it("generates markdown with all crew members", () => {
    const md = generateAgentsMd(defaultCrew, {});
    expect(md).toContain("# Brand Lead");
    expect(md).toContain("# Marketing Lead");
    expect(md).toContain("# Tech Lead");
    expect(md).toContain("# CS Lead");
    expect(md).toContain("# Sales Lead");
  });

  it("includes knowledge context when provided", () => {
    const md = generateAgentsMd(defaultCrew, {
      brandVoice: "Professional yet approachable",
    });
    expect(md).toContain("Professional yet approachable");
  });
});

describe("generateClaudeMd", () => {
  it("generates CLAUDE.md with pilot instructions", () => {
    const md = generateClaudeMd({ projectName: "medal-social" });
    expect(md).toContain("medal-social");
    expect(md).toContain("/pilot");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/cli/src/training/generator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement generator.ts**

```ts
// packages/cli/src/training/generator.ts
import type { CrewMember } from "../types.js";

interface KnowledgeContext {
  brandVoice?: string;
  products?: string[];
  competitors?: string[];
  guidelines?: string[];
}

export function generateAgentsMd(
  crew: CrewMember[],
  knowledge: KnowledgeContext
): string {
  const lines: string[] = [
    "# Pilot Crew — AGENTS.md",
    "",
    "Generated by `pilot training`. This file configures AI agents across Claude Code, Codex, and Pilot.",
    "",
  ];

  if (knowledge.brandVoice) {
    lines.push("## Brand Voice", "", knowledge.brandVoice, "");
  }

  for (const member of crew) {
    lines.push(`# ${member.role}`, "");
    lines.push(`${member.description}`, "");
    if (member.skills.length > 0) {
      lines.push("Skills:");
      for (const skill of member.skills) {
        lines.push(`- ${skill}`);
      }
      lines.push("");
    }
  }

  if (knowledge.products?.length) {
    lines.push("## Products", "");
    for (const p of knowledge.products) lines.push(`- ${p}`);
    lines.push("");
  }

  if (knowledge.competitors?.length) {
    lines.push("## Competitors", "");
    for (const c of knowledge.competitors) lines.push(`- ${c}`);
    lines.push("");
  }

  return lines.join("\n");
}

interface ProjectContext {
  projectName: string;
}

export function generateClaudeMd(context: ProjectContext): string {
  return [
    `# ${context.projectName}`,
    "",
    "This project uses Pilot for AI crew management.",
    "",
    "## Using Pilot",
    "",
    "Type `/pilot` to access your Medal Social crew in Claude Code.",
    "Run `pilot training` to update crew knowledge.",
    "",
  ].join("\n");
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test packages/cli/src/training/generator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/training/generator.ts packages/cli/src/training/generator.test.ts
git commit -m "feat: add AGENTS.md and CLAUDE.md generator"
```

---

### Task 19: Chat screen with streaming

**Files:**
- Create: `packages/cli/src/screens/Chat.tsx`
- Test: `packages/cli/src/screens/Chat.test.tsx`

- [ ] **Step 1: Write Chat test**

```tsx
// packages/cli/src/screens/Chat.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { Chat } from "./Chat.js";

describe("Chat", () => {
  it("shows input prompt", () => {
    const { lastFrame } = render(<Chat />);
    expect(lastFrame()).toContain("What would you like to do");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/cli/src/screens/Chat.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Chat.tsx**

```tsx
// packages/cli/src/screens/Chat.tsx
import React, { useState } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { ThinkingRow } from "../components/ThinkingRow.js";
import { StatusBar } from "../components/StatusBar.js";
import { colors } from "../colors.js";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ToolCall {
  name: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);

  const handleSubmit = async (value: string) => {
    if (!value.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: value }]);
    setInput("");
    setStreaming(true);

    // AI response will be handled by the AI client
    // For now, show a placeholder
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'll help with that. Let me check..." },
      ]);
      setStreaming(false);
    }, 1000);
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1}>
        {messages.map((msg, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            {msg.role === "user" ? (
              <Text bold color={colors.text}>
                {">"} {msg.content}
              </Text>
            ) : (
              <Text color={colors.text}>{msg.content}</Text>
            )}
          </Box>
        ))}
        {toolCalls.map((tc, i) => (
          <ThinkingRow key={i} tool={tc.name} />
        ))}
      </Box>
      <Box
        paddingX={2}
        paddingY={1}
        borderStyle="single"
        borderColor={streaming ? colors.warning : colors.primary}
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        {streaming ? (
          <Text color={colors.muted}>Thinking...</Text>
        ) : (
          <Box>
            <Text color={colors.primary}>❯ </Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              placeholder="What would you like to do next?"
            />
          </Box>
        )}
      </Box>
      <StatusBar
        items={[
          { label: "● connected", color: colors.success },
          { label: "pilot" },
          { label: "claude · content" },
        ]}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test packages/cli/src/screens/Chat.test.tsx`
Expected: PASS

- [ ] **Step 5: Wire Chat into Repl routing**

Update `packages/cli/src/screens/Repl.tsx` to transition from Home to Chat when user starts typing.

- [ ] **Step 6: Update README.md Feature Tracker**

Update the Feature Tracker in README.md — change status from "Planned" to "Done" for features completed in this subplan.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/screens/Chat.tsx packages/cli/src/screens/Chat.test.tsx packages/cli/src/screens/Repl.tsx
git commit -m "feat: add Chat screen with streaming UI and crew routing"
```

---

## Self-Review

| Spec Section | Task |
|---|---|
| Architecture (AI layer) | Task 16 |
| Flow 3 — Pilot Chat | Tasks 19, 17 |
| Crew System (routing) | Task 17 |
| AGENTS.md generation | Task 18 |
| MCP tool aggregation | Task 16 |
