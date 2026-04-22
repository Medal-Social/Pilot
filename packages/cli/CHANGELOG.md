# @medalsocial/pilot

## 0.2.0

### Minor Changes

- [#41](https://github.com/Medal-Social/Pilot/pull/41) [`4d2c815`](https://github.com/Medal-Social/Pilot/commit/4d2c81557dd900d292ddc185238284e243ff086f) Thanks [@alioftech](https://github.com/alioftech)! - Add `pilot usage` command to display per-model token usage and costs for Claude Code and Codex CLI sessions. Supports filtering by week, month, or custom date, and outputs in table or JSON format. No API calls required; reads from local session files.

## 0.1.8

### Patch Changes

- [#35](https://github.com/Medal-Social/Pilot/pull/35) [`b4e82e0`](https://github.com/Medal-Social/Pilot/commit/b4e82e09c1580d9d4727c9d73f2e911fd86a9c80) Thanks [@alioftech](https://github.com/alioftech)! - Fix binary build workflow to trigger on release publish, not v\* tags. Add continue-on-error for auto-merge.

## 0.1.7

### Patch Changes

- Updated dependencies [[`e360e20`](https://github.com/Medal-Social/Pilot/commit/e360e2059ee2cbc865dd4c400f9fed44635754db)]:
  - @medalsocial/kit@0.1.2

## 0.1.6

### Patch Changes

- [#17](https://github.com/Medal-Social/Pilot/pull/17) [`6ddcd72`](https://github.com/Medal-Social/Pilot/commit/6ddcd72243beadb404384257a70af53809bdd806) Thanks [@alioftech](https://github.com/alioftech)! - Add repository guardrails for AI-assisted changes, security scanning, and release discipline.

  This adds Changesets-based release automation, stricter contributor hooks, tracked-file secret scanning,
  Knip baseline reporting, and tighter published package metadata.

- Updated dependencies [[`6ddcd72`](https://github.com/Medal-Social/Pilot/commit/6ddcd72243beadb404384257a70af53809bdd806)]:
  - @medalsocial/kit@0.1.1
