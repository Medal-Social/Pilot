// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { LocalProvider } from './local.js';

const ctx = { machineId: 'm', user: 'u', kitRepoDir: '/tmp' };

describe('LocalProvider', () => {
  const p = new LocalProvider();

  it('has a stable id', () => {
    expect(p.id).toBe('local');
  });

  it('returns empty required apps from local source', async () => {
    const r = await p.getRequiredApps(ctx);
    expect(r.casks).toHaveLength(0);
    expect(r.brews).toHaveLength(0);
    expect(r.source).toBe('local');
  });

  it('returns empty required plugins', async () => {
    const r = await p.getRequiredPlugins(ctx);
    expect(r.plugins).toHaveLength(0);
  });

  it('returns no security baseline', async () => {
    expect(await p.getSecurityBaseline(ctx)).toEqual([]);
  });

  it('reportStatus is a no-op (resolves)', async () => {
    await expect(
      p.reportStatus(ctx, {
        machineId: 'm',
        os: 'macOS',
        arch: 'arm64',
        kitCommit: null,
        appsCount: 0,
      })
    ).resolves.toBeUndefined();
  });
});
