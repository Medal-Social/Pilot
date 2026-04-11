// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import type { LoadedPlugin } from './types.js';

export const bundledPlugins: LoadedPlugin[] = [
  {
    manifest: {
      name: 'kit',
      namespace: 'medalsocial',
      description: 'Machine configuration & Nix management',
      provides: { commands: ['up', 'update', 'status'], mcpServers: [] },
      permissions: { network: [] },
      roleBindings: {},
    },
    id: '@medalsocial/kit',
    enabled: true,
    path: 'bundled',
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
    path: 'bundled',
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
    enabled: true,
    path: 'bundled',
  },
];
