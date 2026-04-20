// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('runCompletions', () => {
  let writtenOutput: string;

  beforeEach(() => {
    writtenOutput = '';

    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writtenOutput += String(chunk);
      return true;
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

  it('bash script includes all commands but not repl', async () => {
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
    expect(writtenOutput).not.toContain('repl');
  });

  it('outputs a zsh completion script for zsh shell', async () => {
    const { runCompletions } = await import('./completions.js');
    await runCompletions('zsh');
    expect(writtenOutput).toContain('#compdef pilot');
    expect(writtenOutput).toContain('_describe');
    expect(writtenOutput).toContain('compdef _pilot pilot');
  });

  it('zsh script includes all commands but not repl', async () => {
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
    expect(writtenOutput).not.toContain('repl');
  });

  it('outputs a fish completion script for fish shell', async () => {
    const { runCompletions } = await import('./completions.js');
    await runCompletions('fish');
    expect(writtenOutput).toContain('complete -c pilot -f');
    expect(writtenOutput).toContain('__fish_use_subcommand');
  });

  it('fish script includes all commands with descriptions but not repl', async () => {
    const { runCompletions } = await import('./completions.js');
    await runCompletions('fish');
    expect(writtenOutput).toContain("-a crew -d 'Manage your AI crew'");
    expect(writtenOutput).toContain("-a down -d 'Remove a template'");
    expect(writtenOutput).toContain("-a completions -d 'Shell completions'");
    expect(writtenOutput).not.toContain('repl');
  });

  it('throws PilotError for unknown shell', async () => {
    const { runCompletions } = await import('./completions.js');
    await expect(runCompletions('powershell')).rejects.toThrow('Unknown shell');
    await expect(runCompletions('powershell')).rejects.toMatchObject({
      name: 'PilotError',
      code: 'COMPLETIONS_UNKNOWN_SHELL',
    });
  });
});
