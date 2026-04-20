// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { errorCodes, KitError } from '../errors.js';
import type { Step, StepContext } from './types.js';

const SSH_OK = /successfully authenticated/i;

function home(ctx: StepContext): string {
  return ctx.env?.HOME ?? process.env.HOME ?? '';
}

/**
 * Pre-seed `~/.ssh/known_hosts` with github.com's host key so the SSH probe
 * (which runs in BatchMode and therefore can't accept host keys interactively)
 * doesn't fail before authentication is evaluated. Idempotent — skips if
 * github.com is already trusted.
 */
async function ensureGitHubHostKey(ctx: StepContext): Promise<void> {
  const sshDir = join(home(ctx), '.ssh');
  const knownHosts = join(sshDir, 'known_hosts');

  if (existsSync(knownHosts)) {
    try {
      const contents = readFileSync(knownHosts, 'utf8');
      if (/^github\.com[\s,]/m.test(contents)) return;
    } catch {
      // Fall through to re-seed.
    }
  }

  await ctx.exec.run('mkdir', ['-p', sshDir]);
  const scan = await ctx.exec.run('ssh-keyscan', ['-t', 'ed25519,rsa', 'github.com']);
  if (scan.code !== 0 || scan.stdout.trim().length === 0) {
    // Non-fatal — fall back to accept-new on the probe; surface a clearer error if everything else fails.
    return;
  }
  // Append (don't overwrite — preserve any other hosts the user has trusted).
  const existing = existsSync(knownHosts) ? readFileSync(knownHosts, 'utf8') : '';
  const sep = existing && !existing.endsWith('\n') ? '\n' : '';
  await ctx.exec.run('sh', ['-c', `cat >> "${knownHosts}"`], {
    input: `${sep}${scan.stdout}`,
  });
  await ctx.exec.run('chmod', ['644', knownHosts]);
}

async function trySshAuth(ctx: StepContext): Promise<boolean> {
  await ensureGitHubHostKey(ctx);
  const r = await ctx.exec.run('ssh', [
    '-o',
    'BatchMode=yes',
    '-o',
    'ConnectTimeout=5',
    // Belt-and-suspenders: even if known_hosts seeding failed, accept-new lets
    // BatchMode trust an unknown host on first encounter rather than rejecting it.
    '-o',
    'StrictHostKeyChecking=accept-new',
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
