// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as child_process from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as state from './state.js';
import * as templates from './templates.js';
import { uninstallTemplate } from './uninstaller.js';

vi.mock('node:child_process');
vi.mock('./state.js');
vi.mock('./templates.js');

function mockExecFileSuccess() {
  vi.mocked(child_process.execFile).mockImplementation(((
    _cmd: unknown,
    _args: unknown,
    _opts: unknown,
    cb: unknown
  ) => {
    (cb as (err: null, stdout: string) => void)(null, '');
  }) as typeof child_process.execFile);
}

function mockExecFileError(message: string) {
  vi.mocked(child_process.execFile).mockImplementation(((
    _cmd: unknown,
    _args: unknown,
    _opts: unknown,
    cb: unknown
  ) => {
    (cb as (err: Error) => void)(new Error(message));
  }) as typeof child_process.execFile);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(templates.getTemplate).mockReturnValue(undefined);
  vi.mocked(state.loadTemplateState).mockReturnValue({ templates: {} });
  vi.mocked(state.removeTemplateFromState).mockReturnValue(undefined);
});

describe('uninstallTemplate', () => {
  it('removes all deps for a known installed template', async () => {
    vi.mocked(templates.getTemplate).mockReturnValue({
      name: 'pencil',
      displayName: 'Pencil Design Studio',
      description: 'Design engine and code editor extensions',
      dependencies: [
        { label: 'Design engine', nixPackage: 'pencil-mcp' },
        { label: 'Code editor', nixPackage: 'zed' },
      ],
    });
    vi.mocked(state.loadTemplateState).mockReturnValue({
      templates: {
        pencil: {
          name: 'pencil',
          installedAt: '2024-01-01T00:00:00.000Z',
          lastChecked: '2024-01-01T00:00:00.000Z',
          dependencies: { 'pencil-mcp': true, zed: true },
        },
      },
    });
    mockExecFileSuccess();

    const result = await uninstallTemplate('pencil');

    expect(result.template).toBe('pencil');
    expect(result.removed).toEqual(['pencil-mcp', 'zed']);
    expect(result.failed).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(state.removeTemplateFromState).toHaveBeenCalledWith('pencil');
  });

  it('skips deps not marked installed in state', async () => {
    vi.mocked(templates.getTemplate).mockReturnValue({
      name: 'remotion',
      displayName: 'Remotion Video Studio',
      description: 'Video production with Node.js',
      dependencies: [
        { label: 'Video runtime', nixPackage: 'nodejs' },
        { label: 'Media encoder', nixPackage: 'ffmpeg' },
        { label: 'Browser engine', nixPackage: 'chromium' },
      ],
    });
    vi.mocked(state.loadTemplateState).mockReturnValue({
      templates: {
        remotion: {
          name: 'remotion',
          installedAt: '2024-01-01T00:00:00.000Z',
          lastChecked: '2024-01-01T00:00:00.000Z',
          dependencies: { nodejs: true, ffmpeg: false, chromium: true },
        },
      },
    });
    mockExecFileSuccess();

    const result = await uninstallTemplate('remotion');

    expect(result.removed).toEqual(['nodejs', 'chromium']);
    expect(result.skipped).toEqual(['ffmpeg']);
    expect(result.failed).toEqual([]);
  });

  it('reports failed removals without throwing', async () => {
    vi.mocked(templates.getTemplate).mockReturnValue({
      name: 'pencil',
      displayName: 'Pencil Design Studio',
      description: 'Design engine and code editor extensions',
      dependencies: [
        { label: 'Design engine', nixPackage: 'pencil-mcp' },
        { label: 'Code editor', nixPackage: 'zed' },
      ],
    });
    vi.mocked(state.loadTemplateState).mockReturnValue({
      templates: {
        pencil: {
          name: 'pencil',
          installedAt: '2024-01-01T00:00:00.000Z',
          lastChecked: '2024-01-01T00:00:00.000Z',
          dependencies: { 'pencil-mcp': true, zed: true },
        },
      },
    });
    mockExecFileError('error: package not found');

    const result = await uninstallTemplate('pencil');

    expect(result.removed).toEqual([]);
    expect(result.failed).toEqual(['pencil-mcp', 'zed']);
    expect(result.skipped).toEqual([]);
    expect(state.removeTemplateFromState).not.toHaveBeenCalled();
  });

  it('returns empty result for unknown template', async () => {
    vi.mocked(templates.getTemplate).mockReturnValue(undefined);

    const result = await uninstallTemplate('nonexistent');

    expect(result.template).toBe('nonexistent');
    expect(result.removed).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(state.removeTemplateFromState).not.toHaveBeenCalled();
  });

  it('returns empty result for template not in state', async () => {
    vi.mocked(templates.getTemplate).mockReturnValue({
      name: 'pencil',
      displayName: 'Pencil Design Studio',
      description: 'Design engine and code editor extensions',
      dependencies: [
        { label: 'Design engine', nixPackage: 'pencil-mcp' },
        { label: 'Code editor', nixPackage: 'zed' },
      ],
    });
    vi.mocked(state.loadTemplateState).mockReturnValue({ templates: {} });

    const result = await uninstallTemplate('pencil');

    expect(result.template).toBe('pencil');
    expect(result.removed).toEqual([]);
    expect(result.failed).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(state.removeTemplateFromState).not.toHaveBeenCalled();
  });
});
