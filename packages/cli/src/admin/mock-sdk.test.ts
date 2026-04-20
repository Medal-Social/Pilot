// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { createMockAdminSDK } from './mock-sdk.js';

describe('createMockAdminSDK', () => {
  it('returns a super admin user by default', async () => {
    const sdk = createMockAdminSDK();
    const user = await sdk.getUser();
    expect(user.role).toBe('super_admin');
    expect(user.email).toContain('medalsocial');
  });

  it('returns a workspace user when configured', async () => {
    const sdk = createMockAdminSDK({ role: 'owner', workspaceId: 'ws-1' });
    const user = await sdk.getUser();
    expect(user.role).toBe('owner');
    expect(user.workspaceId).toBe('ws-1');
  });

  it('returns services with at least one warning', async () => {
    const sdk = createMockAdminSDK();
    const services = await sdk.getServices();
    expect(services.length).toBeGreaterThan(0);
    expect(services.some((s) => s.status === 'warning')).toBe(true);
  });

  it('returns workspaces with mixed statuses', async () => {
    const sdk = createMockAdminSDK();
    const workspaces = await sdk.getWorkspaces();
    expect(workspaces.length).toBeGreaterThan(3);
    expect(workspaces.some((w) => w.siteStatus === 'down')).toBe(true);
  });

  it('returns workspace detail for a given ID', async () => {
    const sdk = createMockAdminSDK();
    const workspaces = await sdk.getWorkspaces();
    const detail = await sdk.getWorkspaceDetail(workspaces[0].id);
    expect(detail.id).toBe(workspaces[0].id);
    expect(detail.recentActivity.length).toBeGreaterThan(0);
  });

  it('returns content stats for a workspace', async () => {
    const sdk = createMockAdminSDK();
    const stats = await sdk.getContentStats('ws-1');
    expect(stats.published).toBeGreaterThan(0);
    expect(stats.datasets.length).toBeGreaterThan(0);
  });

  it('returns zero uptime and visits for non-live workspace', async () => {
    const sdk = createMockAdminSDK();
    // ws-4 (Bloom Florist) has siteStatus: 'setup' — not live
    const detail = await sdk.getWorkspaceDetail('ws-4');
    expect(detail.uptime).toBe(0);
    expect(detail.monthlyVisits).toBe(0);
  });

  it('falls back to first workspace in getWorkspaceDetail when id not found', async () => {
    const sdk = createMockAdminSDK();
    const detail = await sdk.getWorkspaceDetail('nonexistent-id');
    expect(detail.name).toBe('Sunrise Bakery');
  });

  it('falls back to first workspace in getUser when workspaceId not found', async () => {
    const sdk = createMockAdminSDK({ role: 'admin', workspaceId: 'nonexistent-id' });
    const user = await sdk.getUser();
    expect(user.workspaceId).toBe('ws-1');
  });
});
