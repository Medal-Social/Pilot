import { describe, expect, it } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Update } from './Update.js';

describe('Update', () => {
  it('shows checking state initially', () => {
    const { lastFrame } = render(<Update />);
    expect(lastFrame()).toContain('Checking for updates');
  });
});
