// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from 'node:crypto';
import type { RegistryIndex, TemplateEntry } from './types.js';

const templates: TemplateEntry[] = [
  {
    name: 'pencil',
    displayName: 'Pencil Design Studio',
    description: 'Local-first design engine by Medal Social',
    version: '1.0.0',
    category: 'design',
    platforms: ['darwin', 'linux', 'win32'],
    steps: [
      { type: 'npm', pkg: '@medalsocial/pencil', global: true, label: 'Pencil engine' },
      { type: 'mcp', server: 'pencil', command: 'pencil mcp', label: 'MCP server wiring' },
      { type: 'zed-extension', id: 'medalsocial.pencil', label: 'Zed extension' },
      {
        type: 'skill',
        id: 'pencil',
        url: 'https://pilot.medalsocial.com/registry/v1/skills/pencil.md',
        label: 'Pencil AI skill',
      },
    ],
    crew: { specialist: 'design-specialist', displayName: 'Design Specialist', skills: ['pencil'] },
    completionHint: 'Open Zed and look for the Pencil panel',
  },
  {
    name: 'remotion',
    displayName: 'Remotion Video Studio',
    description: 'Video production with Node.js and React',
    version: '1.2.0',
    category: 'video',
    platforms: ['darwin', 'linux', 'win32'],
    steps: [
      {
        type: 'pkg',
        nix: 'nodejs_20',
        brew: 'node',
        winget: 'OpenJS.NodeJS.LTS',
        label: 'Node.js runtime',
      },
      { type: 'pkg', nix: 'ffmpeg', brew: 'ffmpeg', winget: 'Gyan.FFmpeg', label: 'Media encoder' },
      {
        type: 'pkg',
        nix: 'chromium',
        brew: 'chromium',
        winget: 'Google.Chrome',
        label: 'Browser engine',
      },
      { type: 'npm', pkg: '@remotion/cli', global: true, label: 'Remotion CLI' },
      {
        type: 'skill',
        id: 'remotion',
        url: 'https://pilot.medalsocial.com/registry/v1/skills/remotion.md',
        label: 'Remotion AI skill',
      },
    ],
    crew: { specialist: 'video-specialist', displayName: 'Video Specialist', skills: ['remotion'] },
    completionHint: 'Open Remotion Studio from your project to start editing video',
  },
  {
    name: 'nextmedal',
    displayName: 'NextMedal Web App',
    description: 'Full-stack Medal Social web application',
    version: '1.0.0',
    category: 'dev',
    platforms: ['darwin', 'linux', 'win32'],
    steps: [
      {
        type: 'pkg',
        nix: 'nodejs_20',
        brew: 'node',
        winget: 'OpenJS.NodeJS.LTS',
        label: 'Node.js runtime',
      },
      {
        type: 'pkg',
        nix: 'nodePackages.pnpm',
        brew: 'pnpm',
        winget: 'pnpm.pnpm',
        label: 'Package manager',
      },
    ],
    completionHint: 'Your project scaffold is ready — open the folder to get started',
  },
];

export const BUNDLED_REGISTRY: RegistryIndex = {
  version: 1,
  publishedAt: '2026-04-21T00:00:00Z',
  sha256: createHash('sha256').update(JSON.stringify(templates)).digest('hex'),
  templates,
};
