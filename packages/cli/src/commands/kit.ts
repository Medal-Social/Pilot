// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { readdirSync, statSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';
import {
  addApp,
  detectMachine,
  KitError,
  listApps,
  loadKitConfig,
  realExec,
  realSudoKeeper,
  removeApp,
  renderStatus,
  resolveProvider,
  runEdit,
  runInit,
  runUpdate,
  scaffoldKit,
} from '@medalsocial/kit';
import { render, Text } from 'ink';
import React from 'react';
import { colors } from '../colors.js';

function fail(err: unknown): never {
  if (err instanceof KitError) {
    console.error(`${err.message}${err.cause ? `\n${String(err.cause)}` : ''}`);
    process.exit(1);
  }
  throw err;
}

function findMachineFile(machinesDir: string, machine: string): string | null {
  const target = `${machine}.apps.json`;
  let entries: string[];
  try {
    entries = readdirSync(machinesDir);
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = join(machinesDir, entry);
    if (entry === target) return full;
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      const found = findMachineFile(full, machine);
      if (found) return found;
    }
  }
  return null;
}

function machineFile(repoDir: string, machine: string): string {
  const found = findMachineFile(join(repoDir, 'machines'), machine);
  if (found) return found;
  // Fall back to the conventional path so error messages are informative.
  return join(repoDir, 'machines', `${machine}.apps.json`);
}

export async function runKitInit(machineArg?: string): Promise<void> {
  try {
    const config = await loadKitConfig();
    const machine = machineArg ?? detectMachine(hostname()) ?? Object.keys(config.machines)[0];
    const m = config.machines[machine];
    if (!m) {
      console.error(`Unknown machine: ${machine}`);
      process.exit(1);
    }
    await runInit({
      machine,
      machineType: m.type,
      kitRepoDir: config.repoDir,
      kitRepoUrl: config.repo,
      provider: resolveProvider(),
      exec: realExec,
      platform: process.platform,
      arch: process.arch,
    });
  } catch (e) {
    fail(e);
  }
}

export async function runKitNew(): Promise<void> {
  const target = process.env.KIT_NEW_TARGET ?? join(process.cwd(), 'my-kit');
  const machine = process.env.KIT_NEW_MACHINE ?? 'my-mac';
  const user = process.env.USER ?? 'me';
  try {
    await scaffoldKit({ target, name: 'my-kit', machine, user, exec: realExec });
    render(React.createElement(Text, { color: colors.success }, `✓ Scaffolded ${target}`));
  } catch (e) {
    fail(e);
  }
}

export async function runKitUpdate(): Promise<void> {
  try {
    const config = await loadKitConfig();
    const machine = detectMachine(hostname()) ?? Object.keys(config.machines)[0];
    const m = config.machines[machine];
    const start = Date.now();
    const isTty = process.stdout.isTTY;
    const cyan = (s: string) => (isTty ? `\x1b[36m${s}\x1b[0m` : s);
    const green = (s: string) => (isTty ? `\x1b[32m${s}\x1b[0m` : s);
    const dim = (s: string) => (isTty ? `\x1b[2m${s}\x1b[0m` : s);
    const bold = (s: string) => (isTty ? `\x1b[1m${s}\x1b[0m` : s);

    process.stdout.write(`\n  ${bold('kit update')}  ${dim(`· ${machine}`)}\n`);
    process.stdout.write(`  ${dim('─'.repeat(40))}\n\n`);

    await runUpdate({
      machine,
      machineType: m.type,
      kitRepoDir: config.repoDir,
      provider: resolveProvider(),
      exec: realExec,
      sudoKeeper: realSudoKeeper,
      hooks: {
        onPhaseStart: (_phase, label) => {
          // Print the in-progress line; finalised by onPhaseEnd which overwrites it.
          process.stdout.write(`  ${cyan('⠸')}  ${label}…`);
        },
        onPhaseEnd: (_phase, label, detail) => {
          // Carriage return + clear-line, then re-print as completed.
          process.stdout.write(`\r\x1b[2K  ${green('✓')}  ${label}`);
          if (detail) process.stdout.write(`  ${dim(detail)}`);
          process.stdout.write('\n');
        },
      },
    });

    const totalSecs = Math.round((Date.now() - start) / 1000);
    const fmt =
      totalSecs < 60 ? `${totalSecs}s` : `${Math.floor(totalSecs / 60)}m ${totalSecs % 60}s`;
    process.stdout.write(
      `\n  ${green('✓')}  ${bold(`${machine} is up to date`)}  ${dim(`(${fmt})`)}\n\n`
    );
  } catch (e) {
    fail(e);
  }
}

function fmtCheck(status: 'ok' | 'warn' | 'error' | 'info', tty: boolean): string {
  const c = (s: string, code: string) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s);
  switch (status) {
    case 'ok':
      return c('✓', '32');
    case 'warn':
      return c('!', '33');
    case 'error':
      return c('✗', '31');
    case 'info':
      return c('·', '36');
  }
}

function printHumanReadable(report: Awaited<ReturnType<typeof renderStatus>>): void {
  const tty = process.stdout.isTTY;
  const dim = (s: string) => (tty ? `\x1b[2m${s}\x1b[0m` : s);
  const bold = (s: string) => (tty ? `\x1b[1m${s}\x1b[0m` : s);

  process.stdout.write(`\n  ${bold('kit status')}  ${dim(`· ${report.machineId}`)}\n`);
  process.stdout.write(`  ${dim('─'.repeat(40))}\n\n`);

  for (const c of report.checks) {
    const glyph = fmtCheck(c.status, tty);
    let line = `  ${glyph}  ${c.label.padEnd(20)} ${c.detail ?? ''}`;
    if (c.hint && (c.status === 'warn' || c.status === 'error')) {
      line += `\n     ${dim(c.hint)}`;
    }
    process.stdout.write(`${line}\n`);
  }

  if (report.orgPolicy) {
    process.stdout.write(`\n  ${bold('Org Policy')} ${dim(`(${report.orgPolicy.apps.source})`)}\n`);
    for (const a of report.orgPolicy.apps.casks) {
      process.stdout.write(`    cask: ${a.name}  ${dim(`— ${a.reason}`)}\n`);
    }
    for (const a of report.orgPolicy.apps.brews) {
      process.stdout.write(`    brew: ${a.name}  ${dim(`— ${a.reason}`)}\n`);
    }
    for (const c of report.orgPolicy.baseline) {
      process.stdout.write(`    check: ${c.id}  ${dim(`— ${c.description}`)}\n`);
    }
  }

  process.stdout.write('\n');
}

export interface RunKitStatusOpts {
  json?: boolean;
}

export async function runKitStatus(opts: RunKitStatusOpts = {}): Promise<void> {
  try {
    const config = await loadKitConfig();
    const machine = detectMachine(hostname()) ?? Object.keys(config.machines)[0];
    const report = await renderStatus({
      machine,
      kitRepoDir: config.repoDir,
      machineFile: machineFile(config.repoDir, machine),
      configPath: config.configPath,
      configRepoUrl: config.repo,
      knownMachines: Object.keys(config.machines),
      provider: resolveProvider(),
      exec: realExec,
    });
    const wantsJson = opts.json || !process.stdout.isTTY;
    if (wantsJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printHumanReadable(report);
    }
  } catch (e) {
    fail(e);
  }
}

export async function runKitConfigShow(): Promise<void> {
  try {
    const config = await loadKitConfig();
    const tty = process.stdout.isTTY;
    if (!tty) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }
    const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
    const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
    process.stdout.write(`\n  ${bold('kit config')}\n  ${dim('─'.repeat(40))}\n\n`);
    process.stdout.write(`  ${bold('source')}    ${config.configPath}\n`);
    process.stdout.write(`  ${bold('name')}      ${config.name}\n`);
    process.stdout.write(`  ${bold('repo')}      ${config.repo}\n`);
    process.stdout.write(`  ${bold('repoDir')}   ${config.repoDir}\n`);
    process.stdout.write(`  ${bold('machines')}\n`);
    for (const [name, m] of Object.entries(config.machines)) {
      process.stdout.write(`    ${name.padEnd(15)} ${dim(`type=${m.type}, user=${m.user}`)}\n`);
    }
    process.stdout.write('\n');
  } catch (e) {
    fail(e);
  }
}

export async function runKitConfigPath(): Promise<void> {
  try {
    const config = await loadKitConfig();
    console.log(config.configPath);
  } catch (e) {
    fail(e);
  }
}

export async function runKitApps(action: string, name?: string): Promise<void> {
  try {
    const config = await loadKitConfig();
    const machine = detectMachine(hostname()) ?? Object.keys(config.machines)[0];
    const path = machineFile(config.repoDir, machine);
    if (action === 'list') {
      console.log(JSON.stringify(listApps(path), null, 2));
      return;
    }
    if (!name) {
      console.error('Usage: pilot kit apps <add|remove> <name>');
      process.exit(1);
    }
    if (action === 'add') await addApp(path, name);
    else if (action === 'remove') await removeApp(path, name);
    else {
      console.error(`Unknown action: ${action}`);
      process.exit(1);
    }
  } catch (e) {
    fail(e);
  }
}

export async function runKitEdit(): Promise<void> {
  try {
    const config = await loadKitConfig();
    const machine = detectMachine(hostname()) ?? Object.keys(config.machines)[0];
    const path = join(config.repoDir, 'machines', `${machine}.nix`);
    await runEdit(path, { env: process.env, exec: realExec });
  } catch (e) {
    fail(e);
  }
}
