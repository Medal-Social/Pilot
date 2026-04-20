// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Home } from './Home.js';

describe('Home', () => {
  it('shows pilot logo', () => {
    const { lastFrame } = render(<Home />);
    expect(lastFrame()).toContain('Pilot');
  });

  it('shows input prompt', () => {
    const { lastFrame } = render(<Home />);
    expect(lastFrame()).toContain('What would you like to work on?');
  });
});
