// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

export const errorCodes = {
  KIT_SUDO_DENIED: 'KIT_SUDO_DENIED',
  KIT_XCODE_INSTALL_FAILED: 'KIT_XCODE_INSTALL_FAILED',
  KIT_ROSETTA_INSTALL_FAILED: 'KIT_ROSETTA_INSTALL_FAILED',
  KIT_NIX_INSTALL_FAILED: 'KIT_NIX_INSTALL_FAILED',
  KIT_SSH_KEYGEN_FAILED: 'KIT_SSH_KEYGEN_FAILED',
  KIT_GITHUB_AUTH_FAILED: 'KIT_GITHUB_AUTH_FAILED',
  KIT_REPO_CLONE_FAILED: 'KIT_REPO_CLONE_FAILED',
  KIT_REPO_PULL_FAILED: 'KIT_REPO_PULL_FAILED',
  KIT_SECRETS_INIT_FAILED: 'KIT_SECRETS_INIT_FAILED',
  KIT_REBUILD_FAILED: 'KIT_REBUILD_FAILED',
  KIT_CONFIG_NOT_FOUND: 'KIT_CONFIG_NOT_FOUND',
  KIT_CONFIG_INVALID: 'KIT_CONFIG_INVALID',
  KIT_UNKNOWN_MACHINE: 'KIT_UNKNOWN_MACHINE',
  KIT_NO_MACHINE_FILE: 'KIT_NO_MACHINE_FILE',
  KIT_APPS_CORRUPT: 'KIT_APPS_CORRUPT',
  KIT_APPS_DUPLICATE: 'KIT_APPS_DUPLICATE',
  KIT_APPS_INVALID_NAME: 'KIT_APPS_INVALID_NAME',
  KIT_NO_EDITOR: 'KIT_NO_EDITOR',
} as const;

type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

const userMessages: Record<ErrorCode, string> = {
  KIT_SUDO_DENIED: 'sudo authentication was denied. Cannot proceed.',
  KIT_XCODE_INSTALL_FAILED: 'Could not install Xcode Command Line Tools.',
  KIT_ROSETTA_INSTALL_FAILED: 'Could not install Rosetta 2.',
  KIT_NIX_INSTALL_FAILED: 'Could not install Nix. See log for details.',
  KIT_SSH_KEYGEN_FAILED: 'Could not generate SSH key.',
  KIT_GITHUB_AUTH_FAILED: 'Could not authenticate to GitHub. Try `gh auth login` manually.',
  KIT_REPO_CLONE_FAILED: 'Could not clone the kit repository.',
  KIT_REPO_PULL_FAILED: 'Could not pull the kit repository.',
  KIT_SECRETS_INIT_FAILED: 'Secrets setup failed. Re-run `kit update` after fixing.',
  KIT_REBUILD_FAILED: 'System rebuild failed. See log for details.',
  KIT_CONFIG_NOT_FOUND:
    'No kit.config.ts found. Set $KIT_CONFIG or place it at ~/Documents/Code/kit/kit.config.ts.',
  KIT_CONFIG_INVALID: 'kit.config.ts is invalid.',
  KIT_UNKNOWN_MACHINE: 'Machine name is not in kit.config.ts → machines.',
  KIT_NO_MACHINE_FILE: 'No machine config file found for this hostname.',
  KIT_APPS_CORRUPT: 'apps.json is malformed.',
  KIT_APPS_DUPLICATE: 'That app is already in your config.',
  KIT_APPS_INVALID_NAME: 'Invalid Homebrew package name.',
  KIT_NO_EDITOR: 'No editor available. Set $EDITOR or install one of: zed, code, nvim, vim.',
};

export class KitError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode, detail?: string) {
    super(userMessages[code]);
    this.code = code;
    this.name = 'KitError';
    if (detail) this.cause = detail;
  }
}
