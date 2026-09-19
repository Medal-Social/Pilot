// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeStandaloneHost } from './standalone.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('standalone default integrations', () => {
  it.each([
    ['info', 'log'],
    ['warn', 'warn'],
    ['error', 'error'],
  ] as const)('routes %s messages and optional metadata to console.%s', (level, method) => {
    const sink = vi.spyOn(console, method).mockImplementation(() => {});
    const host = makeStandaloneHost();
    host.log[level]('ready');
    host.log[level]('ready', { plugin: 'dispatch' });
    expect(sink.mock.calls).toEqual([
      [`[pilot:${level}] ready`, ''],
      [`[pilot:${level}] ready`, { plugin: 'dispatch' }],
    ]);
  });

  it('suppresses debug output unless DEBUG is enabled, preserving optional metadata', () => {
    const sink = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const host = makeStandaloneHost();
    vi.stubEnv('DEBUG', '');
    host.log.debug('hidden');
    expect(sink).not.toHaveBeenCalled();
    vi.stubEnv('DEBUG', '1');
    host.log.debug('visible');
    host.log.debug('visible', { retry: 2 });
    expect(sink.mock.calls).toEqual([
      ['[pilot:debug] visible', ''],
      ['[pilot:debug] visible', { retry: 2 }],
    ]);
  });

  it('uses process environment secrets by default and preserves empty values', async () => {
    vi.stubEnv('PILOT_COVERAGE_SECRET', 'fixture');
    const host = makeStandaloneHost();
    expect(await host.secrets.get('PILOT_COVERAGE_SECRET')).toBe('fixture');
    vi.stubEnv('PILOT_COVERAGE_SECRET', '');
    expect(await host.secrets.get('PILOT_COVERAGE_SECRET')).toBe('');
  });
});
