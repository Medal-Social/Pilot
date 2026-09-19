import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runAgentRuntime } from './agent-runtime.js';
import type { AgentFrame } from './frames.js';
import type { ExecResult, MedalConnectProvider, ProviderEvent } from './provider-types.js';
import type { WSClientOptions } from './ws-client.js';

const state = vi.hoisted(() => ({
  options: undefined as WSClientOptions | undefined,
  send: vi.fn<(frame: AgentFrame) => boolean>(() => true),
  close: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  kick: vi.fn(),
}));
vi.mock('./ws-client.js', () => ({
  WSClient: class {
    constructor(options: WSClientOptions) {
      state.options = options;
    }
    start() {
      state.start();
    }
    send(frame: AgentFrame) {
      return state.send(frame);
    }
    close() {
      state.close();
    }
  },
}));
vi.mock('./heartbeat.js', () => ({
  HeartbeatLoop: class {
    start() {}
    kick() {
      state.kick();
    }
    stop() {
      state.stop();
    }
  },
}));

let emit: (event: ProviderEvent) => void;
let handle: Awaited<ReturnType<typeof runAgentRuntime>> | undefined;
let provider: MedalConnectProvider;
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

beforeEach(() => {
  provider = {
    id: 'kit',
    capabilities: () => [],
    snapshot: async () => ({ ready: true }),
    watch: (listener) => {
      emit = listener;
      return { dispose() {} };
    },
    exec: async () => ({ status: 'ok' }),
  };
});
afterEach(() => {
  handle?.shutdown();
  handle = undefined;
});
async function start(out?: (s: string) => void) {
  handle = await runAgentRuntime({
    paired: { deviceId: 'd', workspaceId: 'w', doUrl: 'https://local.invalid' },
    token: 'test',
    providers: [provider],
    out,
  });
}
function command() {
  state.options?.onCommand?.({ type: 'command', commandId: 'c', kind: 'kit.rebuild', args: {} });
}

describe('agent runtime provider boundaries', () => {
  it('forwards both state and custom events without changing their payload', async () => {
    await start();
    expect(state.options?.url).toBe('wss://local.invalid/ws/w');
    emit({ kind: 'state', snapshot: { apps: ['zed'] } });
    emit({ kind: 'kit.changed', payload: { revision: 2 } });
    expect(state.send).toHaveBeenCalledWith({
      type: 'event',
      kind: 'kit.state',
      payload: { apps: ['zed'] },
    });
    expect(state.send).toHaveBeenCalledWith({
      type: 'event',
      kind: 'kit.changed',
      payload: { revision: 2 },
    });
  });

  it('survives a failing snapshot and a failing watcher cleanup', async () => {
    provider.snapshot = async () => {
      throw new Error('offline');
    };
    provider.watch = () => ({
      dispose() {
        throw new Error('already disposed');
      },
    });
    await start();
    handle?.onConnected();
    await flush();
    expect(state.send).not.toHaveBeenCalled();
    handle?.shutdown();
    expect(state.stop).toHaveBeenCalled();
    expect(state.close).toHaveBeenCalled();
  });

  it('reports successful commands with an empty result when the provider omits it', async () => {
    await start();
    command();
    await flush();
    expect(state.send).toHaveBeenCalledWith({
      type: 'command_result',
      commandId: 'c',
      ok: true,
      result: {},
    });
  });

  it('forwards an interactive prompt instead of falsely reporting success', async () => {
    const prompt = { kind: 'touchid' as const, reason: 'Confirm rebuild', ttlSec: 30 };
    provider.exec = async (): Promise<ExecResult> => ({ status: 'awaiting_user', prompt });
    await start();
    command();
    await flush();
    expect(state.send).toHaveBeenCalledWith({
      type: 'command_awaiting_user',
      commandId: 'c',
      prompt,
    });
    expect(state.send.mock.calls.some(([frame]) => frame.type === 'command_result')).toBe(false);
  });

  it('turns a non-Error provider rejection into an explicit failure result', async () => {
    provider.exec = async () => {
      throw 'permission lost';
    };
    await start();
    command();
    await flush();
    expect(state.send).toHaveBeenCalledWith({
      type: 'command_result',
      commandId: 'c',
      ok: false,
      error: 'permission lost',
    });
  });

  it('handles welcome and rejection without optional output callbacks', async () => {
    await start();
    state.options?.onWelcome?.(1, []);
    state.options?.onRejected?.('device_revoked');
    await flush();
    expect(state.kick).toHaveBeenCalledOnce();
    expect(state.send).toHaveBeenCalledWith({
      type: 'event',
      kind: 'kit.state',
      payload: { ready: true },
    });
  });
});
