// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpStep, NpmStep, PkgStep, SkillStep, ZedExtStep } from '../registry/types.js';
import type { PackageManagers } from './detect.js';
import type { Exec } from './exec.js';
import { checkStep, executeStep, unexecuteStep } from './steps.js';

vi.mock('../settings.js', () => ({
  loadSettings: vi.fn(() => ({
    onboarded: false,
    plugins: {},
    mcpServers: {},
    crew: { specialists: {} },
  })),
  saveSettings: vi.fn(),
}));

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
});
afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
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

  it('unexecuteStep deletes the skill file', async () => {
    writeFileSync(join(tmpDir, 'remotion.md'), '# Remotion');
    const exec = makeExec(0);
    await unexecuteStep(skillStep, npmOnly, exec, { skillsDir: tmpDir });
    expect(existsSync(join(tmpDir, 'remotion.md'))).toBe(false);
  });

  it('unexecuteStep does nothing when skill file does not exist', async () => {
    const exec = makeExec(0);
    // Should not throw
    await expect(
      unexecuteStep(skillStep, npmOnly, exec, { skillsDir: tmpDir })
    ).resolves.not.toThrow();
  });

  it('executeStep throws UP_STEP_FAILED when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const exec = makeExec(0);
    await expect(
      executeStep(skillStep, npmOnly, exec, { skillsDir: tmpDir })
    ).rejects.toMatchObject({ code: 'UP_STEP_FAILED' });
    vi.unstubAllGlobals();
  });

  it('executeStep throws UP_STEP_FAILED when fetch returns non-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') })
    );
    const exec = makeExec(0);
    await expect(
      executeStep(skillStep, npmOnly, exec, { skillsDir: tmpDir })
    ).rejects.toMatchObject({ code: 'UP_STEP_FAILED' });
    vi.unstubAllGlobals();
  });
});

// --- winget pkg step ---
describe('winget pkg step', () => {
  const wingetStep: PkgStep = {
    type: 'pkg',
    winget: 'Microsoft.NodeJs',
    label: 'Node.js (winget)',
  };
  const wingetOnly: PackageManagers = { nix: false, brew: false, winget: true, npm: false };

  it('checkStep uses winget list', async () => {
    const exec = makeExec(0);
    expect(await checkStep(wingetStep, wingetOnly, exec)).toBe(true);
    expect(exec.run).toHaveBeenCalledWith('winget', ['list', '--id', 'Microsoft.NodeJs']);
  });

  it('executeStep uses winget install', async () => {
    const exec = makeExec(0);
    await executeStep(wingetStep, wingetOnly, exec);
    expect(exec.run).toHaveBeenCalledWith(
      'winget',
      expect.arrayContaining(['install', '--id', 'Microsoft.NodeJs'])
    );
  });

  it('unexecuteStep uses winget uninstall', async () => {
    const exec = makeExec(0);
    await unexecuteStep(wingetStep, wingetOnly, exec);
    expect(exec.run).toHaveBeenCalledWith('winget', [
      'uninstall',
      '--id',
      'Microsoft.NodeJs',
      '--silent',
    ]);
  });

  it('checkStep returns false when no manager matches', async () => {
    const exec = makeExec(0);
    expect(await checkStep(wingetStep, noneAvailable, exec)).toBe(false);
  });

  it('executeStep throws UP_STEP_FAILED on non-zero exit', async () => {
    const exec = makeExec(1);
    await expect(executeStep(wingetStep, wingetOnly, exec)).rejects.toMatchObject({
      code: 'UP_STEP_FAILED',
    });
  });

  it('unexecuteStep does nothing when no manager available', async () => {
    const exec = makeExec(0);
    await expect(unexecuteStep(wingetStep, noneAvailable, exec)).resolves.not.toThrow();
  });
});

// --- npm local step ---
describe('npm local step', () => {
  const localNpmStep: NpmStep = {
    type: 'npm',
    pkg: 'typescript',
    global: false,
    label: 'TypeScript',
  };

  it('executeStep runs npm install (local)', async () => {
    const exec = makeExec(0);
    await executeStep(localNpmStep, noneAvailable, exec);
    expect(exec.run).toHaveBeenCalledWith('npm', ['install', 'typescript']);
  });

  it('unexecuteStep runs npm uninstall (local)', async () => {
    const exec = makeExec(0);
    await unexecuteStep(localNpmStep, noneAvailable, exec);
    expect(exec.run).toHaveBeenCalledWith('npm', ['uninstall', 'typescript']);
  });

  it('executeStep throws UP_STEP_FAILED on non-zero exit', async () => {
    const exec = makeExec(1);
    await expect(executeStep(localNpmStep, noneAvailable, exec)).rejects.toMatchObject({
      code: 'UP_STEP_FAILED',
    });
  });
});

// --- mcp step ---
describe('mcp step', () => {
  const mcpStep: McpStep = {
    type: 'mcp',
    server: 'test-server',
    command: 'npx test-mcp',
    label: 'Test MCP',
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('checkStep returns false when server not in settings', async () => {
    const exec = makeExec(0);
    expect(await checkStep(mcpStep, noneAvailable, exec)).toBe(false);
  });

  it('checkStep returns true when server is in settings', async () => {
    const { loadSettings } = await import('../settings.js');
    vi.mocked(loadSettings).mockReturnValueOnce({
      onboarded: false,
      plugins: {},
      mcpServers: { 'test-server': { command: 'npx test-mcp' } },
      crew: { specialists: {} },
    });
    const exec = makeExec(0);
    expect(await checkStep(mcpStep, noneAvailable, exec)).toBe(true);
  });

  it('checkStep returns false when loadSettings throws', async () => {
    const { loadSettings } = await import('../settings.js');
    vi.mocked(loadSettings).mockImplementationOnce(() => {
      throw new Error('settings error');
    });
    const exec = makeExec(0);
    expect(await checkStep(mcpStep, noneAvailable, exec)).toBe(false);
  });

  it('executeStep adds server to mcpServers', async () => {
    const { saveSettings } = await import('../settings.js');
    const exec = makeExec(0);
    await executeStep(mcpStep, noneAvailable, exec);
    expect(vi.mocked(saveSettings)).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpServers: expect.objectContaining({ 'test-server': { command: 'npx test-mcp' } }),
      })
    );
  });

  it('unexecuteStep removes server from mcpServers', async () => {
    const { loadSettings, saveSettings } = await import('../settings.js');
    vi.mocked(loadSettings).mockReturnValueOnce({
      onboarded: false,
      plugins: {},
      mcpServers: { 'test-server': { command: 'npx test-mcp' } },
      crew: { specialists: {} },
    });
    const exec = makeExec(0);
    await unexecuteStep(mcpStep, noneAvailable, exec);
    const savedArg = vi.mocked(saveSettings).mock.calls[0]?.[0];
    expect(savedArg?.mcpServers).not.toHaveProperty('test-server');
  });
});

// --- zed-extension step ---
describe('zed-extension step', () => {
  const zedStep: ZedExtStep = {
    type: 'zed-extension',
    id: 'gleam',
    label: 'Gleam language support',
  };

  it('checkStep always returns false', async () => {
    const exec = makeExec(0);
    expect(await checkStep(zedStep, noneAvailable, exec)).toBe(false);
  });

  it('executeStep does nothing when zed settings file does not exist', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
    // On linux, path would be ~/.config/zed/settings.json — which won't exist
    const exec = makeExec(0);
    await expect(executeStep(zedStep, noneAvailable, exec)).resolves.not.toThrow();
    vi.restoreAllMocks();
  });

  it('unexecuteStep does nothing when zed settings file does not exist', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
    const exec = makeExec(0);
    await expect(unexecuteStep(zedStep, noneAvailable, exec)).resolves.not.toThrow();
    vi.restoreAllMocks();
  });
});
