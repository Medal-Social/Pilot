// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
import { initSteps } from './init.js';

describe('initSteps', () => {
  it('skips xcode + rosetta on linux', () => {
    const steps = initSteps({ platform: 'linux', arch: 'x64' });
    const ids = steps.map((s) => s.id);
    expect(ids).not.toContain('xcode');
    expect(ids).not.toContain('rosetta');
    expect(ids).toContain('nix');
  });

  it('includes xcode but not rosetta on darwin x64', () => {
    const ids = initSteps({ platform: 'darwin', arch: 'x64' }).map((s) => s.id);
    expect(ids).toContain('xcode');
    expect(ids).not.toContain('rosetta');
  });

  it('includes rosetta on darwin arm64', () => {
    const ids = initSteps({ platform: 'darwin', arch: 'arm64' }).map((s) => s.id);
    expect(ids).toContain('rosetta');
  });

  it('always ends with rebuild', () => {
    const steps = initSteps({ platform: 'darwin', arch: 'arm64' });
    expect(steps[steps.length - 1].id).toBe('rebuild');
  });
});
