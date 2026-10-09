import { describe, expect, it } from 'vitest';
import { parseAgentFrame, parseServerFrame } from './frames.js';

describe('frame validation at transport boundaries', () => {
  it.each([
    { type: 'hello', deviceId: 'd', token: 'test', since: 0 },
    { type: 'heartbeat', ts: 1 },
    { type: 'event', kind: 'kit.state', payload: { ready: true } },
    { type: 'command_ack', commandId: 'c', received: true },
    { type: 'command_result', commandId: 'c', ok: false, error: 'offline' },
    { type: 'command_user_satisfied', commandId: 'c', ok: true },
  ])('accepts a valid $type frame', (frame) => {
    expect(parseAgentFrame(frame)).toEqual(frame);
  });
  it('rejects invalid timestamps and unknown server commands', () => {
    expect(() => parseAgentFrame({ type: 'heartbeat', ts: -1 })).toThrow();
    expect(() => parseServerFrame({ type: 'execute_arbitrary', args: {} })).toThrow();
  });
});
