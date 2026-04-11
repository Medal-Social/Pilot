#!/usr/bin/env node
// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { program } from 'commander';
import { VERSION } from '../version.js';

program.name('pilot').description('Your AI crew, ready to fly.').version(VERSION, '-v, --version');

program
  .command('up [template]')
  .description('One-click setup — install templates, skills, crew bindings')
  .action(async (template?: string) => {
    const { runUp } = await import('../commands/up.js');
    await runUp(template);
  });

program
  .command('crew')
  .description('Manage your AI crew')
  .action(async () => {
    const { runCrew } = await import('../commands/crew.js');
    await runCrew();
  });

program
  .command('training')
  .description('Knowledge base — teach your crew about your brand')
  .action(async () => {
    const { runTraining } = await import('../commands/training.js');
    await runTraining();
  });

program
  .command('plugins')
  .description('Browse and manage plugins')
  .action(async () => {
    const { runPlugins } = await import('../commands/plugins.js');
    await runPlugins();
  });

program
  .command('update')
  .description('Check for and apply updates')
  .action(async () => {
    const { runUpdate } = await import('../commands/update.js');
    await runUpdate();
  });

program
  .command('status')
  .description('Machine and system health')
  .action(async () => {
    const { runStatus } = await import('../commands/status.js');
    await runStatus();
  });

program
  .command('help')
  .description('Help reference')
  .action(async () => {
    const { runHelp } = await import('../commands/help.js');
    await runHelp();
  });

program
  .command('uninstall')
  .description('Remove Pilot and all its files from your machine')
  .action(async () => {
    const { runUninstall } = await import('../commands/uninstall.js');
    await runUninstall();
  });

program
  .command('down <template>')
  .description("Remove a template's installed tools (inverse of pilot up)")
  .action(async (template: string) => {
    const { runDown } = await import('../commands/down.js');
    await runDown(template);
  });

program.action(async () => {
  const { runRepl } = await import('../commands/repl.js');
  await runRepl();
});

program.parseAsync();
