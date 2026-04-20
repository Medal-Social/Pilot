// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
import { LocalProvider } from './local.js';
import { resolveProvider } from './resolve.js';

describe('resolveProvider (v1)', () => {
  it('returns LocalProvider unconditionally', () => {
    const p = resolveProvider();
    expect(p).toBeInstanceOf(LocalProvider);
  });
});
