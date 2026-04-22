// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpStep, NpmStep, PkgStep, SkillStep, ZedExtStep } from '../registry/types.js';
import { loadSettings, saveSettings } from '../settings.js';
import type { PackageManagers } from './detect.js';
import type { Exec } from './exec.js';
import { checkStep, executeStep, unexecuteStep } from './steps.js';

vi.mock('../settings.js', () => ({
  loadSettings: vi.fn().mockReturnValue({
    onboarded: true,
    plugins: {},
    mcpServers: {},
    crew: { specialists: {} },
  }),
  saveSettings: vi.fn(),
}));

vi.mock('node:os', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:os')>();
  return {
    ...original,
    homedir: () => process.env.PILOT_TEST_HOMEDIR ?? original.homedir(),
  };
});

const allManagers: PackageManagers = { nix: true, brew: true, winget: false, npm: true };
const brewOnly: PackageManagers = { nix: false, brew: true, winget: false, npm: false };
const npmOnly: PackageManagers = { nix: false, brew: false, winget: false, npm: true };
const noneAvailable: PackageManagers = { nix: false, brew: false, winget: false, npm: false };

function makeExec(exitCode = 0, stdout = ''): Exec {
  return { run: vi.fn().mockResolvedValue({ stdout, stderr: '', code: exitCode }) };
}

let tmpDir: string;
beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'pilot-steps-'));
  process.env.PILOT_TEST_HOMEDIR = tmpDir;
});
afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.PILOT_TEST_HOMEDIR;
});

// --- pkg step ---
describe('pkg step', () => {
  const pkgStep: PkgStep = { type: 'pkg', nix: 'nodejs_20', brew: 'node', label: 'Node.js' };

  it('checkStep returns true when brew list exits 0', async () => {
    const exec = makeExec(0);
    expect(await checkStep(pkgStep, brewOnly, exec)).toBe(true);
  });

  it('checkStep returns false when brew list exits non-zero', async () => {
    const exec = makeExec(1);
    expect(await checkStep(pkgStep, brewOnly, exec)).toBe(false);
  });

  it('checkStep returns true when nix profile list includes the package', async () => {
    const nixOnly: PackageManagers = { nix: true, brew: false, winget: false, npm: false };
    const exec: Exec = {
      run: vi.fn().mockResolvedValue({ stdout: 'nodejs_20 abc123', stderr: '', code: 0 }),
    };
    expect(await checkStep(pkgStep, nixOnly, exec)).toBe(true);
  });

  it('executeStep runs nix profile install when nix is available', async () => {
    const exec = makeExec(0);
    await executeStep(pkgStep, allManagers, exec);
    expect(exec.run).toHaveBeenCalledWith('nix', ['profile', 'install', 'nixpkgs#nodejs_20']);
  });

  it('executeStep runs brew install when only brew is available', async () => {
    const exec = makeExec(0);
    await executeStep(pkgStep, brewOnly, exec);
    expect(exec.run).toHaveBeenCalledWith('brew', ['install', 'node']);
  });

  it('executeStep throws UP_NO_PACKAGE_MANAGER when none available', async () => {
    const exec = makeExec(1);
    await expect(executeStep(pkgStep, noneAvailable, exec)).rejects.toMatchObject({
      code: 'UP_NO_PACKAGE_MANAGER',
    });
  });

  it('unexecuteStep runs nix profile remove when nix is available', async () => {
    const exec = makeExec(0);
    await unexecuteStep(pkgStep, allManagers, exec);
    expect(exec.run).toHaveBeenCalledWith('nix', ['profile', 'remove', 'nixpkgs#nodejs_20']);
  });

  it('unexecuteStep throws UP_STEP_FAILED when brew uninstall exits non-zero', async () => {
    const exec = makeExec(1);
    await expect(unexecuteStep(pkgStep, brewOnly, exec)).rejects.toMatchObject({
      code: 'UP_STEP_FAILED',
    });
  });
});

// --- npm step ---
describe('npm step', () => {
  const npmStep: NpmStep = {
    type: 'npm',
    pkg: '@remotion/cli',
    global: true,
    label: 'Remotion CLI',
  };

  it('checkStep returns true when npm list exits 0', async () => {
    const exec = makeExec(0);
    expect(await checkStep(npmStep, npmOnly, exec)).toBe(true);
  });

  it('checkStep uses -g flag for global npm steps', async () => {
    const exec = makeExec(0);
    await checkStep(npmStep, npmOnly, exec);
    expect(exec.run).toHaveBeenCalledWith('npm', ['list', '-g', '--depth=0', '@remotion/cli']);
  });

  it('checkStep omits -g flag for local npm steps', async () => {
    const localStep: NpmStep = {
      type: 'npm',
      pkg: '@remotion/cli',
      global: false,
      label: 'Remotion CLI',
    };
    const exec = makeExec(0);
    await checkStep(localStep, npmOnly, exec);
    expect(exec.run).toHaveBeenCalledWith('npm', ['list', '--depth=0', '@remotion/cli']);
  });

  it('executeStep runs npm install -g', async () => {
    const exec = makeExec(0);
    await executeStep(npmStep, npmOnly, exec);
    expect(exec.run).toHaveBeenCalledWith('npm', ['install', '-g', '@remotion/cli']);
  });

  it('unexecuteStep runs npm uninstall -g', async () => {
    const exec = makeExec(0);
    await unexecuteStep(npmStep, npmOnly, exec);
    expect(exec.run).toHaveBeenCalledWith('npm', ['uninstall', '-g', '@remotion/cli']);
  });

  it('unexecuteStep throws when npm uninstall exits non-zero', async () => {
    const exec = makeExec(1);
    await expect(unexecuteStep(npmStep, npmOnly, exec)).rejects.toThrow();
  });
});

// --- skill step ---
describe('skill step', () => {
  const skillStep: SkillStep = {
    type: 'skill',
    id: 'remotion',
    url: 'https://example.com/remotion.md',
    label: 'Remotion skill',
  };

  it('checkStep returns false when skill file does not exist', async () => {
    const exec = makeExec(0);
    expect(await checkStep(skillStep, npmOnly, exec, { skillsDir: tmpDir })).toBe(false);
  });

  it('checkStep returns true when skill file exists', async () => {
    writeFileSync(join(tmpDir, 'remotion.md'), '# Remotion');
    const exec = makeExec(0);
    expect(await checkStep(skillStep, npmOnly, exec, { skillsDir: tmpDir })).toBe(true);
  });

  it('executeStep fetches and writes the skill file', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('# Skill') })
    );
    const exec = makeExec(0);
    await executeStep(skillStep, npmOnly, exec, { skillsDir: tmpDir });
    expect(existsSync(join(tmpDir, 'remotion.md'))).toBe(true);
    vi.unstubAllGlobals();
  });

  it('executeStep rejects path-traversal skill IDs', async () => {
    const traversalStep: SkillStep = {
      type: 'skill',
      id: '../evil',
      url: 'https://example.com/evil.md',
      label: 'Evil skill',
    };
    const exec = makeExec(0);
    await expect(
      executeStep(traversalStep, npmOnly, exec, { skillsDir: tmpDir })
    ).rejects.toMatchObject({
      code: 'UP_STEP_FAILED',
    });
  });

  it('checkStep rejects path-traversal skill IDs', async () => {
    const traversalStep: SkillStep = {
      type: 'skill',
      id: '../evil',
      url: 'https://example.com/evil.md',
      label: 'Evil skill',
    };
    const exec = makeExec(0);
    await expect(
      checkStep(traversalStep, npmOnly, exec, { skillsDir: tmpDir })
    ).rejects.toMatchObject({
      code: 'UP_STEP_FAILED',
    });
  });

  it('unexecuteStep deletes the skill file', async () => {
    writeFileSync(join(tmpDir, 'remotion.md'), '# Remotion');
    const exec = makeExec(0);
    await unexecuteStep(skillStep, npmOnly, exec, { skillsDir: tmpDir });
    expect(existsSync(join(tmpDir, 'remotion.md'))).toBe(false);
  });
});

// --- mcp step ---
describe('mcp step', () => {
  const mcpStep: McpStep = {
    type: 'mcp',
    server: 'my-server',
    command: 'node mcp.js',
    label: 'My MCP Server',
  };

  it('checkStep returns false when server is not in mcpServers', async () => {
    const exec = makeExec(0);
    expect(await checkStep(mcpStep, allManagers, exec)).toBe(false);
  });

  it('checkStep returns true when server is in mcpServers with matching command', async () => {
    vi.mocked(loadSettings).mockReturnValueOnce({
      onboarded: true,
      plugins: {},
      mcpServers: { 'my-server': { command: 'node mcp.js' } },
      crew: { specialists: {} },
    });
    const exec = makeExec(0);
    expect(await checkStep(mcpStep, allManagers, exec)).toBe(true);
  });

  it('checkStep returns false when server command differs from step command', async () => {
    vi.mocked(loadSettings).mockReturnValueOnce({
      onboarded: true,
      plugins: {},
      mcpServers: { 'my-server': { command: 'node old-mcp.js' } },
      crew: { specialists: {} },
    });
    const exec = makeExec(0);
    expect(await checkStep(mcpStep, allManagers, exec)).toBe(false);
  });

  it('executeStep adds the server to mcpServers', async () => {
    const settings = { onboarded: true, plugins: {}, mcpServers: {}, crew: { specialists: {} } };
    vi.mocked(loadSettings).mockReturnValueOnce(settings);
    const exec = makeExec(0);
    await executeStep(mcpStep, allManagers, exec);
    expect(vi.mocked(saveSettings)).toHaveBeenCalledWith(
      expect.objectContaining({ mcpServers: { 'my-server': { command: 'node mcp.js' } } })
    );
  });

  it('unexecuteStep removes the server from mcpServers', async () => {
    const settings = {
      onboarded: true,
      plugins: {},
      mcpServers: { 'my-server': { command: 'node mcp.js' } },
      crew: { specialists: {} },
    };
    vi.mocked(loadSettings).mockReturnValueOnce(settings);
    const exec = makeExec(0);
    await unexecuteStep(mcpStep, allManagers, exec);
    expect(vi.mocked(saveSettings)).toHaveBeenCalledWith(
      expect.objectContaining({ mcpServers: {} })
    );
  });
});

// --- zed-extension step ---
describe('zed-extension step', () => {
  const zedStep: ZedExtStep = { type: 'zed-extension', id: 'rust', label: 'Rust Extension' };

  it('checkStep always returns false', async () => {
    const exec = makeExec(0);
    expect(await checkStep(zedStep, allManagers, exec)).toBe(false);
  });

  it('executeStep is a no-op when Zed settings file does not exist', async () => {
    const exec = makeExec(0);
    await expect(executeStep(zedStep, allManagers, exec)).resolves.toBeUndefined();
  });

  it('unexecuteStep is a no-op when Zed settings file does not exist', async () => {
    const exec = makeExec(0);
    await expect(unexecuteStep(zedStep, allManagers, exec)).resolves.toBeUndefined();
  });

  it('executeStep writes extension into Zed settings when file exists', async () => {
    const zedDir =
      process.platform === 'darwin'
        ? join(tmpDir, 'Library', 'Application Support', 'Zed')
        : join(tmpDir, '.config', 'zed');
    mkdirSync(zedDir, { recursive: true });
    writeFileSync(join(zedDir, 'settings.json'), JSON.stringify({ auto_install_extensions: {} }));

    const exec = makeExec(0);
    await executeStep(zedStep, allManagers, exec);

    const written = JSON.parse(readFileSync(join(zedDir, 'settings.json'), 'utf-8')) as {
      auto_install_extensions: Record<string, boolean>;
    };
    expect(written.auto_install_extensions.rust).toBe(true);
  });

  it('unexecuteStep removes extension from Zed settings when file exists', async () => {
    const zedDir =
      process.platform === 'darwin'
        ? join(tmpDir, 'Library', 'Application Support', 'Zed')
        : join(tmpDir, '.config', 'zed');
    mkdirSync(zedDir, { recursive: true });
    writeFileSync(
      join(zedDir, 'settings.json'),
      JSON.stringify({ auto_install_extensions: { rust: true } })
    );

    const exec = makeExec(0);
    await unexecuteStep(zedStep, allManagers, exec);

    const written = JSON.parse(readFileSync(join(zedDir, 'settings.json'), 'utf-8')) as {
      auto_install_extensions: Record<string, boolean>;
    };
    expect(written.auto_install_extensions.rust).toBeUndefined();
  });
});
