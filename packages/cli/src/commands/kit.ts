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
    await runUpdate({
      machine,
      machineType: m.type,
      kitRepoDir: config.repoDir,
      provider: resolveProvider(),
      exec: realExec,
      sudoKeeper: realSudoKeeper,
    });
  } catch (e) {
    fail(e);
  }
}

export async function runKitStatus(_opts: { interactive: boolean }): Promise<void> {
  try {
    const config = await loadKitConfig();
    const machine = detectMachine(hostname()) ?? Object.keys(config.machines)[0];
    const report = await renderStatus({
      machine,
      kitRepoDir: config.repoDir,
      machineFile: machineFile(config.repoDir, machine),
      provider: resolveProvider(),
      exec: realExec,
    });
    console.log(JSON.stringify(report, null, 2));
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
