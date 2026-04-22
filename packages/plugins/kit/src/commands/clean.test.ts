// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import type { CleanTarget } from './clean.js';
import { CLEAN_TARGETS, formatBytes, scanTargets } from './clean.js';

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [1024 * 1024, '1.0 MB'],
    [1.5 * 1024 * 1024, '1.5 MB'],
    [1024 ** 3, '1.0 GB'],
    [2.3 * 1024 ** 3, '2.3 GB'],
  ])('formatBytes(%i) → "%s"', (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });
});

describe('CLEAN_TARGETS', () => {
  it('contains the required target ids', () => {
    const ids = CLEAN_TARGETS.map((t) => t.id);
    for (const id of [
      'system-caches',
      'system-logs',
      'trash',
      'xcode-derived',
      'simulator-caches',
      'brew',
      'npm',
      'pnpm',
      'yarn',
      'pip',
      'gradle',
      'maven',
      'docker',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('all path-kind targets have a path defined', () => {
    for (const t of CLEAN_TARGETS.filter((t) => t.kind === 'path')) {
      expect(t.path).toBeDefined();
    }
  });

  it('docker target has kind "docker" and no path', () => {
    const docker = CLEAN_TARGETS.find((t) => t.id === 'docker');
    expect(docker?.kind).toBe('docker');
    expect(docker?.path).toBeUndefined();
  });
});

describe('scanTargets', () => {
  it('returns empty array when all targets are missing or unavailable', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: 'not found', code: 1 }),
      spawn: vi.fn(),
    };
    const result = await scanTargets(exec);
    expect(result).toHaveLength(0);
  });

  it('includes a path target when du reports non-zero bytes', async () => {
    const exec = {
      run: vi.fn().mockImplementation(async (_cmd: string, args: string[]) => {
        if (_cmd === 'du') return { stdout: `2048\t${args[1]}\n`, stderr: '', code: 0 };
        return { stdout: '', stderr: '', code: 1 };
      }),
      spawn: vi.fn(),
    };
    const custom: CleanTarget[] = [
      { id: 'test-path', label: 'Test', kind: 'path', path: '/test/path' },
    ];
    const result = await scanTargets(exec, custom);
    expect(result).toHaveLength(1);
    expect(result[0].bytes).toBe(2048 * 1024);
    expect(result[0].target.id).toBe('test-path');
  });

  it('excludes a path target when du returns zero bytes', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '0\t/path\n', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    const custom: CleanTarget[] = [
      { id: 'test-path', label: 'Test', kind: 'path', path: '/test/path' },
    ];
    const result = await scanTargets(exec, custom);
    expect(result).toHaveLength(0);
  });

  it('includes docker target when docker info exits 0', async () => {
    const exec = {
      run: vi.fn().mockImplementation(async (cmd: string) => {
        if (cmd === 'docker') return { stdout: '', stderr: '', code: 0 };
        return { stdout: '', stderr: '', code: 1 };
      }),
      spawn: vi.fn(),
    };
    const custom: CleanTarget[] = [{ id: 'docker', label: 'Docker', kind: 'docker' }];
    const result = await scanTargets(exec, custom);
    expect(result).toHaveLength(1);
    expect(result[0].bytes).toBe(0);
  });

  it('excludes docker target when docker info exits non-zero', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 1 }),
      spawn: vi.fn(),
    };
    const custom: CleanTarget[] = [{ id: 'docker', label: 'Docker', kind: 'docker' }];
    const result = await scanTargets(exec, custom);
    expect(result).toHaveLength(0);
  });

  it('resolves brew cache path and measures it', async () => {
    const exec = {
      run: vi.fn().mockImplementation(async (cmd: string, args: string[]) => {
        if (cmd === 'brew' && args[0] === '--cache') {
          return { stdout: '/usr/local/Cellar/cache\n', stderr: '', code: 0 };
        }
        if (cmd === 'du') return { stdout: `4096\t${args[1]}\n`, stderr: '', code: 0 };
        return { stdout: '', stderr: '', code: 1 };
      }),
      spawn: vi.fn(),
    };
    const custom: CleanTarget[] = [{ id: 'brew', label: 'Homebrew cache', kind: 'brew' }];
    const result = await scanTargets(exec, custom);
    expect(result).toHaveLength(1);
    expect(result[0].target.path).toBe('/usr/local/Cellar/cache');
    expect(result[0].bytes).toBe(4096 * 1024);
  });

  it('excludes brew target when brew is not installed', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 1 }),
      spawn: vi.fn(),
    };
    const custom: CleanTarget[] = [{ id: 'brew', label: 'Homebrew cache', kind: 'brew' }];
    const result = await scanTargets(exec, custom);
    expect(result).toHaveLength(0);
  });
});
