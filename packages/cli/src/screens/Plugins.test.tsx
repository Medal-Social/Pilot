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
});
