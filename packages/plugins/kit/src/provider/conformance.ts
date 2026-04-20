// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'vitest';
import type { FleetProvider, ProviderContext } from './types.js';

const ctx: ProviderContext = { machineId: 'm', user: 'u', kitRepoDir: '/tmp' };

export async function runConformanceSuite(provider: FleetProvider): Promise<void> {
  expect(provider.id).toMatch(/^[a-z][a-z0-9-]*$/);
  expect(provider.displayName.length).toBeGreaterThan(0);

  const apps = await provider.getRequiredApps(ctx);
  expect(apps).toHaveProperty('casks');
  expect(apps).toHaveProperty('brews');
  expect(apps).toHaveProperty('source');
  expect(typeof apps.source).toBe('string');

  const plugins = await provider.getRequiredPlugins(ctx);
  expect(plugins).toHaveProperty('plugins');
  expect(plugins).toHaveProperty('source');

  const baseline = await provider.getSecurityBaseline(ctx);
  expect(Array.isArray(baseline)).toBe(true);

  await expect(
    provider.reportStatus(ctx, {
      machineId: 'm',
      os: 'macOS',
      arch: 'arm64',
      kitCommit: null,
      appsCount: 0,
    })
  ).resolves.toBeUndefined();

  if (provider.subscribe) {
    const sub = provider.subscribe(ctx, () => {});
    sub.dispose();
    expect(() => sub.dispose()).not.toThrow();
  }
}
