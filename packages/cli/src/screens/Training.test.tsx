import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Training } from './Training.js';

describe('Training', () => {
  it('shows Training header', () => {
    const { lastFrame } = render(<Training />);
    expect(lastFrame()).toContain('Training');
  });

  it('shows source tabs', () => {
    const { lastFrame } = render(<Training />);
    expect(lastFrame()).toContain('Sources');
    expect(lastFrame()).toContain('Articles');
    expect(lastFrame()).toContain('Runs');
  });
});
