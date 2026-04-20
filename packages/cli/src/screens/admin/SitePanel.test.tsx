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

  it('shows warning when DNS is not configured', () => {
    const ws = { ...mockWorkspace, dnsConfigured: false };
    const { lastFrame } = render(<SitePanel workspace={ws} />);
    expect(lastFrame()).toContain('Not configured');
  });
});
