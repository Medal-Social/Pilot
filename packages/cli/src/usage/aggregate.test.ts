// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { applyDateFilter, groupByModel } from './aggregate.js';
import type { UsageEntry } from './types.js';

function makeEntry(overrides: Partial<UsageEntry> = {}): UsageEntry {
  return {
    timestamp: new Date('2026-04-22T10:00:00Z'),
    model: 'claude-opus-4',
    inputTokens: 1000,
    outputTokens: 500,
    cacheCreationTokens: 100,
    cacheReadTokens: 50,
    costUSD: 0.5,
    costKnown: true,
    provider: 'claude',
    ...overrides,
  };
}

describe('applyDateFilter', () => {
  const window = {
    since: new Date('2026-04-22T00:00:00Z'),
    until: new Date('2026-04-22T23:59:59Z'),
    label: 'today',
  };

  it('keeps entries within the window', () => {
    const entry = makeEntry({ timestamp: new Date('2026-04-22T12:00:00Z') });
    expect(applyDateFilter([entry], window)).toHaveLength(1);
  });

  it('excludes entries before the window', () => {
    const entry = makeEntry({ timestamp: new Date('2026-04-21T23:59:59Z') });
    expect(applyDateFilter([entry], window)).toHaveLength(0);
  });

  it('excludes entries after the window', () => {
    const entry = makeEntry({ timestamp: new Date('2026-04-23T00:00:01Z') });
    expect(applyDateFilter([entry], window)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(applyDateFilter([], window)).toHaveLength(0);
  });
});

describe('groupByModel', () => {
  it('groups entries by model and sums tokens', () => {
    const entries = [
      makeEntry({
        model: 'claude-opus-4',
        inputTokens: 1000,
        outputTokens: 200,
        cacheCreationTokens: 50,
        cacheReadTokens: 10,
        costUSD: 0.5,
      }),
      makeEntry({
        model: 'claude-opus-4',
        inputTokens: 500,
        outputTokens: 100,
        cacheCreationTokens: 20,
        cacheReadTokens: 5,
        costUSD: 0.25,
      }),
    ];
    const result = groupByModel(entries);
    expect(result).toHaveLength(1);
    expect(result[0]?.model).toBe('claude-opus-4');
    expect(result[0]?.inputTokens).toBe(1500);
    expect(result[0]?.outputTokens).toBe(300);
    expect(result[0]?.cacheTokens).toBe(85); // 70 creation + 15 read
    expect(result[0]?.costUSD).toBeCloseTo(0.75);
  });

  it('separates different models', () => {
    const entries = [
      makeEntry({ model: 'claude-opus-4' }),
      makeEntry({ model: 'claude-sonnet-4-6' }),
    ];
    expect(groupByModel(entries)).toHaveLength(2);
  });

  it('sorts by cost descending', () => {
    const entries = [
      makeEntry({ model: 'cheap-model', costUSD: 0.01 }),
      makeEntry({ model: 'expensive-model', costUSD: 1.0 }),
    ];
    const result = groupByModel(entries);
    expect(result[0]?.model).toBe('expensive-model');
    expect(result[1]?.model).toBe('cheap-model');
  });

  it('marks costUnknown when any entry has costKnown=false', () => {
    const entries = [
      makeEntry({ model: 'gpt-5', costKnown: false, costUSD: 0 }),
      makeEntry({ model: 'gpt-5', costKnown: true, costUSD: 0.5 }),
    ];
    const result = groupByModel(entries);
    expect(result[0]?.costUnknown).toBe(true);
  });

  it('returns empty array for empty input', () => {
    expect(groupByModel([])).toHaveLength(0);
  });
});
