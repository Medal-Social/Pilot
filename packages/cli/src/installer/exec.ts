// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// The installer subprocess interface. Re-exports the single authoritative Exec
// implementation from `shell/exec.ts` — direct child_process usage must be
// centralized there per project convention (see CLAUDE.md).

export type { Exec, ExecResult } from '../shell/exec.js';
export { realExec } from '../shell/exec.js';
