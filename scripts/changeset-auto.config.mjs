/*
 * Copyright (c) Medal Social, Inc. and its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0.
 */

/**
 * Deterministic changeset classifier — single source of truth.
 *
 * This module is imported by both `scripts/changeset-auto.mjs` and its test
 * file. No runtime dependencies beyond Node built-ins.
 */

/**
 * Maps file path prefixes (glob-like) to publishable package names. Order
 * matters: the first matching entry wins. `@medalsocial/kit` is intentionally
 * omitted because it is `private: true` and never published.
 */
export const PACKAGE_MAP = [{ glob: 'packages/cli/**', name: '@medalsocial/pilot' }];

/**
 * Glob-like patterns for files that never warrant a changeset on their own.
 * Patterns ending in `/**` match any file under that directory (root or
 * nested). Patterns like `*.lock.yml` match files by basename. Root-only
 * patterns (no slash) match files at the repo root only.
 */
export const IGNORED_GLOBS = [
  'docs/**',
  '*.md',
  'tests/**',
  'scripts/**',
  '.github/**',
  '.changeset/**',
  '*.lock.yml',
  'biome.json',
  'turbo.json',
  '.husky/**',
  'commitlint.config.cjs',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'LICENSE',
  'SECURITY.md',
];

/**
 * Regexes recognising PR-comment commands. `exec`-based; capture groups are
 * documented below.
 *
 * - `skip`: `/skip-changeset` (standalone, case-insensitive)
 * - `generate`: `/changeset` (no args → regenerate with inferred type)
 * - `generateTyped`: `/changeset <type>: <desc>` (overrides inference)
 */
export const COMMENT_COMMAND_REGEXES = {
  skip: /^\s*\/skip-changeset\s*$/im,
  generateTyped: /^\s*\/changeset\s+(patch|minor|major)\s*:\s*(.+?)\s*$/im,
  generate: /^\s*\/changeset\s*$/im,
};

/**
 * Matches Dependabot PR titles. Captures: (1) dep name, (2) from version,
 * (3) to version. Accepts both `build(deps)` and `chore(deps)` prefixes.
 */
export const DEPENDABOT_TITLE_REGEX =
  /^(?:build|chore)\(deps(?:-dev)?\): bump (\S+) from ([\d.]+\S*) to ([\d.]+\S*)/i;

/** PR label that forces the classifier to skip writing a changeset. */
export const SKIP_LABEL = 'no-changeset';

/** PR labels that override the inferred semver bump type. */
export const TYPE_LABELS = ['patch', 'minor', 'major'];
