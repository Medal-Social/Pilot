// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export interface UsageWindow {
  since: Date;
  until: Date;
  label: string;
}

export interface UsageEntry {
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUSD: number;
  costKnown: boolean;
  provider: 'claude' | 'codex';
}

export interface ModelBreakdown {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  costUSD: number;
  costUnknown: boolean;
}

export interface ProviderReport {
  provider: 'claude' | 'codex';
  scope: string;
  models: ModelBreakdown[];
  totalCostUSD: number;
  hasCostUnknown: boolean;
}

export interface UsageReport {
  window: UsageWindow;
  project: string;
  providers: ProviderReport[];
  grandTotalCostUSD: number;
}
