// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeAppsJson } from '../apps/store.js';
import { errorCodes, KitError } from '../errors.js';
import type { Exec } from '../shell/exec.js';

export interface ScaffoldOpts {
  target: string;
  name: string;
  machine: string;
  user: string;
  type?: 'darwin' | 'nixos';
  exec: Exec;
}

function darwinFlake(name: string, machine: string, user: string): string {
  return `{
  description = "${name} — managed by kit";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nix-darwin = {
      url = "github:LnL7/nix-darwin";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    nix-homebrew.url = "github:zhaofengli-wip/nix-homebrew";
  };

  outputs = { self, nixpkgs, nix-darwin, nix-homebrew, ... }: {
    darwinConfigurations.${machine} = nix-darwin.lib.darwinSystem {
      system = "aarch64-darwin";
      modules = [
        ./machines/${machine}.nix
        nix-homebrew.darwinModules.nix-homebrew
        ({ ... }: {
          system.stateVersion = 5;
          users.users.${user}.home = "/Users/${user}";
          nix-homebrew = {
            enable = true;
            enableRosetta = true;
            user = "${user}";
          };
        })
      ];
    };
  };
}
`;
}

function nixosFlake(name: string, machine: string, user: string): string {
  return `{
  description = "${name} — managed by kit";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs, ... }: {
    nixosConfigurations.${machine} = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./machines/${machine}.nix
        ({ ... }: {
          system.stateVersion = "24.11";
          users.users.${user} = { isNormalUser = true; home = "/home/${user}"; };
        })
      ];
    };
  };
}
`;
}

function machineNix(machine: string, type: 'darwin' | 'nixos'): string {
  if (type === 'darwin') {
    return `{ ... }: let
  apps = builtins.fromJSON (builtins.readFile ./${machine}.apps.json);
in {
  networking.hostName = "${machine}";
  homebrew.casks = apps.casks;
  homebrew.brews = apps.brews;
}
`;
  }
  return `{ ... }: {
  networking.hostName = "${machine}";
}
`;
}

async function runGit(exec: Exec, args: string[], cwd: string, what: string): Promise<void> {
  const r = await exec.run('git', args, { cwd });
  if (r.code !== 0) {
    throw new KitError(
      errorCodes.KIT_REPO_CLONE_FAILED,
      `git ${args.join(' ')} failed (${what}): ${r.stderr.trim() || `exit ${r.code}`}`
    );
  }
}

export async function scaffoldKit(opts: ScaffoldOpts): Promise<void> {
  const type = opts.type ?? 'darwin';
  mkdirSync(opts.target, { recursive: true });
  mkdirSync(join(opts.target, 'machines'), { recursive: true });

  // Note: NO `repoDir` field — the loader derives it from the config file's
  // location, so this scaffolded config is portable across machines.
  const config = {
    name: opts.name,
    repo: 'github:USER/REPO',
    machines: { [opts.machine]: { type, user: opts.user } },
  };
  writeFileSync(join(opts.target, 'kit.config.json'), `${JSON.stringify(config, null, 2)}\n`);

  writeFileSync(
    join(opts.target, 'flake.nix'),
    type === 'darwin'
      ? darwinFlake(opts.name, opts.machine, opts.user)
      : nixosFlake(opts.name, opts.machine, opts.user)
  );

  writeFileSync(
    join(opts.target, 'machines', `${opts.machine}.nix`),
    machineNix(opts.machine, type)
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

  await runGit(opts.exec, ['init'], opts.target, 'init');
  await runGit(opts.exec, ['add', '.'], opts.target, 'stage scaffold');
  await runGit(
    opts.exec,
    ['commit', '-m', `chore: scaffold ${opts.name}`],
    opts.target,
    'initial commit'
  );
}
