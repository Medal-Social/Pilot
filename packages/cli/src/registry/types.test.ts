// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { RegistryIndexSchema, TemplateEntrySchema } from './types.js';

describe('TemplateEntrySchema', () => {
  it('parses a template with pkg and npm steps', () => {
    const raw = {
      name: 'remotion',
      displayName: 'Remotion',
      description: 'Video tool',
      version: '1.0.0',
      category: 'video',
      platforms: ['darwin', 'linux'],
      steps: [
        { type: 'pkg', brew: 'node', winget: 'OpenJS.NodeJS', label: 'Node.js' },
        { type: 'npm', pkg: '@remotion/cli', global: true, label: 'Remotion CLI' },
      ],
      completionHint: 'Run npx remotion studio',
    };
    const parsed = TemplateEntrySchema.parse(raw);
    expect(parsed.name).toBe('remotion');
    expect(parsed.steps).toHaveLength(2);
  });

  it('parses skill + mcp + zed-extension steps', () => {
    const raw = {
      name: 'pencil',
      displayName: 'Pencil',
      description: 'Design tool',
      version: '1.0.0',
      category: 'design',
      platforms: ['darwin'],
      steps: [
        { type: 'mcp', server: 'pencil', command: 'pencil mcp', label: 'MCP wiring' },
        { type: 'zed-extension', id: 'medalsocial.pencil', label: 'Zed extension' },
        { type: 'skill', id: 'pencil', url: 'https://example.com/pencil.md', label: 'AI skill' },
      ],
      crew: {
        specialist: 'design-specialist',
        displayName: 'Design Specialist',
        skills: ['pencil'],
      },
    };
    const parsed = TemplateEntrySchema.parse(raw);
    expect(parsed.crew?.specialist).toBe('design-specialist');
  });

  it('rejects unknown step type', () => {
    const raw = {
      name: 'x',
      displayName: 'X',
      description: 'X',
      version: '1.0.0',
      category: 'other',
      platforms: ['darwin'],
      steps: [{ type: 'unknown', label: 'bad' }],
    };
    expect(() => TemplateEntrySchema.parse(raw)).toThrow();
  });
});

describe('RegistryIndexSchema', () => {
  it('parses a valid registry index', () => {
    const raw = {
      version: 1,
      publishedAt: '2026-04-21T00:00:00Z',
      sha256: 'abc123',
      templates: [],
    };
    expect(RegistryIndexSchema.parse(raw)).toEqual(raw);
  });

  it('rejects missing sha256', () => {
    expect(() =>
      RegistryIndexSchema.parse({ version: 1, publishedAt: '2026-04-21T00:00:00Z', templates: [] })
    ).toThrow();
  });
});
