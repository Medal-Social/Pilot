// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Step } from './Step.js';

describe('Step', () => {
  it('renders done state with checkmark', () => {
    const { lastFrame } = render(<Step label="Task complete" status="done" />);
    expect(lastFrame()).toContain('✓');
    expect(lastFrame()).toContain('Task complete');
  });

  it('renders active state with spinner character', () => {
    const { lastFrame } = render(<Step label="Working..." status="active" />);
    expect(lastFrame()).toContain('Working...');
  });

  it('renders waiting state with circle', () => {
    const { lastFrame } = render(<Step label="Pending" status="waiting" />);
    expect(lastFrame()).toContain('○');
    expect(lastFrame()).toContain('Pending');
  });

  it('renders error state with cross', () => {
    const { lastFrame } = render(<Step label="Failed" status="error" />);
    expect(lastFrame()).toContain('✗');
    expect(lastFrame()).toContain('Failed');
  });

  it('renders detail text when provided', () => {
    const { lastFrame } = render(<Step label="Task" status="done" detail="extra info" />);
    expect(lastFrame()).toContain('extra info');
  });
});
