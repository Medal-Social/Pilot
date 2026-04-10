import { describe, expect, it, vi } from 'vitest';
import { discoverPlugins } from './discover.js';
import * as fs from 'node:fs';

vi.mock('node:fs');

describe('discoverPlugins', () => {
  it('returns bundled plugins with default enabled state', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const plugins = discoverPlugins({
      userDir: '/fake/.pilot/plugins',
      enabledState: {},
    });

    expect(plugins.length).toBeGreaterThanOrEqual(3);
    expect(plugins.find((p) => p.id === '@medalsocial/kit')).toBeDefined();
    expect(plugins.find((p) => p.id === '@medalsocial/sanity')).toBeDefined();
    expect(plugins.find((p) => p.id === '@medalsocial/pencil')).toBeDefined();
  });

  it('respects enabled state from settings', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const plugins = discoverPlugins({
      userDir: '/fake/.pilot/plugins',
      enabledState: { '@medalsocial/kit': { enabled: false } },
    });

    const kit = plugins.find((p) => p.id === '@medalsocial/kit');
    expect(kit?.enabled).toBe(false);
  });

  it('merges user plugins with bundled', () => {
    const mockToml = `
name = "custom"
namespace = "user"
description = "Custom plugin"

[provides]
commands = ["custom"]
mcpServers = []

[permissions]
network = []

[roleBindings]
`;

    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const s = String(p);
      if (s === '/fake/.pilot/plugins') return true;
      if (s.endsWith('plugin.toml')) return true;
      return false;
    });

    vi.mocked(fs.readdirSync).mockReturnValue(['custom'] as unknown as fs.Dirent[]);
    vi.mocked(fs.readFileSync).mockReturnValue(mockToml);

    const plugins = discoverPlugins({
      userDir: '/fake/.pilot/plugins',
      enabledState: {},
    });

    expect(plugins.find((p) => p.id === '@user/custom')).toBeDefined();
    expect(plugins.find((p) => p.id === '@medalsocial/kit')).toBeDefined();
  });

  it('skips malformed plugin.toml and continues scanning', () => {
    const validToml = `
name = "good"
namespace = "user"
description = "Good plugin"

[provides]
commands = ["good"]
mcpServers = []

[permissions]
network = []

[roleBindings]
`;

    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const s = String(p);
      if (s === '/fake/.pilot/plugins') return true;
      if (s.endsWith('plugin.toml')) return true;
      return false;
    });

    vi.mocked(fs.readdirSync).mockReturnValue([
      'broken',
      'good',
    ] as unknown as fs.Dirent[]);

    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const s = String(p);
      if (s.includes('broken')) return '<<<INVALID TOML>>>';
      return validToml;
    });

    const plugins = discoverPlugins({
      userDir: '/fake/.pilot/plugins',
      enabledState: {},
    });

    // broken plugin should be skipped, good plugin and bundled plugins present
    expect(plugins.find((p) => p.id === '@user/good')).toBeDefined();
    expect(plugins.find((p) => p.id === '@medalsocial/kit')).toBeDefined();
    expect(plugins.find((p) => p.id.includes('broken'))).toBeUndefined();
  });
});
