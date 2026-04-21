// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NpmStep, PkgStep, SkillStep } from '../registry/types.js';
import type { PackageManagers } from './detect.js';
import type { Exec } from './exec.js';
import { checkStep, executeStep, unexecuteStep } from './steps.js';

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
});
