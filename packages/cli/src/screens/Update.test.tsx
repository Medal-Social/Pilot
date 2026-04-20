// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import { Update } from './Update.js';

vi.mock('../update/checker.js', () => ({
  checkForUpdates: vi.fn(() => new Promise(() => {})),
  applyUpdate: vi.fn(() => Promise.resolve({ success: true })),
}));

const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));

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
    await delay();
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
    await delay();
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
    await delay();
    rerender(<Update currentVersion="0.1.0" />);
    expect(lastFrame()).toContain('network timeout');
  });

  it('transitions to updating phase when user presses y at confirm', async () => {
    const { checkForUpdates, applyUpdate } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '1.0.0',
      hasUpdate: true,
    });
    // Keep applyUpdate pending so we can observe the 'updating' state
    vi.mocked(applyUpdate).mockReturnValue(new Promise(() => {}));

    const { lastFrame, stdin, rerender } = render(<Update currentVersion="0.1.0" />);
    await delay();
    rerender(<Update currentVersion="0.1.0" />);

    // Now in 'confirm' phase — press y
    stdin.write('y');
    await delay();
    expect(lastFrame()).toContain('Downloading update');
  });

  it('transitions to updating phase when user presses Enter at confirm', async () => {
    const { checkForUpdates, applyUpdate } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '1.0.0',
      hasUpdate: true,
    });
    // Keep applyUpdate pending so we can observe the 'updating' state
    vi.mocked(applyUpdate).mockReturnValue(new Promise(() => {}));

    const { lastFrame, stdin, rerender } = render(<Update currentVersion="0.1.0" />);
    await delay();
    rerender(<Update currentVersion="0.1.0" />);

    // Now in 'confirm' phase — press Enter
    stdin.write('\r');
    await delay();
    expect(lastFrame()).toContain('Downloading update');
  });

  it('dismisses confirm with n and shows up-to-date', async () => {
    const { checkForUpdates } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '1.0.0',
      hasUpdate: true,
    });

    const { lastFrame, stdin, rerender } = render(<Update currentVersion="0.1.0" />);
    await delay();
    rerender(<Update currentVersion="0.1.0" />);

    // Press n to decline
    stdin.write('n');
    await delay();
    expect(lastFrame()).toContain('current');
  });

  it('shows complete state after successful update', async () => {
    const { checkForUpdates, applyUpdate } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '1.0.0',
      hasUpdate: true,
    });
    vi.mocked(applyUpdate).mockResolvedValue({ success: true });

    const { lastFrame, stdin, rerender } = render(<Update currentVersion="0.1.0" />);
    await delay();
    rerender(<Update currentVersion="0.1.0" />);

    stdin.write('y');
    await delay(150);
    expect(lastFrame()).toContain('upgraded');
  });

  it('shows error state when applyUpdate fails', async () => {
    const { checkForUpdates, applyUpdate } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '1.0.0',
      hasUpdate: true,
    });
    vi.mocked(applyUpdate).mockResolvedValue({
      success: false,
      error: { message: 'permission denied', code: 'UPDATE_INSTALL_FAILED' } as never,
    });

    const { lastFrame, stdin, rerender } = render(<Update currentVersion="0.1.0" />);
    await delay();
    rerender(<Update currentVersion="0.1.0" />);

    stdin.write('y');
    await delay(150);
    expect(lastFrame()).toContain('permission denied');
  });

  it('transitions to updating phase when user presses Y (uppercase) at confirm', async () => {
    const { checkForUpdates, applyUpdate } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '1.0.0',
      hasUpdate: true,
    });
    vi.mocked(applyUpdate).mockReturnValue(new Promise(() => {}));

    const { lastFrame, stdin, rerender } = render(<Update currentVersion="0.1.0" />);
    await delay();
    rerender(<Update currentVersion="0.1.0" />);

    stdin.write('Y');
    await delay();
    expect(lastFrame()).toContain('Downloading update');
  });

  it('dismisses confirm with N (uppercase) and shows up-to-date', async () => {
    const { checkForUpdates } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '1.0.0',
      hasUpdate: true,
    });

    const { lastFrame, stdin, rerender } = render(<Update currentVersion="0.1.0" />);
    await delay();
    rerender(<Update currentVersion="0.1.0" />);

    stdin.write('N');
    await delay();
    expect(lastFrame()).toContain('current');
  });

  it('ignores unrecognized keys at confirm prompt', async () => {
    const { checkForUpdates } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '1.0.0',
      hasUpdate: true,
    });

    const { lastFrame, stdin, rerender } = render(<Update currentVersion="0.1.0" />);
    await delay();
    rerender(<Update currentVersion="0.1.0" />);

    stdin.write('x');
    await delay();
    // Should still be on confirm
    expect(lastFrame()).toContain('newer version');
  });

  it('shows generic error when applyUpdate fails without message', async () => {
    const { checkForUpdates, applyUpdate } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValue({
      current: '0.1.0',
      latest: '1.0.0',
      hasUpdate: true,
    });
    vi.mocked(applyUpdate).mockResolvedValue({ success: false });

    const { lastFrame, stdin, rerender } = render(<Update currentVersion="0.1.0" />);
    await delay();
    rerender(<Update currentVersion="0.1.0" />);

    stdin.write('y');
    await delay(150);
    expect(lastFrame()).toContain('Update');
  });

  it('ignores keyboard input when phase is not confirm', async () => {
    const { checkForUpdates } = await import('../update/checker.js');
    // Never resolves — component stays in 'checking' phase
    vi.mocked(checkForUpdates).mockReturnValueOnce(new Promise(() => {}));

    const { lastFrame, stdin } = render(<Update currentVersion="0.1.0" />);
    stdin.write('y'); // phase === 'checking', not 'confirm' — input is ignored
    await delay();
    expect(lastFrame()).toContain('Checking for updates');
  });

  it('does not setState when unmounted before checkForUpdates resolves', async () => {
    const { checkForUpdates } = await import('../update/checker.js');
    let resolve!: (v: never) => void;
    vi.mocked(checkForUpdates).mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      })
    );

    const { unmount } = render(<Update currentVersion="0.1.0" />);
    unmount(); // triggers cleanup → cancelled = true
    resolve({ current: '0.1.0', latest: '0.1.0', hasUpdate: false } as never);
    await delay();
    // No crash — the cancelled guard prevented the setState call
  });

  it('does not setState when unmounted during applyUpdate', async () => {
    const { checkForUpdates, applyUpdate } = await import('../update/checker.js');
    vi.mocked(checkForUpdates).mockResolvedValueOnce({
      current: '0.1.0',
      latest: '1.0.0',
      hasUpdate: true,
    });
    let resolveApply!: (v: never) => void;
    vi.mocked(applyUpdate).mockReturnValueOnce(
      new Promise((r) => {
        resolveApply = r;
      })
    );

    const { stdin, rerender, unmount } = render(<Update currentVersion="0.1.0" />);
    await delay();
    rerender(<Update currentVersion="0.1.0" />);

    stdin.write('y'); // transitions to 'updating'
    await delay();

    unmount(); // triggers cleanup → cancelled = true
    resolveApply({ success: true } as never);
    await delay();
    // No crash — the cancelled guard prevented the setState call
  });
});
