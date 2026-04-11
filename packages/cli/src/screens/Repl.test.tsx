// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import { Repl } from './Repl.js';

vi.mock('../settings.js', () => ({
  loadSettings: vi.fn(() => ({ onboarded: false, plugins: {} })),
  markOnboarded: vi.fn(),
}));

describe('Repl', () => {
  it('shows Welcome screen on first run', () => {
    const { lastFrame } = render(<Repl />);
    expect(lastFrame()).toContain('Welcome aboard');
  });

  it('shows Home screen when already onboarded', async () => {
    const { loadSettings } = await import('../settings.js');
    vi.mocked(loadSettings).mockReturnValue({ onboarded: true, plugins: {} });

    const { lastFrame } = render(<Repl />);
    expect(lastFrame()).toContain('pilot');
  });

  it('transitions to Home after pressing Enter on Welcome screen', async () => {
    const { loadSettings, markOnboarded } = await import('../settings.js');
    vi.mocked(loadSettings).mockReturnValue({ onboarded: false, plugins: {} });

    const { lastFrame, stdin } = render(<Repl />);
    expect(lastFrame()).toContain('Welcome aboard');

    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\r');
    await new Promise((r) => setTimeout(r, 50));

    expect(markOnboarded).toHaveBeenCalled();
    expect(lastFrame()).toContain('pilot');
  });
});
