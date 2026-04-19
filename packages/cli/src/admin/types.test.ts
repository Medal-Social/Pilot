// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
import type {
  AdminSDK,
  AdminUser,
  ContentStats,
  QuickStats,
  ServiceHealth,
  WorkspaceDetail,
  WorkspaceSummary,
} from './types.js';

describe('Admin types', () => {
  it('ServiceHealth has required fields', () => {
    const service: ServiceHealth = {
      name: 'auth',
      status: 'healthy',
    };
    expect(service.name).toBe('auth');
    expect(service.status).toBe('healthy');
  });

  it('WorkspaceSummary has required fields', () => {
    const ws: WorkspaceSummary = {
      id: 'ws-1',
      name: 'Test Workspace',
      status: 'active',
      siteStatus: 'live',
      plan: 'Pro',
      mrr: 299,
      lastActive: '2m ago',
    };
    expect(ws.name).toBe('Test Workspace');
  });

  it('AdminUser supports all roles', () => {
    const superAdmin: AdminUser = { email: 'ali@medalsocial.com', role: 'super_admin' };
    const owner: AdminUser = {
      email: 'jake@coastal.com',
      role: 'owner',
      workspaceId: 'ws-1',
      workspaceName: 'Coastal Fitness',
    };
    const admin: AdminUser = {
      email: 'sam@coastal.com',
      role: 'admin',
      workspaceId: 'ws-1',
      workspaceName: 'Coastal Fitness',
    };
    expect(superAdmin.role).toBe('super_admin');
    expect(owner.role).toBe('owner');
    expect(admin.role).toBe('admin');
  });
});
