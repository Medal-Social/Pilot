// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ModelBreakdown, UsageEntry, UsageWindow } from './types.js';

export function applyDateFilter(entries: UsageEntry[], window: UsageWindow): UsageEntry[] {
  return entries.filter((e) => e.timestamp >= window.since && e.timestamp <= window.until);
}

export function groupByModel(entries: UsageEntry[]): ModelBreakdown[] {
  const map = new Map<string, ModelBreakdown>();
  for (const e of entries) {
    const existing = map.get(e.model);
    if (existing) {
      existing.inputTokens += e.inputTokens;
      existing.outputTokens += e.outputTokens;
      existing.cacheTokens += e.cacheCreationTokens + e.cacheReadTokens;
      existing.costUSD += e.costUSD;
      if (!e.costKnown) existing.costUnknown = true;
    } else {
      map.set(e.model, {
        model: e.model,
        inputTokens: e.inputTokens,
        outputTokens: e.outputTokens,
        cacheTokens: e.cacheCreationTokens + e.cacheReadTokens,
        costUSD: e.costUSD,
        costUnknown: !e.costKnown,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.costUSD - a.costUSD);
}
