# Uninstall & Down Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `pilot uninstall` (interactive self-removal) and `pilot down <template>` (selective tool removal) with a shared Nix uninstaller module.

**Architecture:** A reusable `uninstaller.ts` module handles Nix package removal, used by both `pilot uninstall` step 4 and `pilot down`. The uninstall flow is a 5-step interactive walkthrough rendered as a React Ink screen with a phase-based state machine. `deployer.ts` gains a `removeRoutingFromClaudeMd()` function for clean CLAUDE.md surgery. Since `device/templates.ts`, `device/state.ts`, and `deploy/deployer.ts` don't exist yet, this plan creates minimal versions of each that the uninstall flow needs.

**Tech Stack:** React 19 + Ink 7, Commander.js, Vitest + ink-testing-library, Node.js fs/child_process

**Spec:** `docs/specs/2026-04-10-uninstall-design.md`

---

## File Map

**New files:**
| File | Responsibility |
|------|---------------|
| `src/device/templates.ts` | Template manifest definitions (name → Nix packages) |
| `src/device/state.ts` | Read/write `~/.pilot/templates.json` |
| `src/device/uninstaller.ts` | Remove Nix packages by template, update state |
| `src/device/uninstaller.test.ts` | Tests for uninstaller |
| `src/deploy/deployer.ts` | `removeRoutingFromClaudeMd()` + `removeSkillSymlink()` |
| `src/deploy/deployer.test.ts` | Tests for deployer removal functions |
| `src/commands/uninstall.ts` | `runUninstall()` command entry |
| `src/commands/down.ts` | `runDown(template)` command entry |
| `src/screens/Uninstall.tsx` | Interactive 5-step uninstall UI |
| `src/screens/Uninstall.test.tsx` | Tests for Uninstall screen |
| `src/device/backup.ts` | Backup `~/.pilot/knowledge/` to `~/pilot-backup-<date>/` |
| `src/device/backup.test.ts` | Tests for backup |

**Modified files:**
| File | Change |
|------|--------|
| `src/bin/pilot.ts` | Register `uninstall` and `down` commands |
| `src/errors.ts` | Add error codes for uninstall/down |

---

## Task 1: Add Error Codes

**Files:**
- Modify: `src/errors.ts`

- [ ] **Step 1: Add error codes**

In `src/errors.ts`, add the new codes to `errorCodes` and `userMessages`:

```ts
export const errorCodes = {
  UPDATE_CHECK_FAILED: 'UPDATE_CHECK_FAILED',
  UPDATE_INSTALL_FAILED: 'UPDATE_INSTALL_FAILED',
  UNINSTALL_NOT_INSTALLED: 'UNINSTALL_NOT_INSTALLED',
  UNINSTALL_BACKUP_FAILED: 'UNINSTALL_BACKUP_FAILED',
  UNINSTALL_STEP_FAILED: 'UNINSTALL_STEP_FAILED',
  UNINSTALL_NPM_FAILED: 'UNINSTALL_NPM_FAILED',
  DOWN_UNKNOWN_TEMPLATE: 'DOWN_UNKNOWN_TEMPLATE',
  DOWN_NOT_INSTALLED: 'DOWN_NOT_INSTALLED',
  DOWN_REMOVE_FAILED: 'DOWN_REMOVE_FAILED',
} as const;
```

And in `userMessages`:

```ts
const userMessages: Record<ErrorCode, string> = {
  UPDATE_CHECK_FAILED: 'Unable to check for updates — are you online?',
  UPDATE_INSTALL_FAILED: 'Update could not be installed. Please try again or visit medalsocial.com/pilot for help.',
  UNINSTALL_NOT_INSTALLED: 'Pilot is not installed. Nothing to remove.',
  UNINSTALL_BACKUP_FAILED: 'Could not back up knowledge files. Uninstall aborted for safety.',
  UNINSTALL_STEP_FAILED: 'A removal step failed — continuing with remaining steps.',
  UNINSTALL_NPM_FAILED: 'Could not remove the global package. Run: sudo npm uninstall -g @medalsocial/pilot',
  DOWN_UNKNOWN_TEMPLATE: 'Unknown template. Run pilot up to see available templates.',
  DOWN_NOT_INSTALLED: 'That template is not installed. Nothing to remove.',
  DOWN_REMOVE_FAILED: 'Could not remove template dependencies. Some files may remain.',
};
```

- [ ] **Step 2: Run existing tests to make sure nothing breaks**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm test -- --run`
Expected: All existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/errors.ts
git commit -m "feat(uninstall): add error codes for uninstall and down commands"
```

---

## Task 2: Template Manifests & State

**Files:**
- Create: `src/device/templates.ts`
- Create: `src/device/state.ts`

These are foundational modules the uninstaller depends on. They define what templates exist and track what's installed.

- [ ] **Step 1: Create `src/device/templates.ts`**

```ts
export interface TemplateDependency {
  label: string;
  nixPackage: string;
}

export interface TemplateManifest {
  name: string;
  displayName: string;
  description: string;
  dependencies: TemplateDependency[];
}

export const templates: Record<string, TemplateManifest> = {
  pencil: {
    name: 'pencil',
    displayName: 'Pencil Design Studio',
    description: 'Design engine and code editor extensions',
    dependencies: [
      { label: 'Design engine', nixPackage: 'pencil-mcp' },
      { label: 'Code editor', nixPackage: 'zed' },
    ],
  },
  remotion: {
    name: 'remotion',
    displayName: 'Remotion Video Studio',
    description: 'Video production with Node.js',
    dependencies: [
      { label: 'Video runtime', nixPackage: 'nodejs' },
      { label: 'Media encoder', nixPackage: 'ffmpeg' },
      { label: 'Browser engine', nixPackage: 'chromium' },
    ],
  },
  nextmedal: {
    name: 'nextmedal',
    displayName: 'Next Medal Web App',
    description: 'Full-stack web application',
    dependencies: [
      { label: 'Runtime', nixPackage: 'nodejs' },
      { label: 'Package manager', nixPackage: 'pnpm' },
    ],
  },
};

export function getTemplate(name: string): TemplateManifest | undefined {
  return templates[name];
}

export function getAllTemplateNames(): string[] {
  return Object.keys(templates);
}
```

- [ ] **Step 2: Create `src/device/state.ts`**

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const PILOT_DIR = join(homedir(), '.pilot');
const STATE_FILE = join(PILOT_DIR, 'templates.json');

export interface InstalledDependency {
  label: string;
  installed: boolean;
}

export interface InstalledTemplate {
  name: string;
  installedAt: string;
  lastChecked: string;
  dependencies: Record<string, boolean>;
}

export interface TemplateState {
  templates: Record<string, InstalledTemplate>;
}

export function loadTemplateState(): TemplateState {
  if (!existsSync(STATE_FILE)) {
    return { templates: {} };
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { templates: {} };
  }
}

export function saveTemplateState(state: TemplateState): void {
  mkdirSync(PILOT_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function removeTemplateFromState(templateName: string): void {
  const state = loadTemplateState();
  delete state.templates[templateName];
  saveTemplateState(state);
}

export function getInstalledTemplateNames(): string[] {
  const state = loadTemplateState();
  return Object.keys(state.templates);
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/device/templates.ts packages/cli/src/device/state.ts
git commit -m "feat(device): add template manifests and state management"
```

---

## Task 3: Nix Uninstaller Module

**Files:**
- Create: `src/device/uninstaller.ts`
- Create: `src/device/uninstaller.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/device/uninstaller.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('./state.js', () => ({
  loadTemplateState: vi.fn(),
  removeTemplateFromState: vi.fn(),
}));

vi.mock('./templates.js', () => ({
  getTemplate: vi.fn(),
}));

import { execFile } from 'node:child_process';
import { loadTemplateState, removeTemplateFromState } from './state.js';
import { getTemplate } from './templates.js';
import { uninstallTemplate } from './uninstaller.js';

const mockExecFile = vi.mocked(execFile);
const mockLoadState = vi.mocked(loadTemplateState);
const mockRemoveState = vi.mocked(removeTemplateFromState);
const mockGetTemplate = vi.mocked(getTemplate);

function setupExecFile(success: boolean) {
  mockExecFile.mockImplementation((_cmd, _args, _opts, cb) => {
    const callback = cb as (err: Error | null, stdout: string) => void;
    if (success) {
      callback(null, '');
    } else {
      callback(new Error('nix command failed'), '');
    }
    return undefined as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('uninstallTemplate', () => {
  it('removes all dependencies for a known installed template', async () => {
    mockGetTemplate.mockReturnValue({
      name: 'pencil',
      displayName: 'Pencil Design Studio',
      description: 'Design engine and code editor extensions',
      dependencies: [
        { label: 'Design engine', nixPackage: 'pencil-mcp' },
        { label: 'Code editor', nixPackage: 'zed' },
      ],
    });
    mockLoadState.mockReturnValue({
      templates: {
        pencil: {
          name: 'pencil',
          installedAt: '2026-04-01T00:00:00Z',
          lastChecked: '2026-04-01T00:00:00Z',
          dependencies: { 'pencil-mcp': true, zed: true },
        },
      },
    });
    setupExecFile(true);

    const result = await uninstallTemplate('pencil');

    expect(result.template).toBe('pencil');
    expect(result.removed).toEqual(['Design engine', 'Code editor']);
    expect(result.failed).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(mockRemoveState).toHaveBeenCalledWith('pencil');
  });

  it('skips dependencies not marked as installed in state', async () => {
    mockGetTemplate.mockReturnValue({
      name: 'pencil',
      displayName: 'Pencil Design Studio',
      description: 'Design engine and code editor extensions',
      dependencies: [
        { label: 'Design engine', nixPackage: 'pencil-mcp' },
        { label: 'Code editor', nixPackage: 'zed' },
      ],
    });
    mockLoadState.mockReturnValue({
      templates: {
        pencil: {
          name: 'pencil',
          installedAt: '2026-04-01T00:00:00Z',
          lastChecked: '2026-04-01T00:00:00Z',
          dependencies: { 'pencil-mcp': true, zed: false },
        },
      },
    });
    setupExecFile(true);

    const result = await uninstallTemplate('pencil');

    expect(result.removed).toEqual(['Design engine']);
    expect(result.skipped).toEqual(['Code editor']);
  });

  it('reports failed removals without throwing', async () => {
    mockGetTemplate.mockReturnValue({
      name: 'pencil',
      displayName: 'Pencil Design Studio',
      description: 'Design engine and code editor extensions',
      dependencies: [
        { label: 'Design engine', nixPackage: 'pencil-mcp' },
      ],
    });
    mockLoadState.mockReturnValue({
      templates: {
        pencil: {
          name: 'pencil',
          installedAt: '2026-04-01T00:00:00Z',
          lastChecked: '2026-04-01T00:00:00Z',
          dependencies: { 'pencil-mcp': true },
        },
      },
    });
    setupExecFile(false);

    const result = await uninstallTemplate('pencil');

    expect(result.removed).toEqual([]);
    expect(result.failed).toEqual(['Design engine']);
  });

  it('returns empty result for unknown template', async () => {
    mockGetTemplate.mockReturnValue(undefined);

    const result = await uninstallTemplate('nonexistent');

    expect(result.removed).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it('returns empty result for template not in state', async () => {
    mockGetTemplate.mockReturnValue({
      name: 'pencil',
      displayName: 'Pencil Design Studio',
      description: 'Design engine and code editor extensions',
      dependencies: [
        { label: 'Design engine', nixPackage: 'pencil-mcp' },
      ],
    });
    mockLoadState.mockReturnValue({ templates: {} });

    const result = await uninstallTemplate('pencil');

    expect(result.removed).toEqual([]);
    expect(result.skipped).toEqual(['Design engine']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm --filter @medalsocial/pilot test -- --run src/device/uninstaller.test.ts`
Expected: FAIL — `uninstaller.js` module not found.

- [ ] **Step 3: Implement `src/device/uninstaller.ts`**

```ts
import { execFile } from 'node:child_process';
import { getTemplate } from './templates.js';
import { loadTemplateState, removeTemplateFromState } from './state.js';

export interface UninstallResult {
  template: string;
  removed: string[];
  failed: string[];
  skipped: string[];
}

function nixRemove(nixPackage: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('nix', ['profile', 'remove', nixPackage], { timeout: 60_000 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function uninstallTemplate(templateName: string): Promise<UninstallResult> {
  const result: UninstallResult = {
    template: templateName,
    removed: [],
    failed: [],
    skipped: [],
  };

  const manifest = getTemplate(templateName);
  if (!manifest) {
    return result;
  }

  const state = loadTemplateState();
  const installed = state.templates[templateName];

  for (const dep of manifest.dependencies) {
    const isInstalled = installed?.dependencies[dep.nixPackage] === true;

    if (!isInstalled) {
      result.skipped.push(dep.label);
      continue;
    }

    try {
      await nixRemove(dep.nixPackage);
      result.removed.push(dep.label);
    } catch {
      result.failed.push(dep.label);
    }
  }

  if (result.removed.length > 0 || result.skipped.length === manifest.dependencies.length) {
    removeTemplateFromState(templateName);
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm --filter @medalsocial/pilot test -- --run src/device/uninstaller.test.ts`
Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/device/uninstaller.ts packages/cli/src/device/uninstaller.test.ts
git commit -m "feat(device): add Nix uninstaller module with tests"
```

---

## Task 4: Backup Module

**Files:**
- Create: `src/device/backup.ts`
- Create: `src/device/backup.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/device/backup.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { existsSync, mkdirSync, cpSync } from 'node:fs';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  cpSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}));

const mockExists = vi.mocked(existsSync);
const mockMkdir = vi.mocked(mkdirSync);
const mockCp = vi.mocked(cpSync);

import { backupKnowledge } from './backup.js';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-10'));
});

describe('backupKnowledge', () => {
  it('copies knowledge dir to ~/pilot-backup-<date>/', () => {
    mockExists.mockImplementation((p) => {
      if (String(p).includes('knowledge')) return true;
      if (String(p).includes('pilot-backup')) return false;
      return false;
    });

    const result = backupKnowledge();

    expect(result.success).toBe(true);
    expect(result.backupPath).toBe('/mock/home/pilot-backup-2026-04-10');
    expect(mockCp).toHaveBeenCalledWith(
      '/mock/home/.pilot/knowledge',
      '/mock/home/pilot-backup-2026-04-10/knowledge',
      { recursive: true }
    );
  });

  it('appends suffix when backup dir already exists', () => {
    mockExists.mockImplementation((p) => {
      const path = String(p);
      if (path.includes('knowledge')) return true;
      if (path === '/mock/home/pilot-backup-2026-04-10') return true;
      if (path === '/mock/home/pilot-backup-2026-04-10-2') return false;
      return false;
    });

    const result = backupKnowledge();

    expect(result.backupPath).toBe('/mock/home/pilot-backup-2026-04-10-2');
  });

  it('returns skip result when knowledge dir does not exist', () => {
    mockExists.mockReturnValue(false);

    const result = backupKnowledge();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(mockCp).not.toHaveBeenCalled();
  });

  it('returns failure when copy throws', () => {
    mockExists.mockImplementation((p) => {
      if (String(p).includes('knowledge')) return true;
      return false;
    });
    mockCp.mockImplementation(() => {
      throw new Error('disk full');
    });

    const result = backupKnowledge();

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm --filter @medalsocial/pilot test -- --run src/device/backup.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/device/backup.ts`**

```ts
import { existsSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface BackupResult {
  success: boolean;
  backupPath?: string;
  skipped?: boolean;
}

export function backupKnowledge(): BackupResult {
  const home = homedir();
  const knowledgeDir = join(home, '.pilot', 'knowledge');

  if (!existsSync(knowledgeDir)) {
    return { success: true, skipped: true };
  }

  const date = new Date().toISOString().slice(0, 10);
  let backupPath = join(home, `pilot-backup-${date}`);
  let suffix = 2;

  while (existsSync(backupPath)) {
    backupPath = join(home, `pilot-backup-${date}-${suffix}`);
    suffix++;
  }

  try {
    mkdirSync(backupPath, { recursive: true });
    cpSync(knowledgeDir, join(backupPath, 'knowledge'), { recursive: true });
    return { success: true, backupPath };
  } catch {
    return { success: false };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm --filter @medalsocial/pilot test -- --run src/device/backup.test.ts`
Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/device/backup.ts packages/cli/src/device/backup.test.ts
git commit -m "feat(device): add knowledge backup module with tests"
```

---

## Task 5: Deployer Removal Functions

**Files:**
- Create: `src/deploy/deployer.ts`
- Create: `src/deploy/deployer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/deploy/deployer.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  lstatSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}));

import { existsSync, readFileSync, writeFileSync, unlinkSync, lstatSync } from 'node:fs';
import { removeRoutingFromClaudeMd, removeSkillSymlink } from './deployer.js';

const mockExists = vi.mocked(existsSync);
const mockRead = vi.mocked(readFileSync);
const mockWrite = vi.mocked(writeFileSync);
const mockUnlink = vi.mocked(unlinkSync);
const mockLstat = vi.mocked(lstatSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('removeRoutingFromClaudeMd', () => {
  it('removes the Pilot routing section and preserves other content', () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue(
      '# My Config\n\nSome stuff here.\n\n## Pilot routing\n\nWhen the user\'s request matches Pilot functionality, invoke /pilot.\n\nKey routing rules:\n- Brand voice → invoke /pilot\n\n## Other section\n\nKeep this.\n'
    );

    const result = removeRoutingFromClaudeMd();

    expect(result.success).toBe(true);
    expect(mockWrite).toHaveBeenCalledTimes(1);
    const written = vi.mocked(writeFileSync).mock.calls[0][1] as string;
    expect(written).toContain('# My Config');
    expect(written).toContain('## Other section');
    expect(written).toContain('Keep this.');
    expect(written).not.toContain('Pilot routing');
    expect(written).not.toContain('invoke /pilot');
  });

  it('removes routing section at end of file (no following heading)', () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue(
      '# Config\n\n## Pilot routing\n\nRouting rules here.\n'
    );

    const result = removeRoutingFromClaudeMd();

    expect(result.success).toBe(true);
    const written = vi.mocked(writeFileSync).mock.calls[0][1] as string;
    expect(written).toContain('# Config');
    expect(written).not.toContain('Pilot routing');
  });

  it('returns skip when CLAUDE.md does not exist', () => {
    mockExists.mockReturnValue(false);

    const result = removeRoutingFromClaudeMd();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('returns skip when routing section not found', () => {
    mockExists.mockReturnValue(true);
    mockRead.mockReturnValue('# Config\n\nNo pilot stuff here.\n');

    const result = removeRoutingFromClaudeMd();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(mockWrite).not.toHaveBeenCalled();
  });
});

describe('removeSkillSymlink', () => {
  it('removes symlink when it exists', () => {
    mockExists.mockReturnValue(true);
    mockLstat.mockReturnValue({ isSymbolicLink: () => true } as never);

    const result = removeSkillSymlink();

    expect(result.success).toBe(true);
    expect(mockUnlink).toHaveBeenCalledWith('/mock/home/.claude/skills/pilot');
  });

  it('skips when symlink does not exist', () => {
    mockExists.mockReturnValue(false);

    const result = removeSkillSymlink();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it('skips when path is not a symlink', () => {
    mockExists.mockReturnValue(true);
    mockLstat.mockReturnValue({ isSymbolicLink: () => false } as never);

    const result = removeSkillSymlink();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(mockUnlink).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm --filter @medalsocial/pilot test -- --run src/deploy/deployer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/deploy/deployer.ts`**

```ts
import { existsSync, readFileSync, writeFileSync, unlinkSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface RemovalResult {
  success: boolean;
  skipped?: boolean;
}

const CLAUDE_DIR = join(homedir(), '.claude');
const CLAUDE_MD = join(CLAUDE_DIR, 'CLAUDE.md');
const SKILL_SYMLINK = join(CLAUDE_DIR, 'skills', 'pilot');

const ROUTING_HEADING = '## Pilot routing';

export function removeRoutingFromClaudeMd(): RemovalResult {
  if (!existsSync(CLAUDE_MD)) {
    return { success: true, skipped: true };
  }

  const content = readFileSync(CLAUDE_MD, 'utf-8');
  const headingIndex = content.indexOf(ROUTING_HEADING);

  if (headingIndex === -1) {
    return { success: true, skipped: true };
  }

  const before = content.slice(0, headingIndex);
  const afterHeading = content.slice(headingIndex + ROUTING_HEADING.length);

  // Find the next ## heading after the routing section
  const nextHeadingMatch = afterHeading.match(/\n(## )/);
  let after = '';
  if (nextHeadingMatch?.index !== undefined) {
    after = afterHeading.slice(nextHeadingMatch.index + 1); // +1 to skip the \n
  }

  const result = (before + after).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
  writeFileSync(CLAUDE_MD, result);

  return { success: true };
}

export function removeSkillSymlink(): RemovalResult {
  if (!existsSync(SKILL_SYMLINK)) {
    return { success: true, skipped: true };
  }

  const stat = lstatSync(SKILL_SYMLINK);
  if (!stat.isSymbolicLink()) {
    return { success: true, skipped: true };
  }

  unlinkSync(SKILL_SYMLINK);
  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm --filter @medalsocial/pilot test -- --run src/deploy/deployer.test.ts`
Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/deploy/deployer.ts packages/cli/src/deploy/deployer.test.ts
git commit -m "feat(deploy): add CLAUDE.md routing removal and symlink cleanup"
```

---

## Task 6: Uninstall Screen

**Files:**
- Create: `src/screens/Uninstall.tsx`
- Create: `src/screens/Uninstall.test.tsx`

This is the largest task — the interactive 5-step uninstall UI.

- [ ] **Step 1: Write the failing tests**

Create `src/screens/Uninstall.test.tsx`:

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  rmSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}));

vi.mock('../device/backup.js', () => ({
  backupKnowledge: vi.fn(() => ({ success: true, backupPath: '/mock/home/pilot-backup-2026-04-10' })),
}));

vi.mock('../device/state.js', () => ({
  getInstalledTemplateNames: vi.fn(() => []),
}));

vi.mock('../device/uninstaller.js', () => ({
  uninstallTemplate: vi.fn(async () => ({ template: 'pencil', removed: ['Design engine'], failed: [], skipped: [] })),
}));

vi.mock('../deploy/deployer.js', () => ({
  removeRoutingFromClaudeMd: vi.fn(() => ({ success: true })),
  removeSkillSymlink: vi.fn(() => ({ success: true })),
}));

vi.mock('node:child_process', () => ({
  execFile: vi.fn((_cmd: string, _args: string[], _opts: unknown, cb: (err: Error | null) => void) => {
    cb(null);
    return undefined;
  }),
}));

import { Uninstall } from './Uninstall.js';

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Uninstall', () => {
  it('shows warning and backup message on initial render', async () => {
    const { lastFrame } = render(<Uninstall />);
    await delay();
    expect(lastFrame()).toContain('remove Pilot');
    expect(lastFrame()).toContain('backup');
  });

  it('advances through steps on Y input', async () => {
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    // Confirm backup + step 1
    stdin.write('y');
    await delay();
    expect(lastFrame()).toContain('Knowledge');

    stdin.write('y');
    await delay();
    expect(lastFrame()).toContain('Skills');
  });

  it('skips a step on N input', async () => {
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    stdin.write('y'); // start
    await delay();
    stdin.write('n'); // skip knowledge
    await delay();
    expect(lastFrame()).toContain('Skills');
  });

  it('shows done message at the end', async () => {
    const { lastFrame, stdin } = render(<Uninstall />);
    await delay();

    stdin.write('y'); // start
    await delay();
    stdin.write('y'); // step 1: knowledge
    await delay();
    stdin.write('y'); // step 2: skills
    await delay();
    stdin.write('y'); // step 3: claude
    await delay();
    // step 4 skipped (no templates installed)
    stdin.write('y'); // step 5: CLI
    await delay(300);
    expect(lastFrame()).toContain('removed');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm --filter @medalsocial/pilot test -- --run src/screens/Uninstall.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/screens/Uninstall.tsx`**

```tsx
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFile } from 'node:child_process';
import { colors } from '../colors.js';
import { Step } from '../components/Step.js';
import { backupKnowledge } from '../device/backup.js';
import { getInstalledTemplateNames } from '../device/state.js';
import { uninstallTemplate } from '../device/uninstaller.js';
import { removeRoutingFromClaudeMd, removeSkillSymlink } from '../deploy/deployer.js';
import type { StepStatus } from '../types.js';

type Phase =
  | 'intro'
  | 'step1-knowledge'
  | 'step2-skills'
  | 'step3-claude'
  | 'step4-tools'
  | 'step5-cli'
  | 'removing'
  | 'done'
  | 'error';

interface StepState {
  label: string;
  status: StepStatus;
  detail?: string;
}

const PILOT_DIR = join(homedir(), '.pilot');

export function Uninstall() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>('intro');
  const [backupPath, setBackupPath] = useState<string | undefined>();
  const [steps, setSteps] = useState<StepState[]>([]);
  const [removedItems, setRemovedItems] = useState<string[]>([]);
  const [skippedItems, setSkippedItems] = useState<string[]>([]);
  const installedTemplates = getInstalledTemplateNames();

  // Run backup on intro confirmation
  useEffect(() => {
    if (phase !== 'intro') return;
    // Just waiting for user input
  }, [phase]);

  // Handle async removal for current phase
  useEffect(() => {
    if (phase !== 'removing') return;
    // Removal is handled synchronously in the input handler
  }, [phase]);

  useInput((input, key) => {
    const yes = input === 'y' || input === 'Y' || key.return;
    const no = input === 'n' || input === 'N';

    if (phase === 'intro' && (yes || no)) {
      if (no) {
        exit();
        return;
      }
      // Run backup
      const result = backupKnowledge();
      if (result.backupPath) setBackupPath(result.backupPath);
      setPhase('step1-knowledge');
      return;
    }

    if (phase === 'step1-knowledge' && (yes || no)) {
      if (yes) {
        const home = homedir();
        try {
          rmSync(join(home, '.pilot', 'knowledge'), { recursive: true, force: true });
          rmSync(join(home, '.pilot', 'sessions'), { recursive: true, force: true });
          const auditPath = join(home, '.pilot', 'audit.log');
          if (existsSync(auditPath)) rmSync(auditPath);
          setRemovedItems((prev) => [...prev, 'Knowledge & sessions']);
          setSteps((prev) => [...prev, { label: 'Knowledge & sessions', status: 'done' }]);
        } catch {
          setSteps((prev) => [...prev, { label: 'Knowledge & sessions', status: 'error', detail: 'Some files could not be removed' }]);
        }
      } else {
        setSkippedItems((prev) => [...prev, 'Knowledge & sessions']);
        setSteps((prev) => [...prev, { label: 'Knowledge & sessions', status: 'waiting', detail: 'Skipped' }]);
      }
      setPhase('step2-skills');
      return;
    }

    if (phase === 'step2-skills' && (yes || no)) {
      if (yes) {
        const home = homedir();
        try {
          rmSync(join(home, '.pilot', 'skills'), { recursive: true, force: true });
          rmSync(join(home, '.pilot', 'plugins'), { recursive: true, force: true });
          const manifestPath = join(home, '.pilot', 'manifest.json');
          if (existsSync(manifestPath)) rmSync(manifestPath);
          setRemovedItems((prev) => [...prev, 'Skills & plugins']);
          setSteps((prev) => [...prev, { label: 'Skills & plugins', status: 'done' }]);
        } catch {
          setSteps((prev) => [...prev, { label: 'Skills & plugins', status: 'error', detail: 'Some files could not be removed' }]);
        }
      } else {
        setSkippedItems((prev) => [...prev, 'Skills & plugins']);
        setSteps((prev) => [...prev, { label: 'Skills & plugins', status: 'waiting', detail: 'Skipped' }]);
      }
      setPhase('step3-claude');
      return;
    }

    if (phase === 'step3-claude' && (yes || no)) {
      if (yes) {
        const symlinkResult = removeSkillSymlink();
        const routingResult = removeRoutingFromClaudeMd();
        const detail = [
          symlinkResult.skipped ? null : 'Symlink removed',
          routingResult.skipped ? null : 'CLAUDE.md cleaned',
        ].filter(Boolean).join(', ');
        setRemovedItems((prev) => [...prev, 'Claude integration']);
        setSteps((prev) => [...prev, { label: 'Claude integration', status: 'done', detail: detail || 'Nothing to clean' }]);
      } else {
        setSkippedItems((prev) => [...prev, 'Claude integration']);
        setSteps((prev) => [...prev, { label: 'Claude integration', status: 'waiting', detail: 'Skipped' }]);
      }

      if (installedTemplates.length > 0) {
        setPhase('step4-tools');
      } else {
        setPhase('step5-cli');
      }
      return;
    }

    if (phase === 'step4-tools' && (yes || no)) {
      if (yes) {
        // Remove all installed templates
        setSteps((prev) => [...prev, { label: 'Installed tools', status: 'active', detail: 'Removing...' }]);
        Promise.all(installedTemplates.map((t) => uninstallTemplate(t))).then((results) => {
          const totalRemoved = results.flatMap((r) => r.removed);
          const totalFailed = results.flatMap((r) => r.failed);
          const status: StepStatus = totalFailed.length > 0 ? 'error' : 'done';
          const detail = totalRemoved.length > 0 ? `Removed: ${totalRemoved.join(', ')}` : 'Nothing to remove';
          setSteps((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { label: 'Installed tools', status, detail };
            return updated;
          });
          setRemovedItems((prev) => [...prev, 'Installed tools']);
          setPhase('step5-cli');
        });
        return;
      }
      setSkippedItems((prev) => [...prev, 'Installed tools']);
      setSteps((prev) => [...prev, { label: 'Installed tools', status: 'waiting', detail: 'Skipped' }]);
      setPhase('step5-cli');
      return;
    }

    if (phase === 'step5-cli' && (yes || no)) {
      if (yes) {
        try {
          rmSync(PILOT_DIR, { recursive: true, force: true });
        } catch {
          // Best effort
        }
        execFile('npm', ['uninstall', '-g', '@medalsocial/pilot'], { timeout: 30_000 }, (err) => {
          if (err) {
            setSteps((prev) => [...prev, {
              label: 'Pilot CLI',
              status: 'error',
              detail: 'Run: sudo npm uninstall -g @medalsocial/pilot',
            }]);
          } else {
            setSteps((prev) => [...prev, { label: 'Pilot CLI', status: 'done' }]);
          }
          setPhase('done');
        });
        return;
      }
      setSkippedItems((prev) => [...prev, 'Pilot CLI']);
      setSteps((prev) => [...prev, { label: 'Pilot CLI', status: 'waiting', detail: 'Skipped' }]);
      setPhase('done');
      return;
    }

    if (phase === 'done' && (yes || key.return || key.escape)) {
      exit();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {phase === 'intro' && (
        <Box flexDirection="column" gap={1}>
          <Text color={colors.warning} bold>⚠️  This will remove Pilot from your machine.</Text>
          <Text color={colors.muted}>
            Your knowledge files will be backed up before removal.
          </Text>
          <Text color={colors.text}>Continue? [Y/n]</Text>
        </Box>
      )}

      {phase !== 'intro' && (
        <Box flexDirection="column" gap={0}>
          {backupPath && (
            <Text color={colors.muted}>Backup: {backupPath}</Text>
          )}
          <Text> </Text>
          {steps.map((step, i) => (
            <Step key={i} label={step.label} status={step.status} detail={step.detail} />
          ))}
        </Box>
      )}

      {phase === 'step1-knowledge' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.text} bold>Step 1/5: Knowledge & Sessions</Text>
          <Text color={colors.muted}>~/.pilot/knowledge/, ~/.pilot/sessions/, ~/.pilot/audit.log</Text>
          <Text color={colors.text}>Remove? [Y/n]</Text>
        </Box>
      )}

      {phase === 'step2-skills' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.text} bold>Step 2/5: Crew Skills & Plugins</Text>
          <Text color={colors.muted}>~/.pilot/skills/, ~/.pilot/plugins/, ~/.pilot/manifest.json</Text>
          <Text color={colors.text}>Remove? [Y/n]</Text>
        </Box>
      )}

      {phase === 'step3-claude' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.text} bold>Step 3/5: Claude Integration</Text>
          <Text color={colors.muted}>~/.claude/skills/pilot (symlink), ~/.claude/CLAUDE.md (routing section)</Text>
          <Text color={colors.text}>Remove? [Y/n]</Text>
        </Box>
      )}

      {phase === 'step4-tools' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.text} bold>Step 4/5: Installed Tools</Text>
          <Text color={colors.muted}>Templates: {installedTemplates.join(', ')}</Text>
          <Text color={colors.text}>Remove all? [Y/n]</Text>
        </Box>
      )}

      {phase === 'step5-cli' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.text} bold>Step 5/5: Pilot CLI</Text>
          <Text color={colors.muted}>~/.pilot/ directory, npm global package</Text>
          <Text color={colors.text}>Remove? [Y/n]</Text>
        </Box>
      )}

      {phase === 'done' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.success} bold>✓ Pilot has been removed. Safe travels! ✈️</Text>
          {backupPath && (
            <Text color={colors.muted}>Backup saved to: {backupPath}</Text>
          )}
          {skippedItems.length > 0 && (
            <Text color={colors.muted}>Skipped: {skippedItems.join(', ')}</Text>
          )}
          <Text color={colors.muted}>Press any key to exit.</Text>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm --filter @medalsocial/pilot test -- --run src/screens/Uninstall.test.tsx`
Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/screens/Uninstall.tsx packages/cli/src/screens/Uninstall.test.tsx
git commit -m "feat(screens): add interactive Uninstall screen with 5-step walkthrough"
```

---

## Task 7: Commands & CLI Registration

**Files:**
- Create: `src/commands/uninstall.ts`
- Create: `src/commands/down.ts`
- Modify: `src/bin/pilot.ts`

- [ ] **Step 1: Create `src/commands/uninstall.ts`**

```ts
import React from 'react';
import { render } from 'ink';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { Uninstall } from '../screens/Uninstall.js';
import { PilotError, errorCodes } from '../errors.js';

export async function runUninstall() {
  const pilotDir = join(homedir(), '.pilot');

  if (!existsSync(pilotDir)) {
    throw new PilotError(errorCodes.UNINSTALL_NOT_INSTALLED);
  }

  render(React.createElement(Uninstall));
}
```

- [ ] **Step 2: Create `src/commands/down.ts`**

```ts
import React from 'react';
import { render, Text } from 'ink';
import { colors } from '../colors.js';
import { getTemplate } from '../device/templates.js';
import { getInstalledTemplateNames } from '../device/state.js';
import { uninstallTemplate } from '../device/uninstaller.js';
import { PilotError, errorCodes } from '../errors.js';

export async function runDown(template: string) {
  const manifest = getTemplate(template);
  if (!manifest) {
    throw new PilotError(errorCodes.DOWN_UNKNOWN_TEMPLATE);
  }

  const installed = getInstalledTemplateNames();
  if (!installed.includes(template)) {
    render(
      React.createElement(Text, { color: colors.muted }, `${manifest.displayName} is not installed. Nothing to remove.`)
    );
    return;
  }

  render(
    React.createElement(Text, { color: colors.warning }, `Removing ${manifest.displayName}...`)
  );

  const result = await uninstallTemplate(template);

  if (result.removed.length > 0) {
    for (const label of result.removed) {
      render(
        React.createElement(Text, { color: colors.success }, `  ✓ ${label} removed`)
      );
    }
  }

  for (const label of result.failed) {
    render(
      React.createElement(Text, { color: colors.error }, `  ✗ ${label} could not be removed`)
    );
  }

  if (result.failed.length > 0) {
    throw new PilotError(errorCodes.DOWN_REMOVE_FAILED);
  }

  render(
    React.createElement(Text, { color: colors.muted }, `\nDone. Run \`pilot up ${template}\` to reinstall.`)
  );
}
```

- [ ] **Step 3: Register both commands in `src/bin/pilot.ts`**

Add these two command blocks before the default `program.action(...)` at the end of the file:

```ts
program
  .command('uninstall')
  .description('Remove Pilot and all its files from your machine')
  .action(async () => {
    const { runUninstall } = await import('../commands/uninstall.js');
    await runUninstall();
  });

program
  .command('down <template>')
  .description('Remove a template\'s installed tools (inverse of pilot up)')
  .action(async (template: string) => {
    const { runDown } = await import('../commands/down.js');
    await runDown(template);
  });
```

- [ ] **Step 4: Run all tests**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm test -- --run`
Expected: All tests pass (existing + new).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/uninstall.ts packages/cli/src/commands/down.ts packages/cli/src/bin/pilot.ts
git commit -m "feat: register pilot uninstall and pilot down commands"
```

---

## Task 8: Integration Test & Final Verification

- [ ] **Step 1: Build the project**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 2: Run all tests**

Run: `cd /Users/ali/Documents/Code/pilot && pnpm test -- --run`
Expected: All tests pass.

- [ ] **Step 3: Verify CLI help output**

Run: `cd /Users/ali/Documents/Code/pilot && node packages/cli/dist/bin/pilot.js --help`
Expected: Output includes `uninstall` and `down <template>` commands.

- [ ] **Step 4: Verify down command rejects unknown template**

Run: `cd /Users/ali/Documents/Code/pilot && node packages/cli/dist/bin/pilot.js down fakename`
Expected: Shows "Unknown template" error message.

- [ ] **Step 5: Final commit if any adjustments were needed**

```bash
git add -A
git commit -m "chore: integration fixes for uninstall and down commands"
```
