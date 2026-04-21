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
          steps: [{ type: 'npm', pkg: '@remotion/cli', global: true, label: 'Remotion CLI' }],
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

vi.mock('../device/state.js', () => ({
  getInstalledTemplateNames: vi.fn().mockReturnValue(['remotion']),
  removeTemplateFromState: vi.fn(),
  loadTemplateState: vi.fn().mockReturnValue({ templates: {} }),
  saveTemplateState: vi.fn(),
}));

vi.mock('../installer/runner.js', () => ({
  runUninstallSteps: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../settings.js', () => ({
  loadSettings: vi.fn().mockReturnValue({
    onboarded: true,
    plugins: {},
    mcpServers: {},
    crew: {
      specialists: {
        'video-specialist': { displayName: 'Video Specialist', skills: ['remotion'] },
      },
    },
  }),
  saveSettings: vi.fn(),
}));

vi.mock('../screens/up/UpInstall.js', () => ({
  UpInstall: vi.fn(),
}));

vi.mock('ink', () => ({
  render: vi
    .fn()
    .mockImplementation((_element) => ({ waitUntilExit: vi.fn().mockResolvedValue(undefined) })),
  Text: 'Text',
  Box: 'Box',
  useApp: () => ({ exit: vi.fn() }),
  useInput: vi.fn(),
}));

vi.mock('react', () => {
  const createElement = vi
    .fn()
    .mockImplementation((_type: unknown, props: Record<string, unknown> | null) => {
      if (props && typeof props.runSteps === 'function') {
        props.runSteps({
          onStepStart: vi.fn(),
          onStepSkip: vi.fn(),
          onStepDone: vi.fn(),
          onStepError: vi.fn(),
        });
      }
      return null;
    });
  return {
    default: { createElement },
    createElement,
    useState: vi.fn().mockReturnValue([[], vi.fn()]),
    useEffect: vi.fn(),
  };
});

describe('runDown', () => {
  it('throws DOWN_NOT_INSTALLED when template is not installed', async () => {
    const { runDown } = await import('./down.js');
    // 'unknown' is not in the default installed list (['remotion'])
    await expect(runDown('unknown')).rejects.toMatchObject({ code: 'DOWN_NOT_INSTALLED' });
  });

  it('cleans up state when template is installed but no longer in registry', async () => {
    const { fetchRegistry } = await import('../registry/fetch.js');
    const { getInstalledTemplateNames, removeTemplateFromState } = await import(
      '../device/state.js'
    );
    (getInstalledTemplateNames as ReturnType<typeof vi.fn>).mockReturnValueOnce(['orphan']);
    (fetchRegistry as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      index: { version: 1, publishedAt: '', sha256: 'x', templates: [] },
      fromCache: false,
      offline: false,
    });
    const { runDown } = await import('./down.js');
    await runDown('orphan'); // should not throw
    expect(removeTemplateFromState).toHaveBeenCalledWith('orphan');
  });

  it('calls runUninstallSteps for an installed template', async () => {
    const { runUninstallSteps } = await import('../installer/runner.js');
    const { runDown } = await import('./down.js');
    await runDown('remotion');
    expect(runUninstallSteps).toHaveBeenCalled();
  });
});
