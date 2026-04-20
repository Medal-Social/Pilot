// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { spawn } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { errorCodes, KitError } from '../errors.js';
import type { FleetProvider } from '../provider/types.js';
import type { Exec } from '../shell/exec.js';
import { rebuildStep } from '../steps/rebuild.js';
import { runSteps } from '../steps/types.js';
import { migrateMachineFile } from './migrate-apps.js';

function findMachineNixFiles(machinesDir: string): Array<{ path: string; machine: string }> {
  const out: Array<{ path: string; machine: string }> = [];
  let entries: string[];
  try {
    entries = readdirSync(machinesDir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(machinesDir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      out.push(...findMachineNixFiles(full));
    } else if (stat.isFile() && entry.endsWith('.nix')) {
      out.push({ path: full, machine: basename(entry, '.nix') });
    }
  }
  return out;
}

export async function runMigrations(kitRepoDir: string): Promise<number> {
  let changed = 0;
  for (const { path, machine } of findMachineNixFiles(join(kitRepoDir, 'machines'))) {
    const result = await migrateMachineFile(path, machine);
    if (result.changed) changed += 1;
  }
  return changed;
}

export interface SudoKeeper {
  start(): () => void;
}

export interface RunUpdateOpts {
  machine: string;
  machineType: 'darwin' | 'nixos';
  kitRepoDir: string;
  provider: FleetProvider;
  exec: Exec;
  sudoKeeper: SudoKeeper;
  user?: string;
}

export async function runUpdate(opts: RunUpdateOpts): Promise<void> {
  const sudoOk = await opts.exec.run('sudo', ['-v']);
  if (sudoOk.code !== 0) throw new KitError(errorCodes.KIT_SUDO_DENIED);

  await opts.exec.run('git', ['-C', opts.kitRepoDir, 'fetch', '--quiet']);
  const pull = await opts.exec.run('git', ['-C', opts.kitRepoDir, 'pull', '--ff-only']);
  if (pull.code !== 0) throw new KitError(errorCodes.KIT_REPO_PULL_FAILED, pull.stderr);

  await opts.provider.getRequiredApps({
    machineId: opts.machine,
    user: opts.user ?? process.env.USER ?? '',
    kitRepoDir: opts.kitRepoDir,
  });

  // Idempotent migration: lift inline homebrew lists into apps.json files.
  await runMigrations(opts.kitRepoDir);

  const stopKeeper = opts.sudoKeeper.start();
  const onExit = () => stopKeeper();
  process.once('SIGINT', onExit);
  process.once('SIGTERM', onExit);
  try {
    await runSteps(
      [rebuildStep],
      {},
      {
        exec: opts.exec,
        env: {
          ...process.env,
          KIT_MACHINE: opts.machine,
          KIT_MACHINE_TYPE: opts.machineType,
          KIT_REPO_DIR: opts.kitRepoDir,
        },
      }
    );
  } finally {
    stopKeeper();
    process.off('SIGINT', onExit);
    process.off('SIGTERM', onExit);
  }
}

export const realSudoKeeper: SudoKeeper = {
  start() {
    const id = setInterval(() => {
      spawn('sudo', ['-v'], { stdio: 'ignore' }).on('error', () => {});
    }, 30_000);
    return () => clearInterval(id);
  },
};
