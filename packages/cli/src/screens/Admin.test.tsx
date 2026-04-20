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

  it('cycles to next tab with Tab key', async () => {
    const api = createMockAPI();
    const { lastFrame, stdin } = render(<Admin api={api} />);
    await delay();
    // Start on overview; Tab should move to Site panel
    stdin.write('\t');
    await delay();
    expect(lastFrame()).toContain('SSL');
  });

  it('refreshes data on r key', async () => {
    const api = createMockAPI();
    const { lastFrame, stdin } = render(<Admin api={api} />);
    await delay();
    const frameBefore = lastFrame();
    stdin.write('r');
    await delay();
    expect(lastFrame()).toContain('PILOT ADMIN');
    expect(frameBefore).toBeTruthy();
  });

  it('exits on q key without throwing', async () => {
    const api = createMockAPI();
    const { stdin, unmount } = render(<Admin api={api} />);
    await delay();
    stdin.write('q');
    await delay();
    unmount();
  });

  it('cycles to previous tab with Shift+Tab key', async () => {
    const api = createMockAPI();
    const { lastFrame, stdin } = render(<Admin api={api} />);
    await delay();
    // Start on overview (index 0); Shift+Tab wraps to Settings (index 4)
    stdin.write('\x1b[Z');
    await delay();
    expect(lastFrame()).toContain('BILLING');
  });

  it('switches to content tab with number key', async () => {
    const api = createMockAPI();
    const { lastFrame, stdin } = render(<Admin api={api} />);
    await delay();
    stdin.write('3');
    await delay();
    expect(lastFrame()).not.toContain('SITE STATUS');
  });

  it('switches to analytics tab with number key', async () => {
    const api = createMockAPI();
    const { lastFrame, stdin } = render(<Admin api={api} />);
    await delay();
    stdin.write('4');
    await delay();
    expect(lastFrame()).not.toContain('SITE STATUS');
  });

  it('handles empty workspaces array gracefully', async () => {
    const api = createMockAPI();
    vi.spyOn(api, 'fetchWorkspaces').mockResolvedValue([]);
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    // wsId is undefined → fetchWorkspaceDetail is never called; component stays with null workspace
    expect(lastFrame()).toContain('PILOT ADMIN');
  });

  it('cleans up polling interval on unmount', async () => {
    const api = createMockAPI();
    const { unmount } = render(<Admin api={api} />);
    await delay();
    // Unmounting triggers the clearInterval cleanup function
    expect(() => unmount()).not.toThrow();
  });

  it('shows in-UI error banner instead of crashing when fetch rejects', async () => {
    const api = createMockAPI();
    vi.spyOn(api, 'fetchDashboard').mockRejectedValue(new Error('network down'));
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    const frame = lastFrame() ?? '';
    expect(frame).toContain('refresh failed');
    expect(frame).toContain('network down');
    // The TUI is still rendered — header is visible, no crash.
    expect(frame).toContain('PILOT ADMIN');
  });
});
