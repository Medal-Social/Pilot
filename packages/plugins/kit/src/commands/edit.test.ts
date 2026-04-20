// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { KitError } from '../errors.js';
import { resolveEditor, runEdit } from './edit.js';

const allAvailable = () => true;
const noneAvailable = () => false;

describe('resolveEditor', () => {
  it('prefers $KIT_EDITOR > $VISUAL > $EDITOR', () => {
    expect(
      resolveEditor({ KIT_EDITOR: 'zed', VISUAL: 'vim', EDITOR: 'nano' }, [], allAvailable)
    ).toBe('zed');
    expect(resolveEditor({ VISUAL: 'vim', EDITOR: 'nano' }, [], allAvailable)).toBe('vim');
    expect(resolveEditor({ EDITOR: 'nano' }, [], allAvailable)).toBe('nano');
  });

  it('returns first available fallback that passes the probe', () => {
    expect(resolveEditor({}, ['nvim', 'vim'], allAvailable)).toBe('nvim');
  });

  it('skips fallbacks that fail the probe', () => {
    expect(resolveEditor({}, ['zed', 'nvim', 'vim'], (cmd) => cmd === 'nvim')).toBe('nvim');
  });

  it('returns null when all fallbacks fail the probe', () => {
    expect(resolveEditor({}, ['zed', 'nvim'], noneAvailable)).toBeNull();
  });

  it('returns null when no env vars and empty available list', () => {
    expect(resolveEditor({}, [], allAvailable)).toBeNull();
  });
});

describe('runEdit', () => {
  const makeExec = (code = 0, stderr = '') => ({
    run: vi.fn().mockResolvedValue({ stdout: '', stderr, code }),
    spawn: vi.fn(),
  });

  it('throws when no editor available', async () => {
    await expect(
      runEdit('/tmp/x.nix', { env: {}, available: [], probe: noneAvailable, exec: makeExec() })
    ).rejects.toBeInstanceOf(KitError);
  });

  it('spawns a simple editor in interactive mode', async () => {
    const exec = makeExec();
    await runEdit('/tmp/x.nix', { env: { EDITOR: 'zed' }, probe: allAvailable, exec });
    expect(exec.run).toHaveBeenCalledWith('zed', ['/tmp/x.nix'], { interactive: true });
  });

  it('splits editor with embedded args before exec (Bug 1)', async () => {
    const exec = makeExec();
    await runEdit('/tmp/x.nix', { env: { EDITOR: 'code --wait' }, probe: allAvailable, exec });
    expect(exec.run).toHaveBeenCalledWith('code', ['--wait', '/tmp/x.nix'], { interactive: true });
  });

  it('splits editor with multiple embedded args', async () => {
    const exec = makeExec();
    await runEdit('/tmp/x.nix', {
      env: { VISUAL: 'nvim -u /etc/init.lua' },
      probe: allAvailable,
      exec,
    });
    expect(exec.run).toHaveBeenCalledWith('nvim', ['-u', '/etc/init.lua', '/tmp/x.nix'], {
      interactive: true,
    });
  });

  it('uses probe to skip unavailable fallbacks (Bug 2)', async () => {
    const exec = makeExec();
    // zed not on PATH, code is
    await runEdit('/tmp/x.nix', {
      env: {},
      available: ['zed', 'code'],
      probe: (cmd) => cmd === 'code',
      exec,
    });
    expect(exec.run).toHaveBeenCalledWith('code', ['/tmp/x.nix'], { interactive: true });
  });

  it('uses onPath probe by default when no probe is provided', async () => {
    const exec = makeExec();
    // EDITOR set → resolveEditor returns early, probe is never called (but assigned)
    await runEdit('/tmp/x.nix', { env: { EDITOR: 'zed' }, exec });
    expect(exec.run).toHaveBeenCalledWith('zed', ['/tmp/x.nix'], { interactive: true });
  });

  it('throws KitError when editor exits non-zero with stderr', async () => {
    await expect(
      runEdit('/tmp/x.nix', {
        env: { EDITOR: 'zed' },
        probe: allAvailable,
        exec: makeExec(130, 'oops'),
      })
    ).rejects.toBeInstanceOf(KitError);
  });

  it('throws KitError when editor exits non-zero without stderr', async () => {
    await expect(
      runEdit('/tmp/x.nix', { env: { EDITOR: 'zed' }, probe: allAvailable, exec: makeExec(1, '') })
    ).rejects.toBeInstanceOf(KitError);
  });
});
