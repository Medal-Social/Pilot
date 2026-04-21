// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { RegistryIndex } from '../registry/types.js';
import { UpBrowse } from './Up.js';

const registry: RegistryIndex = {
  version: 1,
  publishedAt: '2026-04-21T00:00:00Z',
  sha256: 'x',
  templates: [
    {
      name: 'pencil',
      displayName: 'Pencil Design Studio',
      description: 'Design engine',
      version: '1.0.0',
      category: 'design',
      platforms: ['darwin'],
      steps: [],
    },
    {
      name: 'remotion',
      displayName: 'Remotion Video Studio',
      description: 'Video tool',
      version: '1.0.0',
      category: 'video',
      platforms: ['darwin'],
      steps: [],
    },
  ],
};

describe('UpBrowse', () => {
  it('renders template names', () => {
    const { lastFrame } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    expect(lastFrame()).toContain('Pencil Design Studio');
    expect(lastFrame()).toContain('Remotion Video Studio');
  });

  it('shows [installed] badge for installed templates', () => {
    const { lastFrame } = render(
      React.createElement(UpBrowse, { registry, installedNames: ['pencil'], onInstall: vi.fn() })
    );
    expect(lastFrame()).toContain('installed');
  });

  it('renders category list', () => {
    const { lastFrame } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    expect(lastFrame()).toContain('All');
  });
});
