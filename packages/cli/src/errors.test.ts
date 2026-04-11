// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
import { errorCodes, PilotError } from './errors.js';

describe('PilotError', () => {
  it('sets code and user-facing message', () => {
    const err = new PilotError(errorCodes.UPDATE_CHECK_FAILED);
    expect(err.code).toBe('UPDATE_CHECK_FAILED');
    expect(err.name).toBe('PilotError');
    expect(err.message).toContain('online');
  });

  it('stores detail as cause when provided', () => {
    const err = new PilotError(errorCodes.UPDATE_CHECK_FAILED, 'ECONNREFUSED');
    expect(err.cause).toBe('ECONNREFUSED');
  });

  it('does not set cause when detail is omitted', () => {
    const err = new PilotError(errorCodes.UPDATE_INSTALL_FAILED);
    expect(err.cause).toBeUndefined();
  });

  it('is instanceof Error', () => {
    expect(new PilotError(errorCodes.PLUGIN_INVALID_MANIFEST)).toBeInstanceOf(Error);
  });
});
