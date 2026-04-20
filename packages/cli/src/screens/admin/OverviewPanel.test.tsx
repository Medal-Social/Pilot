// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

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

  it('renders negative trend with down arrow', () => {
    const { lastFrame } = render(<OverviewPanel workspace={{ ...mockDetail, visitsTrend: -5 }} />);
    expect(lastFrame()).toContain('↓');
    expect(lastFrame()).toContain('5%');
  });

  it('renders domain when present', () => {
    const { lastFrame } = render(
      <OverviewPanel workspace={{ ...mockDetail, domain: 'example.com' }} />
    );
    expect(lastFrame()).toContain('example.com');
  });

  it('renders without nextPostAt', () => {
    const { lastFrame } = render(
      <OverviewPanel workspace={{ ...mockDetail, nextPostAt: undefined }} />
    );
    expect(lastFrame()).not.toContain('next:');
  });
});
