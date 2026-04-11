// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Header } from './Header.js';

describe('Header', () => {
  it('renders medium size by default', () => {
    const { lastFrame } = render(<Header />);
    expect(lastFrame()).toContain('pilot');
    expect(lastFrame()).toContain('medal social');
  });

  it('renders small size with shorter text', () => {
    const { lastFrame } = render(<Header size="small" />);
    expect(lastFrame()).toContain('pilot');
    // Small size uses '✈ pilot' not the full LOGO_SMALL
    expect(lastFrame()).not.toContain('medal social');
  });

  it('renders large size same as medium', () => {
    const { lastFrame } = render(<Header size="large" />);
    expect(lastFrame()).toContain('pilot');
    expect(lastFrame()).toContain('medal social');
  });

  it('renders subtitle when provided', () => {
    const { lastFrame } = render(<Header subtitle="v1.0.0" />);
    expect(lastFrame()).toContain('v1.0.0');
  });

  it('does not render subtitle element when not provided', () => {
    const { lastFrame } = render(<Header />);
    // No extra line below the logo
    const lines = (lastFrame() ?? '').split('\n').filter(Boolean);
    expect(lines.length).toBe(1);
  });
});
