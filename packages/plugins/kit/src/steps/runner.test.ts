// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { errorCodes, KitError } from '../errors.js';
import { runSteps, type Step } from './types.js';

const ok: Step = {
  id: 'ok',
  label: 'OK step',
  check: vi.fn().mockResolvedValue(false),
  run: vi.fn().mockResolvedValue(undefined),
};

const alreadyDone: Step = {
  id: 'done',
  label: 'Already done',
  check: vi.fn().mockResolvedValue(true),
  run: vi.fn(),
};

const failing: Step = {
  id: 'fail',
  label: 'Boom',
  check: vi.fn().mockResolvedValue(false),
  run: vi.fn().mockRejectedValue(new KitError(errorCodes.KIT_NIX_INSTALL_FAILED)),
};

describe('runSteps', () => {
  it('skips steps whose check returns true', async () => {
    const events: string[] = [];
    await runSteps([alreadyDone], {
      onStart: (s) => events.push(`start:${s.id}`),
      onSkip: (s) => events.push(`skip:${s.id}`),
    });
    expect(events).toEqual(['start:done', 'skip:done']);
    expect(alreadyDone.run).not.toHaveBeenCalled();
  });

  it('runs steps whose check returns false', async () => {
    const events: string[] = [];
    await runSteps([ok], {
      onStart: (s) => events.push(`start:${s.id}`),
      onDone: (s) => events.push(`done:${s.id}`),
    });
    expect(events).toEqual(['start:ok', 'done:ok']);
    expect(ok.run).toHaveBeenCalled();
  });

  it('throws and stops on the first failing step', async () => {
    const events: string[] = [];
    await expect(
      runSteps([ok, failing, ok], { onStart: (s) => events.push(s.id) })
    ).rejects.toBeInstanceOf(KitError);
    expect(events).toEqual(['ok', 'fail']);
  });
});
