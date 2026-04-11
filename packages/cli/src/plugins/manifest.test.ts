// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
import { parseManifest, pluginId } from './manifest.js';

describe('parseManifest', () => {
  it('parses a valid manifest', () => {
    const raw = {
      name: 'kit',
      namespace: 'medalsocial',
      description: 'Machine config & Nix management',
      provides: {
        commands: ['up', 'update', 'status'],
        mcpServers: [],
      },
      permissions: {
        network: [],
      },
      roleBindings: {},
    };
    const result = parseManifest(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('kit');
      expect(result.data.namespace).toBe('medalsocial');
    }
  });

  it('rejects manifest without name', () => {
    const raw = { description: 'test' };
    const result = parseManifest(raw);
    expect(result.success).toBe(false);
  });

  it('computes full plugin ID', () => {
    const raw = {
      name: 'sanity',
      namespace: 'medalsocial',
      description: 'CMS',
      provides: {},
    };
    const result = parseManifest(raw);
    if (result.success) {
      expect(`@${result.data.namespace}/${result.data.name}`).toBe('@medalsocial/sanity');
    }
  });
});

describe('pluginId', () => {
  it('returns formatted id from manifest', () => {
    const result = parseManifest({
      name: 'kit',
      namespace: 'medalsocial',
      description: 'Machine config',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(pluginId(result.data)).toBe('@medalsocial/kit');
    }
  });

  it('throws PilotError when namespace is empty', () => {
    expect(() =>
      pluginId({
        name: 'kit',
        namespace: '',
        description: '',
        provides: { commands: [], mcpServers: [] },
        permissions: { network: [] },
        roleBindings: {},
      })
    ).toThrow();
  });

  it('throws PilotError when name is empty', () => {
    expect(() =>
      pluginId({
        name: '',
        namespace: 'medalsocial',
        description: '',
        provides: { commands: [], mcpServers: [] },
        permissions: { network: [] },
        roleBindings: {},
      })
    ).toThrow();
  });
});
