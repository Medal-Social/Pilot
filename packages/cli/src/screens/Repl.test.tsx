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
});
