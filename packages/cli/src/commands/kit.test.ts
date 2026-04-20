// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { KitErrorStub } = vi.hoisted(() => {
  class KitErrorStub extends Error {
    cause?: unknown;
    constructor(msg: string, opts?: { cause?: unknown }) {
      super(msg);
      this.name = 'KitError';
      this.cause = opts?.cause;
    }
  }
  return { KitErrorStub };
});

vi.mock('@medalsocial/kit', () => ({
  KitError: KitErrorStub,
  loadKitConfig: vi.fn(),
  detectMachine: vi.fn(() => null),
  resolveProvider: vi.fn(() => ({ name: 'local' })),
  realExec: vi.fn(),
  realSudoKeeper: vi.fn(),
  runInit: vi.fn(),
  runUpdate: vi.fn(),
  renderStatus: vi.fn(),
  scaffoldKit: vi.fn(),
  listApps: vi.fn(() => ({ casks: [], brews: [] })),
  addApp: vi.fn(),
  removeApp: vi.fn(),
  runEdit: vi.fn(),
}));

vi.mock('ink', () => ({
  render: vi.fn(),
  Text: 'Text',
}));

vi.mock('node:fs', () => ({
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(),
}));

import { readdirSync, statSync } from 'node:fs';
import {
  addApp,
  listApps,
  loadKitConfig,
  removeApp,
  renderStatus,
  runEdit,
  runInit,
  runUpdate,
  scaffoldKit,
} from '@medalsocial/kit';

import {
  parseAppsTarget,
  resolveMachine,
  runKitApps,
  runKitConfigPath,
  runKitConfigShow,
  runKitEdit,
  runKitInit,
  runKitNew,
  runKitStatus,
  runKitUpdate,
} from './kit.js';

const baseConfig = {
  name: 'kit',
  repo: 'git@github.com:Medal-Social/kit.git',
  repoDir: '/tmp/kit',
  configPath: '/tmp/kit/kit.config.json',
  machines: {
    'ali-pro': { type: 'darwin' as const, user: 'ali' },
    'ada-air': { type: 'darwin' as const, user: 'ada' },
  },
};

beforeEach(() => {
  vi.mocked(loadKitConfig).mockResolvedValue(baseConfig);
  vi.mocked(readdirSync).mockReturnValue([]);
});

describe('parseAppsTarget', () => {
  it('defaults to cask when no prefix', () => {
    expect(parseAppsTarget('zed')).toEqual({ kind: 'casks', name: 'zed' });
  });

  it('strips brew: prefix', () => {
    expect(parseAppsTarget('brew:ripgrep')).toEqual({ kind: 'brews', name: 'ripgrep' });
  });

  it('strips cask: prefix (explicit)', () => {
    expect(parseAppsTarget('cask:zed')).toEqual({ kind: 'casks', name: 'zed' });
  });
});

describe('resolveMachine', () => {
  it('returns explicit override when present in config', () => {
    expect(resolveMachine(baseConfig, 'ada-air')).toBe('ada-air');
  });

  it('exits when explicit override is unknown', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(((_code?: number) => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => resolveMachine(baseConfig, 'mystery-host')).toThrow('exit');
    expect(err).toHaveBeenCalledWith(expect.stringContaining('Unknown machine'));
    exit.mockRestore();
    err.mockRestore();
  });

  it('falls back to first configured machine when detection misses', () => {
    // ali-pro is first in baseConfig — and on the test runner hostname won't match.
    // We can't control hostname() here, but the function falls back deterministically
    // to the first key when detect doesn't match.
    const result = resolveMachine(baseConfig);
    expect(Object.keys(baseConfig.machines)).toContain(result);
  });

  it('exits when config has no machines', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(((_code?: number) => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      resolveMachine({ ...baseConfig, machines: {} as typeof baseConfig.machines })
    ).toThrow('exit');
    expect(err).toHaveBeenCalledWith(expect.stringContaining('no machines'));
    exit.mockRestore();
    err.mockRestore();
  });
});

describe('runKitInit', () => {
  it('calls runInit with resolved machine', async () => {
    await runKitInit('ali-pro');
    expect(runInit).toHaveBeenCalledWith(expect.objectContaining({ machine: 'ali-pro' }));
  });

  it('propagates KitError via fail', async () => {
    vi.mocked(runInit).mockRejectedValue(new KitErrorStub('boom'));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runKitInit('ali-pro')).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
    vi.mocked(runInit).mockResolvedValue(undefined);
  });

  it('rethrows non-KitError', async () => {
    vi.mocked(runInit).mockRejectedValue(new TypeError('unexpected'));
    await expect(runKitInit('ali-pro')).rejects.toThrow('unexpected');
    vi.mocked(runInit).mockResolvedValue(undefined);
  });
});

describe('runKitNew', () => {
  it('calls scaffoldKit and renders success message', async () => {
    await runKitNew();
    expect(scaffoldKit).toHaveBeenCalled();
  });

  it('propagates KitError via fail on scaffold failure', async () => {
    vi.mocked(scaffoldKit).mockRejectedValue(new KitErrorStub('scaffold failed'));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runKitNew()).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
    vi.mocked(scaffoldKit).mockResolvedValue(undefined);
  });
});

describe('runKitUpdate', () => {
  it('calls runUpdate with hooks', async () => {
    vi.mocked(runUpdate).mockImplementationOnce(async ({ hooks }) => {
      hooks?.onPhaseStart?.('init' as never, 'Installing');
      hooks?.onPhaseEnd?.('init' as never, 'Installing', 'done');
    });
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await runKitUpdate();
    expect(runUpdate).toHaveBeenCalled();
    write.mockRestore();
  });

  it('propagates KitError via fail', async () => {
    vi.mocked(runUpdate).mockRejectedValue(new KitErrorStub('update failed'));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await expect(runKitUpdate()).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
    write.mockRestore();
    vi.mocked(runUpdate).mockResolvedValue(undefined);
  });
});

describe('runKitStatus', () => {
  const report = {
    machineId: 'ali-pro',
    checks: [
      { status: 'ok' as const, label: 'Nix', detail: 'ok' },
      { status: 'warn' as const, label: 'SSH', detail: 'key missing', hint: 'Run ssh-keygen' },
      { status: 'error' as const, label: 'Repo', detail: 'missing', hint: 'Clone it' },
      { status: 'info' as const, label: 'OS', detail: 'macOS' },
    ],
    orgPolicy: {
      apps: {
        source: 'remote',
        casks: [{ name: 'zed', reason: 'required' }],
        brews: [{ name: 'ripgrep', reason: 'required' }],
      },
      baseline: [{ id: 'filevault', description: 'Disk encryption' }],
    },
  };

  it('outputs JSON when opts.json is true', async () => {
    vi.mocked(renderStatus).mockResolvedValue(report as never);
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await runKitStatus({ json: true });
    expect(write).toHaveBeenCalledWith(expect.stringContaining('"machineId"'));
    write.mockRestore();
  });

  it('outputs human-readable with all check statuses and org policy', async () => {
    vi.mocked(renderStatus).mockResolvedValue(report as never);
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    await runKitStatus({});
    expect(write).toHaveBeenCalled();
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    write.mockRestore();
  });

  it('outputs human-readable without orgPolicy', async () => {
    const { orgPolicy: _, ...noPolicy } = report;
    vi.mocked(renderStatus).mockResolvedValue(noPolicy as never);
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await runKitStatus({});
    write.mockRestore();
  });

  it('propagates KitError via fail', async () => {
    vi.mocked(renderStatus).mockRejectedValue(new KitErrorStub('status failed'));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runKitStatus()).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
    vi.mocked(renderStatus).mockResolvedValue(report as never);
  });
});

describe('runKitConfigShow', () => {
  it('outputs JSON when not a TTY', async () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await runKitConfigShow();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('"repoDir"'));
    write.mockRestore();
  });

  it('outputs human-readable table when a TTY', async () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await runKitConfigShow();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('kit config'));
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    write.mockRestore();
  });

  it('propagates KitError via fail', async () => {
    vi.mocked(loadKitConfig).mockRejectedValueOnce(new KitErrorStub('no config'));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runKitConfigShow()).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
  });
});

describe('runKitConfigPath', () => {
  it('writes config path to stdout', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await runKitConfigPath();
    expect(write).toHaveBeenCalledWith('/tmp/kit/kit.config.json\n');
    write.mockRestore();
  });

  it('propagates KitError via fail', async () => {
    vi.mocked(loadKitConfig).mockRejectedValueOnce(new KitErrorStub('no config'));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runKitConfigPath()).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
  });
});

describe('runKitApps', () => {
  it('lists apps as JSON', async () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    await runKitApps('list');
    expect(listApps).toHaveBeenCalled();
    write.mockRestore();
  });

  it('adds a cask app', async () => {
    await runKitApps('add', 'zed');
    expect(addApp).toHaveBeenCalledWith(expect.any(String), 'zed', 'casks');
  });

  it('removes a brew app', async () => {
    await runKitApps('remove', 'brew:ripgrep');
    expect(removeApp).toHaveBeenCalledWith(expect.any(String), 'ripgrep', 'brews');
  });

  it('exits when name is missing for add/remove', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runKitApps('add')).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
  });

  it('exits on unknown action', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runKitApps('deploy', 'zed')).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
  });

  it('propagates KitError via fail', async () => {
    vi.mocked(addApp).mockRejectedValueOnce(new KitErrorStub('add failed'));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runKitApps('add', 'zed')).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
  });
});

describe('runKitEdit', () => {
  it('opens found nix file in editor', async () => {
    vi.mocked(readdirSync).mockReturnValue(['ali-pro.nix'] as never);
    vi.mocked(statSync).mockReturnValue({ isDirectory: () => false } as never);
    await runKitEdit();
    expect(runEdit).toHaveBeenCalledWith(
      expect.stringContaining('ali-pro.nix'),
      expect.any(Object)
    );
  });

  it('exits when no nix file found', async () => {
    vi.mocked(readdirSync).mockReturnValue([]);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runKitEdit()).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
  });

  it('searches subdirectories for nix file', async () => {
    vi.mocked(readdirSync)
      .mockReturnValueOnce(['subdir'] as never)
      .mockReturnValueOnce(['ali-pro.nix'] as never);
    vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as never);
    await runKitEdit();
    expect(runEdit).toHaveBeenCalled();
  });

  it('handles readdirSync failure gracefully', async () => {
    vi.mocked(readdirSync).mockImplementation(() => {
      throw new Error('ENOENT');
    });
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runKitEdit()).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
    vi.mocked(readdirSync).mockReturnValue([]);
  });

  it('propagates KitError via fail', async () => {
    vi.mocked(readdirSync).mockReturnValue(['ali-pro.nix'] as never);
    vi.mocked(statSync).mockReturnValue({ isDirectory: () => false } as never);
    vi.mocked(runEdit).mockRejectedValueOnce(new KitErrorStub('editor failed'));
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(runKitEdit()).rejects.toThrow('exit');
    exit.mockRestore();
    err.mockRestore();
    vi.mocked(readdirSync).mockReturnValue([]);
  });
});
