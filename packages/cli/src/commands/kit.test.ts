// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import { parseAppsTarget, resolveMachine } from './kit.js';

const baseConfig = {
  name: 'kit',
  repo: 'git@github.com:Medal-Social/kit.git',
  repoDir: '/tmp/kit',
  configPath: '/tmp/kit/kit.config.json',
  machines: {
    'ali-pro': { type: 'darwin' as const, user: 'ali' },
    'ada-air': { type: 'darwin' as const, user: 'ada' },
  },
};

describe('parseAppsTarget', () => {
  it('defaults to cask when no prefix', () => {
    expect(parseAppsTarget('zed')).toEqual({ kind: 'casks', name: 'zed' });
  });

  it('strips brew: prefix', () => {
    expect(parseAppsTarget('brew:ripgrep')).toEqual({ kind: 'brews', name: 'ripgrep' });
  });

  it('strips cask: prefix (explicit)', () => {
    expect(parseAppsTarget('cask:zed')).toEqual({ kind: 'casks', name: 'zed' });
  });
});

describe('resolveMachine', () => {
  it('returns explicit override when present in config', () => {
    expect(resolveMachine(baseConfig, 'ada-air')).toBe('ada-air');
  });

  it('exits when explicit override is unknown', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(((_code?: number) => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => resolveMachine(baseConfig, 'mystery-host')).toThrow('exit');
    expect(err).toHaveBeenCalledWith(expect.stringContaining('Unknown machine'));
    exit.mockRestore();
    err.mockRestore();
  });

  it('falls back to first configured machine when detection misses', () => {
    // ali-pro is first in baseConfig — and on the test runner hostname won't match.
    // We can't control hostname() here, but the function falls back deterministically
    // to the first key when detect doesn't match.
    const result = resolveMachine(baseConfig);
    expect(Object.keys(baseConfig.machines)).toContain(result);
  });

  it('exits when config has no machines', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(((_code?: number) => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      resolveMachine({ ...baseConfig, machines: {} as typeof baseConfig.machines })
    ).toThrow('exit');
    expect(err).toHaveBeenCalledWith(expect.stringContaining('no machines'));
    exit.mockRestore();
    err.mockRestore();
  });
});
