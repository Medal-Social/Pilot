// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Welcome } from './Welcome.js';

describe('Welcome', () => {
  it('shows welcome message', () => {
    const { lastFrame } = render(<Welcome onContinue={() => {}} />);
    expect(lastFrame()).toContain('Welcome aboard, Captain');
  });

  it('lists all crew members', () => {
    const { lastFrame } = render(<Welcome onContinue={() => {}} />);
    expect(lastFrame()).toContain('Brand Lead');
    expect(lastFrame()).toContain('Marketing Lead');
    expect(lastFrame()).toContain('Tech Lead');
    expect(lastFrame()).toContain('CS Lead');
    expect(lastFrame()).toContain('Sales Lead');
  });
});
