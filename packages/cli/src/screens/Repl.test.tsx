import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Repl } from './Repl.js';

vi.mock('../state.js', () => ({
  loadState: vi.fn(() => ({ onboarded: false })),
  markOnboarded: vi.fn(),
}));

describe('Repl', () => {
  it('shows Welcome screen on first run', () => {
    const { lastFrame } = render(<Repl />);
    expect(lastFrame()).toContain('Welcome aboard');
  });
});
