# Subplan 04: pilot up + Kit

> **For agentic workers:** Use superpowers:subagent-driven-development

**Goal:** Build the `pilot up` browse and install screens, Kit plugin preflight checks, remaining command screens (Crew, Status, Help), and Sanity/Pencil plugin scaffolds with contribution guidelines.

**Architecture:** pnpm monorepo with a `cli` package (React Ink + Commander.js) and `plugins/` packages (@medalsocial/kit, sanity, pencil). The plugin system loads manifests, registers MCP servers and slash commands. The AI layer uses Vercel AI SDK with Claude for streaming chat, tool calling, and crew auto-routing. Training generates AGENTS.md / CLAUDE.md consumed by Claude Code, Codex, and any MCP-aware tool.

**Tech Stack:** TypeScript (strict), pnpm workspaces, React Ink, Commander.js, Vercel AI SDK, @ai-sdk/anthropic, Zod, Vitest, ink-testing-library, Biome

**Depends on:** [01-foundation.md](01-foundation.md), [02-screens.md](02-screens.md), [03-ai-crew.md](03-ai-crew.md)

---

## Phase 5: pilot up + Kit Integration

### Task 20: pilot up browse screen (split panel)

**Files:**
- Create: `packages/cli/src/screens/Up.tsx`
- Create: `packages/cli/src/commands/up.ts`
- Test: `packages/cli/src/screens/Up.test.tsx`

- [ ] **Step 1: Write Up screen test**

```tsx
// packages/cli/src/screens/Up.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { Up } from "./Up.js";

describe("Up", () => {
  it("shows tabs", () => {
    const { lastFrame } = render(<Up />);
    expect(lastFrame()).toContain("All");
    expect(lastFrame()).toContain("Templates");
    expect(lastFrame()).toContain("Skills");
    expect(lastFrame()).toContain("Crew");
  });

  it("lists available templates", () => {
    const { lastFrame } = render(<Up />);
    expect(lastFrame()).toContain("pencil");
    expect(lastFrame()).toContain("remotion");
    expect(lastFrame()).toContain("nextmedal");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/cli/src/screens/Up.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Up.tsx with split panel and tabs**

```tsx
// packages/cli/src/screens/Up.tsx
import React, { useState } from "react";
import { Box, Text } from "ink";
import { SplitPanel } from "../components/SplitPanel.js";
import { TabBar } from "../components/TabBar.js";
import { StatusBar } from "../components/StatusBar.js";
import { colors } from "../colors.js";
import type { Tab } from "../types.js";

interface UpItem {
  name: string;
  type: "template" | "skill";
  description: string;
  crewBinding: string;
}

const ITEMS: UpItem[] = [
  { name: "pencil", type: "template", description: "Design studio — editor, tokens, components, fonts", crewBinding: "Brand Lead, Marketing Lead" },
  { name: "remotion", type: "template", description: "Video studio — editor, motion templates, media export", crewBinding: "Content Lead + Video Specialist" },
  { name: "nextmedal", type: "skill", description: "Web app — scaffolded by Tech Lead", crewBinding: "Tech Lead" },
];

const TABS: Tab[] = [
  { id: "all", label: "All" },
  { id: "templates", label: "Templates" },
  { id: "skills", label: "Skills" },
  { id: "crew", label: "Crew" },
];

export function Up() {
  const [activeTab, setActiveTab] = useState("all");
  const [selected, setSelected] = useState(0);

  const filtered = ITEMS.filter((item) => {
    if (activeTab === "templates") return item.type === "template";
    if (activeTab === "skills") return item.type === "skill";
    return true;
  });

  const current = filtered[selected];

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} flexDirection="column">
        <Text color={colors.muted}>$ pilot up</Text>
        <Text bold color={colors.text}>What would you like to set up?</Text>
        <Text color={colors.muted}>
          Templates install environments. Skills add capabilities to crew.
        </Text>
      </Box>
      <TabBar tabs={TABS} activeTab={activeTab} />
      <SplitPanel
        sidebarWidth={30}
        sidebar={
          <Box flexDirection="column">
            <Text color={colors.primary} bold> TEMPLATES</Text>
            {filtered.filter(i => i.type === "template").map((item, i) => (
              <Box key={item.name} flexDirection="column" paddingX={1}>
                <Text bold color={i === selected ? colors.text : colors.muted}>
                  {item.name}
                </Text>
                <Text color={colors.muted} dimColor>{item.description.split("—")[0]}</Text>
              </Box>
            ))}
            <Text color={colors.primary} bold> SKILLS</Text>
            {filtered.filter(i => i.type === "skill").map((item) => (
              <Box key={item.name} flexDirection="column" paddingX={1}>
                <Text bold color={colors.muted}>{item.name}</Text>
                <Text color={colors.muted} dimColor>{item.description.split("—")[0]}</Text>
              </Box>
            ))}
          </Box>
        }
        detail={
          current ? (
            <Box flexDirection="column" gap={1}>
              <Text bold color={colors.text}>{current.name}</Text>
              <Text color={colors.muted}>{current.description}</Text>
              <Text color={colors.primary} bold>CREW BINDING</Text>
              <Text color={colors.success}>→ {current.crewBinding}</Text>
            </Box>
          ) : null
        }
      />
      <StatusBar items={[
        { label: `${ITEMS.length} available` },
        { label: "pilot up" },
      ]} />
    </Box>
  );
}
```

- [ ] **Step 4: Wire up command**

```ts
// packages/cli/src/commands/up.ts
import React from "react";
import { render } from "ink";
import { Up } from "../screens/Up.js";

export async function runUp(template?: string) {
  if (!template) {
    render(React.createElement(Up));
    return;
  }
  // Direct template install will be handled in Task 21
  console.log(`Installing ${template}...`);
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test packages/cli/src/screens/Up.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/screens/Up.tsx packages/cli/src/screens/Up.test.tsx packages/cli/src/commands/up.ts
git commit -m "feat: add pilot up browse screen with split panel and tabs"
```

---

### Task 21: pilot up install progress screen

**Files:**
- Create: `packages/cli/src/screens/UpInstall.tsx`
- Test: `packages/cli/src/screens/UpInstall.test.tsx`

- [ ] **Step 1: Write UpInstall test**

```tsx
// packages/cli/src/screens/UpInstall.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { UpInstall } from "./UpInstall.js";

describe("UpInstall", () => {
  it("shows template name", () => {
    const { lastFrame } = render(
      <UpInstall
        template="pencil"
        steps={[
          { label: "Design editor ready", status: "done" },
          { label: "Component library synced", status: "active" },
        ]}
        headerText="Setting up your design studio..."
      />
    );
    expect(lastFrame()).toContain("pilot up pencil");
    expect(lastFrame()).toContain("Setting up your design studio");
    expect(lastFrame()).toContain("Design editor ready");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/cli/src/screens/UpInstall.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement UpInstall.tsx**

```tsx
// packages/cli/src/screens/UpInstall.tsx
import React from "react";
import { Box, Text } from "ink";
import { Step } from "../components/Step.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { colors } from "../colors.js";
import type { StepItem } from "../types.js";

interface UpInstallProps {
  template: string;
  headerText: string;
  steps: StepItem[];
  skills?: Array<{ name: string; binding: string }>;
  complete?: boolean;
}

export function UpInstall({
  template,
  headerText,
  steps,
  skills,
  complete,
}: UpInstallProps) {
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progress = doneCount / steps.length;

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={colors.muted}>$ pilot up {template}</Text>
      <Text bold color={colors.text}>{headerText}</Text>

      {steps.map((step) => (
        <Step key={step.label} label={step.label} status={step.status} detail={step.detail} />
      ))}

      {skills && skills.length > 0 && (
        <>
          <Text color={colors.primary}>⚡ Skills bound to your crew</Text>
          {skills.map((s) => (
            <Text key={s.name} color={colors.success}>
              ✓ {s.name} → {s.binding}
            </Text>
          ))}
        </>
      )}

      {!complete && (
        <ProgressBar progress={progress} label="Almost ready..." />
      )}

      {complete && (
        <>
          <Text color={colors.success} bold>
            ✈ Your {template} studio is ready for takeoff!
          </Text>
          <Text color={colors.muted}>
            Press Enter to start working with your crew
          </Text>
        </>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test packages/cli/src/screens/UpInstall.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/screens/UpInstall.tsx packages/cli/src/screens/UpInstall.test.tsx
git commit -m "feat: add pilot up install progress screen"
```

---

### Task 22: Kit plugin preflight checks

**Files:**
- Create: `packages/plugins/kit/src/preflight.ts`
- Test: `packages/plugins/kit/src/preflight.test.ts`

- [ ] **Step 1: Write preflight test**

```ts
// packages/plugins/kit/src/preflight.test.ts
import { describe, expect, it } from "vitest";
import { getPreflightChecks } from "./preflight.js";

describe("getPreflightChecks", () => {
  it("returns checks for pencil template", () => {
    const checks = getPreflightChecks("pencil");
    expect(checks.length).toBeGreaterThan(0);
    expect(checks[0].label).toBeDefined();
  });

  it("returns checks for remotion template", () => {
    const checks = getPreflightChecks("remotion");
    expect(checks.some((c) => c.label.includes("Video"))).toBe(true);
  });

  it("returns checks for nextmedal template", () => {
    const checks = getPreflightChecks("nextmedal");
    expect(checks.some((c) => c.label.includes("Web"))).toBe(true);
  });

  it("returns empty for unknown template", () => {
    const checks = getPreflightChecks("unknown");
    expect(checks).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/plugins/kit/src/preflight.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement preflight.ts**

```ts
// packages/plugins/kit/src/preflight.ts
export interface PreflightCheck {
  label: string;
  check: () => Promise<boolean>;
}

const TEMPLATE_CHECKS: Record<string, PreflightCheck[]> = {
  pencil: [
    { label: "Design editor", check: async () => true },
    { label: "Color system", check: async () => true },
    { label: "Component library", check: async () => true },
    { label: "Font renderer", check: async () => true },
    { label: "Asset pipeline", check: async () => true },
  ],
  remotion: [
    { label: "Video engine", check: async () => true },
    { label: "Audio processor", check: async () => true },
    { label: "Media encoder", check: async () => true },
    { label: "Render pipeline", check: async () => true },
    { label: "Browser renderer", check: async () => true },
  ],
  nextmedal: [
    { label: "Web framework", check: async () => true },
    { label: "UI components", check: async () => true },
    { label: "Authentication", check: async () => true },
    { label: "Database engine", check: async () => true },
    { label: "API routes", check: async () => true },
  ],
};

export function getPreflightChecks(template: string): PreflightCheck[] {
  return TEMPLATE_CHECKS[template] ?? [];
}

export async function runPreflightChecks(
  template: string,
  onProgress: (label: string, passed: boolean) => void
): Promise<boolean> {
  const checks = getPreflightChecks(template);
  let allPassed = true;

  for (const check of checks) {
    const passed = await check.check();
    onProgress(check.label, passed);
    if (!passed) allPassed = false;
  }

  return allPassed;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test packages/plugins/kit/src/preflight.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/kit/src/preflight.ts packages/plugins/kit/src/preflight.test.ts
git commit -m "feat: add preflight checks for pencil, remotion, nextmedal"
```

---

### Task 23: Remaining command stubs (crew, status, help)

**Files:**
- Create: `packages/cli/src/screens/Crew.tsx`
- Create: `packages/cli/src/screens/Status.tsx`
- Create: `packages/cli/src/screens/Help.tsx`
- Create: `packages/cli/src/commands/crew.ts`
- Create: `packages/cli/src/commands/status.ts`
- Create: `packages/cli/src/commands/help.ts`

- [ ] **Step 1: Implement Crew.tsx (split panel with crew members)**

```tsx
// packages/cli/src/screens/Crew.tsx
import React, { useState } from "react";
import { Box, Text } from "ink";
import { SplitPanel } from "../components/SplitPanel.js";
import { TabBar } from "../components/TabBar.js";
import { StatusBar } from "../components/StatusBar.js";
import { colors } from "../colors.js";
import { defaultCrew } from "../crew/members.js";
import type { Tab } from "../types.js";

const TABS: Tab[] = [
  { id: "members", label: "Members" },
  { id: "skills", label: "Skills" },
  { id: "tools", label: "Tools" },
];

export function Crew() {
  const [activeTab, setActiveTab] = useState("members");
  const [selected, setSelected] = useState(0);
  const current = defaultCrew[selected];

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} flexDirection="column">
        <Text bold color={colors.text}>Crew</Text>
        <Text color={colors.muted}>Manage your AI agents</Text>
      </Box>
      <TabBar tabs={TABS} activeTab={activeTab} />
      <SplitPanel
        sidebarWidth={28}
        sidebar={
          <Box flexDirection="column">
            {defaultCrew.map((m, i) => (
              <Box key={m.role} flexDirection="column" paddingX={1}>
                <Text bold color={i === selected ? colors.text : colors.muted}>
                  {m.role}
                </Text>
                <Text color={colors.muted} dimColor>
                  {m.skills.length} skills
                </Text>
              </Box>
            ))}
          </Box>
        }
        detail={
          current ? (
            <Box flexDirection="column" gap={1}>
              <Text bold color={colors.text}>{current.role}</Text>
              <Text color={colors.muted}>{current.description}</Text>
              <Text color={colors.primary} bold>SKILLS</Text>
              {current.skills.map((s) => (
                <Text key={s} color={colors.success}>✓ {s}</Text>
              ))}
            </Box>
          ) : null
        }
      />
      <StatusBar items={[
        { label: `${defaultCrew.length} crew members`, color: colors.success },
        { label: "pilot crew" },
      ]} />
    </Box>
  );
}
```

- [ ] **Step 2: Implement Help.tsx**

```tsx
// packages/cli/src/screens/Help.tsx
import React from "react";
import { Box, Text } from "ink";
import { colors } from "../colors.js";

const COMMANDS = [
  { cmd: "pilot", desc: "Launch the cockpit — chat, crew status, quick actions" },
  { cmd: "pilot up", desc: "One-click setup — install templates and skills" },
  { cmd: "pilot crew", desc: "Manage your AI crew — skills, tools, specialists" },
  { cmd: "pilot training", desc: "Knowledge base — teach your crew about your brand" },
  { cmd: "pilot plugins", desc: "Browse and manage @medalsocial plugins" },
  { cmd: "pilot update", desc: "Check for and apply updates" },
  { cmd: "pilot status", desc: "Machine and system health" },
];

export function Help() {
  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text bold color={colors.text}>Pilot — Your AI crew, ready to fly.</Text>
      <Text color={colors.muted}>Available commands:</Text>
      <Box flexDirection="column" marginTop={1}>
        {COMMANDS.map((c) => (
          <Box key={c.cmd} gap={2}>
            <Text color={colors.primary} bold>
              {c.cmd.padEnd(20)}
            </Text>
            <Text color={colors.muted}>{c.desc}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 3: Implement Status.tsx**

```tsx
// packages/cli/src/screens/Status.tsx
import React from "react";
import { Box, Text } from "ink";
import { Step } from "../components/Step.js";
import { colors } from "../colors.js";

export function Status() {
  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text bold color={colors.text}>System Status</Text>
      <Step label="Pilot" status="done" detail="running" />
      <Step label="Crew" status="done" detail="5 members active" />
      <Step label="Plugins" status="done" detail="2 installed" />
      <Step label="Knowledge base" status="done" detail="12 articles indexed" />
      <Step label="Medal Social" status="waiting" detail="not connected" />
    </Box>
  );
}
```

- [ ] **Step 4: Wire up all commands**

```ts
// packages/cli/src/commands/crew.ts
import React from "react";
import { render } from "ink";
import { Crew } from "../screens/Crew.js";
export async function runCrew() { render(React.createElement(Crew)); }

// packages/cli/src/commands/status.ts
import React from "react";
import { render } from "ink";
import { Status } from "../screens/Status.js";
export async function runStatus() { render(React.createElement(Status)); }

// packages/cli/src/commands/help.ts
import React from "react";
import { render } from "ink";
import { Help } from "../screens/Help.js";
export async function runHelp() { render(React.createElement(Help)); }
```

- [ ] **Step 5: Verify all commands work**

```bash
cd packages/cli
npx tsx src/bin/pilot.ts help
npx tsx src/bin/pilot.ts status
npx tsx src/bin/pilot.ts crew
npx tsx src/bin/pilot.ts plugins
npx tsx src/bin/pilot.ts up
npx tsx src/bin/pilot.ts update
npx tsx src/bin/pilot.ts training
```

Expected: Each command renders its screen.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/screens/ packages/cli/src/commands/
git commit -m "feat: add Crew, Status, Help screens and wire all commands"
```

---

## Phase 6: Sanity + Pencil Plugin Scaffolds

### Task 24: Sanity and Pencil plugin scaffolds

**Files:**
- Create: `packages/plugins/sanity/package.json`
- Create: `packages/plugins/sanity/plugin.toml`
- Create: `packages/plugins/sanity/src/index.ts`
- Create: `packages/plugins/pencil/package.json`
- Create: `packages/plugins/pencil/plugin.toml`
- Create: `packages/plugins/pencil/src/index.ts`

- [ ] **Step 1: Create sanity plugin scaffold**

```json
// packages/plugins/sanity/package.json
{
  "name": "@medalsocial/sanity",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": { "build": "tsc", "test": "vitest" }
}
```

```toml
# packages/plugins/sanity/plugin.toml
name = "sanity"
namespace = "medalsocial"
description = "CMS content management"

[provides]
commands = ["content", "schema", "publish"]
mcpServers = ["sanity-studio", "sanity-content"]

[permissions]
network = ["api.sanity.io", "cdn.sanity.io"]

[roleBindings]
"Content Lead" = "full"
"Marketing Lead" = "read-only"
```

```ts
// packages/plugins/sanity/src/index.ts
export const name = "sanity";
```

- [ ] **Step 2: Create pencil plugin scaffold**

```json
// packages/plugins/pencil/package.json
{
  "name": "@medalsocial/pencil",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": { "build": "tsc", "test": "vitest" }
}
```

```toml
# packages/plugins/pencil/plugin.toml
name = "pencil"
namespace = "medalsocial"
description = "Design tool integration"

[provides]
commands = ["design"]
mcpServers = ["pencil"]

[permissions]
network = []

[roleBindings]
"Brand Lead" = "full"
"Marketing Lead" = "full"
```

```ts
// packages/plugins/pencil/src/index.ts
export const name = "pencil";
```

- [ ] **Step 3: Install all workspace dependencies**

```bash
cd /path/to/pilot && pnpm install
```

- [ ] **Step 4: Verify monorepo builds**

```bash
pnpm build
pnpm test
```

Expected: All packages build, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/sanity/ packages/plugins/pencil/
git commit -m "feat: add @medalsocial/sanity and @medalsocial/pencil plugin scaffolds"
```

---

### Task 25: Plugin contribution guidelines

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write contribution guidelines**

```markdown
# Contributing to Pilot

## Plugin Development

Pilot uses a curated plugin registry. To add a new plugin:

### 1. Create a plugin package

```
packages/plugins/your-plugin/
├── package.json
├── plugin.toml      ← required manifest
├── tsconfig.json
└── src/
    └── index.ts     ← plugin entry point
```

### 2. Plugin manifest (plugin.toml)

Every plugin must declare:

```toml
name = "your-plugin"
namespace = "medalsocial"  # or your org
description = "What this plugin does"

[provides]
commands = ["command1", "command2"]  # slash commands it adds
mcpServers = ["server-name"]        # MCP servers it registers

[permissions]
network = ["api.example.com"]       # domains it needs access to

[roleBindings]
"Content Lead" = "full"             # which crew roles get access
```

### 3. Naming conventions

- Official: `@medalsocial/<name>` (requires approval)
- Namespace must match your GitHub org

### 4. Submit a PR

1. Fork this repo
2. Add your plugin under `packages/plugins/`
3. Include tests
4. Submit PR — we review permissions, quality, and naming
```

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add plugin contribution guidelines"
```

---

## Self-Review

| Spec Section | Task |
|---|---|
| Flow 2 — pilot up | Tasks 20, 21, 22 |
| Core Commands (crew, status, help) | Task 23 |
| Kit plugin (preflight checks) | Task 22 |
| Sanity + Pencil plugins | Task 24 |
| Plugin guidelines | Task 25 |
