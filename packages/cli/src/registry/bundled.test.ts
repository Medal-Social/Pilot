// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BUNDLED_REGISTRY } from './bundled.js';
import { RegistryIndexSchema } from './types.js';

describe('BUNDLED_REGISTRY', () => {
  it('is a valid RegistryIndex', () => {
    expect(() => RegistryIndexSchema.parse(BUNDLED_REGISTRY)).not.toThrow();
  });

  it('includes pencil, remotion, nextmedal', () => {
    const names = BUNDLED_REGISTRY.templates.map((t) => t.name);
    expect(names).toContain('pencil');
    expect(names).toContain('remotion');
    expect(names).toContain('nextmedal');
  });

  it('sha256 matches the templates array', () => {
    const expected = createHash('sha256')
      .update(JSON.stringify(BUNDLED_REGISTRY.templates))
      .digest('hex');
    expect(BUNDLED_REGISTRY.sha256).toBe(expected);
  });
});
