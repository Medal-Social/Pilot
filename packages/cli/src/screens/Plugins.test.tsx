// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import type { LoadedPlugin } from '../plugins/types.js';
import { Plugins } from './Plugins.js';

vi.mock('../settings.js', () => ({
  loadSettings: vi.fn(() => ({ onboarded: true, plugins: {} })),
  saveSettings: vi.fn(),
}));

const mockPlugins: LoadedPlugin[] = [
  {
    manifest: {
      name: 'kit',
      namespace: 'medalsocial',
      description: 'Machine config & Nix management',
      provides: { commands: ['up', 'update', 'status'], mcpServers: [] },
      permissions: { network: [] },
      roleBindings: {},
    },
    id: '@medalsocial/kit',
    enabled: true,
    path: '/fake/plugins/kit',
  },
  {
    manifest: {
      name: 'sanity',
      namespace: 'medalsocial',
      description: 'CMS content management',
      provides: { commands: [], mcpServers: ['sanity'] },
      permissions: { network: [] },
      roleBindings: {},
    },
    id: '@medalsocial/sanity',
    enabled: true,
    path: '/fake/plugins/sanity',
  },
  {
    manifest: {
      name: 'pencil',
      namespace: 'medalsocial',
      description: 'Design tool integration',
      provides: { commands: [], mcpServers: ['pencil'] },
      permissions: { network: [] },
      roleBindings: {},
    },
    id: '@medalsocial/pencil',
    enabled: false,
    path: '/fake/plugins/pencil',
  },
];

describe('Plugins', () => {
  it('shows plugin header', () => {
    const { lastFrame } = render(<Plugins plugins={mockPlugins} />);
    expect(lastFrame()).toContain('Plugins');
  });

  it('shows tabs', () => {
    const { lastFrame } = render(<Plugins plugins={mockPlugins} />);
    expect(lastFrame()).toContain('All');
    expect(lastFrame()).toContain('Enabled');
    expect(lastFrame()).toContain('Disabled');
  });

  it('lists plugin names', () => {
    const { lastFrame } = render(<Plugins plugins={mockPlugins} />);
    expect(lastFrame()).toContain('kit');
    expect(lastFrame()).toContain('sanity');
    expect(lastFrame()).toContain('pencil');
  });

  it('shows enabled/disabled status', () => {
    const { lastFrame } = render(<Plugins plugins={mockPlugins} />);
    expect(lastFrame()).toContain('● enabled');
    expect(lastFrame()).toContain('○ disabled');
  });

  it('shows plugin details for selected plugin', () => {
    const { lastFrame } = render(<Plugins plugins={mockPlugins} />);
    expect(lastFrame()).toContain('@medalsocial/kit');
    expect(lastFrame()).toContain('Machine config');
  });

  it('shows empty detail pane message when no plugins provided', () => {
    const { lastFrame } = render(<Plugins plugins={[]} />);
    expect(lastFrame()).toContain('No plugins in this view');
    expect(lastFrame()).toContain('Select a plugin');
  });

  it('enables a disabled plugin with e key', async () => {
    const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));
    const { lastFrame, stdin } = render(<Plugins plugins={mockPlugins} />);
    await delay();

    // Switch to Disabled tab (press 3) — pencil is there and selected
    stdin.write('3');
    await delay();
    expect(lastFrame()).toContain('▸ pencil');

    // Enable pencil (press e)
    stdin.write('e');
    await delay();

    // Switch to All tab to verify pencil is now enabled
    stdin.write('1');
    await delay();
    expect(lastFrame()).toContain('pencil');
  });

  it('shows provided commands in detail pane', () => {
    const { lastFrame } = render(<Plugins plugins={mockPlugins} />);
    // kit is selected by default, and it provides commands: ['up', 'update', 'status']
    expect(lastFrame()).toContain('PROVIDES');
    expect(lastFrame()).toContain('✓ up');
    expect(lastFrame()).toContain('✓ update');
    expect(lastFrame()).toContain('✓ status');
  });

  it('shows provided MCP servers in detail pane', async () => {
    const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));
    const { lastFrame, stdin } = render(<Plugins plugins={mockPlugins} />);
    await delay();
    // Navigate down to sanity which has mcpServers: ['sanity']
    stdin.write('\x1B[B');
    await delay();
    expect(lastFrame()).toContain('✓ sanity (MCP)');
  });

  it('does not toggle when pressing d on already disabled plugin', async () => {
    const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));
    const { lastFrame, stdin } = render(<Plugins plugins={mockPlugins} />);
    await delay();
    // Navigate to pencil (index 2, disabled)
    stdin.write('\x1B[B');
    await delay();
    stdin.write('\x1B[B');
    await delay();
    // Press 'd' on a disabled plugin — should be a no-op
    stdin.write('d');
    await delay();
    expect(lastFrame()).toContain('○ disabled');
  });

  it('does not toggle when pressing e on already enabled plugin', async () => {
    const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));
    const { lastFrame, stdin } = render(<Plugins plugins={mockPlugins} />);
    await delay();
    // kit is selected (index 0, enabled) — press 'e' should be a no-op
    stdin.write('e');
    await delay();
    expect(lastFrame()).toContain('● enabled');
  });

  it('renders PROVIDES section when plugin has no commands or mcpServers', () => {
    const pluginWithNoProvides: LoadedPlugin[] = [
      {
        manifest: {
          name: 'bare',
          namespace: 'medalsocial',
          description: 'A plugin with no commands or MCP servers',
          // Cast to bypass Zod defaults and exercise the `?? []` null branches
          provides: {
            commands: undefined as unknown as string[],
            mcpServers: undefined as unknown as string[],
          },
          permissions: { network: [] },
          roleBindings: {},
        },
        id: '@medalsocial/bare',
        enabled: true,
        path: '/fake/plugins/bare',
      },
    ];
    const { lastFrame } = render(<Plugins plugins={pluginWithNoProvides} />);
    expect(lastFrame()).toContain('PROVIDES');
    expect(lastFrame()).toContain('bare');
  });

  it('recovers toggle after disabling only enabled plugin on Enabled tab', async () => {
    // One enabled, one disabled — Enabled tab has exactly 1 plugin
    const plugins: LoadedPlugin[] = [
      {
        manifest: {
          name: 'kit',
          namespace: 'medalsocial',
          description: 'Machine config',
          provides: { commands: ['up'], mcpServers: [] },
          permissions: { network: [] },
          roleBindings: {},
        },
        id: '@medalsocial/kit',
        enabled: true,
        path: '/fake/plugins/kit',
      },
      {
        manifest: {
          name: 'pencil',
          namespace: 'medalsocial',
          description: 'Design tools',
          provides: { commands: [], mcpServers: ['pencil'] },
          permissions: { network: [] },
          roleBindings: {},
        },
        id: '@medalsocial/pencil',
        enabled: false,
        path: '/fake/plugins/pencil',
      },
    ];

    const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

    const { lastFrame, stdin } = render(<Plugins plugins={plugins} />);

    // Switch to Enabled tab (press 2) — only kit is visible
    await delay();
    stdin.write('2');
    await delay();
    expect(lastFrame()).toContain('▸ kit');

    // Disable kit (press d) — Enabled tab becomes empty
    stdin.write('d');
    await delay();

    // Should show empty state, not a ghost highlight on a nonexistent item
    expect(lastFrame()).toContain('No plugins in this view');
    // The detail pane should NOT show kit's details anymore
    expect(lastFrame()).not.toContain('▸ kit');
  });
});
