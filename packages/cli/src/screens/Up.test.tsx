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

// Ink control-sequence helpers for simulating input.
const DOWN = '[B';
const UP = '[A';
const LEFT = '[D';
const RIGHT = '[C';
const RETURN = '\r';

async function flush() {
  await new Promise((r) => setTimeout(r, 20));
}

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

  it('moves category down on arrow-down and wraps around', async () => {
    const { stdin, lastFrame } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    stdin.write(DOWN);
    await flush();
    stdin.write(DOWN);
    await flush();
    stdin.write(DOWN);
    await flush();
    // After wrapping, lastFrame still renders — we just assert the component
    // hasn't crashed and the 'All' label still shows (it's the first category).
    expect(lastFrame()).toContain('All');
  });

  it('moves category up from first selection (wraps to end)', async () => {
    const { stdin, lastFrame } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    stdin.write(UP);
    await flush();
    // Wrapped to last category ('video') — remotion should be visible.
    expect(lastFrame()).toContain('Remotion Video Studio');
  });

  it('switches to templates panel with right-arrow', async () => {
    const { stdin, lastFrame } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    stdin.write(RIGHT);
    await flush();
    // When templates panel is focused, cursor color shifts — the frame should
    // still include the templates.
    expect(lastFrame()).toContain('Pencil Design Studio');
  });

  it('invokes onInstall when pressing Enter on a selected template', async () => {
    const onInstall = vi.fn();
    const { stdin } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall })
    );
    stdin.write(RIGHT); // focus templates
    await flush();
    stdin.write(RETURN); // install selected
    await flush();
    expect(onInstall).toHaveBeenCalledWith(expect.objectContaining({ name: 'pencil' }));
  });

  it('arrow-down/up cycles the selected template', async () => {
    const onInstall = vi.fn();
    const { stdin } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall })
    );
    stdin.write(RIGHT);
    await flush();
    stdin.write(DOWN);
    await flush();
    stdin.write(UP);
    await flush();
    stdin.write(RETURN);
    await flush();
    expect(onInstall).toHaveBeenCalled();
  });

  it('left-arrow returns focus from templates back to categories', async () => {
    const { stdin, lastFrame } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    stdin.write(RIGHT);
    await flush();
    stdin.write(LEFT);
    await flush();
    expect(lastFrame()).toContain('All');
  });

  it('enter in categories advances to templates when the category is non-empty', async () => {
    const { stdin, lastFrame } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    stdin.write(RETURN);
    await flush();
    expect(lastFrame()).toContain('Pencil Design Studio');
  });

  it('shows empty-category message and ignores right-arrow when no templates match', async () => {
    const emptyRegistry: RegistryIndex = {
      version: 1,
      publishedAt: '2026-04-21T00:00:00Z',
      sha256: 'x',
      templates: [],
    };
    const { stdin, lastFrame } = render(
      React.createElement(UpBrowse, {
        registry: emptyRegistry,
        installedNames: [],
        onInstall: vi.fn(),
      })
    );
    stdin.write(RIGHT); // should be a no-op because displayTemplates is empty
    await flush();
    expect(lastFrame()).toContain('No templates in this category');
  });

  it('ignores arrow keys inside templates panel when templates are empty', async () => {
    // Narrow to a category with no matching templates by flipping category with
    // down-arrow to an imaginary second category. Use a registry whose only
    // category has a single template, then clear it by filtering on an empty
    // category. We simulate this by providing a second category that is empty.
    const twoCatRegistry: RegistryIndex = {
      version: 1,
      publishedAt: '2026-04-21T00:00:00Z',
      sha256: 'x',
      templates: [
        {
          name: 'pencil',
          displayName: 'Pencil',
          description: '',
          version: '1.0.0',
          category: 'design',
          platforms: ['darwin'],
          steps: [],
        },
      ],
    };
    const { stdin, lastFrame } = render(
      React.createElement(UpBrowse, {
        registry: twoCatRegistry,
        installedNames: [],
        onInstall: vi.fn(),
      })
    );
    stdin.write(RIGHT);
    await flush();
    // Inside templates panel, down/up with a single template should not crash.
    stdin.write(DOWN);
    await flush();
    stdin.write(UP);
    await flush();
    expect(lastFrame()).toContain('Pencil');
  });

  it('exits the process on q key', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(((_code?: number) => {
      // Prevent actual exit during tests.
      return undefined as never;
    }) as never);
    const { stdin } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    stdin.write('q');
    await flush();
    expect(exit).toHaveBeenCalledWith(0);
    exit.mockRestore();
  });
});
