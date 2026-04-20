// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('colors (normal mode)', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NO_COLOR;
    delete process.env.FORCE_COLOR;
  });

  it('exports all brand colors', async () => {
    const { colors } = await import('./colors.js');
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

  it('isColorEnabled is true when NO_COLOR is not set', async () => {
    const { isColorEnabled } = await import('./colors.js');
    expect(isColorEnabled).toBe(true);
  });
});

describe('colors (NO_COLOR mode)', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NO_COLOR = '';
  });

  afterEach(() => {
    delete process.env.NO_COLOR;
  });

  it('all color values are undefined when NO_COLOR is set (so Ink omits styling)', async () => {
    const { colors } = await import('./colors.js');
    for (const key of Object.keys(colors)) {
      expect(colors[key as keyof typeof colors]).toBeUndefined();
    }
  });

  it('isColorEnabled is false when NO_COLOR is set', async () => {
    const { isColorEnabled } = await import('./colors.js');
    expect(isColorEnabled).toBe(false);
  });

  it('NO_COLOR with a non-empty value also disables colors', async () => {
    vi.resetModules();
    process.env.NO_COLOR = '1';
    const { colors, isColorEnabled } = await import('./colors.js');
    expect(isColorEnabled).toBe(false);
    expect(colors.primary).toBeUndefined();
  });
});

describe('FORCE_COLOR', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NO_COLOR;
    process.env.FORCE_COLOR = '1';
  });

  afterEach(() => {
    delete process.env.FORCE_COLOR;
  });

  it('colors are present when FORCE_COLOR is set and NO_COLOR is absent', async () => {
    const { colors, isColorEnabled } = await import('./colors.js');
    expect(isColorEnabled).toBe(true);
    expect(colors.primary).toBe('#9A6AC2');
    expect(colors.error).toBe('#EF4444');
  });

  it('colors are present in non-TTY mode when FORCE_COLOR is set', async () => {
    const originalIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = false;

    const { colors, isColorEnabled } = await import('./colors.js');
    expect(isColorEnabled).toBe(true);
    expect(colors.primary).toBe('#9A6AC2');
    expect(colors.bg).toBe('#09090B');
    expect(colors.error).toBe('#EF4444');

    process.stdout.isTTY = originalIsTTY;
  });
});
