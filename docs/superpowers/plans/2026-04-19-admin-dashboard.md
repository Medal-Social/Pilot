# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `pilot admin` — a full-screen CLI command center with a persistent health strip, tabbed panels, and keyboard navigation, powered by the Medal Social SDK. Phase 1 ships the customer-facing workspace view.

**Architecture:** Hybrid dashboard layout with a persistent HealthStrip at the top (service status dots + quick stats), a TabBar for panel switching, and swappable panel components below. Data flows through an SDK wrapper (`admin/api.ts`) that handles polling, loading states, and role-based scoping. The screen reuses existing components (TabBar, StatusBar, Modal, SplitPanel) and follows the established React Ink patterns.

**Tech Stack:** React Ink, Commander.js, Vitest, ink-testing-library, Medal Social SDK (interface-first, concrete implementation later)

**Spec:** `docs/superpowers/specs/2026-04-19-admin-dashboard-design.md`

---

### Task 1: Admin Types and SDK Interface

**Files:**
- Create: `packages/cli/src/admin/types.ts`
- Test: `packages/cli/src/admin/types.test.ts`

- [ ] **Step 1: Write the type definitions**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

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
```

- [ ] **Step 2: Write the SDK interface**

Add to the bottom of `packages/cli/src/admin/types.ts`:

```typescript
export interface AdminSDK {
  getUser(): Promise<AdminUser>;
  getServices(): Promise<ServiceHealth[]>;
  getQuickStats(): Promise<QuickStats>;
  getWorkspaces(): Promise<WorkspaceSummary[]>;
  getWorkspaceDetail(id: string): Promise<WorkspaceDetail>;
  getContentStats(workspaceId: string): Promise<ContentStats>;
}
```

- [ ] **Step 3: Write tests to verify types compile correctly**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm vitest run src/admin/types.test.ts`
Expected: PASS — all 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/admin/types.ts packages/cli/src/admin/types.test.ts
git commit -m "feat(admin): add admin types and SDK interface"
```

---

### Task 2: Mock SDK and API Wrapper

**Files:**
- Create: `packages/cli/src/admin/api.ts`
- Test: `packages/cli/src/admin/api.test.ts`

- [ ] **Step 1: Write failing tests for the API wrapper**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm vitest run src/admin/api.test.ts`
Expected: FAIL — `createAdminAPI` does not exist

- [ ] **Step 3: Implement the API wrapper**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm vitest run src/admin/api.test.ts`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/admin/api.ts packages/cli/src/admin/api.test.ts
git commit -m "feat(admin): add API wrapper over SDK interface"
```

---

### Task 3: Mock SDK Implementation (Development)

**Files:**
- Create: `packages/cli/src/admin/mock-sdk.ts`
- Test: `packages/cli/src/admin/mock-sdk.test.ts`

- [ ] **Step 1: Write failing tests for the mock SDK**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm vitest run src/admin/mock-sdk.test.ts`
Expected: FAIL — `createMockAdminSDK` does not exist

- [ ] **Step 3: Implement the mock SDK**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import type {
  AdminSDK,
  AdminUser,
  ContentStats,
  ServiceHealth,
  QuickStats,
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
  { id: 'ws-1', name: 'Sunrise Bakery', status: 'active', siteStatus: 'live', plan: 'Pro', mrr: 299, lastActive: '2m ago' },
  { id: 'ws-2', name: 'Coastal Fitness', status: 'active', siteStatus: 'live', plan: 'Pro', mrr: 299, lastActive: '14m ago' },
  { id: 'ws-3', name: 'Mountain View Dental', status: 'active', siteStatus: 'live', plan: 'Starter', mrr: 149, lastActive: '1h ago' },
  { id: 'ws-4', name: 'Bloom Florist', status: 'trial', siteStatus: 'setup', plan: 'Trial', mrr: 0, lastActive: '3d ago' },
  { id: 'ws-5', name: 'Peak Performance Auto', status: 'active', siteStatus: 'live', plan: 'Pro', mrr: 299, lastActive: '45m ago' },
  { id: 'ws-6', name: 'Harbor Seafood', status: 'active', siteStatus: 'down', plan: 'Pro', mrr: 299, lastActive: '6h ago' },
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm vitest run src/admin/mock-sdk.test.ts`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/admin/mock-sdk.ts packages/cli/src/admin/mock-sdk.test.ts
git commit -m "feat(admin): add mock SDK for development and testing"
```

---

### Task 4: HealthStrip Component

**Files:**
- Create: `packages/cli/src/screens/admin/HealthStrip.tsx`
- Test: `packages/cli/src/screens/admin/HealthStrip.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import type { QuickStats, ServiceHealth } from '../../admin/types.js';
import { HealthStrip } from './HealthStrip.js';

const mockServices: ServiceHealth[] = [
  { name: 'auth', status: 'healthy' },
  { name: 'api', status: 'healthy' },
  { name: 'realtime', status: 'warning', message: 'High latency' },
  { name: 'email', status: 'critical' },
];

const mockStats: QuickStats = {
  totalWorkspaces: 12,
  liveSites: 11,
  warnings: 1,
  mrr: 2400,
};

describe('HealthStrip', () => {
  it('renders service names', () => {
    const { lastFrame } = render(
      <HealthStrip services={mockServices} stats={mockStats} />
    );
    expect(lastFrame()).toContain('AUTH');
    expect(lastFrame()).toContain('API');
    expect(lastFrame()).toContain('REALTIME');
    expect(lastFrame()).toContain('EMAIL');
  });

  it('renders quick stats', () => {
    const { lastFrame } = render(
      <HealthStrip services={mockServices} stats={mockStats} />
    );
    expect(lastFrame()).toContain('12');
    expect(lastFrame()).toContain('workspaces');
    expect(lastFrame()).toContain('11');
    expect(lastFrame()).toContain('live');
  });

  it('renders status indicators', () => {
    const { lastFrame } = render(
      <HealthStrip services={mockServices} stats={mockStats} />
    );
    // The output should contain dot characters for each service
    const frame = lastFrame() ?? '';
    expect(frame).toContain('●');
  });

  it('renders without stats when not provided', () => {
    const { lastFrame } = render(<HealthStrip services={mockServices} />);
    expect(lastFrame()).toContain('AUTH');
    expect(lastFrame()).not.toContain('workspaces');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/HealthStrip.test.tsx`
Expected: FAIL — `HealthStrip` does not exist

- [ ] **Step 3: Implement HealthStrip**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';
import { colors } from '../../colors.js';
import type { QuickStats, ServiceHealth, ServiceStatus } from '../../admin/types.js';

const statusColor: Record<ServiceStatus, string> = {
  healthy: colors.success,
  warning: colors.warning,
  critical: colors.error,
  idle: colors.muted,
};

interface HealthStripProps {
  services: ServiceHealth[];
  stats?: QuickStats;
}

function formatMrr(mrr: number): string {
  if (mrr >= 1000) return `$${(mrr / 1000).toFixed(1)}k`;
  return `$${mrr}`;
}

export function HealthStrip({ services, stats }: HealthStripProps) {
  return (
    <Box paddingX={1} gap={2}>
      <Box gap={2} flexGrow={1}>
        {services.map((service) => (
          <Box key={service.name} gap={1}>
            <Text color={statusColor[service.status]}>●</Text>
            <Text color={colors.muted}>{service.name.toUpperCase()}</Text>
          </Box>
        ))}
      </Box>
      {stats && (
        <Box gap={2}>
          <Box gap={1}>
            <Text bold color={colors.primary}>
              {stats.totalWorkspaces}
            </Text>
            <Text color={colors.muted}>workspaces</Text>
          </Box>
          <Box gap={1}>
            <Text bold color={colors.primary}>
              {stats.liveSites}
            </Text>
            <Text color={colors.muted}>live</Text>
          </Box>
          {stats.warnings > 0 && (
            <Box gap={1}>
              <Text bold color={colors.warning}>
                {stats.warnings}
              </Text>
              <Text color={colors.muted}>warning{stats.warnings !== 1 ? 's' : ''}</Text>
            </Box>
          )}
          <Box gap={1}>
            <Text bold color={colors.success}>
              {formatMrr(stats.mrr)}
            </Text>
            <Text color={colors.muted}>MRR</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/HealthStrip.test.tsx`
Expected: PASS — all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/screens/admin/HealthStrip.tsx packages/cli/src/screens/admin/HealthStrip.test.tsx
git commit -m "feat(admin): add HealthStrip component with service dots and quick stats"
```

---

### Task 5: OverviewPanel Component

**Files:**
- Create: `packages/cli/src/screens/admin/OverviewPanel.tsx`
- Test: `packages/cli/src/screens/admin/OverviewPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import type { WorkspaceDetail } from '../../admin/types.js';
import { OverviewPanel } from './OverviewPanel.js';

const mockDetail: WorkspaceDetail = {
  id: 'ws-2',
  name: 'Coastal Fitness',
  status: 'active',
  siteStatus: 'live',
  plan: 'Pro',
  mrr: 299,
  lastActive: '14m ago',
  sslValid: true,
  dnsConfigured: true,
  uptime: 14,
  monthlyVisits: 847,
  visitsTrend: 12,
  scheduledPosts: 3,
  nextPostAt: 'tomorrow 9am',
  recentActivity: [
    { description: 'Blog post published: "Summer Fitness Tips"', timestamp: '2h ago' },
    { description: 'Instagram post scheduled', timestamp: '5h ago' },
    { description: 'SSL certificate renewed', timestamp: '2d ago' },
  ],
};

describe('OverviewPanel', () => {
  it('renders site status', () => {
    const { lastFrame } = render(<OverviewPanel workspace={mockDetail} />);
    expect(lastFrame()).toContain('Live');
  });

  it('renders scheduled posts count', () => {
    const { lastFrame } = render(<OverviewPanel workspace={mockDetail} />);
    expect(lastFrame()).toContain('3');
  });

  it('renders monthly visits', () => {
    const { lastFrame } = render(<OverviewPanel workspace={mockDetail} />);
    expect(lastFrame()).toContain('847');
  });

  it('renders recent activity', () => {
    const { lastFrame } = render(<OverviewPanel workspace={mockDetail} />);
    expect(lastFrame()).toContain('Summer Fitness Tips');
    expect(lastFrame()).toContain('2h ago');
  });

  it('renders loading state when no workspace', () => {
    const { lastFrame } = render(<OverviewPanel />);
    expect(lastFrame()).toContain('Loading');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/OverviewPanel.test.tsx`
Expected: FAIL — `OverviewPanel` does not exist

- [ ] **Step 3: Implement OverviewPanel**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';
import { colors } from '../../colors.js';
import type { SiteStatus, WorkspaceDetail } from '../../admin/types.js';

const siteStatusDisplay: Record<SiteStatus, { label: string; color: string }> = {
  live: { label: 'Live', color: colors.success },
  setup: { label: 'Setup', color: colors.warning },
  down: { label: 'Down', color: colors.error },
  building: { label: 'Building', color: colors.info },
};

interface OverviewPanelProps {
  workspace?: WorkspaceDetail;
}

export function OverviewPanel({ workspace }: OverviewPanelProps) {
  if (!workspace) {
    return (
      <Box paddingX={1}>
        <Text color={colors.muted}>Loading...</Text>
      </Box>
    );
  }

  const site = siteStatusDisplay[workspace.siteStatus];
  const trendSign = workspace.visitsTrend >= 0 ? '↑' : '↓';

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box gap={4}>
        <Box flexDirection="column">
          <Text color={colors.muted}>SITE STATUS</Text>
          <Text bold color={site.color}>
            {site.label}
          </Text>
          {workspace.domain && <Text color={colors.muted}>{workspace.domain}</Text>}
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>SCHEDULED POSTS</Text>
          <Text bold color={colors.primary}>
            {workspace.scheduledPosts}
          </Text>
          {workspace.nextPostAt && (
            <Text color={colors.muted}>next: {workspace.nextPostAt}</Text>
          )}
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>THIS MONTH</Text>
          <Text bold color={colors.text}>
            {workspace.monthlyVisits}
          </Text>
          <Text color={workspace.visitsTrend >= 0 ? colors.success : colors.error}>
            {trendSign} {Math.abs(workspace.visitsTrend)}% vs last month
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text color={colors.muted}>RECENT ACTIVITY</Text>
        {workspace.recentActivity.map((item) => (
          <Box key={item.timestamp} justifyContent="space-between">
            <Text color={colors.text}>{item.description}</Text>
            <Text color={colors.muted}>{item.timestamp}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/OverviewPanel.test.tsx`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/screens/admin/OverviewPanel.tsx packages/cli/src/screens/admin/OverviewPanel.test.tsx
git commit -m "feat(admin): add OverviewPanel with site status, posts, visits, and activity"
```

---

### Task 6: SitePanel Component

**Files:**
- Create: `packages/cli/src/screens/admin/SitePanel.tsx`
- Test: `packages/cli/src/screens/admin/SitePanel.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import type { WorkspaceDetail } from '../../admin/types.js';
import { SitePanel } from './SitePanel.js';

const mockWorkspace: WorkspaceDetail = {
  id: 'ws-2',
  name: 'Coastal Fitness',
  status: 'active',
  siteStatus: 'live',
  plan: 'Pro',
  mrr: 299,
  lastActive: '14m ago',
  domain: 'coastalfitness.com',
  sslValid: true,
  dnsConfigured: true,
  uptime: 14,
  monthlyVisits: 847,
  visitsTrend: 12,
  scheduledPosts: 3,
  recentActivity: [],
};

describe('SitePanel', () => {
  it('renders domain name', () => {
    const { lastFrame } = render(<SitePanel workspace={mockWorkspace} />);
    expect(lastFrame()).toContain('coastalfitness.com');
  });

  it('renders SSL status as valid', () => {
    const { lastFrame } = render(<SitePanel workspace={mockWorkspace} />);
    expect(lastFrame()).toContain('SSL');
    expect(lastFrame()).toContain('Valid');
  });

  it('renders DNS status as configured', () => {
    const { lastFrame } = render(<SitePanel workspace={mockWorkspace} />);
    expect(lastFrame()).toContain('DNS');
    expect(lastFrame()).toContain('Configured');
  });

  it('renders uptime', () => {
    const { lastFrame } = render(<SitePanel workspace={mockWorkspace} />);
    expect(lastFrame()).toContain('14');
    expect(lastFrame()).toContain('days');
  });

  it('shows warning for invalid SSL', () => {
    const ws = { ...mockWorkspace, sslValid: false };
    const { lastFrame } = render(<SitePanel workspace={ws} />);
    expect(lastFrame()).toContain('Expired');
  });

  it('renders loading state when no workspace', () => {
    const { lastFrame } = render(<SitePanel />);
    expect(lastFrame()).toContain('Loading');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/SitePanel.test.tsx`
Expected: FAIL — `SitePanel` does not exist

- [ ] **Step 3: Implement SitePanel**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';
import { colors } from '../../colors.js';
import type { WorkspaceDetail } from '../../admin/types.js';

interface SitePanelProps {
  workspace?: WorkspaceDetail;
}

export function SitePanel({ workspace }: SitePanelProps) {
  if (!workspace) {
    return (
      <Box paddingX={1}>
        <Text color={colors.muted}>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="column">
        <Text color={colors.muted}>DOMAIN</Text>
        <Text bold color={colors.text}>
          {workspace.domain ?? 'No custom domain'}
        </Text>
      </Box>

      <Box gap={4}>
        <Box flexDirection="column">
          <Text color={colors.muted}>SSL</Text>
          {workspace.sslValid ? (
            <Box gap={1}>
              <Text color={colors.success}>●</Text>
              <Text color={colors.success}>Valid</Text>
            </Box>
          ) : (
            <Box gap={1}>
              <Text color={colors.error}>●</Text>
              <Text color={colors.error}>Expired</Text>
            </Box>
          )}
        </Box>

        <Box flexDirection="column">
          <Text color={colors.muted}>DNS</Text>
          {workspace.dnsConfigured ? (
            <Box gap={1}>
              <Text color={colors.success}>●</Text>
              <Text color={colors.success}>Configured</Text>
            </Box>
          ) : (
            <Box gap={1}>
              <Text color={colors.warning}>●</Text>
              <Text color={colors.warning}>Not configured</Text>
            </Box>
          )}
        </Box>

        <Box flexDirection="column">
          <Text color={colors.muted}>UPTIME</Text>
          <Text bold color={colors.text}>
            {workspace.uptime} days
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/SitePanel.test.tsx`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/screens/admin/SitePanel.tsx packages/cli/src/screens/admin/SitePanel.test.tsx
git commit -m "feat(admin): add SitePanel with domain, SSL, DNS, and uptime status"
```

---

### Task 7: ContentPanel Component

**Files:**
- Create: `packages/cli/src/screens/admin/ContentPanel.tsx`
- Test: `packages/cli/src/screens/admin/ContentPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import type { ContentStats } from '../../admin/types.js';
import { ContentPanel } from './ContentPanel.js';

const mockStats: ContentStats = {
  published: 24,
  drafts: 3,
  scheduled: 5,
  datasets: [
    { name: 'production', documentCount: 150 },
    { name: 'staging', documentCount: 42 },
  ],
};

describe('ContentPanel', () => {
  it('renders published count', () => {
    const { lastFrame } = render(<ContentPanel stats={mockStats} />);
    expect(lastFrame()).toContain('24');
    expect(lastFrame()).toContain('Published');
  });

  it('renders drafts count', () => {
    const { lastFrame } = render(<ContentPanel stats={mockStats} />);
    expect(lastFrame()).toContain('3');
    expect(lastFrame()).toContain('Drafts');
  });

  it('renders scheduled count', () => {
    const { lastFrame } = render(<ContentPanel stats={mockStats} />);
    expect(lastFrame()).toContain('5');
    expect(lastFrame()).toContain('Scheduled');
  });

  it('renders dataset info', () => {
    const { lastFrame } = render(<ContentPanel stats={mockStats} />);
    expect(lastFrame()).toContain('production');
    expect(lastFrame()).toContain('150');
  });

  it('renders loading state when no stats', () => {
    const { lastFrame } = render(<ContentPanel />);
    expect(lastFrame()).toContain('Loading');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/ContentPanel.test.tsx`
Expected: FAIL — `ContentPanel` does not exist

- [ ] **Step 3: Implement ContentPanel**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';
import { colors } from '../../colors.js';
import type { ContentStats } from '../../admin/types.js';

interface ContentPanelProps {
  stats?: ContentStats;
}

export function ContentPanel({ stats }: ContentPanelProps) {
  if (!stats) {
    return (
      <Box paddingX={1}>
        <Text color={colors.muted}>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box gap={4}>
        <Box flexDirection="column">
          <Text color={colors.muted}>Published</Text>
          <Text bold color={colors.success}>
            {stats.published}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>Drafts</Text>
          <Text bold color={colors.warning}>
            {stats.drafts}
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={colors.muted}>Scheduled</Text>
          <Text bold color={colors.info}>
            {stats.scheduled}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text color={colors.muted}>DATASETS</Text>
        {stats.datasets.map((ds) => (
          <Box key={ds.name} gap={1}>
            <Text color={colors.text}>{ds.name}</Text>
            <Text color={colors.muted}>· {ds.documentCount} documents</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/ContentPanel.test.tsx`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/screens/admin/ContentPanel.tsx packages/cli/src/screens/admin/ContentPanel.test.tsx
git commit -m "feat(admin): add ContentPanel with publish stats and dataset info"
```

---

### Task 8: AnalyticsPanel Component

**Files:**
- Create: `packages/cli/src/screens/admin/AnalyticsPanel.tsx`
- Test: `packages/cli/src/screens/admin/AnalyticsPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import type { WorkspaceDetail } from '../../admin/types.js';
import { AnalyticsPanel } from './AnalyticsPanel.js';

const mockWorkspace: WorkspaceDetail = {
  id: 'ws-2',
  name: 'Coastal Fitness',
  status: 'active',
  siteStatus: 'live',
  plan: 'Pro',
  mrr: 299,
  lastActive: '14m ago',
  sslValid: true,
  dnsConfigured: true,
  uptime: 14,
  monthlyVisits: 847,
  visitsTrend: 12,
  scheduledPosts: 3,
  recentActivity: [],
};

describe('AnalyticsPanel', () => {
  it('renders monthly visits', () => {
    const { lastFrame } = render(<AnalyticsPanel workspace={mockWorkspace} />);
    expect(lastFrame()).toContain('847');
  });

  it('renders positive trend with up arrow', () => {
    const { lastFrame } = render(<AnalyticsPanel workspace={mockWorkspace} />);
    expect(lastFrame()).toContain('↑');
    expect(lastFrame()).toContain('12%');
  });

  it('renders negative trend with down arrow', () => {
    const ws = { ...mockWorkspace, visitsTrend: -5 };
    const { lastFrame } = render(<AnalyticsPanel workspace={ws} />);
    expect(lastFrame()).toContain('↓');
    expect(lastFrame()).toContain('5%');
  });

  it('renders loading state when no workspace', () => {
    const { lastFrame } = render(<AnalyticsPanel />);
    expect(lastFrame()).toContain('Loading');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/AnalyticsPanel.test.tsx`
Expected: FAIL — `AnalyticsPanel` does not exist

- [ ] **Step 3: Implement AnalyticsPanel**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';
import { colors } from '../../colors.js';
import type { WorkspaceDetail } from '../../admin/types.js';

interface AnalyticsPanelProps {
  workspace?: WorkspaceDetail;
}

export function AnalyticsPanel({ workspace }: AnalyticsPanelProps) {
  if (!workspace) {
    return (
      <Box paddingX={1}>
        <Text color={colors.muted}>Loading...</Text>
      </Box>
    );
  }

  const trendPositive = workspace.visitsTrend >= 0;
  const trendIcon = trendPositive ? '↑' : '↓';
  const trendColor = trendPositive ? colors.success : colors.error;

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box gap={4}>
        <Box flexDirection="column">
          <Text color={colors.muted}>MONTHLY VISITS</Text>
          <Text bold color={colors.text}>
            {workspace.monthlyVisits.toLocaleString()}
          </Text>
          <Text color={trendColor}>
            {trendIcon} {Math.abs(workspace.visitsTrend)}% vs last month
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text color={colors.muted}>UPTIME</Text>
          <Text bold color={colors.text}>
            {workspace.uptime} days
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text color={colors.muted}>PLAN</Text>
          <Text bold color={colors.primary}>
            {workspace.plan}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/AnalyticsPanel.test.tsx`
Expected: PASS — all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/screens/admin/AnalyticsPanel.tsx packages/cli/src/screens/admin/AnalyticsPanel.test.tsx
git commit -m "feat(admin): add AnalyticsPanel with visits, trends, and uptime"
```

---

### Task 9: SettingsPanel Component

**Files:**
- Create: `packages/cli/src/screens/admin/SettingsPanel.tsx`
- Test: `packages/cli/src/screens/admin/SettingsPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import type { WorkspaceDetail } from '../../admin/types.js';
import { SettingsPanel } from './SettingsPanel.js';

const mockWorkspace: WorkspaceDetail = {
  id: 'ws-2',
  name: 'Coastal Fitness',
  status: 'active',
  siteStatus: 'live',
  plan: 'Pro',
  mrr: 299,
  lastActive: '14m ago',
  domain: 'coastalfitness.com',
  sslValid: true,
  dnsConfigured: true,
  uptime: 14,
  monthlyVisits: 847,
  visitsTrend: 12,
  scheduledPosts: 3,
  recentActivity: [],
};

describe('SettingsPanel', () => {
  it('renders workspace name', () => {
    const { lastFrame } = render(<SettingsPanel workspace={mockWorkspace} />);
    expect(lastFrame()).toContain('Coastal Fitness');
  });

  it('renders plan', () => {
    const { lastFrame } = render(<SettingsPanel workspace={mockWorkspace} />);
    expect(lastFrame()).toContain('Pro');
  });

  it('renders workspace status', () => {
    const { lastFrame } = render(<SettingsPanel workspace={mockWorkspace} />);
    expect(lastFrame()).toContain('Active');
  });

  it('renders domain', () => {
    const { lastFrame } = render(<SettingsPanel workspace={mockWorkspace} />);
    expect(lastFrame()).toContain('coastalfitness.com');
  });

  it('renders loading state when no workspace', () => {
    const { lastFrame } = render(<SettingsPanel />);
    expect(lastFrame()).toContain('Loading');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/SettingsPanel.test.tsx`
Expected: FAIL — `SettingsPanel` does not exist

- [ ] **Step 3: Implement SettingsPanel**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text } from 'ink';
import { colors } from '../../colors.js';
import type { WorkspaceDetail, WorkspaceStatus } from '../../admin/types.js';

const statusDisplay: Record<WorkspaceStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: colors.success },
  trial: { label: 'Trial', color: colors.warning },
  suspended: { label: 'Suspended', color: colors.error },
  churned: { label: 'Churned', color: colors.muted },
};

interface SettingsPanelProps {
  workspace?: WorkspaceDetail;
}

export function SettingsPanel({ workspace }: SettingsPanelProps) {
  if (!workspace) {
    return (
      <Box paddingX={1}>
        <Text color={colors.muted}>Loading...</Text>
      </Box>
    );
  }

  const status = statusDisplay[workspace.status];

  return (
    <Box flexDirection="column" gap={1} paddingX={1}>
      <Box flexDirection="column">
        <Text color={colors.muted}>WORKSPACE</Text>
        <Text bold color={colors.text}>
          {workspace.name}
        </Text>
        <Text color={colors.muted}>ID: {workspace.id}</Text>
      </Box>

      <Box gap={4}>
        <Box flexDirection="column">
          <Text color={colors.muted}>STATUS</Text>
          <Text bold color={status.color}>
            {status.label}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text color={colors.muted}>PLAN</Text>
          <Text bold color={colors.primary}>
            {workspace.plan}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text color={colors.muted}>BILLING</Text>
          <Text bold color={colors.text}>
            ${workspace.mrr}/mo
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text color={colors.muted}>DOMAIN</Text>
        <Text color={colors.text}>{workspace.domain ?? 'No custom domain configured'}</Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm vitest run src/screens/admin/SettingsPanel.test.tsx`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/screens/admin/SettingsPanel.tsx packages/cli/src/screens/admin/SettingsPanel.test.tsx
git commit -m "feat(admin): add SettingsPanel with workspace config and billing info"
```

---

### Task 10: Admin Screen (Main Orchestrator)

**Files:**
- Create: `packages/cli/src/screens/Admin.tsx`
- Test: `packages/cli/src/screens/Admin.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { createAdminAPI } from '../admin/api.js';
import { createMockAdminSDK } from '../admin/mock-sdk.js';
import { Admin } from './Admin.js';

function createMockAPI() {
  return createAdminAPI(createMockAdminSDK());
}

describe('Admin', () => {
  const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

  it('renders the header with PILOT ADMIN', async () => {
    const api = createMockAPI();
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    expect(lastFrame()).toContain('PILOT ADMIN');
  });

  it('renders the health strip with service names', async () => {
    const api = createMockAPI();
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    expect(lastFrame()).toContain('AUTH');
    expect(lastFrame()).toContain('API');
  });

  it('renders tab bar with customer tabs', async () => {
    const api = createMockAPI();
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    expect(lastFrame()).toContain('Overview');
    expect(lastFrame()).toContain('Site');
    expect(lastFrame()).toContain('Content');
    expect(lastFrame()).toContain('Analytics');
    expect(lastFrame()).toContain('Settings');
  });

  it('renders status bar with keyboard hints', async () => {
    const api = createMockAPI();
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    expect(lastFrame()).toContain('navigate');
    expect(lastFrame()).toContain('q quit');
  });

  it('switches tabs with number keys', async () => {
    const api = createMockAPI();
    const { lastFrame, stdin } = render(<Admin api={api} />);
    await delay();

    stdin.write('2');
    await delay();
    expect(lastFrame()).toContain('SSL');
    expect(lastFrame()).toContain('DNS');
  });

  it('shows overview panel by default', async () => {
    const api = createMockAPI();
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    expect(lastFrame()).toContain('SITE STATUS');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && pnpm vitest run src/screens/Admin.test.tsx`
Expected: FAIL — `Admin` does not exist

- [ ] **Step 3: Implement the Admin screen**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text, useApp, useInput } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import type { AdminAPI, DashboardData } from '../admin/api.js';
import type { ContentStats, WorkspaceDetail } from '../admin/types.js';
import { colors } from '../colors.js';
import { StatusBar } from '../components/StatusBar.js';
import { TabBar } from '../components/TabBar.js';
import type { Tab } from '../types.js';
import { AnalyticsPanel } from './admin/AnalyticsPanel.js';
import { ContentPanel } from './admin/ContentPanel.js';
import { HealthStrip } from './admin/HealthStrip.js';
import { OverviewPanel } from './admin/OverviewPanel.js';
import { SettingsPanel } from './admin/SettingsPanel.js';
import { SitePanel } from './admin/SitePanel.js';

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'site', label: 'Site' },
  { id: 'content', label: 'Content' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
];

const POLL_INTERVAL = 30_000;

interface AdminProps {
  api: AdminAPI;
  workspaceId?: string;
}

export function Admin({ api, workspaceId }: AdminProps) {
  const { exit } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [contentStats, setContentStats] = useState<ContentStats | null>(null);

  const fetchData = useCallback(async () => {
    const [dashData, workspaces] = await Promise.all([
      api.fetchDashboard(),
      api.fetchWorkspaces(),
    ]);
    setDashboard(dashData);

    const wsId = workspaceId ?? workspaces[0]?.id;
    if (wsId) {
      const [detail, content] = await Promise.all([
        api.fetchWorkspaceDetail(wsId),
        api.fetchContentStats(wsId),
      ]);
      setWorkspace(detail);
      setContentStats(content);
    }
  }, [api, workspaceId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
      return;
    }
    if (input === 'r') {
      fetchData();
      return;
    }
    const num = Number.parseInt(input, 10);
    if (num >= 1 && num <= TABS.length) {
      setActiveTab(TABS[num - 1].id);
    }
    if (key.tab) {
      const currentIndex = TABS.findIndex((t) => t.id === activeTab);
      const nextIndex = key.shift
        ? (currentIndex - 1 + TABS.length) % TABS.length
        : (currentIndex + 1) % TABS.length;
      setActiveTab(TABS[nextIndex].id);
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} justifyContent="space-between">
        <Text bold color={colors.primary}>
          ✈ PILOT ADMIN
        </Text>
        <Text color={colors.muted}>
          {workspace?.name ?? 'Loading...'}
        </Text>
      </Box>

      <HealthStrip
        services={dashboard?.services ?? []}
        stats={dashboard?.stats}
      />

      <TabBar tabs={TABS} activeTab={activeTab} />

      <Box flexGrow={1} flexDirection="column">
        {activeTab === 'overview' && <OverviewPanel workspace={workspace ?? undefined} />}
        {activeTab === 'site' && <SitePanel workspace={workspace ?? undefined} />}
        {activeTab === 'content' && <ContentPanel stats={contentStats ?? undefined} />}
        {activeTab === 'analytics' && <AnalyticsPanel workspace={workspace ?? undefined} />}
        {activeTab === 'settings' && <SettingsPanel workspace={workspace ?? undefined} />}
      </Box>

      <StatusBar
        items={[
          { label: '↑↓ navigate', color: colors.muted },
          { label: '1-5 tabs' },
          { label: 'r refresh' },
          { label: '/ search' },
          { label: 'q quit' },
        ]}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/cli && pnpm vitest run src/screens/Admin.test.tsx`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/screens/Admin.tsx packages/cli/src/screens/Admin.test.tsx
git commit -m "feat(admin): add Admin screen with health strip, tabs, and panel switching"
```

---

### Task 11: Admin Command and Registration

**Files:**
- Create: `packages/cli/src/commands/admin.ts`
- Modify: `packages/cli/src/bin/pilot.ts`
- Modify: `packages/cli/src/errors.ts`
- Test: `packages/cli/src/commands/admin.test.ts`

- [ ] **Step 1: Add error codes for admin**

Add to the `errorCodes` object in `packages/cli/src/errors.ts`:

```typescript
ADMIN_NOT_AUTHENTICATED: 'ADMIN_NOT_AUTHENTICATED',
ADMIN_ACCESS_DENIED: 'ADMIN_ACCESS_DENIED',
```

Add to the `userMessages` record in `packages/cli/src/errors.ts`:

```typescript
ADMIN_NOT_AUTHENTICATED: 'You must be signed in to access the admin dashboard. Run: pilot login',
ADMIN_ACCESS_DENIED: 'You don\'t have permission to access the admin dashboard.',
```

- [ ] **Step 2: Write failing tests for the admin command**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';

vi.mock('ink', () => ({
  render: vi.fn(),
}));

vi.mock('../admin/mock-sdk.js', () => ({
  createMockAdminSDK: vi.fn(() => ({
    getUser: vi.fn().mockResolvedValue({ email: 'ali@medalsocial.com', role: 'super_admin' }),
    getServices: vi.fn().mockResolvedValue([]),
    getQuickStats: vi.fn().mockResolvedValue({ totalWorkspaces: 0, liveSites: 0, warnings: 0, mrr: 0 }),
    getWorkspaces: vi.fn().mockResolvedValue([]),
    getWorkspaceDetail: vi.fn().mockResolvedValue({}),
    getContentStats: vi.fn().mockResolvedValue({ published: 0, drafts: 0, scheduled: 0, datasets: [] }),
  })),
}));

describe('runAdmin', () => {
  it('renders the Admin screen', async () => {
    const { render } = await import('ink');
    const { runAdmin } = await import('./admin.js');
    await runAdmin();
    expect(render).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd packages/cli && pnpm vitest run src/commands/admin.test.ts`
Expected: FAIL — `runAdmin` does not exist

- [ ] **Step 4: Implement the admin command**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink';
import React from 'react';
import { createAdminAPI } from '../admin/api.js';
import { createMockAdminSDK } from '../admin/mock-sdk.js';
import { Admin } from '../screens/Admin.js';

export async function runAdmin() {
  // TODO: Replace with real SDK once Medal Social SDK is available
  const sdk = createMockAdminSDK();
  const api = createAdminAPI(sdk);

  render(React.createElement(Admin, { api }));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/cli && pnpm vitest run src/commands/admin.test.ts`
Expected: PASS

- [ ] **Step 6: Register the command in pilot.ts**

Add to `packages/cli/src/bin/pilot.ts`, before the default action (before `program.parseAsync()`):

```typescript
program
  .command('admin')
  .description('Admin dashboard and command center')
  .action(async () => {
    const { runAdmin } = await import('../commands/admin.js');
    await runAdmin();
  });
```

- [ ] **Step 7: Run the full test suite to verify nothing breaks**

Run: `cd packages/cli && pnpm vitest run`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/commands/admin.ts packages/cli/src/commands/admin.test.ts packages/cli/src/bin/pilot.ts packages/cli/src/errors.ts
git commit -m "feat(admin): add pilot admin command with mock SDK"
```

---

### Task 12: Integration Test

**Files:**
- Create: `packages/cli/src/screens/Admin.integration.test.tsx`

- [ ] **Step 1: Write integration test that exercises the full flow**

```typescript
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { createAdminAPI } from '../admin/api.js';
import { createMockAdminSDK } from '../admin/mock-sdk.js';
import { Admin } from './Admin.js';

describe('Admin integration', () => {
  const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

  it('loads dashboard data and renders all sections', async () => {
    const sdk = createMockAdminSDK();
    const api = createAdminAPI(sdk);
    const { lastFrame } = render(<Admin api={api} />);
    await delay();

    const frame = lastFrame() ?? '';

    // Health strip renders services
    expect(frame).toContain('AUTH');
    expect(frame).toContain('REALTIME');

    // Quick stats render
    expect(frame).toContain('workspaces');
    expect(frame).toContain('live');

    // Overview panel renders by default
    expect(frame).toContain('SITE STATUS');
  });

  it('navigates through all tabs', async () => {
    const sdk = createMockAdminSDK();
    const api = createAdminAPI(sdk);
    const { lastFrame, stdin } = render(<Admin api={api} />);
    await delay();

    // Tab 2: Site
    stdin.write('2');
    await delay();
    expect(lastFrame()).toContain('SSL');
    expect(lastFrame()).toContain('DNS');

    // Tab 3: Content
    stdin.write('3');
    await delay();
    expect(lastFrame()).toContain('Published');
    expect(lastFrame()).toContain('Drafts');

    // Tab 4: Analytics
    stdin.write('4');
    await delay();
    expect(lastFrame()).toContain('MONTHLY VISITS');

    // Tab 5: Settings
    stdin.write('5');
    await delay();
    expect(lastFrame()).toContain('WORKSPACE');
    expect(lastFrame()).toContain('PLAN');
  });

  it('renders workspace-scoped view for owners', async () => {
    const sdk = createMockAdminSDK({ role: 'owner', workspaceId: 'ws-2' });
    const api = createAdminAPI(sdk);
    const { lastFrame } = render(<Admin api={api} workspaceId="ws-2" />);
    await delay();

    expect(lastFrame()).toContain('PILOT ADMIN');
    expect(lastFrame()).toContain('AUTH');
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `cd packages/cli && pnpm vitest run src/screens/Admin.integration.test.tsx`
Expected: PASS — all 3 tests pass

- [ ] **Step 3: Run the full test suite**

Run: `cd packages/cli && pnpm vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/screens/Admin.integration.test.tsx
git commit -m "test(admin): add integration tests for full admin dashboard flow"
```

---

### Task 13: Update Feature Tracker

**Files:**
- Modify: `packages/cli/README.md` (or project root `README.md`)

- [ ] **Step 1: Add admin dashboard to the feature tracker table in README.md**

Find the Feature Tracker table and add:

```markdown
| Admin Dashboard | In Progress | [Spec](docs/superpowers/specs/2026-04-19-admin-dashboard-design.md) | CLI command center with health strip, tabbed panels, SDK-powered data |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add admin dashboard to feature tracker"
```
