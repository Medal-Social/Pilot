// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { detectMachine, loadKitConfig } from '@medalsocial/kit';
import { createKitProvider } from '@medalsocial/kit/medal-connect';
import open from 'open';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorCodes, PilotError } from '../errors.js';
import { runAgentRuntime } from '../medal-connect/agent-runtime.js';
import { resolveKitContext } from '../medal-connect/kit-context.js';
import { runConnectCommand } from './connect.js';

const fixture = vi.hoisted(() => ({
  shutdown: vi.fn(),
  provider: { id: 'kit' },
  context: {
    kitRepoDir: '/fixture/kit',
    user: 'tester',
    machineType: 'darwin',
    runRebuild: vi.fn(),
    addCask: vi.fn(),
    removeCask: vi.fn(),
    commitAndPush: vi.fn(),
    resolveAppsFile: vi.fn(),
  },
}));
vi.mock('node:os', () => ({ hostname: () => 'test-host' }));
vi.mock('open', () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@medalsocial/kit', () => ({
  detectMachine: vi.fn(),
  loadKitConfig: vi.fn(),
}));
vi.mock('@medalsocial/kit/medal-connect', () => ({
  createKitProvider: vi.fn(() => fixture.provider),
}));
vi.mock('../medal-connect/kit-context.js', () => ({
  resolveKitContext: vi.fn(async () => fixture.context),
}));
vi.mock('../medal-connect/keychain.js', () => ({
  loadDeviceToken: () => ({ token: 'stored-token' }),
}));
vi.mock('../medal-connect/pair-flow.js', () => ({
  runPairFlow: vi.fn(async (opts: { onCode: (code: string, url: string) => void }) => {
    opts.onCode('123456', 'https://example.test/claim');
    return { deviceId: 'device', workspaceId: 'workspace', doUrl: 'https://socket.test' };
  }),
}));
vi.mock('../medal-connect/agent-runtime.js', () => ({
  runAgentRuntime: vi.fn(async () => ({ shutdown: fixture.shutdown, onConnected: vi.fn() })),
}));

let previousInt: ReturnType<typeof process.listeners>;
let previousTerm: ReturnType<typeof process.listeners>;

beforeEach(() => {
  vi.clearAllMocks();
  previousInt = process.listeners('SIGINT');
  previousTerm = process.listeners('SIGTERM');
  vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  vi.mocked(loadKitConfig).mockResolvedValue({
    configPath: '/fixture/kit.config.json',
    machines: {
      first: { type: 'darwin', user: 'tester' },
      detected: { type: 'darwin', user: 'tester' },
    },
  } as Awaited<ReturnType<typeof loadKitConfig>>);
  vi.mocked(detectMachine).mockReturnValue('detected');
});

afterEach(() => {
  for (const listener of process.listeners('SIGINT')) {
    if (!previousInt.includes(listener)) process.removeListener('SIGINT', listener);
  }
  for (const listener of process.listeners('SIGTERM')) {
    if (!previousTerm.includes(listener)) process.removeListener('SIGTERM', listener);
  }
  vi.restoreAllMocks();
});

describe('connect default provider and lifecycle', () => {
  it.each([
    ['detected', 'detected'],
    ['unknown', 'first'],
    [null, 'first'],
  ])('maps detected machine %s to configured machine %s', async (detected, expected) => {
    vi.mocked(detectMachine).mockReturnValue(detected);
    await runConnectCommand();
    expect(open).toHaveBeenCalledWith('https://example.test/claim');
    expect(process.stdout.write).toHaveBeenCalledWith('\n  Code: 123-456\n');
    expect(resolveKitContext).toHaveBeenCalledWith({
      kitConfigPath: '/fixture/kit.config.json',
      machineId: expected,
    });
    expect(createKitProvider).toHaveBeenCalledWith({ ...fixture.context, machineId: expected });
    expect(runAgentRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'stored-token',
        providers: [fixture.provider],
      })
    );
  });

  it('falls back to hostname when the config has no machines and tolerates browser failure', async () => {
    vi.mocked(loadKitConfig).mockResolvedValueOnce({
      configPath: '/fixture/kit.config.json',
    } as Awaited<ReturnType<typeof loadKitConfig>>);
    vi.mocked(open).mockRejectedValueOnce(new Error('browser unavailable'));
    await runConnectCommand();
    expect(resolveKitContext).toHaveBeenCalledWith({
      kitConfigPath: '/fixture/kit.config.json',
      machineId: 'test-host',
    });
    expect(runAgentRuntime).toHaveBeenCalledOnce();
  });

  it.each([
    [new PilotError(errorCodes.CONNECT_KIT_CONFIG_NOT_FOUND), 'Kit setup skipped:'],
    [
      new Error('private path /secret/config'),
      'Kit setup skipped — see `pilot kit status` for details.',
    ],
  ])('continues pairing without providers after setup failure %s', async (error, message) => {
    const out = vi.fn();
    await runConnectCommand({
      headless: true,
      _stdout: out,
      _providers: async () => {
        throw error;
      },
    });
    const written = out.mock.calls.map(([text]) => text).join('');
    expect(written).toContain(message);
    expect(written).not.toContain('/secret/config');
    expect(runAgentRuntime).toHaveBeenCalledWith(expect.objectContaining({ providers: [] }));
  });

  it('reports rejection with a structured code and exits nonzero', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    await runConnectCommand({ headless: true, _providers: async () => [] });
    const opts = vi.mocked(runAgentRuntime).mock.calls[0][0];
    await expect(opts.onRejected?.('revoked')).rejects.toThrow('exit');
    expect(stderr).toHaveBeenCalledWith(
      expect.stringContaining('Connect rejected [CONNECT_REJECTED]')
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it.each(['SIGINT', 'SIGTERM'] as const)('shuts down before exiting on %s', async (signal) => {
    const order: string[] = [];
    fixture.shutdown.mockImplementationOnce(() => order.push('shutdown'));
    vi.spyOn(process, 'exit').mockImplementation(() => {
      order.push('exit');
      throw new Error('exit');
    });
    await runConnectCommand({ headless: true, _providers: async () => [] });
    const previous = signal === 'SIGINT' ? previousInt : previousTerm;
    const cleanup = process.listeners(signal).find((listener) => !previous.includes(listener));
    expect(cleanup).toBeDefined();
    expect(() => cleanup?.()).toThrow('exit');
    expect(order).toEqual(['shutdown', 'exit']);
    expect(process.exit).toHaveBeenCalledWith(0);
  });
});
