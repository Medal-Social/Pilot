// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import { Update } from './Update.js';

vi.mock('../update/checker.js', () => ({
  checkForUpdates: vi.fn(() => new Promise(() => {})),
  applyUpdate: vi.fn(() => Promise.resolve({ success: true })),
}));

describe('Update', () => {
  it('shows checking state initially', () => {
    const { lastFrame } = render(<Update currentVersion="0.1.0" />);
    expect(lastFrame()).toContain('Checking for updates');
  });

  it('shows up-to-date message when no update available', async () => {
    const { checkForUpdates } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '0.1.0',
      hasUpdate: false,
    });

    const { lastFrame, rerender } = render(<Update currentVersion="0.1.0" />);
    await new Promise((r) => setTimeout(r, 50));
    rerender(<Update currentVersion="0.1.0" />);
    expect(lastFrame()).toContain('current');
  });

  it('shows confirm prompt when update is available', async () => {
    const { checkForUpdates } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '1.0.0',
      hasUpdate: true,
    });

    const { lastFrame, rerender } = render(<Update currentVersion="0.1.0" />);
    await new Promise((r) => setTimeout(r, 50));
    rerender(<Update currentVersion="0.1.0" />);
    expect(lastFrame()).toContain('newer version');
  });

  it('shows error when check fails', async () => {
    const { checkForUpdates } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '0.1.0',
      hasUpdate: false,
      error: { message: 'network timeout', code: 'UPDATE_CHECK_FAILED' } as never,
    });

    const { lastFrame, rerender } = render(<Update currentVersion="0.1.0" />);
    await new Promise((r) => setTimeout(r, 50));
    rerender(<Update currentVersion="0.1.0" />);
    expect(lastFrame()).toContain('network timeout');
  });
});
