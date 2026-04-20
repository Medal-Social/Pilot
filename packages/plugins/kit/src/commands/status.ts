// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { existsSync } from 'node:fs';
import { loadAppsJson } from '../apps/store.js';
import type { FleetProvider, RequiredApps, SecurityCheck } from '../provider/types.js';
import type { Exec } from '../shell/exec.js';

export interface RenderStatusOpts {
  machine: string;
  kitRepoDir: string;
  machineFile: string;
  provider: FleetProvider;
  exec: Exec;
  user?: string;
}

export interface StatusReport {
  machineId: string;
  appsCount: number;
  repoClean: boolean;
  commitsBehind: number;
  kitCommit: string | null;
  orgPolicy?: { apps: RequiredApps; baseline: SecurityCheck[] };
}

export async function renderStatus(opts: RenderStatusOpts): Promise<StatusReport> {
  const apps = existsSync(opts.machineFile)
    ? loadAppsJson(opts.machineFile)
    : { casks: [], brews: [] };
  const appsCount = apps.casks.length + apps.brews.length;

  const headRev = await opts.exec.run('git', ['-C', opts.kitRepoDir, 'rev-parse', 'HEAD']);
  const kitCommit = headRev.code === 0 ? headRev.stdout.trim() : null;

  const status = await opts.exec.run('git', ['-C', opts.kitRepoDir, 'status', '--porcelain']);
  const repoClean = status.code === 0 && status.stdout.trim().length === 0;

  await opts.exec.run('git', ['-C', opts.kitRepoDir, 'fetch', '--quiet']);
  const behind = await opts.exec.run('git', [
    '-C',
    opts.kitRepoDir,
    'rev-list',
    'HEAD..@{u}',
    '--count',
  ]);
  const commitsBehind = behind.code === 0 ? Number.parseInt(behind.stdout.trim(), 10) || 0 : 0;

  const ctx = {
    machineId: opts.machine,
    user: opts.user ?? process.env.USER ?? '',
    kitRepoDir: opts.kitRepoDir,
  };
  const required = await opts.provider.getRequiredApps(ctx);
  const baseline = await opts.provider.getSecurityBaseline(ctx);
  const hasOrgPolicy = required.casks.length + required.brews.length + baseline.length > 0;

  return {
    machineId: opts.machine,
    appsCount,
    repoClean,
    commitsBehind,
    kitCommit,
    orgPolicy: hasOrgPolicy ? { apps: required, baseline } : undefined,
  };
}
