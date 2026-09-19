// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, expect, it, vi } from 'vitest';
import { loadDispatchPlugin } from '../plugins/dispatch-loader.js';
import type { PilotHost } from '../runtime/types.js';
import { runDispatchStatus } from './dispatch.js';

vi.mock('../plugins/dispatch-loader.js', () => ({ loadDispatchPlugin: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

it('supplies a usable CLI host with formatted logging and scalar or multiple email recipients', async () => {
  const output = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
  const errors = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
  vi.spyOn(Date, 'now').mockReturnValue(123);
  vi.mocked(loadDispatchPlugin).mockImplementationOnce(async ({ opts }) => {
    const { host } = opts as { host: PilotHost };
    for (const level of ['info', 'warn', 'error'] as const) {
      host.log[level]('ready');
      host.log[level]('ready', { count: 2 });
    }
    host.log.debug('quiet');
    expect(
      await host.email.send({ to: 'one@example.test', subject: 'one', html: '', text: '' })
    ).toEqual({ id: 'pilot-123' });
    expect(
      await host.email.send({
        to: ['one@example.test', 'two@example.test'],
        subject: 'two',
        html: '',
        text: '',
      })
    ).toEqual({ id: 'pilot-123' });
    return {
      manifest: { name: 'dispatch', namespace: 'medalsocial', provides: { commands: [] } },
      syncStream: async function* () {},
      applyRemote: async () => {},
      health: async () => ({ ok: true }),
    };
  });
  await runDispatchStatus();
  expect(output.mock.calls.map(([text]) => text)).toEqual([
    '[pilot:info] ready\n',
    '[pilot:info] ready {"count":2}\n',
    '[pilot:email] -> one@example.test :: one\n',
    '[pilot:email] -> one@example.test, two@example.test :: two\n',
    '{\n  "ok": true\n}\n',
  ]);
  expect(errors.mock.calls.map(([text]) => text)).toEqual([
    '[pilot:warn] ready\n',
    '[pilot:warn] ready {"count":2}\n',
    '[pilot:error] ready\n',
    '[pilot:error] ready {"count":2}\n',
  ]);
});
