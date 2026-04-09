# Subplan 01: Foundation

> **For agentic workers:** Use superpowers:subagent-driven-development

**Goal:** Set up the Pilot monorepo, core UI component library, CLI entry point, and plugin system — the foundation everything else builds on.

**Architecture:** pnpm monorepo with a `cli` package (React Ink + Commander.js) and `plugins/` packages (@medalsocial/kit, sanity, pencil). The plugin system loads manifests, registers MCP servers and slash commands. The AI layer uses Vercel AI SDK with Claude for streaming chat, tool calling, and crew auto-routing. Training generates AGENTS.md / CLAUDE.md consumed by Claude Code, Codex, and any MCP-aware tool.

**Tech Stack:** TypeScript (strict), pnpm workspaces, React Ink, Commander.js, Vercel AI SDK, @ai-sdk/anthropic, Zod, Vitest, ink-testing-library, Biome

---

## Phase 1: Monorepo + Core Foundation

### Task 1: Initialize monorepo

**Files:**
- Create: `pilot/package.json`
- Create: `pilot/pnpm-workspace.yaml`
- Create: `pilot/tsconfig.json`
- Create: `pilot/biome.json`
- Create: `pilot/vitest.config.ts`
- Create: `pilot/.gitignore`
- Create: `pilot/packages/cli/package.json`
- Create: `pilot/packages/cli/tsconfig.json`

- [ ] **Step 1: Create GitHub repo and clone**

```bash
gh repo create Medal-Social/pilot --private --clone
cd pilot
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "pilot",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @medalsocial/pilot dev",
    "build": "pnpm -r build",
    "test": "vitest",
    "lint": "biome check .",
    "lint:fix": "biome check --fix ."
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
  - "packages/plugins/*"
```

- [ ] **Step 4: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

- [ ] **Step 5: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  }
}
```

- [ ] **Step 6: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
```

- [ ] **Step 7: Create packages/cli/package.json**

```json
{
  "name": "@medalsocial/pilot",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "pilot": "./dist/bin/pilot.js"
  },
  "scripts": {
    "dev": "tsx watch src/bin/pilot.ts",
    "build": "tsc",
    "test": "vitest"
  },
  "dependencies": {
    "commander": "^13.0.0",
    "ink": "^5.1.0",
    "ink-text-input": "^6.0.0",
    "react": "^18.3.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "ink-testing-library": "^4.0.0",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 8: Create packages/cli/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 9: Create .gitignore**

```
node_modules/
dist/
.DS_Store
*.tsbuildinfo
.env
.pilot/
.superpowers/
```

- [ ] **Step 10: Install dependencies and verify**

```bash
pnpm install
pnpm build
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: initialize pilot monorepo with cli package"
```

---

### Task 2: Color system and shared types

**Files:**
- Create: `packages/cli/src/colors.ts`
- Create: `packages/cli/src/types.ts`
- Test: `packages/cli/src/colors.test.ts`

- [ ] **Step 1: Write the test**

```ts
// packages/cli/src/colors.test.ts
import { describe, expect, it } from "vitest";
import { colors } from "./colors.js";

describe("colors", () => {
  it("exports all brand colors", () => {
    expect(colors.bg).toBe("#09090B");
    expect(colors.primary).toBe("#9A6AC2");
    expect(colors.success).toBe("#2DD4BF");
    expect(colors.warning).toBe("#FBBF24");
    expect(colors.error).toBe("#EF4444");
    expect(colors.text).toBe("#F4F4F5");
    expect(colors.muted).toBe("#71717A");
    expect(colors.border).toBe("#2E2E33");
    expect(colors.card).toBe("#18181B");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/cli/src/colors.test.ts`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement colors.ts**

```ts
// packages/cli/src/colors.ts
export const colors = {
  bg: "#09090B",
  card: "#18181B",
  border: "#2E2E33",
  primary: "#9A6AC2",
  success: "#2DD4BF",
  warning: "#FBBF24",
  error: "#EF4444",
  text: "#F4F4F5",
  muted: "#71717A",
} as const;
```

- [ ] **Step 4: Create types.ts**

```ts
// packages/cli/src/types.ts
export type StepStatus = "done" | "active" | "waiting" | "error";

export interface StepItem {
  label: string;
  detail?: string;
  status: StepStatus;
}

export interface CrewMember {
  role: string;
  description: string;
  skills: string[];
  color: string;
}

export interface PluginManifest {
  name: string;
  namespace: string;
  description: string;
  provides: {
    commands?: string[];
    mcpServers?: string[];
  };
  permissions?: {
    network?: string[];
  };
  roleBindings?: Record<string, string>;
}

export type TabId = string;

export interface Tab {
  id: TabId;
  label: string;
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test packages/cli/src/colors.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/colors.ts packages/cli/src/colors.test.ts packages/cli/src/types.ts
git commit -m "feat: add color system and shared types"
```

---

### Task 3: Core UI components — Step, ProgressBar, StatusBar

**Files:**
- Create: `packages/cli/src/components/Step.tsx`
- Create: `packages/cli/src/components/ProgressBar.tsx`
- Create: `packages/cli/src/components/StatusBar.tsx`
- Test: `packages/cli/src/components/Step.test.tsx`

- [ ] **Step 1: Write Step component test**

```tsx
// packages/cli/src/components/Step.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { Step } from "./Step.js";

describe("Step", () => {
  it("renders done state with checkmark", () => {
    const { lastFrame } = render(<Step label="Task complete" status="done" />);
    expect(lastFrame()).toContain("✓");
    expect(lastFrame()).toContain("Task complete");
  });

  it("renders active state with spinner character", () => {
    const { lastFrame } = render(<Step label="Working..." status="active" />);
    expect(lastFrame()).toContain("Working...");
  });

  it("renders waiting state with circle", () => {
    const { lastFrame } = render(<Step label="Pending" status="waiting" />);
    expect(lastFrame()).toContain("○");
    expect(lastFrame()).toContain("Pending");
  });

  it("renders error state with cross", () => {
    const { lastFrame } = render(<Step label="Failed" status="error" />);
    expect(lastFrame()).toContain("✗");
    expect(lastFrame()).toContain("Failed");
  });

  it("renders detail text when provided", () => {
    const { lastFrame } = render(
      <Step label="Task" status="done" detail="extra info" />
    );
    expect(lastFrame()).toContain("extra info");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/cli/src/components/Step.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Step.tsx**

```tsx
// packages/cli/src/components/Step.tsx
import React from "react";
import { Box, Text } from "ink";
import { colors } from "../colors.js";
import type { StepStatus } from "../types.js";

const icons: Record<StepStatus, { char: string; color: string }> = {
  done: { char: "✓", color: colors.success },
  active: { char: "⠸", color: colors.warning },
  waiting: { char: "○", color: colors.muted },
  error: { char: "✗", color: colors.error },
};

interface StepProps {
  label: string;
  status: StepStatus;
  detail?: string;
}

export function Step({ label, status, detail }: StepProps) {
  const icon = icons[status];
  return (
    <Box gap={1}>
      <Text color={icon.color}>{icon.char}</Text>
      <Text color={status === "waiting" ? colors.muted : colors.text}>
        {label}
      </Text>
      {detail && <Text color={colors.muted}>{detail}</Text>}
    </Box>
  );
}
```

- [ ] **Step 4: Implement ProgressBar.tsx**

```tsx
// packages/cli/src/components/ProgressBar.tsx
import React from "react";
import { Box, Text } from "ink";
import { colors } from "../colors.js";

interface ProgressBarProps {
  progress: number; // 0-1
  width?: number;
  label?: string;
}

export function ProgressBar({ progress, width = 40, label }: ProgressBarProps) {
  const filled = Math.round(progress * width);
  const empty = width - filled;
  return (
    <Box flexDirection="column" gap={0}>
      <Text>
        <Text color={colors.primary}>{"█".repeat(filled)}</Text>
        <Text color={colors.border}>{"░".repeat(empty)}</Text>
      </Text>
      {label && <Text color={colors.muted}>{label}</Text>}
    </Box>
  );
}
```

- [ ] **Step 5: Implement StatusBar.tsx**

```tsx
// packages/cli/src/components/StatusBar.tsx
import React from "react";
import { Box, Text } from "ink";
import { colors } from "../colors.js";

interface StatusBarProps {
  items: Array<{ label: string; color?: string }>;
}

export function StatusBar({ items }: StatusBarProps) {
  return (
    <Box borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} borderColor={colors.border}>
      <Box gap={2} paddingX={1}>
        {items.map((item, i) => (
          <Text key={i} color={item.color ?? colors.muted}>
            {item.label}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 6: Run tests**

Run: `pnpm test packages/cli/src/components/Step.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/components/
git commit -m "feat: add Step, ProgressBar, StatusBar components"
```

---

### Task 4: SplitPanel and TabBar components

**Files:**
- Create: `packages/cli/src/components/SplitPanel.tsx`
- Create: `packages/cli/src/components/TabBar.tsx`
- Test: `packages/cli/src/components/SplitPanel.test.tsx`

- [ ] **Step 1: Write SplitPanel test**

```tsx
// packages/cli/src/components/SplitPanel.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { SplitPanel } from "./SplitPanel.js";
import { Text } from "ink";

describe("SplitPanel", () => {
  it("renders sidebar and detail side by side", () => {
    const { lastFrame } = render(
      <SplitPanel
        sidebar={<Text>Sidebar</Text>}
        detail={<Text>Detail</Text>}
      />
    );
    expect(lastFrame()).toContain("Sidebar");
    expect(lastFrame()).toContain("Detail");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/cli/src/components/SplitPanel.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement SplitPanel.tsx**

```tsx
// packages/cli/src/components/SplitPanel.tsx
import React from "react";
import { Box } from "ink";
import { colors } from "../colors.js";

interface SplitPanelProps {
  sidebar: React.ReactNode;
  detail: React.ReactNode;
  sidebarWidth?: number;
}

export function SplitPanel({
  sidebar,
  detail,
  sidebarWidth = 30,
}: SplitPanelProps) {
  return (
    <Box flexGrow={1}>
      <Box
        flexDirection="column"
        width={sidebarWidth}
        borderStyle="single"
        borderLeft={false}
        borderTop={false}
        borderBottom={false}
        borderColor={colors.border}
      >
        {sidebar}
      </Box>
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {detail}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Implement TabBar.tsx**

```tsx
// packages/cli/src/components/TabBar.tsx
import React from "react";
import { Box, Text } from "ink";
import { colors } from "../colors.js";
import type { Tab, TabId } from "../types.js";

interface TabBarProps {
  tabs: Tab[];
  activeTab: TabId;
  onSelect?: (id: TabId) => void;
}

export function TabBar({ tabs, activeTab }: TabBarProps) {
  return (
    <Box
      gap={2}
      paddingX={1}
      borderStyle="single"
      borderTop={false}
      borderLeft={false}
      borderRight={false}
      borderColor={colors.border}
    >
      {tabs.map((tab) => (
        <Text
          key={tab.id}
          color={tab.id === activeTab ? colors.primary : colors.muted}
          bold={tab.id === activeTab}
        >
          {tab.label}
        </Text>
      ))}
    </Box>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test packages/cli/src/components/SplitPanel.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/components/SplitPanel.tsx packages/cli/src/components/TabBar.tsx packages/cli/src/components/SplitPanel.test.tsx
git commit -m "feat: add SplitPanel and TabBar components"
```

---

### Task 5: ThinkingRow, Modal, Header components

**Files:**
- Create: `packages/cli/src/components/ThinkingRow.tsx`
- Create: `packages/cli/src/components/Modal.tsx`
- Create: `packages/cli/src/components/Header.tsx`
- Create: `packages/cli/src/components/index.ts`

- [ ] **Step 1: Implement ThinkingRow.tsx**

```tsx
// packages/cli/src/components/ThinkingRow.tsx
import React from "react";
import { Box, Text } from "ink";
import { colors } from "../colors.js";

interface ThinkingRowProps {
  tool: string;
}

export function ThinkingRow({ tool }: ThinkingRowProps) {
  return (
    <Box gap={1}>
      <Text color={colors.primary}>◆</Text>
      <Text color={colors.muted}>{tool}</Text>
    </Box>
  );
}
```

- [ ] **Step 2: Implement Modal.tsx**

```tsx
// packages/cli/src/components/Modal.tsx
import React from "react";
import { Box, Text } from "ink";
import { colors } from "../colors.js";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ title, children, footer }: ModalProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.border}
      paddingX={2}
      paddingY={1}
    >
      <Box justifyContent="space-between">
        <Text bold color={colors.text}>{title}</Text>
        <Text color={colors.muted}>esc</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {children}
      </Box>
      {footer && (
        <Box marginTop={1} justifyContent="flex-end">
          {footer}
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 3: Implement Header.tsx**

```tsx
// packages/cli/src/components/Header.tsx
import React from "react";
import { Box, Text } from "ink";
import { colors } from "../colors.js";

const LOGO_SMALL = "✈ pilot | medal social";

interface HeaderProps {
  size?: "small" | "medium" | "large";
  subtitle?: string;
}

export function Header({ size = "medium", subtitle }: HeaderProps) {
  return (
    <Box flexDirection="column" alignItems="center" gap={0}>
      <Text color={colors.primary} bold>
        {size === "small" ? "✈ pilot" : LOGO_SMALL}
      </Text>
      {subtitle && <Text color={colors.muted}>{subtitle}</Text>}
    </Box>
  );
}
```

- [ ] **Step 4: Create barrel export**

```ts
// packages/cli/src/components/index.ts
export { Step } from "./Step.js";
export { ProgressBar } from "./ProgressBar.js";
export { StatusBar } from "./StatusBar.js";
export { SplitPanel } from "./SplitPanel.js";
export { TabBar } from "./TabBar.js";
export { ThinkingRow } from "./ThinkingRow.js";
export { Modal } from "./Modal.js";
export { Header } from "./Header.js";
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/components/
git commit -m "feat: add ThinkingRow, Modal, Header components and barrel export"
```

---

### Task 6: CLI entry point with Commander.js

**Files:**
- Create: `packages/cli/src/bin/pilot.ts`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/repl.tsx`

- [ ] **Step 1: Create the CLI entry point**

```ts
// packages/cli/src/bin/pilot.ts
#!/usr/bin/env node
import { program } from "commander";
import { version } from "../../package.json" with { type: "json" };

program
  .name("pilot")
  .description("Your AI crew, ready to fly.")
  .version(version, "-v, --version");

program
  .command("up [template]")
  .description("One-click setup — install templates, skills, crew bindings")
  .action(async (template?: string) => {
    const { runUp } = await import("../commands/up.js");
    await runUp(template);
  });

program
  .command("crew")
  .description("Manage your AI crew")
  .action(async () => {
    const { runCrew } = await import("../commands/crew.js");
    await runCrew();
  });

program
  .command("training")
  .description("Knowledge base — teach your crew about your brand")
  .action(async () => {
    const { runTraining } = await import("../commands/training.js");
    await runTraining();
  });

program
  .command("plugins")
  .description("Browse and manage plugins")
  .action(async () => {
    const { runPlugins } = await import("../commands/plugins.js");
    await runPlugins();
  });

program
  .command("update")
  .description("Check for and apply updates")
  .action(async () => {
    const { runUpdate } = await import("../commands/update.js");
    await runUpdate();
  });

program
  .command("status")
  .description("Machine and system health")
  .action(async () => {
    const { runStatus } = await import("../commands/status.js");
    await runStatus();
  });

program
  .command("help")
  .description("Help reference")
  .action(async () => {
    const { runHelp } = await import("../commands/help.js");
    await runHelp();
  });

// Default: no command = launch REPL
program.action(async () => {
  const { runRepl } = await import("../commands/repl.js");
  await runRepl();
});

program.parse();
```

- [ ] **Step 2: Create stub command files**

```ts
// packages/cli/src/commands/repl.ts
import React from "react";
import { render } from "ink";
import { Repl } from "../screens/Repl.js";

export async function runRepl() {
  render(React.createElement(Repl));
}
```

Create matching stubs for `up.ts`, `crew.ts`, `training.ts`, `plugins.ts`, `update.ts`, `status.ts`, `help.ts` — each exporting an async function that renders its screen.

- [ ] **Step 3: Create Repl screen placeholder**

```tsx
// packages/cli/src/screens/Repl.tsx
import React from "react";
import { Box, Text } from "ink";
import { Header } from "../components/Header.js";
import { colors } from "../colors.js";

export function Repl() {
  return (
    <Box flexDirection="column" gap={1}>
      <Header subtitle="Your AI crew, ready to fly." />
      <Text color={colors.muted}>Type a message or /help for commands</Text>
    </Box>
  );
}
```

- [ ] **Step 4: Verify CLI starts**

```bash
cd packages/cli && npx tsx src/bin/pilot.ts --version
npx tsx src/bin/pilot.ts --help
```

Expected: version number, then help text with all commands listed.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/
git commit -m "feat: add CLI entry point with Commander.js and command stubs"
```

---

## Phase 2: Plugin System

### Task 7: Plugin manifest schema

**Files:**
- Create: `packages/cli/src/plugins/manifest.ts`
- Test: `packages/cli/src/plugins/manifest.test.ts`

- [ ] **Step 1: Write manifest validation test**

```ts
// packages/cli/src/plugins/manifest.test.ts
import { describe, expect, it } from "vitest";
import { parseManifest, type PluginManifest } from "./manifest.js";

describe("parseManifest", () => {
  it("parses a valid manifest", () => {
    const raw = {
      name: "kit",
      namespace: "medalsocial",
      description: "Machine config & Nix management",
      provides: {
        commands: ["up", "update", "status"],
        mcpServers: [],
      },
      permissions: {
        network: [],
      },
      roleBindings: {},
    };
    const result = parseManifest(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("kit");
      expect(result.data.namespace).toBe("medalsocial");
    }
  });

  it("rejects manifest without name", () => {
    const raw = { description: "test" };
    const result = parseManifest(raw);
    expect(result.success).toBe(false);
  });

  it("computes full plugin ID", () => {
    const raw = {
      name: "sanity",
      namespace: "medalsocial",
      description: "CMS",
      provides: {},
    };
    const result = parseManifest(raw);
    if (result.success) {
      expect(`@${result.data.namespace}/${result.data.name}`).toBe(
        "@medalsocial/sanity"
      );
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/cli/src/plugins/manifest.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement manifest.ts**

```ts
// packages/cli/src/plugins/manifest.ts
import { z } from "zod";

export const manifestSchema = z.object({
  name: z.string().min(1),
  namespace: z.string().min(1),
  description: z.string(),
  provides: z
    .object({
      commands: z.array(z.string()).optional().default([]),
      mcpServers: z.array(z.string()).optional().default([]),
    })
    .optional()
    .default({}),
  permissions: z
    .object({
      network: z.array(z.string()).optional().default([]),
    })
    .optional()
    .default({}),
  roleBindings: z.record(z.string(), z.string()).optional().default({}),
});

export type PluginManifest = z.infer<typeof manifestSchema>;

export function parseManifest(raw: unknown) {
  return manifestSchema.safeParse(raw);
}

export function pluginId(manifest: PluginManifest): string {
  return `@${manifest.namespace}/${manifest.name}`;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test packages/cli/src/plugins/manifest.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/plugins/
git commit -m "feat: add plugin manifest schema with Zod validation"
```

---

### Task 8: Plugin loader

**Files:**
- Create: `packages/cli/src/plugins/loader.ts`
- Create: `packages/cli/src/plugins/types.ts`
- Test: `packages/cli/src/plugins/loader.test.ts`

- [ ] **Step 1: Write plugin types**

```ts
// packages/cli/src/plugins/types.ts
import type { PluginManifest } from "./manifest.js";

export interface LoadedPlugin {
  manifest: PluginManifest;
  id: string;
  enabled: boolean;
  path: string;
}

export interface PluginRegistry {
  plugins: LoadedPlugin[];
  getPlugin(id: string): LoadedPlugin | undefined;
  enabledPlugins(): LoadedPlugin[];
  enable(id: string): void;
  disable(id: string): void;
  remove(id: string): void;
}
```

- [ ] **Step 2: Write loader test**

```ts
// packages/cli/src/plugins/loader.test.ts
import { describe, expect, it } from "vitest";
import { createRegistry } from "./loader.js";

describe("createRegistry", () => {
  it("creates empty registry", () => {
    const reg = createRegistry([]);
    expect(reg.plugins).toHaveLength(0);
  });

  it("loads plugins and finds by id", () => {
    const reg = createRegistry([
      {
        manifest: {
          name: "kit",
          namespace: "medalsocial",
          description: "Machine config",
          provides: { commands: ["up"], mcpServers: [] },
          permissions: { network: [] },
          roleBindings: {},
        },
        id: "@medalsocial/kit",
        enabled: true,
        path: "/plugins/kit",
      },
    ]);
    expect(reg.plugins).toHaveLength(1);
    expect(reg.getPlugin("@medalsocial/kit")).toBeDefined();
    expect(reg.getPlugin("@medalsocial/nope")).toBeUndefined();
  });

  it("enables and disables plugins", () => {
    const reg = createRegistry([
      {
        manifest: {
          name: "sanity",
          namespace: "medalsocial",
          description: "CMS",
          provides: { commands: [], mcpServers: [] },
          permissions: { network: [] },
          roleBindings: {},
        },
        id: "@medalsocial/sanity",
        enabled: true,
        path: "/plugins/sanity",
      },
    ]);
    expect(reg.enabledPlugins()).toHaveLength(1);
    reg.disable("@medalsocial/sanity");
    expect(reg.enabledPlugins()).toHaveLength(0);
    reg.enable("@medalsocial/sanity");
    expect(reg.enabledPlugins()).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test packages/cli/src/plugins/loader.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement loader.ts**

```ts
// packages/cli/src/plugins/loader.ts
import type { LoadedPlugin, PluginRegistry } from "./types.js";

export function createRegistry(initial: LoadedPlugin[]): PluginRegistry {
  const plugins = [...initial];

  return {
    plugins,

    getPlugin(id: string) {
      return plugins.find((p) => p.id === id);
    },

    enabledPlugins() {
      return plugins.filter((p) => p.enabled);
    },

    enable(id: string) {
      const plugin = plugins.find((p) => p.id === id);
      if (plugin) plugin.enabled = true;
    },

    disable(id: string) {
      const plugin = plugins.find((p) => p.id === id);
      if (plugin) plugin.enabled = false;
    },

    remove(id: string) {
      const idx = plugins.findIndex((p) => p.id === id);
      if (idx !== -1) plugins.splice(idx, 1);
    },
  };
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test packages/cli/src/plugins/loader.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/plugins/
git commit -m "feat: add plugin loader and registry"
```

---

### Task 9: Kit plugin scaffold

**Files:**
- Create: `packages/plugins/kit/package.json`
- Create: `packages/plugins/kit/plugin.toml`
- Create: `packages/plugins/kit/src/index.ts`
- Create: `packages/plugins/kit/src/detect.ts`
- Create: `packages/plugins/kit/src/detect.test.ts`

- [ ] **Step 1: Create kit plugin package.json**

```json
{
  "name": "@medalsocial/kit",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create plugin.toml manifest**

```toml
name = "kit"
namespace = "medalsocial"
description = "Machine configuration & Nix management"

[provides]
commands = ["up", "update", "status"]
mcpServers = []

[permissions]
network = []

[roleBindings]
```

- [ ] **Step 3: Write machine detection test**

```ts
// packages/plugins/kit/src/detect.test.ts
import { describe, expect, it } from "vitest";
import { detectMachine } from "./detect.js";

describe("detectMachine", () => {
  it("detects ali-mini from hostname containing mini", () => {
    expect(detectMachine("Alis-Mac-mini")).toBe("ali-mini");
  });

  it("detects ali-studio from hostname containing studio", () => {
    expect(detectMachine("ali-studio")).toBe("ali-studio");
  });

  it("detects ali-pro from hostname containing pro", () => {
    expect(detectMachine("Alis-MacBook-Pro")).toBe("ali-pro");
  });

  it("detects ada-air from hostname containing ada or air", () => {
    expect(detectMachine("Adas-MacBook-Air")).toBe("ada-air");
  });

  it("returns null for unknown hostname", () => {
    expect(detectMachine("random-machine")).toBeNull();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test packages/plugins/kit/src/detect.test.ts`
Expected: FAIL

- [ ] **Step 5: Implement detect.ts**

```ts
// packages/plugins/kit/src/detect.ts
const MACHINE_PATTERNS: Array<{ pattern: string; machine: string }> = [
  { pattern: "mini", machine: "ali-mini" },
  { pattern: "studio", machine: "ali-studio" },
  { pattern: "ada", machine: "ada-air" },
  { pattern: "air", machine: "ada-air" },
  { pattern: "pro", machine: "ali-pro" },
  { pattern: "oslo", machine: "oslo-server" },
];

export function detectMachine(hostname: string): string | null {
  const lower = hostname.toLowerCase();
  for (const { pattern, machine } of MACHINE_PATTERNS) {
    if (lower.includes(pattern)) return machine;
  }
  return null;
}
```

- [ ] **Step 6: Create plugin entry**

```ts
// packages/plugins/kit/src/index.ts
export { detectMachine } from "./detect.js";
```

- [ ] **Step 7: Run tests**

Run: `pnpm test packages/plugins/kit/src/detect.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add packages/plugins/kit/
git commit -m "feat: add @medalsocial/kit plugin with machine detection"
```

---

## Self-Review

| Spec Section | Task |
|---|---|
| Tech Stack | Task 1 |
| Monorepo structure | Task 1 |
| Design Principles (colors, benefit language, aviation metaphor) | Task 2 |
| Core UI Components | Tasks 3, 4, 5 |
| CLI Entry Point | Task 6 |
| Plugin manifest schema | Task 7 |
| Plugin loader + registry | Task 8 |
| Kit plugin scaffold | Task 9 |
