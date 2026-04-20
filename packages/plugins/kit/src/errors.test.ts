// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { errorCodes, KitError } from './errors.js';

describe('KitError', () => {
  it('exposes the code on the instance', () => {
    const err = new KitError(errorCodes.KIT_SUDO_DENIED);
    expect(err.code).toBe('KIT_SUDO_DENIED');
    expect(err.name).toBe('KitError');
  });

  it('uses the registered user message', () => {
    const err = new KitError(errorCodes.KIT_NIX_INSTALL_FAILED);
    expect(err.message).toMatch(/nix/i);
  });

  it('attaches detail to cause when provided', () => {
    const err = new KitError(errorCodes.KIT_REPO_CLONE_FAILED, 'permission denied');
    expect(err.cause).toBe('permission denied');
  });
});
