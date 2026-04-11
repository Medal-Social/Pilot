// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
import { colors } from './colors.js';

describe('colors', () => {
  it('exports all brand colors', () => {
    expect(colors.bg).toBe('#09090B');
    expect(colors.primary).toBe('#9A6AC2');
    expect(colors.success).toBe('#2DD4BF');
    expect(colors.warning).toBe('#FBBF24');
    expect(colors.error).toBe('#EF4444');
    expect(colors.text).toBe('#F4F4F5');
    expect(colors.muted).toBe('#71717A');
    expect(colors.border).toBe('#2E2E33');
    expect(colors.card).toBe('#18181B');
  });
});
