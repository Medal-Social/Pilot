# Subplan 05: Skill Deployment

> **For agentic workers:** Use superpowers:subagent-driven-development

**Goal:** Build the skill deployment system — crew lead SKILL.md files, the deployer that writes skills + symlinks + CLAUDE.md routing, and wiring deployment into the onboarding and update flows.

**Architecture:** pnpm monorepo with a `cli` package (React Ink + Commander.js) and `plugins/` packages (@medalsocial/kit, sanity, pencil). The plugin system loads manifests, registers MCP servers and slash commands. The AI layer uses Vercel AI SDK with Claude for streaming chat, tool calling, and crew auto-routing. Training generates AGENTS.md / CLAUDE.md consumed by Claude Code, Codex, and any MCP-aware tool.

**Tech Stack:** TypeScript (strict), pnpm workspaces, React Ink, Commander.js, Vercel AI SDK, @ai-sdk/anthropic, Zod, Vitest, ink-testing-library, Biome

**Depends on:** [01-foundation.md](01-foundation.md), [02-screens.md](02-screens.md), [03-ai-crew.md](03-ai-crew.md), [04-pilot-up-kit.md](04-pilot-up-kit.md)

---

## Phase 7: Skill Deployment + Smart Updates

### Task 26: Skill directory structure and crew lead SKILL.md files

**Files:**
- Create: `packages/cli/src/deploy/structure.ts`
- Create: `packages/cli/src/deploy/skills/pilot/SKILL.md`
- Create: `packages/cli/src/deploy/skills/brand-lead/SKILL.md`
- Create: `packages/cli/src/deploy/skills/marketing-lead/SKILL.md`
- Create: `packages/cli/src/deploy/skills/tech-lead/SKILL.md`
- Create: `packages/cli/src/deploy/skills/cs-lead/SKILL.md`
- Create: `packages/cli/src/deploy/skills/sales-lead/SKILL.md`
- Test: `packages/cli/src/deploy/structure.test.ts`

- [ ] **Step 1: Create the pilot SKILL.md (main router)**

```markdown
<!-- packages/cli/src/deploy/skills/pilot/SKILL.md -->
---
name: pilot
description: Medal Social AI crew — routes requests to the right crew lead automatically
---

# Pilot — Medal Social AI Crew

You are Pilot, Medal Social's AI crew router. When invoked via /pilot, you:

1. Read the user's request
2. Identify which crew lead should handle it
3. Dispatch to that lead as a subagent with full context

## Crew Leads

- **Brand Lead** — brand voice, tone, style, guidelines, messaging
- **Marketing Lead** — social posts, campaigns, content calendar, email
- **Tech Lead** — builds, deploys, code review, project scaffolding, Pilot development
- **CS Lead** — tickets, support, escalation, customer retention
- **Sales Lead** — outreach, pipeline, lead scoring, deals

## Routing

Match the user's intent to the right lead. If ambiguous, ask. If it spans multiple leads, start with the most relevant one.

## Knowledge

Read `~/.pilot/knowledge/` for brand voice, product context, and guidelines. Every crew lead uses this context.

## Dispatching

Use the Agent tool to dispatch to crew leads:
- Brand: `~/.pilot/skills/brand-lead/SKILL.md`
- Marketing: `~/.pilot/skills/marketing-lead/SKILL.md`
- Tech: `~/.pilot/skills/tech-lead/SKILL.md`
- CS: `~/.pilot/skills/cs-lead/SKILL.md`
- Sales: `~/.pilot/skills/sales-lead/SKILL.md`
```

- [ ] **Step 2: Create crew lead SKILL.md files**

Each lead gets a SKILL.md with their role, responsibilities, and instructions. Example for Brand Lead:

```markdown
<!-- packages/cli/src/deploy/skills/brand-lead/SKILL.md -->
---
name: brand-lead
description: Brand voice, tone analysis, style guidelines — self-improving, trains other leads
---

# Brand Lead

You are the Brand Lead for Medal Social. You own brand voice and train all other crew leads on tone and messaging.

## Responsibilities
- Define and maintain brand voice
- Analyze tone in any content
- Rewrite content to match brand guidelines
- Train other leads on voice consistency

## Self-Improving
After every interaction, consider whether the brand voice guidelines should be updated. If you learn something new about the brand's voice, suggest updating `~/.pilot/knowledge/brand-voice.md`.

## Knowledge
Read `~/.pilot/knowledge/brand-voice.md` for current guidelines.
Read `~/.pilot/knowledge/products.md` for product context.
```

Create matching SKILL.md files for marketing-lead, cs-lead, and sales-lead following the same pattern.

- [ ] **Step 3: Create Tech Lead SKILL.md with development guides**

```markdown
<!-- packages/cli/src/deploy/skills/tech-lead/SKILL.md -->
---
name: tech-lead
description: Builds, deploys, code review, project scaffolding, Pilot development, AI best practices
---

# Tech Lead

You are the Tech Lead for Medal Social.

## Responsibilities
- Scaffold projects (nextmedal, custom)
- Code review and debugging
- Deploy to Medal hosting
- Develop and maintain Pilot itself

## Pilot Development Guide
When working on Pilot itself:
- Monorepo: pnpm workspaces, packages/cli + packages/plugins/*
- UI: React Ink components, follow existing patterns in packages/cli/src/components/
- Plugin API: plugin.toml manifest, see packages/plugins/kit/ for reference
- Testing: Vitest + ink-testing-library, TDD throughout
- Linting: Biome (pnpm lint)

## AI Best Practices
When creating skills or MCP servers:
- Skills: SKILL.md with frontmatter (name, description), clear instructions, knowledge references
- MCP servers: Use @ai-sdk/mcp createMCPClient, declare in plugin.toml
- CLAUDE.md routing: Append a ## Skill routing section, don't overwrite existing content
- Agent prompts: Be specific about role, responsibilities, and knowledge sources

## Knowledge
Read `~/.pilot/knowledge/` for project context.
```

- [ ] **Step 4: Write structure deployment test**

```ts
// packages/cli/src/deploy/structure.test.ts
import { describe, expect, it } from "vitest";
import { getSkillPaths, CREW_LEADS } from "./structure.js";

describe("getSkillPaths", () => {
  it("returns paths for all crew leads", () => {
    const paths = getSkillPaths("/home/user/.pilot");
    expect(paths).toHaveLength(CREW_LEADS.length + 1); // +1 for pilot router
    expect(paths[0].name).toBe("pilot");
    expect(paths[0].path).toBe("/home/user/.pilot/skills/pilot");
  });

  it("includes all 5 crew leads", () => {
    const paths = getSkillPaths("/home/user/.pilot");
    const names = paths.map((p) => p.name);
    expect(names).toContain("brand-lead");
    expect(names).toContain("marketing-lead");
    expect(names).toContain("tech-lead");
    expect(names).toContain("cs-lead");
    expect(names).toContain("sales-lead");
  });
});
```

- [ ] **Step 5: Implement structure.ts**

```ts
// packages/cli/src/deploy/structure.ts
import { join } from "node:path";

export const CREW_LEADS = [
  "brand-lead",
  "marketing-lead",
  "tech-lead",
  "cs-lead",
  "sales-lead",
] as const;

interface SkillPath {
  name: string;
  path: string;
}

export function getSkillPaths(pilotDir: string): SkillPath[] {
  return [
    { name: "pilot", path: join(pilotDir, "skills", "pilot") },
    ...CREW_LEADS.map((lead) => ({
      name: lead,
      path: join(pilotDir, "skills", lead),
    })),
  ];
}

export function getKnowledgePath(pilotDir: string): string {
  return join(pilotDir, "knowledge");
}

export function getManifestPath(pilotDir: string): string {
  return join(pilotDir, "manifest.json");
}
```

- [ ] **Step 6: Run tests**

Run: `pnpm test packages/cli/src/deploy/structure.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/deploy/
git commit -m "feat: add skill directory structure and crew lead SKILL.md files"
```

---

### Task 27: Skill deployer (writes skills + symlinks + CLAUDE.md routing)

**Files:**
- Create: `packages/cli/src/deploy/deployer.ts`
- Test: `packages/cli/src/deploy/deployer.test.ts`

- [ ] **Step 1: Write deployer test**

```ts
// packages/cli/src/deploy/deployer.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateRoutingSection, shouldUpdateFile } from "./deployer.js";

describe("generateRoutingSection", () => {
  it("generates CLAUDE.md routing section", () => {
    const section = generateRoutingSection();
    expect(section).toContain("## Pilot routing");
    expect(section).toContain("/pilot");
    expect(section).toContain("Medal Social");
  });

  it("includes all routing keywords", () => {
    const section = generateRoutingSection();
    expect(section).toContain("brand");
    expect(section).toContain("marketing");
    expect(section).toContain("deploy");
    expect(section).toContain("support");
  });
});

describe("shouldUpdateFile", () => {
  it("returns true when checksums match (pilot-managed)", () => {
    expect(shouldUpdateFile("abc123", "abc123")).toBe(true);
  });

  it("returns false when checksums differ (user-modified)", () => {
    expect(shouldUpdateFile("abc123", "xyz789")).toBe(false);
  });

  it("returns true when no previous checksum (new file)", () => {
    expect(shouldUpdateFile(undefined, "abc123")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test packages/cli/src/deploy/deployer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement deployer.ts**

```ts
// packages/cli/src/deploy/deployer.ts
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { getSkillPaths, getManifestPath } from "./structure.js";

interface ManifestEntry {
  checksum: string;
  version: string;
}

interface Manifest {
  managed: Record<string, ManifestEntry>;
}

export function generateRoutingSection(): string {
  return `
## Pilot routing

When the user's request involves Medal Social, brand, marketing, content, social media,
machine setup, dev tools, support, sales, or any Medal-related task, invoke the /pilot skill.
Pilot routes to the right crew lead automatically.

Key routing rules:
- Brand voice, tone, style, guidelines, messaging → invoke /pilot
- Social posts, campaigns, content, email, scheduling → invoke /pilot
- Build, deploy, scaffold, code review, Pilot development → invoke /pilot
- Support tickets, customer issues, escalation → invoke /pilot
- Sales outreach, pipeline, lead scoring → invoke /pilot
- Machine setup, dev tools, Nix configuration → invoke /pilot
- Anything about Medal Social → invoke /pilot
`.trim();
}

export function shouldUpdateFile(
  manifestChecksum: string | undefined,
  currentChecksum: string
): boolean {
  if (!manifestChecksum) return true;
  return manifestChecksum === currentChecksum;
}

export function checksum(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

export function deploySkills(pilotDir: string): void {
  const skills = getSkillPaths(pilotDir);
  for (const skill of skills) {
    mkdirSync(skill.path, { recursive: true });
  }
}

export function createSymlink(pilotDir: string): void {
  const claudeSkillsDir = join(homedir(), ".claude", "skills");
  const pilotSkillPath = join(pilotDir, "skills", "pilot");
  const symlinkPath = join(claudeSkillsDir, "pilot");

  mkdirSync(claudeSkillsDir, { recursive: true });

  if (existsSync(symlinkPath)) {
    unlinkSync(symlinkPath);
  }
  symlinkSync(pilotSkillPath, symlinkPath);
}

export function appendRoutingToClaudeMd(): void {
  const claudeMdPath = join(homedir(), ".claude", "CLAUDE.md");
  const routingSection = generateRoutingSection();
  const marker = "## Pilot routing";

  if (existsSync(claudeMdPath)) {
    const content = readFileSync(claudeMdPath, "utf-8");
    if (content.includes(marker)) {
      // Replace existing section
      const before = content.split(marker)[0];
      writeFileSync(claudeMdPath, before + routingSection + "\n");
      return;
    }
    // Append
    writeFileSync(claudeMdPath, content + "\n\n" + routingSection + "\n");
  } else {
    mkdirSync(join(homedir(), ".claude"), { recursive: true });
    writeFileSync(claudeMdPath, routingSection + "\n");
  }
}

export function loadManifest(pilotDir: string): Manifest {
  const path = getManifestPath(pilotDir);
  if (!existsSync(path)) return { managed: {} };
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function saveManifest(pilotDir: string, manifest: Manifest): void {
  writeFileSync(getManifestPath(pilotDir), JSON.stringify(manifest, null, 2));
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test packages/cli/src/deploy/deployer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/deploy/
git commit -m "feat: add skill deployer with symlinks, CLAUDE.md routing, and smart update manifest"
```

---

### Task 28: Wire deployment into install and update flows

**Files:**
- Modify: `packages/cli/src/commands/repl.ts`
- Modify: `packages/cli/src/screens/Update.tsx`

- [ ] **Step 1: Add deployment to first-run onboarding**

Update `packages/cli/src/commands/repl.ts` to call `deploySkills`, `createSymlink`, and `appendRoutingToClaudeMd` after onboarding completes:

```ts
// Add to repl.ts after markOnboarded()
import { deploySkills, createSymlink, appendRoutingToClaudeMd } from "../deploy/deployer.js";
import { homedir } from "node:os";
import { join } from "node:path";

const pilotDir = join(homedir(), ".pilot");
deploySkills(pilotDir);
createSymlink(pilotDir);
appendRoutingToClaudeMd();
```

- [ ] **Step 2: Add smart update logic to Update screen**

Update `packages/cli/src/screens/Update.tsx` to redeploy skills during the update phase, checking manifest checksums before overwriting:

```ts
// In the updating phase, after "Plugin updates applied":
import { deploySkills, loadManifest, saveManifest, checksum, shouldUpdateFile } from "../deploy/deployer.js";

// Only overwrite files that haven't been user-modified
const manifest = loadManifest(pilotDir);
// ... check each managed file against manifest checksums
// ... warn if user-modified files would be overwritten
deploySkills(pilotDir);
```

- [ ] **Step 3: Verify end-to-end flow**

```bash
# First run: should create ~/.pilot/skills/, symlink, and CLAUDE.md routing
npx tsx src/bin/pilot.ts

# Check results
ls -la ~/.pilot/skills/
ls -la ~/.claude/skills/pilot
cat ~/.claude/CLAUDE.md | grep "Pilot routing"
```

Expected: Skills directory created, symlink exists, routing rules in CLAUDE.md.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/commands/repl.ts packages/cli/src/screens/Update.tsx
git commit -m "feat: wire skill deployment into onboarding and update flows"
```

---

## Self-Review

| Spec Section | Task |
|---|---|
| Skill deployment (~/.pilot/skills/) | Tasks 26, 27, 28 |
| CLAUDE.md routing injection | Task 27 |
| Smart update (manifest checksums) | Task 27, 28 |
| Crew lead SKILL.md files | Task 26 |
| Tech Lead dev guide + AI best practices | Task 26 |
| Brand Lead self-improving | Task 26 |
| Symlink to ~/.claude/skills/pilot | Task 27 |
