// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { join } from 'node:path';
import { errorCodes, KitError } from '../errors.js';
import type { Step, StepContext } from './types.js';

const SSH_OK = /successfully authenticated/i;

function home(ctx: StepContext): string {
  return ctx.env?.HOME ?? process.env.HOME ?? '';
}

async function trySshAuth(ctx: StepContext): Promise<boolean> {
  const r = await ctx.exec.run('ssh', [
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=5',
    '-i',
    join(home(ctx), '.ssh', 'id_ed25519'),
    'git@github.com',
  ]);
  return SSH_OK.test(r.stderr) || SSH_OK.test(r.stdout);
}

async function uploadKey(ctx: StepContext): Promise<void> {
  const machine = ctx.env?.KIT_MACHINE ?? 'machine';
  const pubPath = join(home(ctx), '.ssh', 'id_ed25519.pub');
  const pub = await ctx.exec.run('cat', [pubPath]);
  if (pub.code !== 0) throw new KitError(errorCodes.KIT_GITHUB_AUTH_FAILED, 'no public key');
  const list = await ctx.exec.run('gh', ['ssh-key', 'list']);
  if (list.stdout.includes(pub.stdout.split(' ').slice(0, 2).join(' '))) return;
  const add = await ctx.exec.run('gh', [
    'ssh-key',
    'add',
    pubPath,
    '--title',
    machine,
    '--type',
    'authentication',
  ]);
  if (add.code !== 0) throw new KitError(errorCodes.KIT_GITHUB_AUTH_FAILED, add.stderr);
}

export const githubStep: Step = {
  id: 'github',
  label: 'GitHub authentication',
  check: trySshAuth,
  async run(ctx) {
    if (await trySshAuth(ctx)) return;

    const ghStatus = await ctx.exec.run('gh', ['auth', 'status', '--hostname', 'github.com']);
    if (ghStatus.code !== 0) {
      const login = await ctx.exec.run('gh', [
        'auth',
        'login',
        '--hostname',
        'github.com',
        '--git-protocol',
        'https',
        '--web',
        '--scopes',
        'admin:public_key,read:user',
      ]);
      if (login.code !== 0) {
        throw new KitError(
          errorCodes.KIT_GITHUB_AUTH_FAILED,
          'gh auth login failed; consider running `gh auth login` manually'
        );
      }
    }
    await uploadKey(ctx);

    if (!(await trySshAuth(ctx))) {
      throw new KitError(
        errorCodes.KIT_GITHUB_AUTH_FAILED,
        'ssh still not authenticated after gh upload'
      );
    }
  },
};
