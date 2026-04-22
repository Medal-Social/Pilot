// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import type { AnyStep } from '../registry/types.js';
import type { PackageManagers } from './detect.js';
import { runInstallSteps, runUninstallSteps } from './runner.js';

const managers: PackageManagers = { nix: false, brew: false, winget: false, npm: true };

const npmA: AnyStep = { type: 'npm', pkg: 'pkg-a', global: true, label: 'Pkg A' };
const npmB: AnyStep = { type: 'npm', pkg: 'pkg-b', global: true, label: 'Pkg B' };

function makeHandlers(checkPasses: boolean, runFails = false) {
  return {
    checkStep: vi.fn().mockResolvedValue(checkPasses),
    executeStep: runFails
      ? vi.fn().mockRejectedValue(new Error('install failed'))
      : vi.fn().mockResolvedValue(undefined),
    unexecuteStep: vi.fn().mockResolvedValue(undefined),
  };
}

describe('runInstallSteps', () => {
  it('calls onStepSkip for steps that pass check', async () => {
    const handlers = makeHandlers(true);
    const callbacks = {
      onStepStart: vi.fn(),
      onStepSkip: vi.fn(),
      onStepDone: vi.fn(),
      onStepError: vi.fn(),
    };
    await runInstallSteps([npmA], managers, handlers, callbacks);
    expect(callbacks.onStepSkip).toHaveBeenCalledWith(0);
    expect(handlers.executeStep).not.toHaveBeenCalled();
  });

  it('calls onStepDone for steps that execute successfully', async () => {
    const handlers = makeHandlers(false);
    const callbacks = {
      onStepStart: vi.fn(),
      onStepSkip: vi.fn(),
      onStepDone: vi.fn(),
      onStepError: vi.fn(),
    };
    await runInstallSteps([npmA], managers, handlers, callbacks);
    expect(callbacks.onStepDone).toHaveBeenCalledWith(0);
  });

  it('calls onStepError and stops on failure', async () => {
    const handlers = makeHandlers(false, true);
    const callbacks = {
      onStepStart: vi.fn(),
      onStepSkip: vi.fn(),
      onStepDone: vi.fn(),
      onStepError: vi.fn(),
    };
    await expect(runInstallSteps([npmA, npmB], managers, handlers, callbacks)).rejects.toThrow(
      'install failed'
    );
    expect(callbacks.onStepError).toHaveBeenCalledWith(0, expect.any(Error));
    expect(callbacks.onStepStart).toHaveBeenCalledTimes(1); // second step never started
  });
});

describe('runUninstallSteps', () => {
  it('runs steps in reverse order', async () => {
    const order: string[] = [];
    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockImplementation(async (step: AnyStep) => {
        order.push((step as { pkg: string }).pkg);
      }),
    };
    const callbacks = {
      onStepStart: vi.fn(),
      onStepSkip: vi.fn(),
      onStepDone: vi.fn(),
      onStepError: vi.fn(),
    };
    await runUninstallSteps([npmA, npmB], managers, handlers, [], 'test-template', callbacks);
    expect(order).toEqual(['pkg-b', 'pkg-a']);
  });

  it('rejects after all steps when a step fails (continues uninstalling)', async () => {
    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('remove failed')),
    };
    const callbacks = {
      onStepStart: vi.fn(),
      onStepSkip: vi.fn(),
      onStepDone: vi.fn(),
      onStepError: vi.fn(),
    };
    await expect(
      runUninstallSteps([npmA, npmB], managers, handlers, [], 'test-template', callbacks)
    ).rejects.toThrow('remove failed');
    // Both steps were attempted despite the failure
    expect(handlers.unexecuteStep).toHaveBeenCalledTimes(2);
    expect(callbacks.onStepError).toHaveBeenCalledWith(0, expect.any(Error));
  });

  it('skips ALL pkg steps when a peer template is not in registry (unknown peer protection)', async () => {
    const pkgStep: AnyStep = { type: 'pkg', brew: 'node', label: 'Node.js' };
    // fetchRegistry returns registry that does NOT include the peer template 'missing-template'
    vi.mock('../registry/fetch.js', () => ({
      fetchRegistry: vi.fn().mockResolvedValue({
        index: { version: 1, publishedAt: '', sha256: 'x', templates: [] },
        fromCache: false,
        offline: false,
      }),
    }));
    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockResolvedValue(undefined),
    };
    const brewManagers: PackageManagers = { nix: false, brew: true, winget: false, npm: false };
    const callbacks = {
      onStepStart: vi.fn(),
      onStepSkip: vi.fn(),
      onStepDone: vi.fn(),
      onStepError: vi.fn(),
    };
    await runUninstallSteps(
      [pkgStep],
      brewManagers,
      handlers,
      ['missing-template'],
      'remotion',
      callbacks
    );
    expect(handlers.unexecuteStep).not.toHaveBeenCalled();
    expect(callbacks.onStepSkip).toHaveBeenCalledWith(0);
  });

  it('skips global npm steps used by other installed templates', async () => {
    const sharedNpm: AnyStep = {
      type: 'npm',
      pkg: 'typescript',
      global: true,
      label: 'TypeScript',
    };
    vi.mock('../registry/fetch.js', () => ({
      fetchRegistry: vi.fn().mockResolvedValue({
        index: {
          version: 1,
          publishedAt: '',
          sha256: 'x',
          templates: [
            {
              name: 'peer',
              displayName: 'Peer',
              description: '',
              version: '1.0.0',
              category: 'dev',
              platforms: ['darwin'],
              steps: [{ type: 'npm', pkg: 'typescript', global: true, label: 'TypeScript' }],
            },
          ],
        },
        fromCache: false,
        offline: false,
      }),
    }));
    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockResolvedValue(undefined),
    };
    const callbacks = {
      onStepStart: vi.fn(),
      onStepSkip: vi.fn(),
      onStepDone: vi.fn(),
      onStepError: vi.fn(),
    };
    await runUninstallSteps(
      [sharedNpm],
      managers,
      handlers,
      ['peer'],
      'current-template',
      callbacks
    );
    expect(handlers.unexecuteStep).not.toHaveBeenCalled();
    expect(callbacks.onStepSkip).toHaveBeenCalledWith(0);
  });

  it('skips pkg steps used by other installed templates', async () => {
    const pkgStep: AnyStep = { type: 'pkg', brew: 'node', label: 'Node.js' };
    // Mock the fetchRegistry to return a registry where nextmedal also uses brew:node
    vi.mock('../registry/fetch.js', () => ({
      fetchRegistry: vi.fn().mockResolvedValue({
        index: {
          version: 1,
          publishedAt: '',
          sha256: 'x',
          templates: [
            {
              name: 'nextmedal',
              displayName: 'NextMedal',
              description: '',
              version: '1.0.0',
              category: 'dev',
              platforms: ['darwin'],
              steps: [{ type: 'pkg', brew: 'node', label: 'Node.js' }],
            },
          ],
        },
        fromCache: false,
        offline: false,
      }),
    }));
    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockResolvedValue(undefined),
    };
    const brewManagers: PackageManagers = { nix: false, brew: true, winget: false, npm: false };
    const callbacks = {
      onStepStart: vi.fn(),
      onStepSkip: vi.fn(),
      onStepDone: vi.fn(),
      onStepError: vi.fn(),
    };
    await runUninstallSteps(
      [pkgStep],
      brewManagers,
      handlers,
      ['nextmedal'],
      'remotion',
      callbacks
    );
    expect(handlers.unexecuteStep).not.toHaveBeenCalled();
    expect(callbacks.onStepSkip).toHaveBeenCalledWith(0);
  });
});
