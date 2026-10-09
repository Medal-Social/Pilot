// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { render } from 'ink';
import { beforeEach, expect, it, vi } from 'vitest';
import { errorCodes } from '../errors.js';
import { Uninstall } from '../screens/Uninstall.js';
import { runUninstall } from './uninstall.js';

vi.mock('node:fs', () => ({ existsSync: vi.fn() }));
vi.mock('ink', () => ({ render: vi.fn() }));
vi.mock('../screens/Uninstall.js', () => ({ Uninstall: () => null }));
beforeEach(() => vi.clearAllMocks());

it('opens the uninstall screen only when the installation directory exists', async () => {
  vi.mocked(existsSync).mockReturnValue(true);
  await runUninstall();
  expect(existsSync).toHaveBeenCalledWith(join(homedir(), '.pilot'));
  expect(render).toHaveBeenCalledWith(expect.objectContaining({ type: Uninstall }));
});

it('reports an absent installation without opening a destructive screen', async () => {
  vi.mocked(existsSync).mockReturnValue(false);
  await expect(runUninstall()).rejects.toMatchObject({
    code: errorCodes.UNINSTALL_NOT_INSTALLED,
  });
  expect(render).not.toHaveBeenCalled();
});
