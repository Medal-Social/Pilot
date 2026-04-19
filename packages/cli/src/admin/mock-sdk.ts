// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import type {
  AdminSDK,
  AdminUser,
  ContentStats,
  QuickStats,
  ServiceHealth,
  WorkspaceDetail,
  WorkspaceSummary,
} from './types.js';

interface MockOptions {
  role?: 'super_admin' | 'owner' | 'admin';
  workspaceId?: string;
}

const MOCK_SERVICES: ServiceHealth[] = [
  { name: 'auth', status: 'healthy' },
  { name: 'api', status: 'healthy' },
  { name: 'email', status: 'healthy' },
  { name: 'realtime', status: 'warning', message: 'High latency (320ms)' },
  { name: 'scheduler', status: 'healthy' },
  { name: 'storage', status: 'healthy' },
  { name: 'contacts', status: 'healthy' },
  { name: 'events', status: 'healthy' },
];

const MOCK_WORKSPACES: WorkspaceSummary[] = [
  {
    id: 'ws-1',
    name: 'Sunrise Bakery',
    status: 'active',
    siteStatus: 'live',
    plan: 'Pro',
    mrr: 299,
    lastActive: '2m ago',
  },
  {
    id: 'ws-2',
    name: 'Coastal Fitness',
    status: 'active',
    siteStatus: 'live',
    plan: 'Pro',
    mrr: 299,
    lastActive: '14m ago',
  },
  {
    id: 'ws-3',
    name: 'Mountain View Dental',
    status: 'active',
    siteStatus: 'live',
    plan: 'Starter',
    mrr: 149,
    lastActive: '1h ago',
  },
  {
    id: 'ws-4',
    name: 'Bloom Florist',
    status: 'trial',
    siteStatus: 'setup',
    plan: 'Trial',
    mrr: 0,
    lastActive: '3d ago',
  },
  {
    id: 'ws-5',
    name: 'Peak Performance Auto',
    status: 'active',
    siteStatus: 'live',
    plan: 'Pro',
    mrr: 299,
    lastActive: '45m ago',
  },
  {
    id: 'ws-6',
    name: 'Harbor Seafood',
    status: 'active',
    siteStatus: 'down',
    plan: 'Pro',
    mrr: 299,
    lastActive: '6h ago',
  },
];

function mockDetail(ws: WorkspaceSummary): WorkspaceDetail {
  return {
    ...ws,
    sslValid: ws.siteStatus === 'live',
    dnsConfigured: ws.siteStatus !== 'setup',
    uptime: ws.siteStatus === 'live' ? 14 : 0,
    monthlyVisits: ws.siteStatus === 'live' ? 847 : 0,
    visitsTrend: 12,
    scheduledPosts: 3,
    nextPostAt: 'tomorrow 9am',
    recentActivity: [
      { description: 'Blog post published', timestamp: '2h ago' },
      { description: 'Instagram post scheduled', timestamp: '5h ago' },
      { description: 'SSL certificate renewed', timestamp: '2d ago' },
    ],
  };
}

export function createMockAdminSDK(options: MockOptions = {}): AdminSDK {
  const { role = 'super_admin', workspaceId } = options;

  return {
    async getUser(): Promise<AdminUser> {
      if (role === 'super_admin') {
        return { email: 'ali@medalsocial.com', role: 'super_admin' };
      }
      const ws = MOCK_WORKSPACES.find((w) => w.id === workspaceId) ?? MOCK_WORKSPACES[0];
      return { email: 'user@example.com', role, workspaceId: ws.id, workspaceName: ws.name };
    },

    async getServices(): Promise<ServiceHealth[]> {
      return MOCK_SERVICES;
    },

    async getQuickStats(): Promise<QuickStats> {
      return {
        totalWorkspaces: MOCK_WORKSPACES.length,
        liveSites: MOCK_WORKSPACES.filter((w) => w.siteStatus === 'live').length,
        warnings: MOCK_SERVICES.filter((s) => s.status === 'warning').length,
        mrr: MOCK_WORKSPACES.reduce((sum, w) => sum + w.mrr, 0),
      };
    },

    async getWorkspaces(): Promise<WorkspaceSummary[]> {
      return MOCK_WORKSPACES;
    },

    async getWorkspaceDetail(id: string): Promise<WorkspaceDetail> {
      const ws = MOCK_WORKSPACES.find((w) => w.id === id) ?? MOCK_WORKSPACES[0];
      return mockDetail(ws);
    },

    async getContentStats(): Promise<ContentStats> {
      return {
        published: 24,
        drafts: 3,
        scheduled: 5,
        datasets: [
          { name: 'production', documentCount: 150 },
          { name: 'staging', documentCount: 42 },
        ],
      };
    },
  };
}
