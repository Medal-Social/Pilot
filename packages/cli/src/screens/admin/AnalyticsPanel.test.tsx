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
