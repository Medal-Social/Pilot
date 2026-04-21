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

vi.mock('../screens/Up.js', () => ({ UpBrowse: vi.fn() }));

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

  it('renders UpBrowse when called with no template', async () => {
    const { render } = await import('ink');
    const { runUp } = await import('./up.js');
    await runUp();
    expect(render).toHaveBeenCalled();
  });

  it('writes offline warning to stderr when registry is offline', async () => {
    const { fetchRegistry } = await import('../registry/fetch.js');
    (fetchRegistry as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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
      fromCache: true,
      offline: true,
    });
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { runUp } = await import('./up.js');
    await runUp('remotion');
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('offline'));
    stderrSpy.mockRestore();
  });

  it('stores crewSpecialist key in template state and wires crew settings on install', async () => {
    const { fetchRegistry } = await import('../registry/fetch.js');
    (fetchRegistry as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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
            crew: {
              specialist: 'video-specialist',
              displayName: 'Video Specialist',
              skills: ['remotion'],
            },
          },
        ],
      },
      fromCache: false,
      offline: false,
    });

    const { saveTemplateState } = await import('../device/state.js');
    const { saveSettings } = await import('../settings.js');
    const React = await import('react');
    (React.default.createElement as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (_type: unknown, props: Record<string, unknown> | null) => {
        if (props?.onDone) void (props.onDone as () => Promise<void>)();
        return null;
      }
    );

    const { runUp } = await import('./up.js');
    await runUp('remotion');
    await Promise.resolve();
    await Promise.resolve();

    expect(saveTemplateState).toHaveBeenCalledWith(
      expect.objectContaining({
        templates: expect.objectContaining({
          remotion: expect.objectContaining({ crewSpecialist: 'video-specialist' }),
        }),
      })
    );
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        crew: expect.objectContaining({
          specialists: expect.objectContaining({
            'video-specialist': expect.objectContaining({ displayName: 'Video Specialist' }),
          }),
        }),
      })
    );
  });

  it('ignores concurrent onInstall calls while install is in progress', async () => {
    const react = await import('react');
    const { render } = await import('ink');
    (render as ReturnType<typeof vi.fn>).mockClear();

    type OnInstall = (entry: { name: string }) => void;
    let capturedOnInstall: OnInstall | undefined;
    (react.default.createElement as ReturnType<typeof vi.fn>).mockImplementationOnce(
      (_type: unknown, props: Record<string, unknown> | null) => {
        if (props?.onInstall) capturedOnInstall = props.onInstall as OnInstall;
        return null;
      }
    );

    const { runUp } = await import('./up.js');
    void runUp(); // browse mode
    // flush: fetchRegistry await + dynamic import('../screens/Up.js') await
    await new Promise((r) => setTimeout(r, 0));

    const fakeEntry = {
      name: 'remotion',
      displayName: 'Remotion',
      description: 'Video',
      version: '1.0.0',
      category: 'video',
      platforms: ['darwin'],
      steps: [],
    };

    capturedOnInstall?.(fakeEntry);
    capturedOnInstall?.(fakeEntry); // second call — should be blocked
    // flush: runUp('remotion') fetchRegistry + dynamic import('../screens/up/UpInstall.js')
    await new Promise((r) => setTimeout(r, 0));

    // 1 for UpBrowse + 1 for UpInstall = 2, not 3
    expect(render).toHaveBeenCalledTimes(2);
  });
});
