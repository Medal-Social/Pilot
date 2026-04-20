// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type ServiceStatus = 'healthy' | 'warning' | 'critical' | 'idle';

export type WorkspaceStatus = 'active' | 'trial' | 'suspended' | 'churned';

export type SiteStatus = 'live' | 'setup' | 'down' | 'building';

export type AdminRole = 'super_admin' | 'owner' | 'admin';

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  latency?: number;
  message?: string;
}

export interface QuickStats {
  totalWorkspaces: number;
  liveSites: number;
  warnings: number;
  mrr: number;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  status: WorkspaceStatus;
  siteStatus: SiteStatus;
  plan: string;
  mrr: number;
  lastActive: string;
  domain?: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  status: WorkspaceStatus;
  siteStatus: SiteStatus;
  plan: string;
  mrr: number;
  lastActive: string;
  domain?: string;
  sslValid: boolean;
  dnsConfigured: boolean;
  uptime: number;
  monthlyVisits: number;
  visitsTrend: number;
  scheduledPosts: number;
  nextPostAt?: string;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  description: string;
  timestamp: string;
}

export interface ContentStats {
  published: number;
  drafts: number;
  scheduled: number;
  datasets: DatasetStat[];
}

export interface DatasetStat {
  name: string;
  documentCount: number;
}

export interface AdminUser {
  email: string;
  role: AdminRole;
  workspaceId?: string;
  workspaceName?: string;
}

export interface AdminSDK {
  getUser(): Promise<AdminUser>;
  getServices(): Promise<ServiceHealth[]>;
  getQuickStats(): Promise<QuickStats>;
  getWorkspaces(): Promise<WorkspaceSummary[]>;
  getWorkspaceDetail(id: string): Promise<WorkspaceDetail>;
  getContentStats(workspaceId: string): Promise<ContentStats>;
}
