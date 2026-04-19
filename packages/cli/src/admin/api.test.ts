// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminAPI } from './api.js';
import type { AdminSDK } from './types.js';

function createMockSDK(): AdminSDK {
  return {
    getUser: vi.fn().mockResolvedValue({
      email: 'ali@medalsocial.com',
      role: 'super_admin',
    }),
    getServices: vi.fn().mockResolvedValue([
      { name: 'auth', status: 'healthy' },
      { name: 'api', status: 'healthy' },
      { name: 'realtime', status: 'warning', message: 'High latency' },
    ]),
    getQuickStats: vi.fn().mockResolvedValue({
      totalWorkspaces: 12,
      liveSites: 11,
      warnings: 1,
      mrr: 2400,
    }),
    getWorkspaces: vi.fn().mockResolvedValue([
      {
        id: 'ws-1',
        name: 'Sunrise Bakery',
        status: 'active',
        siteStatus: 'live',
        plan: 'Pro',
        mrr: 299,
        lastActive: '2m ago',
      },
    ]),
    getWorkspaceDetail: vi.fn().mockResolvedValue({
      id: 'ws-1',
      name: 'Sunrise Bakery',
      status: 'active',
      siteStatus: 'live',
      plan: 'Pro',
      mrr: 299,
      lastActive: '2m ago',
      sslValid: true,
      dnsConfigured: true,
      uptime: 14,
      monthlyVisits: 847,
      visitsTrend: 12,
      scheduledPosts: 3,
      nextPostAt: 'tomorrow 9am',
      recentActivity: [{ description: 'Blog post published', timestamp: '2h ago' }],
    }),
    getContentStats: vi.fn().mockResolvedValue({
      published: 24,
      drafts: 3,
      scheduled: 5,
      datasets: [{ name: 'production', documentCount: 150 }],
    }),
  };
}

describe('createAdminAPI', () => {
  it('fetches user on init', async () => {
    const sdk = createMockSDK();
    const api = createAdminAPI(sdk);
    const user = await api.fetchUser();
    expect(user.email).toBe('ali@medalsocial.com');
    expect(sdk.getUser).toHaveBeenCalledOnce();
  });

  it('fetches dashboard data', async () => {
    const sdk = createMockSDK();
    const api = createAdminAPI(sdk);
    const data = await api.fetchDashboard();
    expect(data.services).toHaveLength(3);
    expect(data.stats.totalWorkspaces).toBe(12);
  });

  it('fetches workspaces', async () => {
    const sdk = createMockSDK();
    const api = createAdminAPI(sdk);
    const workspaces = await api.fetchWorkspaces();
    expect(workspaces).toHaveLength(1);
    expect(workspaces[0].name).toBe('Sunrise Bakery');
  });

  it('fetches workspace detail', async () => {
    const sdk = createMockSDK();
    const api = createAdminAPI(sdk);
    const detail = await api.fetchWorkspaceDetail('ws-1');
    expect(detail.monthlyVisits).toBe(847);
    expect(sdk.getWorkspaceDetail).toHaveBeenCalledWith('ws-1');
  });

  it('fetches content stats', async () => {
    const sdk = createMockSDK();
    const api = createAdminAPI(sdk);
    const stats = await api.fetchContentStats('ws-1');
    expect(stats.published).toBe(24);
    expect(sdk.getContentStats).toHaveBeenCalledWith('ws-1');
  });
});
