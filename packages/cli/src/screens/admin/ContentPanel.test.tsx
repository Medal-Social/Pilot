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
