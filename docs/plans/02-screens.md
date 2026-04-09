# Subplan 02: Screens

> **For agentic workers:** Use superpowers:subagent-driven-development

**Goal:** Build all user-facing screens — Welcome (first run), Home (returning user), REPL routing, Plugins browser, Training knowledge base, and Update flow.

**Architecture:** pnpm monorepo with a `cli` package (React Ink + Commander.js) and `plugins/` packages (@medalsocial/kit, sanity, pencil). The plugin system loads manifests, registers MCP servers and slash commands. The AI layer uses Vercel AI SDK with Claude for streaming chat, tool calling, and crew auto-routing. Training generates AGENTS.md / CLAUDE.md consumed by Claude Code, Codex, and any MCP-aware tool.

**Tech Stack:** TypeScript (strict), pnpm workspaces, React Ink, Commander.js, Vercel AI SDK, @ai-sdk/anthropic, Zod, Vitest, ink-testing-library, Biome

**Depends on:** [01-foundation.md](01-foundation.md) (Tasks 1-9 must be complete)

---

## Phase 3: Screens

### Task 10: Welcome screen (first run)

**Files:**
- Create: `packages/cli/src/screens/Welcome.tsx`
- Create: `packages/cli/src/crew/members.ts`
- Test: `packages/cli/src/screens/Welcome.test.tsx`

- [ ] **Step 1: Create default crew members**

```ts
// packages/cli/src/crew/members.ts
import type { CrewMember } from "../types.js";

export const defaultCrew: CrewMember[] = [
  {
    role: "Brand Lead",
    description: "Learns your voice, trains all other leads",
    skills: ["brand-voice", "tone-analysis"],
    color: "#9A6AC2",
  },
  {
    role: "Marketing Lead",
    description: "Social posts, campaigns, content calendar",
    skills: ["content-writer", "social-scheduler"],
    color: "#2DD4BF",
  },
  {
    role: "Tech Lead",
    description: "Suite builds, deploys, code review",
    skills: ["nextmedal", "deploy"],
    color: "#3B82F6",
  },
  {
    role: "CS Lead",
    description: "Tickets, escalation, customer retention",
    skills: ["support-agent"],
    color: "#F59E0B",
  },
  {
    role: "Sales Lead",
    description: "Outreach, pipeline, lead scoring",
    skills: ["outreach"],
    color: "#EF4444",
  },
];
```

- [ ] **Step 2: Write Welcome test**

```tsx
// packages/cli/src/screens/Welcome.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { Welcome } from "./Welcome.js";

describe("Welcome", () => {
  it("shows welcome message", () => {
    const { lastFrame } = render(<Welcome onContinue={() => {}} />);
    expect(lastFrame()).toContain("Welcome aboard, Captain");
  });

  it("lists all crew members", () => {
    const { lastFrame } = render(<Welcome onContinue={() => {}} />);
    expect(lastFrame()).toContain("Brand Lead");
    expect(lastFrame()).toContain("Marketing Lead");
    expect(lastFrame()).toContain("Tech Lead");
    expect(lastFrame()).toContain("CS Lead");
    expect(lastFrame()).toContain("Sales Lead");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test packages/cli/src/screens/Welcome.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement Welcome.tsx**

```tsx
// packages/cli/src/screens/Welcome.tsx
import React from "react";
import { Box, Text, useInput } from "ink";
import { Header } from "../components/Header.js";
import { colors } from "../colors.js";
import { defaultCrew } from "../crew/members.js";

interface WelcomeProps {
  onContinue: () => void;
}

export function Welcome({ onContinue }: WelcomeProps) {
  useInput((_input, key) => {
    if (key.return) onContinue();
  });

  return (
    <Box flexDirection="column" alignItems="center" gap={1} padding={2}>
      <Header size="large" />
      <Text bold color={colors.text}>
        Welcome aboard, Captain.
      </Text>
      <Text color={colors.muted}>
        You have a full AI crew ready to work. Here's who's on board:
      </Text>
      <Box flexDirection="column" gap={0} marginTop={1}>
        {defaultCrew.map((member) => (
          <Box key={member.role} gap={1}>
            <Text color={member.color}>●</Text>
            <Text bold color={colors.text}>
              {member.role}
            </Text>
            <Text color={colors.muted}>— {member.description}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={colors.muted}>
          Press <Text bold color={colors.text}>Enter</Text> to start flying
        </Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test packages/cli/src/screens/Welcome.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/screens/Welcome.tsx packages/cli/src/screens/Welcome.test.tsx packages/cli/src/crew/members.ts
git commit -m "feat: add Welcome screen with crew introduction"
```

---

### Task 11: Home screen (returning user instruments dashboard)

**Files:**
- Create: `packages/cli/src/screens/Home.tsx`
- Create: `packages/cli/src/state.ts`
- Test: `packages/cli/src/screens/Home.test.tsx`

- [ ] **Step 1: Create app state**

```ts
// packages/cli/src/state.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const PILOT_DIR = join(homedir(), ".pilot");
const STATE_FILE = join(PILOT_DIR, "state.json");

interface PilotState {
  onboarded: boolean;
  lastRun?: string;
}

export function loadState(): PilotState {
  if (!existsSync(STATE_FILE)) {
    return { onboarded: false };
  }
  return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
}

export function saveState(state: PilotState): void {
  mkdirSync(PILOT_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function markOnboarded(): void {
  const state = loadState();
  state.onboarded = true;
  state.lastRun = new Date().toISOString();
  saveState(state);
}
```

- [ ] **Step 2: Write Home test**

```tsx
// packages/cli/src/screens/Home.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { Home } from "./Home.js";

describe("Home", () => {
  it("shows pilot logo", () => {
    const { lastFrame } = render(<Home />);
    expect(lastFrame()).toContain("pilot");
  });

  it("shows input prompt", () => {
    const { lastFrame } = render(<Home />);
    expect(lastFrame()).toContain("What would you like to work on?");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test packages/cli/src/screens/Home.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement Home.tsx**

```tsx
// packages/cli/src/screens/Home.tsx
import React from "react";
import { Box, Text } from "ink";
import { Header } from "../components/Header.js";
import { StatusBar } from "../components/StatusBar.js";
import { colors } from "../colors.js";

export function Home() {
  return (
    <Box flexDirection="column" height="100%">
      <Box flexDirection="column" flexGrow={1} alignItems="center" justifyContent="center" gap={1}>
        <Header size="medium" />
        <Box
          borderStyle="single"
          borderColor={colors.border}
          paddingX={2}
          paddingY={0}
          width={50}
        >
          <Text color={colors.muted}>What would you like to work on?</Text>
        </Box>
      </Box>
      <Box flexDirection="column">
        <Text color={colors.muted}>
          <Text color={colors.warning}>● Tip</Text> Type /help to see all
          available commands
        </Text>
        <StatusBar
          items={[
            { label: "● ready", color: colors.success },
            { label: "pilot · content" },
          ]}
        />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test packages/cli/src/screens/Home.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/screens/Home.tsx packages/cli/src/screens/Home.test.tsx packages/cli/src/state.ts
git commit -m "feat: add Home screen with instruments dashboard and app state"
```

---

### Task 12: REPL with routing (Welcome → Home → Chat)

**Files:**
- Modify: `packages/cli/src/screens/Repl.tsx`
- Test: `packages/cli/src/screens/Repl.test.tsx`

- [ ] **Step 1: Write Repl routing test**

```tsx
// packages/cli/src/screens/Repl.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { Repl } from "./Repl.js";

// Mock state to control onboarding
vi.mock("../state.js", () => ({
  loadState: vi.fn(() => ({ onboarded: false })),
  markOnboarded: vi.fn(),
}));

describe("Repl", () => {
  it("shows Welcome screen on first run", () => {
    const { lastFrame } = render(<Repl />);
    expect(lastFrame()).toContain("Welcome aboard");
  });
});
```

- [ ] **Step 2: Implement Repl.tsx with routing**

```tsx
// packages/cli/src/screens/Repl.tsx
import React, { useState } from "react";
import { Box } from "ink";
import { Welcome } from "./Welcome.js";
import { Home } from "./Home.js";
import { loadState, markOnboarded } from "../state.js";

type Screen = "welcome" | "home" | "chat";

export function Repl() {
  const state = loadState();
  const [screen, setScreen] = useState<Screen>(
    state.onboarded ? "home" : "welcome"
  );

  if (screen === "welcome") {
    return (
      <Welcome
        onContinue={() => {
          markOnboarded();
          setScreen("home");
        }}
      />
    );
  }

  return <Home />;
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm test packages/cli/src/screens/Repl.test.tsx`
Expected: PASS

- [ ] **Step 4: Verify full flow works**

```bash
cd packages/cli && npx tsx src/bin/pilot.ts
```

Expected: Welcome screen appears on first run. Press Enter → Home screen.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/screens/Repl.tsx packages/cli/src/screens/Repl.test.tsx
git commit -m "feat: add REPL with Welcome → Home routing"
```

---

### Task 13: Plugins screen (split panel browse + manage)

**Files:**
- Create: `packages/cli/src/screens/Plugins.tsx`
- Create: `packages/cli/src/commands/plugins.ts`
- Test: `packages/cli/src/screens/Plugins.test.tsx`

- [ ] **Step 1: Write Plugins screen test**

```tsx
// packages/cli/src/screens/Plugins.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { Plugins } from "./Plugins.js";

describe("Plugins", () => {
  it("shows plugin header", () => {
    const { lastFrame } = render(<Plugins />);
    expect(lastFrame()).toContain("Plugins");
  });

  it("shows tabs", () => {
    const { lastFrame } = render(<Plugins />);
    expect(lastFrame()).toContain("All");
    expect(lastFrame()).toContain("Installed");
    expect(lastFrame()).toContain("Available");
  });

  it("lists @medalsocial plugins", () => {
    const { lastFrame } = render(<Plugins />);
    expect(lastFrame()).toContain("kit");
    expect(lastFrame()).toContain("sanity");
    expect(lastFrame()).toContain("pencil");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/cli/src/screens/Plugins.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Plugins.tsx**

```tsx
// packages/cli/src/screens/Plugins.tsx
import React, { useState } from "react";
import { Box, Text } from "ink";
import { SplitPanel } from "../components/SplitPanel.js";
import { TabBar } from "../components/TabBar.js";
import { StatusBar } from "../components/StatusBar.js";
import { colors } from "../colors.js";
import type { Tab } from "../types.js";

interface PluginItem {
  name: string;
  description: string;
  installed: boolean;
  provides: string[];
}

const PLUGINS: PluginItem[] = [
  {
    name: "kit",
    description: "Machine config & Nix management",
    installed: true,
    provides: ["pilot up", "pilot update", "pilot status"],
  },
  {
    name: "sanity",
    description: "CMS content management",
    installed: true,
    provides: ["/content", "/schema", "/publish"],
  },
  {
    name: "pencil",
    description: "Design tool integration",
    installed: false,
    provides: ["/design", "pencil MCP"],
  },
];

const TABS: Tab[] = [
  { id: "all", label: "All" },
  { id: "installed", label: "Installed" },
  { id: "available", label: "Available" },
];

export function Plugins() {
  const [activeTab, setActiveTab] = useState("all");
  const [selected, setSelected] = useState(0);

  const filtered = PLUGINS.filter((p) => {
    if (activeTab === "installed") return p.installed;
    if (activeTab === "available") return !p.installed;
    return true;
  });

  const current = filtered[selected];

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} paddingY={0} flexDirection="column">
        <Text bold color={colors.text}>Plugins</Text>
        <Text color={colors.muted}>
          Extend Pilot with official Medal Social integrations
        </Text>
      </Box>
      <TabBar tabs={TABS} activeTab={activeTab} />
      <SplitPanel
        sidebarWidth={28}
        sidebar={
          <Box flexDirection="column">
            <Text color={colors.primary} bold>
              {" "}@MEDALSOCIAL
            </Text>
            {filtered.map((p, i) => (
              <Box
                key={p.name}
                flexDirection="column"
                paddingX={1}
                paddingY={0}
              >
                <Text
                  bold
                  color={i === selected ? colors.text : colors.muted}
                >
                  {p.name}
                </Text>
                <Text color={colors.muted} dimColor>
                  {p.installed ? "● installed" : "○ available"}
                </Text>
              </Box>
            ))}
          </Box>
        }
        detail={
          current ? (
            <Box flexDirection="column" gap={1}>
              <Text bold color={colors.text}>
                {current.name}
              </Text>
              <Text color={colors.muted}>
                @medalsocial/{current.name} · {current.description}
              </Text>
              <Box flexDirection="column">
                <Text color={colors.primary} bold>
                  PROVIDES
                </Text>
                {current.provides.map((p) => (
                  <Text key={p} color={colors.success}>
                    ✓ {p}
                  </Text>
                ))}
              </Box>
              {current.installed && (
                <Box gap={2}>
                  <Text color={colors.warning}>[Disable]</Text>
                  <Text color={colors.error}>[Remove]</Text>
                </Box>
              )}
            </Box>
          ) : null
        }
      />
      <StatusBar
        items={[
          {
            label: `● ${PLUGINS.filter((p) => p.installed).length} installed`,
            color: colors.success,
          },
          {
            label: `${PLUGINS.filter((p) => !p.installed).length} available`,
          },
          { label: "pilot plugins" },
        ]}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Wire up command**

```ts
// packages/cli/src/commands/plugins.ts
import React from "react";
import { render } from "ink";
import { Plugins } from "../screens/Plugins.js";

export async function runPlugins() {
  render(React.createElement(Plugins));
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test packages/cli/src/screens/Plugins.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/screens/Plugins.tsx packages/cli/src/screens/Plugins.test.tsx packages/cli/src/commands/plugins.ts
git commit -m "feat: add Plugins screen with split panel browse and manage"
```

---

### Task 14: Training screen (split panel with sources)

**Files:**
- Create: `packages/cli/src/screens/Training.tsx`
- Create: `packages/cli/src/training/types.ts`
- Create: `packages/cli/src/commands/training.ts`
- Test: `packages/cli/src/screens/Training.test.tsx`

- [ ] **Step 1: Create training types**

```ts
// packages/cli/src/training/types.ts
export interface KnowledgeSource {
  id: string;
  type: "sanity" | "slack" | "manual";
  name: string;
  description: string;
  connected: boolean;
  lastSync?: string;
  documentCount?: number;
}

export interface TrainingRun {
  id: number;
  status: "running" | "complete" | "failed";
  steps: Array<{
    label: string;
    status: "done" | "active" | "waiting";
  }>;
  sourcesIncluded: string[];
  outputFiles: string[];
}
```

- [ ] **Step 2: Write Training screen test**

```tsx
// packages/cli/src/screens/Training.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { Training } from "./Training.js";

describe("Training", () => {
  it("shows Training header", () => {
    const { lastFrame } = render(<Training />);
    expect(lastFrame()).toContain("Training");
  });

  it("shows source tabs", () => {
    const { lastFrame } = render(<Training />);
    expect(lastFrame()).toContain("Sources");
    expect(lastFrame()).toContain("Articles");
    expect(lastFrame()).toContain("Runs");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test packages/cli/src/screens/Training.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement Training.tsx**

```tsx
// packages/cli/src/screens/Training.tsx
import React, { useState } from "react";
import { Box, Text } from "ink";
import { SplitPanel } from "../components/SplitPanel.js";
import { TabBar } from "../components/TabBar.js";
import { StatusBar } from "../components/StatusBar.js";
import { colors } from "../colors.js";
import type { Tab } from "../types.js";
import type { KnowledgeSource } from "../training/types.js";

const SOURCES: KnowledgeSource[] = [
  {
    id: "sanity",
    type: "sanity",
    name: "Sanity CMS",
    description: "Auto-syncing product catalog, blog posts, and pages",
    connected: true,
    lastSync: "12m ago",
    documentCount: 47,
  },
  {
    id: "slack",
    type: "slack",
    name: "Slack",
    description: "#support, #feedback",
    connected: true,
    documentCount: 2,
  },
  {
    id: "manual",
    type: "manual",
    name: "Manual articles",
    description: "8 articles uploaded",
    connected: true,
    documentCount: 8,
  },
];

const TABS: Tab[] = [
  { id: "sources", label: "Sources" },
  { id: "articles", label: "Articles" },
  { id: "runs", label: "Runs" },
];

export function Training() {
  const [activeTab, setActiveTab] = useState("sources");
  const [selected, setSelected] = useState(0);
  const current = SOURCES[selected];

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} flexDirection="column">
        <Text bold color={colors.text}>Training</Text>
        <Text color={colors.muted}>
          Teach your crew about your brand, products, and voice
        </Text>
      </Box>
      <TabBar tabs={TABS} activeTab={activeTab} />
      <SplitPanel
        sidebarWidth={28}
        sidebar={
          <Box flexDirection="column">
            <Text color={colors.primary} bold>
              {" "}CONNECTED SOURCES
            </Text>
            {SOURCES.map((s, i) => (
              <Box key={s.id} flexDirection="column" paddingX={1}>
                <Text bold color={i === selected ? colors.text : colors.muted}>
                  {s.name}
                </Text>
                <Text color={colors.success} dimColor>
                  ● connected
                </Text>
              </Box>
            ))}
            <Box marginTop={1} paddingX={1}>
              <Text color={colors.primary}>+ Connect new source</Text>
            </Box>
            <Box flexGrow={1} />
            <Box
              paddingX={1}
              paddingY={0}
              marginX={1}
              borderStyle="round"
              borderColor={colors.primary}
              justifyContent="center"
            >
              <Text bold color={colors.text}>
                Start Training Run
              </Text>
            </Box>
          </Box>
        }
        detail={
          current ? (
            <Box flexDirection="column" gap={1}>
              <Text bold color={colors.text}>
                {current.name}
              </Text>
              <Text color={colors.muted}>{current.description}</Text>
              <Box flexDirection="column" borderStyle="single" borderColor={colors.border} paddingX={1}>
                <Text color={colors.primary} bold>STATUS</Text>
                <Text color={colors.text}>
                  Documents: {current.documentCount}
                  {"  "}Last sync: {current.lastSync ?? "never"}
                </Text>
              </Box>
              <Text color={colors.primary} bold>ACTIONS</Text>
              <Box flexDirection="column" borderStyle="single" borderColor={colors.border} paddingX={1}>
                <Text bold color={colors.text}>Sync now</Text>
                <Text color={colors.muted}>Pull latest documents</Text>
              </Box>
              <Box flexDirection="column" borderStyle="single" borderColor={colors.border} paddingX={1}>
                <Text bold color={colors.text}>Configure filters</Text>
                <Text color={colors.muted}>Choose document types to include</Text>
              </Box>
              <Box flexDirection="column" borderStyle="single" borderColor={colors.border} paddingX={1}>
                <Text bold color={colors.error}>Disconnect source</Text>
                <Text color={colors.muted}>Remove from knowledge base</Text>
              </Box>
            </Box>
          ) : null
        }
      />
      <StatusBar
        items={[
          { label: "● 3 sources", color: colors.success },
          { label: "12 articles" },
          { label: "Last trained: 2h ago" },
          { label: "pilot training" },
        ]}
      />
    </Box>
  );
}
```

- [ ] **Step 5: Wire up command**

```ts
// packages/cli/src/commands/training.ts
import React from "react";
import { render } from "ink";
import { Training } from "../screens/Training.js";

export async function runTraining() {
  render(React.createElement(Training));
}
```

- [ ] **Step 6: Run tests**

Run: `pnpm test packages/cli/src/screens/Training.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/screens/Training.tsx packages/cli/src/screens/Training.test.tsx packages/cli/src/training/types.ts packages/cli/src/commands/training.ts
git commit -m "feat: add Training screen with split panel sources"
```

---

### Task 15: Update flow screens

**Files:**
- Create: `packages/cli/src/screens/Update.tsx`
- Create: `packages/cli/src/commands/update.ts`
- Test: `packages/cli/src/screens/Update.test.tsx`

- [ ] **Step 1: Write Update test**

```tsx
// packages/cli/src/screens/Update.test.tsx
import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { Update } from "./Update.js";

describe("Update", () => {
  it("shows checking state initially", () => {
    const { lastFrame } = render(<Update />);
    expect(lastFrame()).toContain("Checking for updates");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/cli/src/screens/Update.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement Update.tsx with 3 phases**

```tsx
// packages/cli/src/screens/Update.tsx
import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { Step } from "../components/Step.js";
import { ProgressBar } from "../components/ProgressBar.js";
import { colors } from "../colors.js";

type Phase = "checking" | "confirm" | "updating" | "complete";

const UPDATES = [
  "New crew skills available",
  "Plugin updates ready",
  "Performance improvements",
];

const STEPS = [
  "Crew skills refreshed",
  "Plugin updates applied",
  "Performance optimized",
  "Configuration finalized",
];

const WHATS_NEW = [
  "Your crew can now schedule Instagram Reels",
  "Brand voice is 40% more consistent",
  "Sanity plugin: live preview for document editing",
];

export function Update() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (phase === "checking") {
      const t = setTimeout(() => setPhase("confirm"), 1500);
      return () => clearTimeout(t);
    }
    if (phase === "updating") {
      const interval = setInterval(() => {
        setActiveStep((s) => {
          if (s >= STEPS.length - 1) {
            clearInterval(interval);
            setTimeout(() => setPhase("complete"), 500);
            return s;
          }
          return s + 1;
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [phase]);

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={colors.muted}>$ pilot update</Text>

      {phase === "checking" && (
        <Text color={colors.warning}>⠸ Checking for updates...</Text>
      )}

      {phase === "confirm" && (
        <>
          <Text bold color={colors.text}>Updates found:</Text>
          {UPDATES.map((u) => (
            <Text key={u} color={colors.success}>  ● {u}</Text>
          ))}
          <Box marginTop={1}>
            <Text color={colors.text}>Apply updates? [Y/n]</Text>
          </Box>
        </>
      )}

      {phase === "updating" && (
        <>
          <Text bold color={colors.text}>Upgrading your Pilot...</Text>
          {STEPS.map((step, i) => (
            <Step
              key={step}
              label={step}
              status={i < activeStep ? "done" : i === activeStep ? "active" : "waiting"}
            />
          ))}
          <ProgressBar
            progress={(activeStep + 1) / STEPS.length}
            label="Almost ready..."
          />
        </>
      )}

      {phase === "complete" && (
        <>
          {STEPS.map((step) => (
            <Step key={step} label={step} status="done" />
          ))}
          <Box marginTop={1}>
            <Text color={colors.success} bold>✈ Flight systems upgraded!</Text>
          </Box>
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor={colors.border}
            paddingX={1}
            marginTop={1}
          >
            <Text color={colors.primary} bold>WHAT'S NEW FOR YOU</Text>
            {WHATS_NEW.map((item) => (
              <Text key={item} color={colors.text}>· {item}</Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color={colors.muted}>
              Run pilot to start using new features
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Wire up command**

```ts
// packages/cli/src/commands/update.ts
import React from "react";
import { render } from "ink";
import { Update } from "../screens/Update.js";

export async function runUpdate() {
  render(React.createElement(Update));
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test packages/cli/src/screens/Update.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/screens/Update.tsx packages/cli/src/screens/Update.test.tsx packages/cli/src/commands/update.ts
git commit -m "feat: add Update flow with check, progress, and what's new"
```

---

## Self-Review

| Spec Section | Task |
|---|---|
| Flow 1 — Installation & Onboarding | Tasks 10, 11, 12 |
| Flow 4 — Training | Task 14 |
| Flow 5 — Plugins | Task 13 |
| Flow 6 — Update | Task 15 |
| Crew System (members definition) | Task 10 |
| App State (onboarding persistence) | Task 11 |
| REPL Routing (Welcome → Home → Chat) | Task 12 |
