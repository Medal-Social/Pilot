// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeAppsJson } from '../apps/store.js';
import type { Exec } from '../shell/exec.js';

export interface ScaffoldOpts {
  target: string;
  name: string;
  machine: string;
  user: string;
  type?: 'darwin' | 'nixos';
  exec: Exec;
}

export async function scaffoldKit(opts: ScaffoldOpts): Promise<void> {
  const type = opts.type ?? 'darwin';
  mkdirSync(opts.target, { recursive: true });
  mkdirSync(join(opts.target, 'machines'), { recursive: true });

  const config = {
    name: opts.name,
    repo: 'github:USER/REPO',
    repoDir: opts.target,
    machines: { [opts.machine]: { type, user: opts.user } },
  };
  writeFileSync(join(opts.target, 'kit.config.json'), `${JSON.stringify(config, null, 2)}\n`);

  writeFileSync(
    join(opts.target, 'flake.nix'),
    `{
  description = "${opts.name} — managed by kit";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { self, nixpkgs }: { };
}
`
  );

  writeFileSync(
    join(opts.target, 'machines', `${opts.machine}.nix`),
    `{ ... }: let
  apps = builtins.fromJSON (builtins.readFile ./${opts.machine}.apps.json);
in {
  homebrew.casks = apps.casks;
  homebrew.brews = apps.brews;
}
`
  );

  writeAppsJson(join(opts.target, 'machines', `${opts.machine}.apps.json`), {
    casks: [],
    brews: [],
  });

  writeFileSync(join(opts.target, '.gitignore'), `.envrc\n.direnv/\nresult\nsecrets.local/\n`);

  writeFileSync(
    join(opts.target, 'README.md'),
    `# ${opts.name}\n\nMachine config managed by kit. Run \`kit init ${opts.machine}\` to bootstrap.\n`
  );

  await opts.exec.run('git', ['init'], { cwd: opts.target });
  await opts.exec.run('git', ['add', '.'], { cwd: opts.target });
  await opts.exec.run('git', ['commit', '-m', `chore: scaffold ${opts.name}`], {
    cwd: opts.target,
  });
}
