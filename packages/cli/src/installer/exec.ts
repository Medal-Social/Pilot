// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Re-export the centralized subprocess interface from shell/exec.ts.
// Do not import node:child_process here — all spawn logic lives in shell/exec.ts.

export type { Exec, ExecResult } from '../shell/exec.js';
export { realExec } from '../shell/exec.js';
