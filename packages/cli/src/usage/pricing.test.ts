// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { CODEX_PRICES, computeCodexCost } from './pricing.js';

describe('CODEX_PRICES', () => {
  it('contains gpt-5', () => {
    expect(CODEX_PRICES['gpt-5']).toBeDefined();
  });

  it('contains gpt-4o', () => {
    expect(CODEX_PRICES['gpt-4o']).toBeDefined();
  });

  it('gpt-5 input rate is $30/M', () => {
    expect(CODEX_PRICES['gpt-5']?.inputPerM).toBe(30);
  });
});

describe('computeCodexCost', () => {
  it('returns null for unknown model', () => {
    expect(computeCodexCost('unknown-xyz', 1000, 0, 1000)).toBeNull();
  });

  it('computes cost for 1M input + 1M output on gpt-5', () => {
    // gpt-5: $30/M input + $60/M output = $90
    expect(computeCodexCost('gpt-5', 1_000_000, 0, 1_000_000)).toBeCloseTo(90);
  });

  it('applies cached input rate', () => {
    // gpt-5: $7.5/M cached input
    expect(computeCodexCost('gpt-5', 0, 1_000_000, 0)).toBeCloseTo(7.5);
  });

  it('computes cost for small token counts', () => {
    // gpt-4o-mini: $0.15/M input, $0.6/M output
    // 10k input = $0.0015, 5k output = $0.003 → $0.0045
    expect(computeCodexCost('gpt-4o-mini', 10_000, 0, 5_000)).toBeCloseTo(0.0045);
  });

  it('returns 0 cost for zero tokens', () => {
    expect(computeCodexCost('gpt-5', 0, 0, 0)).toBeCloseTo(0);
  });
});
