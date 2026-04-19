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

export interface DashboardData {
  services: ServiceHealth[];
  stats: QuickStats;
}

export interface AdminAPI {
  fetchUser(): Promise<AdminUser>;
  fetchDashboard(): Promise<DashboardData>;
  fetchWorkspaces(): Promise<WorkspaceSummary[]>;
  fetchWorkspaceDetail(id: string): Promise<WorkspaceDetail>;
  fetchContentStats(workspaceId: string): Promise<ContentStats>;
}

export function createAdminAPI(sdk: AdminSDK): AdminAPI {
  return {
    async fetchUser() {
      return sdk.getUser();
    },

    async fetchDashboard() {
      const [services, stats] = await Promise.all([sdk.getServices(), sdk.getQuickStats()]);
      return { services, stats };
    },

    async fetchWorkspaces() {
      return sdk.getWorkspaces();
    },

    async fetchWorkspaceDetail(id: string) {
      return sdk.getWorkspaceDetail(id);
    },

    async fetchContentStats(workspaceId: string) {
      return sdk.getContentStats(workspaceId);
    },
  };
}
