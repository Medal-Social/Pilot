// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

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
