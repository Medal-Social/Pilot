import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorCodes } from '../errors.js';
import { openSealed } from './ecdh.js';
import { storeDeviceToken } from './keychain.js';
import { runPairFlow } from './pair-flow.js';

vi.mock('./ecdh.js', () => ({
  generateKeyPairJwk: vi.fn(async () => ({ publicJwk: {}, privateJwk: {} })),
  openSealed: vi.fn(async () => 'test-device-token'),
}));
vi.mock('./keychain.js', () => ({ storeDeviceToken: vi.fn() }));
const created = { code: '123456', claimUrl: 'https://example.com/connect/123456' };
const claimed = {
  status: 'claimed',
  sealedDeviceToken: '{}',
  deviceId: 'd',
  workspaceId: 'w',
  doUrl: 'https://do.invalid',
};

beforeEach(() => {
  vi.mocked(openSealed).mockResolvedValue('test-device-token');
  vi.mocked(storeDeviceToken).mockReset();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function sequence(...responses: unknown[]) {
  const fetchFn = vi.fn<typeof fetch>();
  for (const response of responses) fetchFn.mockResolvedValueOnce(Response.json(response));
  return fetchFn;
}

describe('pairing failure recovery boundaries', () => {
  it('uses the default API and fetch when callers provide no options', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 503 }));
    vi.stubGlobal('fetch', fetchFn);
    await expect(runPairFlow()).rejects.toMatchObject({
      code: errorCodes.CONNECT_PAIR_CREATE_FAILED,
      cause: 'HTTP 503',
    });
    expect(fetchFn).toHaveBeenCalledWith(
      'https://medal.social/api/medal-connect/pair',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('maps network rejections without messages to a typed create failure', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue({});
    await expect(runPairFlow({ fetchFn })).rejects.toMatchObject({
      code: errorCodes.CONNECT_PAIR_CREATE_FAILED,
      cause: 'network error',
    });
  });

  it('maps JSON read errors without messages to a typed create failure', async () => {
    const response = new Response('{}');
    vi.spyOn(response, 'json').mockRejectedValue({});
    await expect(
      runPairFlow({ fetchFn: vi.fn<typeof fetch>().mockResolvedValue(response) })
    ).rejects.toMatchObject({
      code: errorCodes.CONNECT_PAIR_CREATE_FAILED,
      cause: 'malformed response',
    });
  });

  it.each([null, 'not-an-object', { code: '123456', claimUrl: 42 }])(
    'rejects malformed create data %j before polling',
    async (data) => {
      const fetchFn = sequence(data);
      await expect(runPairFlow({ fetchFn })).rejects.toMatchObject({
        code: errorCodes.CONNECT_PAIR_CREATE_FAILED,
      });
      expect(fetchFn).toHaveBeenCalledOnce();
    }
  );

  it.each([
    null,
    'not-an-object',
    ...['deviceId', 'workspaceId', 'doUrl'].map((field) => ({ ...claimed, [field]: null })),
  ])('retries malformed poll data %j instead of claiming success', async (data) => {
    const fetchFn = sequence(created, data, { status: 'expired' });
    await expect(runPairFlow({ fetchFn, pollIntervalMs: 0 })).rejects.toMatchObject({
      code: errorCodes.CONNECT_PAIR_CODE_EXPIRED,
    });
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(storeDeviceToken).not.toHaveBeenCalled();
  });

  it('maps an unseal rejection without a message and never stores a token', async () => {
    vi.mocked(openSealed).mockRejectedValueOnce({});
    await expect(
      runPairFlow({ fetchFn: sequence(created, claimed), pollIntervalMs: 0 })
    ).rejects.toMatchObject({
      code: errorCodes.CONNECT_PAIR_UNSEAL_FAILED,
      cause: 'unseal failed',
    });
    expect(storeDeviceToken).not.toHaveBeenCalled();
  });

  it.each([new Error('keychain locked'), {}])(
    'reports a lost token when keychain persistence fails (%j)',
    async (error) => {
      vi.mocked(storeDeviceToken).mockImplementationOnce(() => {
        throw error;
      });
      await expect(
        runPairFlow({ fetchFn: sequence(created, claimed), pollIntervalMs: 0 })
      ).rejects.toMatchObject({
        code: errorCodes.CONNECT_KEYCHAIN_LOST_TOKEN,
        cause: error instanceof Error ? error.message : 'd',
      });
    }
  );

  it.each(['create', 'poll'])(
    'aborts a hung %s request when its time budget expires',
    async (phase) => {
      vi.useFakeTimers();
      const stalled = vi.fn<typeof fetch>().mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
              once: true,
            });
          })
      );
      const fetchFn =
        phase === 'create'
          ? stalled
          : vi
              .fn<typeof fetch>()
              .mockResolvedValueOnce(Response.json(created))
              .mockImplementation(stalled);
      const promise = runPairFlow({ fetchFn, pollIntervalMs: 1, timeoutMs: 100 });
      const assertion = expect(promise).rejects.toMatchObject({
        code:
          phase === 'create'
            ? errorCodes.CONNECT_PAIR_CREATE_FAILED
            : errorCodes.CONNECT_PAIR_TIMEOUT,
      });
      await vi.advanceTimersByTimeAsync(100);
      await assertion;
      expect(stalled).toHaveBeenCalledOnce();
      expect(stalled.mock.calls[0][1]?.signal?.aborted).toBe(true);
    }
  );
});
