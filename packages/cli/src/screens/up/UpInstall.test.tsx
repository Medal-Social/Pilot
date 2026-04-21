// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { TemplateEntry } from '../../registry/types.js';
import { UpInstall } from './UpInstall.js';

const entry: TemplateEntry = {
  name: 'remotion',
  displayName: 'Remotion Video Studio',
  description: 'Video with React',
  version: '1.0.0',
  category: 'video',
  platforms: ['darwin'],
  steps: [{ type: 'npm', pkg: '@remotion/cli', global: true, label: 'Remotion CLI' }],
  completionHint: 'Run npx remotion studio',
};

const managers = { nix: false, brew: false, winget: false, npm: true };

describe('UpInstall', () => {
  it('renders the template displayName', () => {
    const runSteps = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    const { lastFrame } = render(React.createElement(UpInstall, { entry, managers, runSteps }));
    expect(lastFrame()).toContain('Remotion Video Studio');
  });

  it('renders step labels with waiting status initially', () => {
    const runSteps = vi.fn().mockReturnValue(new Promise(() => {}));
    const { lastFrame } = render(React.createElement(UpInstall, { entry, managers, runSteps }));
    expect(lastFrame()).toContain('Remotion CLI');
    expect(lastFrame()).toContain('○'); // waiting icon from Step component
  });
});
