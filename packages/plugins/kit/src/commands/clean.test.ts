// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { CLEAN_TARGETS, formatBytes } from './clean.js';

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
