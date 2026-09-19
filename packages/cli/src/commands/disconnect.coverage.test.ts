// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorCodes } from '../errors.js';
import { deleteDeviceToken } from '../medal-connect/keychain.js';
import { runDisconnect, runDisconnectCommand } from './disconnect.js';

vi.mock('../medal-connect/keychain.js', () => ({
  loadDeviceToken: vi.fn(() => ({ deviceId: 'device', token: 'token' })),
  deleteDeviceToken: vi.fn(() => true),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('disconnect default transports', () => {
  it('uses default fetch and stdout from the public wrapper after confirmed revocation', async () => {
    const fetcher = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetcher);
    const output = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runDisconnect('device');
    expect(fetcher).toHaveBeenCalledWith(
      'https://medal.social/api/medal-connect/unpair',
      expect.objectContaining({ body: JSON.stringify({ deviceId: 'device', token: 'token' }) })
    );
    expect(deleteDeviceToken).toHaveBeenCalledWith('device');
    expect(output).toHaveBeenCalledWith('Disconnected device\n');
  });

  it('maps a transport rejection without a message to the fallback typed error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue({ code: 'OFFLINE' }));
    await expect(runDisconnectCommand('device')).rejects.toMatchObject({
      code: errorCodes.DISCONNECT_SERVER_ERROR,
      cause: 'network error',
    });
    expect(deleteDeviceToken).not.toHaveBeenCalled();
  });

  it('ignores non-string refusal details and retains the local credential', async () => {
    const result = runDisconnectCommand('device', {
      _fetch: vi.fn(async () => Response.json({ ok: false, reason: { internal: 'detail' } })),
    });
    await expect(result).rejects.toMatchObject({ code: errorCodes.DISCONNECT_UNPAIR_FAILED });
    await expect(result).rejects.not.toHaveProperty('cause');
    expect(deleteDeviceToken).not.toHaveBeenCalled();
  });
});
