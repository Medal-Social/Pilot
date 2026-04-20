// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

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
    const { lastFrame } = render(<HealthStrip services={mockServices} stats={mockStats} />);
    expect(lastFrame()).toContain('AUTH');
    expect(lastFrame()).toContain('API');
    expect(lastFrame()).toContain('REALTIME');
    expect(lastFrame()).toContain('EMAIL');
  });

  it('renders quick stats', () => {
    const { lastFrame } = render(<HealthStrip services={mockServices} stats={mockStats} />);
    expect(lastFrame()).toContain('12');
    expect(lastFrame()).toContain('workspaces');
    expect(lastFrame()).toContain('11');
    expect(lastFrame()).toContain('live');
  });

  it('renders status indicators', () => {
    const { lastFrame } = render(<HealthStrip services={mockServices} stats={mockStats} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('●');
  });

  it('renders without stats when not provided', () => {
    const { lastFrame } = render(<HealthStrip services={mockServices} />);
    expect(lastFrame()).toContain('AUTH');
    expect(lastFrame()).not.toContain('workspaces');
  });

  it('renders MRR under $1k without k suffix', () => {
    const { lastFrame } = render(
      <HealthStrip services={mockServices} stats={{ ...mockStats, mrr: 500 }} />
    );
    expect(lastFrame()).toContain('$500');
  });

  it('renders plural warnings label', () => {
    const { lastFrame } = render(
      <HealthStrip services={mockServices} stats={{ ...mockStats, warnings: 2 }} />
    );
    expect(lastFrame()).toContain('warnings');
  });
});
