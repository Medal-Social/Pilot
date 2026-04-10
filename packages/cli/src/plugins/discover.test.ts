import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { discoverPlugins } from './discover.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

vi.mock('node:fs');

const mockToml = `
name = "kit"
namespace = "medalsocial"
description = "Machine config & Nix management"

[provides]
commands = ["up", "update", "status"]
mcpServers = []

[permissions]
network = []

[roleBindings]
`;

describe('discoverPlugins', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('discovers plugins from bundled directory', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const s = String(p);
      if (s.endsWith('plugins') || s.endsWith('kit')) return true;
      if (s.endsWith('plugin.toml')) return true;
      return false;
    });

    vi.mocked(fs.readdirSync).mockImplementation((p) => {
      const s = String(p);
      if (s.includes('plugins')) return ['kit'] as unknown as fs.Dirent[];
      return [] as unknown as fs.Dirent[];
    });

    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (String(p).endsWith('plugin.toml')) return mockToml;
      return '';
    });

    const plugins = discoverPlugins({
      bundledDir: '/fake/packages/plugins',
      userDir: '/fake/.pilot/plugins',
      enabledState: {},
    });

    expect(plugins).toHaveLength(1);
    expect(plugins[0].id).toBe('@medalsocial/kit');
    expect(plugins[0].manifest.name).toBe('kit');
    expect(plugins[0].enabled).toBe(true);
  });

  it('respects enabled state from settings', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const s = String(p);
      if (s.endsWith('plugins') || s.endsWith('kit')) return true;
      if (s.endsWith('plugin.toml')) return true;
      return false;
    });

    vi.mocked(fs.readdirSync).mockImplementation((p) => {
      const s = String(p);
      if (s.includes('plugins')) return ['kit'] as unknown as fs.Dirent[];
      return [] as unknown as fs.Dirent[];
    });

    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      if (String(p).endsWith('plugin.toml')) return mockToml;
      return '';
    });

    const plugins = discoverPlugins({
      bundledDir: '/fake/packages/plugins',
      userDir: '/fake/.pilot/plugins',
      enabledState: { '@medalsocial/kit': { enabled: false } },
    });

    expect(plugins[0].enabled).toBe(false);
  });

  it('skips directories without plugin.toml', () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const s = String(p);
      if (s.endsWith('plugins')) return true;
      if (s.endsWith('empty-dir')) return true;
      return false;
    });

    vi.mocked(fs.readdirSync).mockImplementation((p) => {
      const s = String(p);
      if (s.includes('plugins')) return ['empty-dir'] as unknown as fs.Dirent[];
      return [] as unknown as fs.Dirent[];
    });

    const plugins = discoverPlugins({
      bundledDir: '/fake/packages/plugins',
      userDir: '/fake/.pilot/plugins',
      enabledState: {},
    });

    expect(plugins).toHaveLength(0);
  });
});
