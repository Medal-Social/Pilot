// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

vi.mock('../registry/fetch.js', () => ({
  fetchRegistry: vi.fn().mockResolvedValue({
    index: {
      version: 1,
      publishedAt: '',
      sha256: 'x',
      templates: [
        {
          name: 'remotion',
          displayName: 'Remotion Video Studio',
          description: 'Video',
          version: '1.0.0',
          category: 'video',
          platforms: ['darwin'],
          steps: [],
          completionHint: 'Run remotion',
        },
      ],
    },
    fromCache: false,
    offline: false,
  }),
}));

vi.mock('../installer/detect.js', () => ({
  detectPackageManagers: vi.fn().mockResolvedValue({
    nix: false,
    brew: false,
    winget: false,
    npm: true,
  }),
}));

vi.mock('../installer/exec.js', () => ({ realExec: {} }));

vi.mock('../installer/runner.js', () => ({
  runInstallSteps: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../device/state.js', () => ({
  getInstalledTemplateNames: vi.fn().mockReturnValue([]),
  loadTemplateState: vi.fn().mockReturnValue({ templates: {} }),
  saveTemplateState: vi.fn(),
}));

vi.mock('../settings.js', () => ({
  loadSettings: vi
    .fn()
    .mockReturnValue({ onboarded: true, plugins: {}, mcpServers: {}, crew: { specialists: {} } }),
  saveSettings: vi.fn(),
}));

vi.mock('ink', () => ({
  render: vi.fn().mockReturnValue({ waitUntilExit: vi.fn().mockResolvedValue(undefined) }),
  Text: 'Text',
  Box: 'Box',
  useApp: () => ({ exit: vi.fn() }),
  useInput: vi.fn(),
}));

vi.mock('react', () => ({
  default: { createElement: vi.fn().mockReturnValue(null) },
  createElement: vi.fn().mockReturnValue(null),
  useState: vi.fn().mockReturnValue([[], vi.fn()]),
  useEffect: vi.fn(),
}));

describe('runUp', () => {
  it('throws UP_TEMPLATE_NOT_FOUND for unknown template', async () => {
    const { runUp } = await import('./up.js');
    await expect(runUp('unknown-template')).rejects.toMatchObject({
      code: 'UP_TEMPLATE_NOT_FOUND',
    });
  });

  it('renders UpInstall for a known template name', async () => {
    const { render } = await import('ink');
    const { runUp } = await import('./up.js');
    await runUp('remotion');
    expect(render).toHaveBeenCalled();
  });
});
