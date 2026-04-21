// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

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

  it('UP_REGISTRY_FETCH_FAILED has a user message', () => {
    const err = new PilotError(errorCodes.UP_REGISTRY_FETCH_FAILED);
    expect(err.code).toBe('UP_REGISTRY_FETCH_FAILED');
    expect(err.message).toMatch(/registry|online/i);
  });

  it('UP_REGISTRY_TAMPERED has a user message', () => {
    const err = new PilotError(errorCodes.UP_REGISTRY_TAMPERED);
    expect(err.code).toBe('UP_REGISTRY_TAMPERED');
    expect(err.message).toMatch(/tampered|integrity/i);
  });

  it('UP_TEMPLATE_NOT_FOUND has a user message', () => {
    const err = new PilotError(errorCodes.UP_TEMPLATE_NOT_FOUND);
    expect(err.code).toBe('UP_TEMPLATE_NOT_FOUND');
    expect(err.message).toMatch(/template/i);
  });

  it('UP_STEP_FAILED has a user message', () => {
    const err = new PilotError(errorCodes.UP_STEP_FAILED);
    expect(err.code).toBe('UP_STEP_FAILED');
    expect(err.message).toMatch(/step|install/i);
  });

  it('UP_NO_PACKAGE_MANAGER has a user message', () => {
    const err = new PilotError(errorCodes.UP_NO_PACKAGE_MANAGER);
    expect(err.code).toBe('UP_NO_PACKAGE_MANAGER');
    expect(err.message).toMatch(/package manager/i);
  });
});
