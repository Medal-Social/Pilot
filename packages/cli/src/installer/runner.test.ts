// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnyStep, TemplateEntry } from '../registry/types.js';
import type { PackageManagers } from './detect.js';
import { runInstallSteps, runUninstallSteps } from './runner.js';

vi.mock('../registry/fetch.js', () => ({
  fetchRegistry: vi.fn(),
}));

vi.mock('../device/state.js', () => ({
  loadTemplateState: vi.fn(),
}));

// Lazy imports so we can re-type the mocks per test.
const getFetchMock = async () => {
  const mod = await import('../registry/fetch.js');
  return mod.fetchRegistry as ReturnType<typeof vi.fn>;
};
const getLoadStateMock = async () => {
  const mod = await import('../device/state.js');
  return mod.loadTemplateState as ReturnType<typeof vi.fn>;
};

const managers: PackageManagers = { nix: false, brew: false, winget: false, npm: true };

const npmA: AnyStep = { type: 'npm', pkg: 'pkg-a', global: true, label: 'Pkg A' };
const npmB: AnyStep = { type: 'npm', pkg: 'pkg-b', global: true, label: 'Pkg B' };

function emptyRegistry(): {
  index: { version: number; publishedAt: string; sha256: string; templates: TemplateEntry[] };
  fromCache: boolean;
  offline: boolean;
} {
  return {
    index: { version: 1, publishedAt: '', sha256: 'x', templates: [] },
    fromCache: false,
    offline: false,
  };
}

function registryWith(templates: TemplateEntry[]) {
  return {
    index: { version: 1, publishedAt: '', sha256: 'x', templates },
    fromCache: false,
    offline: false,
  };
}

function makeHandlers(checkPasses: boolean, runFails = false) {
  return {
    checkStep: vi.fn().mockResolvedValue(checkPasses),
    executeStep: runFails
      ? vi.fn().mockRejectedValue(new Error('install failed'))
      : vi.fn().mockResolvedValue(undefined),
    unexecuteStep: vi.fn().mockResolvedValue(undefined),
  };
}

const callbacks = () => ({
  onStepStart: vi.fn(),
  onStepSkip: vi.fn(),
  onStepDone: vi.fn(),
  onStepError: vi.fn(),
});

beforeEach(async () => {
  const fetchMock = await getFetchMock();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(emptyRegistry());

  const loadStateMock = await getLoadStateMock();
  loadStateMock.mockReset();
  loadStateMock.mockReturnValue({ templates: {} });
});

describe('runInstallSteps', () => {
  it('calls onStepSkip for steps that pass check', async () => {
    const handlers = makeHandlers(true);
    const cbs = callbacks();
    await runInstallSteps([npmA], managers, handlers, cbs);
    expect(cbs.onStepSkip).toHaveBeenCalledWith(0);
    expect(handlers.executeStep).not.toHaveBeenCalled();
  });

  it('calls onStepDone for steps that execute successfully', async () => {
    const handlers = makeHandlers(false);
    const cbs = callbacks();
    await runInstallSteps([npmA], managers, handlers, cbs);
    expect(cbs.onStepDone).toHaveBeenCalledWith(0);
  });

  it('calls onStepError and stops on failure', async () => {
    const handlers = makeHandlers(false, true);
    const cbs = callbacks();
    await expect(runInstallSteps([npmA, npmB], managers, handlers, cbs)).rejects.toThrow(
      'install failed'
    );
    expect(cbs.onStepError).toHaveBeenCalledWith(0, expect.any(Error));
    expect(cbs.onStepStart).toHaveBeenCalledTimes(1);
  });

  it('wraps non-Error rejections in an Error instance', async () => {
    const handlers = {
      checkStep: vi.fn().mockResolvedValue(false),
      executeStep: vi.fn().mockRejectedValue('raw string'),
      unexecuteStep: vi.fn(),
    };
    const cbs = callbacks();
    await expect(runInstallSteps([npmA], managers, handlers, cbs)).rejects.toThrow('raw string');
    expect(cbs.onStepError).toHaveBeenCalledWith(0, expect.any(Error));
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
    await runUninstallSteps([npmA, npmB], managers, handlers, [], 'test-template', callbacks());
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
    const cbs = callbacks();
    await expect(
      runUninstallSteps([npmA, npmB], managers, handlers, [], 'test-template', cbs)
    ).rejects.toThrow('remove failed');
    expect(handlers.unexecuteStep).toHaveBeenCalledTimes(2);
    expect(cbs.onStepError).toHaveBeenCalledWith(0, expect.any(Error));
  });

  it('wraps non-Error uninstall rejections in Error', async () => {
    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockRejectedValueOnce('raw string failure'),
    };
    const cbs = callbacks();
    await expect(runUninstallSteps([npmA], managers, handlers, [], 'current', cbs)).rejects.toThrow(
      'raw string failure'
    );
    expect(cbs.onStepError).toHaveBeenCalledWith(0, expect.any(Error));
  });

  it('uses the exported unexecuteStep when handlers.unexecuteStep is omitted', async () => {
    // Cast through unknown to pass partial handlers (mirrors runtime fallback).
    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
    } as unknown as {
      checkStep: typeof import('./steps.js').checkStep;
      executeStep: typeof import('./steps.js').executeStep;
    };
    const skillStep: AnyStep = {
      type: 'skill',
      id: 'nonexistent',
      url: 'https://example.com/x.md',
      label: 'Skill',
    };
    const cbs = callbacks();
    // The default unexecuteSkill is a no-op when the file is missing, so this
    // exercises the fallback path without side effects on the developer machine.
    await runUninstallSteps([skillStep], managers, handlers, [], 'current', cbs);
    expect(cbs.onStepDone).toHaveBeenCalledWith(0);
  });

  it('skips ALL pkg steps when a peer template is not in registry (unknown peer protection)', async () => {
    const pkgStep: AnyStep = { type: 'pkg', brew: 'node', label: 'Node.js' };
    const fetchMock = await getFetchMock();
    fetchMock.mockResolvedValueOnce(emptyRegistry());

    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockResolvedValue(undefined),
    };
    const brewManagers: PackageManagers = { nix: false, brew: true, winget: false, npm: false };
    const cbs = callbacks();
    await runUninstallSteps(
      [pkgStep],
      brewManagers,
      handlers,
      ['missing-template'],
      'remotion',
      cbs
    );
    expect(handlers.unexecuteStep).not.toHaveBeenCalled();
    expect(cbs.onStepSkip).toHaveBeenCalledWith(0);
  });

  it('skips global npm steps used by other installed templates', async () => {
    const sharedNpm: AnyStep = {
      type: 'npm',
      pkg: 'typescript',
      global: true,
      label: 'TypeScript',
    };
    const fetchMock = await getFetchMock();
    fetchMock.mockResolvedValueOnce(
      registryWith([
        {
          name: 'peer',
          displayName: 'Peer',
          description: '',
          version: '1.0.0',
          category: 'dev',
          platforms: ['darwin'],
          steps: [{ type: 'npm', pkg: 'typescript', global: true, label: 'TypeScript' }],
        },
      ])
    );

    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockResolvedValue(undefined),
    };
    const cbs = callbacks();
    await runUninstallSteps([sharedNpm], managers, handlers, ['peer'], 'current-template', cbs);
    expect(handlers.unexecuteStep).not.toHaveBeenCalled();
    expect(cbs.onStepSkip).toHaveBeenCalledWith(0);
  });

  it('skips pkg steps used by other installed templates', async () => {
    const pkgStep: AnyStep = { type: 'pkg', brew: 'node', label: 'Node.js' };
    const fetchMock = await getFetchMock();
    fetchMock.mockResolvedValueOnce(
      registryWith([
        {
          name: 'nextmedal',
          displayName: 'NextMedal',
          description: '',
          version: '1.0.0',
          category: 'dev',
          platforms: ['darwin'],
          steps: [{ type: 'pkg', brew: 'node', label: 'Node.js' }],
        },
      ])
    );

    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockResolvedValue(undefined),
    };
    const brewManagers: PackageManagers = { nix: false, brew: true, winget: false, npm: false };
    const cbs = callbacks();
    await runUninstallSteps([pkgStep], brewManagers, handlers, ['nextmedal'], 'remotion', cbs);
    expect(handlers.unexecuteStep).not.toHaveBeenCalled();
    expect(cbs.onStepSkip).toHaveBeenCalledWith(0);
  });

  it('absorbs nix and winget peer pkg identifiers', async () => {
    // Current template pkg has only brew, but peers use nix + winget — we want
    // to prove the absorption branches fire without the current step being
    // protected (managers here exclude nix/winget, so the step still runs).
    const pkgStep: AnyStep = { type: 'pkg', brew: 'node', label: 'Node.js' };
    const fetchMock = await getFetchMock();
    fetchMock.mockResolvedValueOnce(
      registryWith([
        {
          name: 'peer-nix',
          displayName: 'Peer Nix',
          description: '',
          version: '1.0.0',
          category: 'dev',
          platforms: ['darwin'],
          steps: [{ type: 'pkg', nix: 'nodejs_20', label: 'Node (nix)' }],
        },
        {
          name: 'peer-winget',
          displayName: 'Peer Winget',
          description: '',
          version: '1.0.0',
          category: 'dev',
          platforms: ['darwin'],
          steps: [{ type: 'pkg', winget: 'OpenJS.NodeJS', label: 'Node (winget)' }],
        },
      ])
    );
    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockResolvedValue(undefined),
    };
    const brewManagers: PackageManagers = { nix: false, brew: true, winget: false, npm: false };
    const cbs = callbacks();
    await runUninstallSteps(
      [pkgStep],
      brewManagers,
      handlers,
      ['peer-nix', 'peer-winget'],
      'remotion',
      cbs
    );
    expect(handlers.unexecuteStep).toHaveBeenCalledTimes(1);
  });

  it('falls back to local state when a peer template is absent from the registry', async () => {
    const pkgStep: AnyStep = { type: 'pkg', brew: 'node', label: 'Node.js' };
    const fetchMock = await getFetchMock();
    fetchMock.mockResolvedValueOnce(emptyRegistry());
    const loadStateMock = await getLoadStateMock();
    loadStateMock.mockReturnValueOnce({
      templates: {
        'local-peer': {
          steps: [{ type: 'pkg', brew: 'node', label: 'Node.js' }],
        },
      },
    });

    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockResolvedValue(undefined),
    };
    const brewManagers: PackageManagers = { nix: false, brew: true, winget: false, npm: false };
    const cbs = callbacks();
    await runUninstallSteps([pkgStep], brewManagers, handlers, ['local-peer'], 'remotion', cbs);
    expect(handlers.unexecuteStep).not.toHaveBeenCalled();
    expect(cbs.onStepSkip).toHaveBeenCalledWith(0);
  });

  it('tolerates loadTemplateState throwing (treats local state as unavailable)', async () => {
    const pkgStep: AnyStep = { type: 'pkg', brew: 'node', label: 'Node.js' };
    const fetchMock = await getFetchMock();
    fetchMock.mockResolvedValueOnce(emptyRegistry());
    const loadStateMock = await getLoadStateMock();
    loadStateMock.mockImplementationOnce(() => {
      throw new Error('state read failure');
    });

    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockResolvedValue(undefined),
    };
    const brewManagers: PackageManagers = { nix: false, brew: true, winget: false, npm: false };
    const cbs = callbacks();
    // With no registry entry and no local state, the peer is unknown → all pkg
    // steps are conservatively skipped.
    await runUninstallSteps([pkgStep], brewManagers, handlers, ['mystery-peer'], 'remotion', cbs);
    expect(handlers.unexecuteStep).not.toHaveBeenCalled();
  });

  it('tolerates fetchRegistry throwing (relies on local state only)', async () => {
    const pkgStep: AnyStep = { type: 'pkg', brew: 'node', label: 'Node.js' };
    const fetchMock = await getFetchMock();
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    const loadStateMock = await getLoadStateMock();
    loadStateMock.mockReturnValueOnce({
      templates: {
        'local-peer': {
          steps: [{ type: 'pkg', brew: 'node', label: 'Node.js' }],
        },
      },
    });

    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockResolvedValue(undefined),
    };
    const brewManagers: PackageManagers = { nix: false, brew: true, winget: false, npm: false };
    const cbs = callbacks();
    await runUninstallSteps([pkgStep], brewManagers, handlers, ['local-peer'], 'remotion', cbs);
    expect(handlers.unexecuteStep).not.toHaveBeenCalled();
    expect(cbs.onStepSkip).toHaveBeenCalledWith(0);
  });

  it('ignores local state entries without a steps array', async () => {
    const pkgStep: AnyStep = { type: 'pkg', brew: 'node', label: 'Node.js' };
    const fetchMock = await getFetchMock();
    fetchMock.mockResolvedValueOnce(emptyRegistry());
    const loadStateMock = await getLoadStateMock();
    loadStateMock.mockReturnValueOnce({
      templates: {
        'local-peer': {
          // No steps key — should fall through to unknownPeerExists = true.
        },
      },
    });

    const handlers = {
      checkStep: vi.fn().mockResolvedValue(true),
      executeStep: vi.fn().mockResolvedValue(undefined),
      unexecuteStep: vi.fn().mockResolvedValue(undefined),
    };
    const brewManagers: PackageManagers = { nix: false, brew: true, winget: false, npm: false };
    const cbs = callbacks();
    await runUninstallSteps([pkgStep], brewManagers, handlers, ['local-peer'], 'remotion', cbs);
    expect(handlers.unexecuteStep).not.toHaveBeenCalled();
  });
});
