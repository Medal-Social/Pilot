import { EventEmitter, once } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { WebSocketServer } from 'ws';
import { WSClient } from './ws-client';

class MockWS extends EventEmitter {
  static instances: MockWS[] = [];
  readyState = 0;
  sent: string[] = [];
  url: string;
  closeCalls: Array<{ code: number; reason: string }> = [];

  constructor(url: string) {
    super();
    this.url = url;
    MockWS.instances.push(this);
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(code: number, reason: string): void {
    this.closeCalls.push({ code, reason });
    this.emit('close', code, Buffer.from(reason));
  }
  open(): void {
    this.readyState = 1;
    this.emit('open');
  }
  receive(payload: object): void {
    this.emit('message', JSON.stringify(payload));
  }
}

describe('WSClient', () => {
  it('sends hello on open with since: 0 initially', () => {
    MockWS.instances = [];
    const client = new WSClient({
      url: 'ws://x',
      deviceId: 'd1',
      token: 'tok',
      WebSocketCtor: MockWS as unknown as typeof WebSocket,
    });
    client.start();
    const ws = MockWS.instances[0];
    ws.open();
    expect(JSON.parse(ws.sent[0])).toEqual({
      type: 'hello',
      deviceId: 'd1',
      token: 'tok',
      since: 0,
    });
  });

  it('updates rev on welcome frames', () => {
    MockWS.instances = [];
    const onWelcome = vi.fn();
    const client = new WSClient({
      url: 'ws://x',
      deviceId: 'd1',
      token: 'tok',
      WebSocketCtor: MockWS as unknown as typeof WebSocket,
      onWelcome,
    });
    client.start();
    const ws = MockWS.instances[0];
    ws.open();
    ws.receive({ type: 'welcome', rev: 42, queuedCommands: [] });
    expect(onWelcome).toHaveBeenCalledWith(42, []);
    expect(client.currentRev).toBe(42);
  });

  it('reconnects on close and resumes from current rev', async () => {
    MockWS.instances = [];
    const client = new WSClient({
      url: 'ws://x',
      deviceId: 'd1',
      token: 'tok',
      WebSocketCtor: MockWS as unknown as typeof WebSocket,
      reconnectBaseMs: 1,
    });
    client.start();
    let ws = MockWS.instances[0];
    ws.open();
    ws.receive({ type: 'welcome', rev: 42, queuedCommands: [] });
    ws.emit('close', 1006, Buffer.from('socket_closed'));

    // Wait for the reconnect timer.
    await new Promise((r) => setTimeout(r, 5));
    expect(MockWS.instances).toHaveLength(2);
    ws = MockWS.instances[1];
    ws.open();
    expect(JSON.parse(ws.sent[0])).toMatchObject({ type: 'hello', since: 42 });
  });

  it('does NOT reconnect after rejected', async () => {
    MockWS.instances = [];
    const onRejected = vi.fn();
    const client = new WSClient({
      url: 'ws://x',
      deviceId: 'd1',
      token: 'tok',
      WebSocketCtor: MockWS as unknown as typeof WebSocket,
      onRejected,
      reconnectBaseMs: 1,
    });
    client.start();
    const ws = MockWS.instances[0];
    ws.open();
    ws.receive({ type: 'rejected', reason: 'token_invalid' });
    ws.emit('close', 1008, Buffer.from('rejected'));
    expect(onRejected).toHaveBeenCalledWith('token_invalid');
    await new Promise((r) => setTimeout(r, 5));
    expect(MockWS.instances).toHaveLength(1);
  });

  it('forwards command frames to onCommand', () => {
    MockWS.instances = [];
    const onCommand = vi.fn();
    const client = new WSClient({
      url: 'ws://x',
      deviceId: 'd1',
      token: 'tok',
      WebSocketCtor: MockWS as unknown as typeof WebSocket,
      onCommand,
    });
    client.start();
    const ws = MockWS.instances[0];
    ws.open();
    ws.receive({
      type: 'command',
      commandId: 'cmd-1',
      kind: 'kit.rebuild',
      args: {},
    });
    expect(onCommand).toHaveBeenCalledOnce();
    expect(onCommand.mock.calls[0][0]).toMatchObject({
      type: 'command',
      commandId: 'cmd-1',
      kind: 'kit.rebuild',
    });
  });

  it('send returns false when socket not open', () => {
    MockWS.instances = [];
    const client = new WSClient({
      url: 'ws://x',
      deviceId: 'd1',
      token: 'tok',
      WebSocketCtor: MockWS as unknown as typeof WebSocket,
    });
    // Before start: no socket
    expect(client.send({ type: 'heartbeat', ts: 1 })).toBe(false);
  });

  it('close prevents reconnect after intentional close', async () => {
    MockWS.instances = [];
    const client = new WSClient({
      url: 'ws://x',
      deviceId: 'd1',
      token: 'tok',
      WebSocketCtor: MockWS as unknown as typeof WebSocket,
      reconnectBaseMs: 1,
    });
    client.start();
    const ws = MockWS.instances[0];
    ws.open();
    client.close();
    expect(ws.closeCalls).toHaveLength(1);
    expect(ws.closeCalls[0]).toEqual({ code: 1000, reason: 'client_close' });
    await new Promise((r) => setTimeout(r, 5));
    expect(MockWS.instances).toHaveLength(1);
  });

  it('does NOT reset backoff on open without a welcome (Codex P2)', async () => {
    vi.useFakeTimers();
    MockWS.instances = [];
    const client = new WSClient({
      url: 'ws://x',
      deviceId: 'd1',
      token: 'tok',
      WebSocketCtor: MockWS as unknown as typeof WebSocket,
      reconnectBaseMs: 10,
      reconnectMaxMs: 10_000,
    });
    try {
      client.start();
      for (const [attempt, delay] of [10, 20, 40].entries()) {
        const ws = MockWS.instances[attempt];
        ws.open();
        ws.emit('close', 1006, Buffer.from(''));
        await vi.advanceTimersByTimeAsync(delay - 1);
        expect(MockWS.instances).toHaveLength(attempt + 1);
        await vi.advanceTimersByTimeAsync(1);
        expect(MockWS.instances).toHaveLength(attempt + 2);
      }
    } finally {
      client.close();
      vi.useRealTimers();
    }
  });

  it('resets backoff after a welcome frame is received (Codex P2)', async () => {
    vi.useFakeTimers();
    MockWS.instances = [];
    const client = new WSClient({
      url: 'ws://x',
      deviceId: 'd1',
      token: 'tok',
      WebSocketCtor: MockWS as unknown as typeof WebSocket,
      reconnectBaseMs: 10,
      reconnectMaxMs: 10_000,
    });
    try {
      client.start();
      // Two closes without a welcome increase the delay to 10ms, then 20ms.
      let ws = MockWS.instances[0];
      ws.open();
      ws.emit('close', 1006, Buffer.from(''));
      await vi.advanceTimersByTimeAsync(10);
      ws = MockWS.instances[1];
      ws.open();
      ws.emit('close', 1006, Buffer.from(''));
      await vi.advanceTimersByTimeAsync(20);
      ws = MockWS.instances[2];
      ws.open();
      ws.receive({ type: 'welcome', rev: 1, queuedCommands: [] });
      ws.emit('close', 1006, Buffer.from(''));
      // Welcome resets the next delay to 10ms rather than 40ms.
      await vi.advanceTimersByTimeAsync(9);
      expect(MockWS.instances).toHaveLength(3);
      await vi.advanceTimersByTimeAsync(1);
      expect(MockWS.instances).toHaveLength(4);
    } finally {
      client.close();
      vi.useRealTimers();
    }
  });

  it('exponential backoff increases delay between reconnects', async () => {
    MockWS.instances = [];
    const client = new WSClient({
      url: 'ws://x',
      deviceId: 'd1',
      token: 'tok',
      WebSocketCtor: MockWS as unknown as typeof WebSocket,
      reconnectBaseMs: 10,
      reconnectMaxMs: 1000,
    });
    client.start();
    // First close → reconnect after 10ms
    let ws = MockWS.instances[0];
    ws.emit('close', 1006, Buffer.from(''));
    const t1 = Date.now();
    await new Promise((r) => setTimeout(r, 30));
    expect(MockWS.instances.length).toBeGreaterThanOrEqual(2);
    // Second close → reconnect after 20ms
    ws = MockWS.instances[MockWS.instances.length - 1];
    ws.emit('close', 1006, Buffer.from(''));
    await new Promise((r) => setTimeout(r, 50));
    expect(MockWS.instances.length).toBeGreaterThanOrEqual(3);
    // Sanity: at least 50ms have elapsed across the two reconnects
    expect(Date.now() - t1).toBeGreaterThanOrEqual(20);
    client.close();
  });
});

it('ignores malformed frames and keeps the connection usable', () => {
  MockWS.instances = [];
  const onCommand = vi.fn();
  const onConnect = vi.fn();
  const onDisconnect = vi.fn();
  const client = new WSClient({
    url: 'ws://x',
    deviceId: 'd',
    token: 'test',
    WebSocketCtor: MockWS as unknown as typeof WebSocket,
    onCommand,
    onConnect,
    onDisconnect,
  });
  expect(client.send({ type: 'heartbeat', ts: 1 })).toBe(false);
  client.start();
  const socket = MockWS.instances[0];
  expect(client.send({ type: 'heartbeat', ts: 1 })).toBe(false);
  socket.open();
  socket.emit('message', '{not JSON');
  socket.receive({ type: 'not-a-frame' });
  socket.emit('error', new Error('transient transport error'));
  socket.receive({ type: 'command', commandId: 'c', kind: 'kit.rebuild', args: {} });
  expect(onConnect).toHaveBeenCalledOnce();
  expect(onCommand).toHaveBeenCalledWith({
    type: 'command',
    commandId: 'c',
    kind: 'kit.rebuild',
    args: {},
  });
  client.close();
  expect(onDisconnect).toHaveBeenCalledWith(1000, 'client_close');
  client.close();
});

it('uses the real WebSocket transport to handshake with a local server', async () => {
  const server = new WebSocketServer({ port: 0, host: '127.0.0.1' });
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('expected TCP address');
  const hello = new Promise<unknown>((resolve) => {
    server.once('connection', (socket) => {
      socket.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
        socket.send(JSON.stringify({ type: 'welcome', rev: 7, queuedCommands: [] }));
      });
    });
  });
  let welcome: () => void = () => {};
  const accepted = new Promise<void>((resolve) => {
    welcome = resolve;
  });
  const client = new WSClient({
    url: `ws://127.0.0.1:${address.port}`,
    deviceId: 'local',
    token: 'test',
    onWelcome: welcome,
  });
  try {
    client.start();
    expect(await hello).toEqual({ type: 'hello', deviceId: 'local', token: 'test', since: 0 });
    await accepted;
    expect(client.currentRev).toBe(7);
  } finally {
    client.close();
    for (const socket of server.clients) socket.terminate();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

it('does not restart a client that was intentionally closed before starting', () => {
  MockWS.instances = [];
  const client = new WSClient({
    url: 'ws://x',
    deviceId: 'd',
    token: 'test',
    WebSocketCtor: MockWS as unknown as typeof WebSocket,
  });
  client.close();
  client.start();
  expect(MockWS.instances).toHaveLength(0);
});

it('uses a one-second default reconnect delay and normalizes transport close reasons', async () => {
  vi.useFakeTimers();
  MockWS.instances = [];
  const onDisconnect = vi.fn();
  const client = new WSClient({
    url: 'ws://x',
    deviceId: 'd',
    token: 'test',
    WebSocketCtor: MockWS as unknown as typeof WebSocket,
    onDisconnect,
  });
  try {
    client.start();
    MockWS.instances[0].emit('close', 1006, 'retry');
    expect(onDisconnect).toHaveBeenCalledWith(1006, 'retry');
    await vi.advanceTimersByTimeAsync(999);
    expect(MockWS.instances).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(MockWS.instances).toHaveLength(2);
    MockWS.instances[1].emit('close', 1006, undefined);
    expect(onDisconnect).toHaveBeenLastCalledWith(1006, '');
  } finally {
    client.close();
    vi.useRealTimers();
  }
});
