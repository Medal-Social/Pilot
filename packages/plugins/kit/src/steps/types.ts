// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Exec } from '../shell/exec.js';

export interface StepContext {
  exec: Exec;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export interface Step {
  id: string;
  label: string;
  check(ctx?: StepContext): Promise<boolean>;
  run(ctx: StepContext): Promise<void>;
}

export interface RunStepsHooks {
  onStart?(step: Step): void;
  onDone?(step: Step): void;
  onSkip?(step: Step): void;
  onError?(step: Step, err: unknown): void;
}

export async function runSteps(
  steps: Step[],
  hooks: RunStepsHooks = {},
  ctx?: StepContext
): Promise<void> {
  const context = ctx ?? { exec: (await import('../shell/exec.js')).realExec };
  for (const step of steps) {
    hooks.onStart?.(step);
    if (await step.check(context)) {
      hooks.onSkip?.(step);
      continue;
    }
    try {
      await step.run(context);
      hooks.onDone?.(step);
    } catch (err) {
      hooks.onError?.(step, err);
      throw err;
    }
  }
}
