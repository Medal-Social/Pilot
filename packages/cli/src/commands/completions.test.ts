// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('runCompletions', () => {
  let writtenOutput: string;
  let writtenError: string;
  let exitCode: number | undefined;

  beforeEach(() => {
    writtenOutput = '';
    writtenError = '';
    exitCode = undefined;

    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenOutput += String(chunk);
      return true;
    });

    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      writtenError += String(chunk);
      return true;
    });

    vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      exitCode = code;
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('outputs a bash completion script for bash shell', async () => {
    const { runCompletions } = await import('./completions.js');
    await runCompletions('bash');
    expect(writtenOutput).toContain('_pilot_completions');
    expect(writtenOutput).toContain('compgen -W');
    expect(writtenOutput).toContain('complete -F _pilot_completions pilot');
  });

  it('bash script includes all commands', async () => {
    const { runCompletions } = await import('./completions.js');
    await runCompletions('bash');
    for (const cmd of [
      'crew',
      'down',
      'help',
      'plugins',
      'status',
      'training',
      'uninstall',
      'up',
      'update',
      'completions',
    ]) {
      expect(writtenOutput).toContain(cmd);
    }
  });

  it('outputs a zsh completion script for zsh shell', async () => {
    const { runCompletions } = await import('./completions.js');
    await runCompletions('zsh');
    expect(writtenOutput).toContain('#compdef pilot');
    expect(writtenOutput).toContain('_describe');
    expect(writtenOutput).toContain('_pilot');
  });

  it('zsh script includes all commands', async () => {
    const { runCompletions } = await import('./completions.js');
    await runCompletions('zsh');
    for (const cmd of [
      'crew',
      'down',
      'help',
      'plugins',
      'status',
      'training',
      'uninstall',
      'up',
      'update',
      'completions',
    ]) {
      expect(writtenOutput).toContain(cmd);
    }
  });

  it('outputs a fish completion script for fish shell', async () => {
    const { runCompletions } = await import('./completions.js');
    await runCompletions('fish');
    expect(writtenOutput).toContain('complete -c pilot -f');
    expect(writtenOutput).toContain('__fish_use_subcommand');
  });

  it('fish script includes all commands with descriptions', async () => {
    const { runCompletions } = await import('./completions.js');
    await runCompletions('fish');
    expect(writtenOutput).toContain("-a crew -d 'Manage your AI crew'");
    expect(writtenOutput).toContain("-a down -d 'Remove a template'");
    expect(writtenOutput).toContain("-a completions -d 'Shell completions'");
  });

  it('writes error and exits for unknown shell', async () => {
    const { runCompletions } = await import('./completions.js');
    await expect(runCompletions('powershell')).rejects.toThrow('process.exit(1)');
    expect(writtenError).toContain('Unknown shell: powershell');
    expect(writtenError).toContain('bash, zsh, fish');
    expect(exitCode).toBe(1);
  });
});
