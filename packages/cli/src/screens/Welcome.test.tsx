// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
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

  it('shows press Enter instruction', () => {
    const { lastFrame } = render(<Welcome onContinue={() => {}} />);
    expect(lastFrame()).toContain('Enter');
  });

  it('calls onContinue when Enter is pressed', async () => {
    const onContinue = vi.fn();
    const { stdin } = render(<Welcome onContinue={onContinue} />);
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\r');
    await new Promise((r) => setTimeout(r, 20));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
