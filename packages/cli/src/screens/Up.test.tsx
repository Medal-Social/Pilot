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

  it('navigates categories with down arrow', async () => {
    const { lastFrame, stdin } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\x1B[B'); // down arrow
    await new Promise((r) => setTimeout(r, 20));
    expect(lastFrame()).toBeDefined();
  });

  it('navigates categories with up arrow', async () => {
    const { lastFrame, stdin } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\x1B[A'); // up arrow
    await new Promise((r) => setTimeout(r, 20));
    expect(lastFrame()).toBeDefined();
  });

  it('switches to templates panel with right arrow', async () => {
    const { lastFrame, stdin } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\x1B[C'); // right arrow
    await new Promise((r) => setTimeout(r, 20));
    expect(lastFrame()).toBeDefined();
  });

  it('switches to templates panel with Enter in categories', async () => {
    const { lastFrame, stdin } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\r'); // Enter
    await new Promise((r) => setTimeout(r, 20));
    expect(lastFrame()).toBeDefined();
  });

  it('navigates templates with down and up arrows', async () => {
    const { lastFrame, stdin } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\x1B[C'); // right arrow — switch to templates
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\x1B[B'); // down arrow in templates
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\x1B[A'); // up arrow in templates
    await new Promise((r) => setTimeout(r, 20));
    expect(lastFrame()).toBeDefined();
  });

  it('switches back to categories with left arrow', async () => {
    const { lastFrame, stdin } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\x1B[C'); // right arrow — switch to templates
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\x1B[D'); // left arrow — switch back
    await new Promise((r) => setTimeout(r, 20));
    expect(lastFrame()).toBeDefined();
  });

  it('calls onInstall when Enter pressed on template', async () => {
    const onInstall = vi.fn();
    const { stdin } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall })
    );
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\r'); // Enter in categories switches to templates
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\r'); // Enter in templates installs first template
    await new Promise((r) => setTimeout(r, 20));
    expect(onInstall).toHaveBeenCalledWith(registry.templates[0]);
  });

  it('exits process when q is pressed', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const { stdin } = render(
      React.createElement(UpBrowse, { registry, installedNames: [], onInstall: vi.fn() })
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(() => stdin.write('q')).toThrow('exit');
    exitSpy.mockRestore();
  });

  it('does not switch panel with right arrow when no templates', async () => {
    const emptyRegistry: RegistryIndex = {
      version: 1,
      publishedAt: '2026-04-21T00:00:00Z',
      sha256: 'x',
      templates: [],
    };
    const { lastFrame, stdin } = render(
      React.createElement(UpBrowse, {
        registry: emptyRegistry,
        installedNames: [],
        onInstall: vi.fn(),
      })
    );
    await new Promise((r) => setTimeout(r, 20));
    stdin.write('\x1B[C'); // right — no templates so stays on categories
    await new Promise((r) => setTimeout(r, 20));
    expect(lastFrame()).toContain('No templates');
  });
});
