// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar.js';

describe('ProgressBar', () => {
  it('renders filled and empty segments', () => {
    const { lastFrame } = render(<ProgressBar progress={0.5} width={10} />);
    expect(lastFrame()).toContain('█'.repeat(5));
    expect(lastFrame()).toContain('░'.repeat(5));
  });

  it('renders label when provided', () => {
    const { lastFrame } = render(<ProgressBar progress={0.5} label="50% complete" />);
    expect(lastFrame()).toContain('50% complete');
  });

  it('clamps progress to 0-1 range', () => {
    const { lastFrame } = render(<ProgressBar progress={1.5} width={10} />);
    expect(lastFrame()).toContain('█'.repeat(10));

    const { lastFrame: frame2 } = render(<ProgressBar progress={-0.5} width={10} />);
    expect(frame2()).toContain('░'.repeat(10));
  });

  it('renders at zero progress', () => {
    const { lastFrame } = render(<ProgressBar progress={0} width={10} />);
    expect(lastFrame()).toContain('░'.repeat(10));
  });
});
