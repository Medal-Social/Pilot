// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
import { createRegistry } from './loader.js';

describe('createRegistry', () => {
  it('creates empty registry', () => {
    const reg = createRegistry([]);
    expect(reg.plugins).toHaveLength(0);
  });

  it('loads plugins and finds by id', () => {
    const reg = createRegistry([
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
        path: '/plugins/kit',
      },
    ]);
    expect(reg.plugins).toHaveLength(1);
    expect(reg.getPlugin('@medalsocial/kit')).toBeDefined();
    expect(reg.getPlugin('@medalsocial/nope')).toBeUndefined();
  });

  it('enables and disables plugins', () => {
    const reg = createRegistry([
      {
        manifest: {
          name: 'sanity',
          namespace: 'medalsocial',
          description: 'CMS',
          provides: { commands: [], mcpServers: [] },
          permissions: { network: [] },
          roleBindings: {},
        },
        id: '@medalsocial/sanity',
        enabled: true,
        path: '/plugins/sanity',
      },
    ]);
    expect(reg.enabledPlugins()).toHaveLength(1);
    reg.disable('@medalsocial/sanity');
    expect(reg.enabledPlugins()).toHaveLength(0);
    reg.enable('@medalsocial/sanity');
    expect(reg.enabledPlugins()).toHaveLength(1);
  });
});
