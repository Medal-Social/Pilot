import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import { Update } from './Update.js';

vi.mock('../update/checker.js', () => ({
  checkForUpdates: vi.fn(() =>
    Promise.resolve({ current: '0.1.0', latest: '0.1.0', hasUpdate: false })
  ),
  applyUpdate: vi.fn(() => Promise.resolve({ success: true })),
}));

describe('Update', () => {
  it('shows checking state initially', () => {
    const { lastFrame } = render(<Update currentVersion="0.1.0" />);
    expect(lastFrame()).toContain('Checking for updates');
  });
});
