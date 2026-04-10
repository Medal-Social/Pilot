import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
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
});
