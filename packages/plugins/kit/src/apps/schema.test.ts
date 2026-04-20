// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
import { appsSchema } from './schema.js';

describe('appsSchema', () => {
  it('accepts empty arrays', () => {
    expect(appsSchema.parse({ casks: [], brews: [] })).toEqual({ casks: [], brews: [] });
  });

  it('accepts valid Homebrew names', () => {
    expect(
      appsSchema.parse({
        casks: ['1password', 'rectangle', 'visual-studio-code'],
        brews: ['ripgrep'],
      })
    ).toBeTruthy();
  });

  it('rejects names with spaces', () => {
    expect(() => appsSchema.parse({ casks: ['bad name'], brews: [] })).toThrow();
  });

  it('rejects non-array fields', () => {
    expect(() => appsSchema.parse({ casks: 'foo', brews: [] })).toThrow();
  });
});
