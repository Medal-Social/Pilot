import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Plugins } from './Plugins.js';

describe('Plugins', () => {
  it('shows plugin header', () => {
    const { lastFrame } = render(<Plugins />);
    expect(lastFrame()).toContain('Plugins');
  });

  it('shows tabs', () => {
    const { lastFrame } = render(<Plugins />);
    expect(lastFrame()).toContain('All');
    expect(lastFrame()).toContain('Installed');
    expect(lastFrame()).toContain('Available');
  });

  it('lists @medalsocial plugins', () => {
    const { lastFrame } = render(<Plugins />);
    expect(lastFrame()).toContain('kit');
    expect(lastFrame()).toContain('sanity');
    expect(lastFrame()).toContain('pencil');
  });
});
