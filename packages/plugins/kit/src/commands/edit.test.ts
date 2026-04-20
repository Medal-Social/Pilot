// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';
import { KitError } from '../errors.js';
import { resolveEditor, runEdit } from './edit.js';

describe('resolveEditor', () => {
  it('prefers $KIT_EDITOR > $VISUAL > $EDITOR', () => {
    expect(resolveEditor({ KIT_EDITOR: 'zed', VISUAL: 'vim', EDITOR: 'nano' })).toBe('zed');
    expect(resolveEditor({ VISUAL: 'vim', EDITOR: 'nano' })).toBe('vim');
    expect(resolveEditor({ EDITOR: 'nano' })).toBe('nano');
  });

  it('falls back to a known editor binary', () => {
    expect(resolveEditor({}, ['nvim', 'vim'])).toMatch(/nvim|vim/);
  });
});

describe('runEdit', () => {
  it('throws when no editor available', async () => {
    const exec = { run: vi.fn(), spawn: vi.fn() };
    await expect(runEdit('/tmp/x.nix', { env: {}, available: [], exec })).rejects.toBeInstanceOf(
      KitError
    );
  });

  it('spawns the resolved editor in interactive mode', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', code: 0 }),
      spawn: vi.fn(),
    };
    await runEdit('/tmp/x.nix', { env: { EDITOR: 'zed' }, available: ['zed'], exec });
    // Editor must be invoked with interactive: true so vim/nvim/zed get a real TTY.
    expect(exec.run).toHaveBeenCalledWith('zed', ['/tmp/x.nix'], { interactive: true });
  });

  it('throws KitError when editor exits non-zero', async () => {
    const exec = {
      run: vi.fn().mockResolvedValue({ stdout: '', stderr: 'oops', code: 130 }),
      spawn: vi.fn(),
    };
    await expect(
      runEdit('/tmp/x.nix', { env: { EDITOR: 'zed' }, available: ['zed'], exec })
    ).rejects.toBeInstanceOf(KitError);
  });
});
