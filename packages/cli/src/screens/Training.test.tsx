// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Training } from './Training.js';

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

describe('Training', () => {
  it('shows Training header', () => {
    const { lastFrame } = render(<Training />);
    expect(lastFrame()).toContain('Training');
  });

  it('shows source tabs', () => {
    const { lastFrame } = render(<Training />);
    expect(lastFrame()).toContain('Sources');
    expect(lastFrame()).toContain('Articles');
    expect(lastFrame()).toContain('Runs');
  });

  it('shows sources on default tab', () => {
    const { lastFrame } = render(<Training />);
    expect(lastFrame()).toContain('Sanity CMS');
    expect(lastFrame()).toContain('Slack');
    expect(lastFrame()).toContain('Manual articles');
  });

  it('switches to Articles tab with number key', async () => {
    const { lastFrame, stdin } = render(<Training />);
    await delay();
    stdin.write('2');
    await delay();
    expect(lastFrame()).toContain('No articles yet');
  });

  it('switches to Runs tab with number key', async () => {
    const { lastFrame, stdin } = render(<Training />);
    await delay();
    stdin.write('3');
    await delay();
    expect(lastFrame()).toContain('No training runs yet');
  });

  it('shows detail pane for selected source with document count and sync info', () => {
    const { lastFrame } = render(<Training />);
    // Sanity CMS is selected by default (index 0)
    expect(lastFrame()).toContain('Sanity CMS');
    expect(lastFrame()).toContain('Documents: 47');
    expect(lastFrame()).toContain('Last sync: 12m ago');
    expect(lastFrame()).toContain('STATUS');
    expect(lastFrame()).toContain('ACTIONS');
    expect(lastFrame()).toContain('Sync now');
    expect(lastFrame()).toContain('Configure filters');
  });

  it('shows "never" for lastSync when source has no lastSync', async () => {
    const { lastFrame, stdin } = render(<Training />);
    await delay();
    // Navigate to Slack (index 1) which has no lastSync
    stdin.write('\x1B[B');
    await delay();
    expect(lastFrame()).toContain('Last sync: never');
  });

  it('shows detail for Manual articles source', async () => {
    const { lastFrame, stdin } = render(<Training />);
    await delay();
    // Navigate to Manual articles (index 2)
    stdin.write('\x1B[B');
    await delay();
    stdin.write('\x1B[B');
    await delay();
    expect(lastFrame()).toContain('Manual articles');
    expect(lastFrame()).toContain('Documents: 8');
  });
});
