// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { rebuildStep } from './rebuild.js';

describe('rebuildStep', () => {
  it('check returns false (always runs)', async () => {
    expect(
      await rebuildStep.check({
        exec: { run: vi.fn(), spawn: vi.fn() },
        env: {},
      })
    ).toBe(false);
  });

  it('run executes darwin-rebuild for darwin machine', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    await rebuildStep.run({
      exec,
      env: {
        KIT_MACHINE_TYPE: 'darwin',
        KIT_MACHINE: 'ali-pro',
        KIT_REPO_DIR: '/nix/config',
      },
    });
    expect(exec.run).toHaveBeenCalledWith(
      'sudo',
      ['darwin-rebuild', 'switch', '--flake', '.#ali-pro'],
      { cwd: '/nix/config' }
    );
  });

  it('run executes nixos-rebuild for nixos machine', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    await rebuildStep.run({
      exec,
      env: {
        KIT_MACHINE_TYPE: 'nixos',
        KIT_MACHINE: 'ali-server',
        KIT_REPO_DIR: '/nix/config',
      },
    });
    expect(exec.run).toHaveBeenCalledWith(
      'sudo',
      ['nixos-rebuild', 'switch', '--flake', '.#ali-server'],
      { cwd: '/nix/config' }
    );
  });

  it('run throws when KIT_MACHINE_TYPE missing', async () => {
    const exec = { run: vi.fn(), spawn: vi.fn() };
    await expect(
      rebuildStep.run({
        exec,
        env: { KIT_MACHINE: 'ali-pro', KIT_REPO_DIR: '/nix/config' },
      })
    ).rejects.toThrow();
  });

  it('run throws when KIT_MACHINE missing', async () => {
    const exec = { run: vi.fn(), spawn: vi.fn() };
    await expect(
      rebuildStep.run({
        exec,
        env: { KIT_MACHINE_TYPE: 'darwin', KIT_REPO_DIR: '/nix/config' },
      })
    ).rejects.toThrow();
  });

  it('run throws when KIT_REPO_DIR missing', async () => {
    const exec = { run: vi.fn(), spawn: vi.fn() };
    await expect(
      rebuildStep.run({
        exec,
        env: { KIT_MACHINE_TYPE: 'darwin', KIT_MACHINE: 'ali-pro' },
      })
    ).rejects.toThrow();
  });

  it('run throws when rebuild command fails', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({
        stdout: '',
        stderr: 'build error',
        code: 1,
      }),
      spawn: vi.fn(),
    };
    await expect(
      rebuildStep.run({
        exec,
        env: {
          KIT_MACHINE_TYPE: 'darwin',
          KIT_MACHINE: 'ali-pro',
          KIT_REPO_DIR: '/nix/config',
        },
      })
    ).rejects.toThrow();
  });
});
