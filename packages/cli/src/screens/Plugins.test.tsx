import { describe, expect, it, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Plugins } from './Plugins.js';
import type { LoadedPlugin } from '../plugins/types.js';

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
