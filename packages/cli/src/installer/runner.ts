// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { homedir } from 'node:os';
import { join } from 'node:path';
import { fetchRegistry } from '../registry/fetch.js';
import type { AnyStep, PkgStep } from '../registry/types.js';
import type { PackageManagers } from './detect.js';
import { realExec } from './exec.js';
import { checkStep, executeStep, unexecuteStep } from './steps.js';

export interface RunCallbacks {
  onStepStart(index: number): void;
  onStepSkip(index: number): void;
  onStepDone(index: number): void;
  onStepError(index: number, error: Error): void;
}

interface StepHandlers {
  checkStep: typeof checkStep;
  executeStep: typeof executeStep;
  unexecuteStep?: typeof unexecuteStep;
}

const defaultHandlers: StepHandlers = { checkStep, executeStep, unexecuteStep };

export async function runInstallSteps(
  steps: AnyStep[],
  managers: PackageManagers,
  handlers: StepHandlers = defaultHandlers,
  callbacks: RunCallbacks
): Promise<void> {
  const skillsDir = join(homedir(), '.pilot', 'skills');
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    callbacks.onStepStart(i);
    try {
      const satisfied = await handlers.checkStep(step, managers, realExec, { skillsDir });
      if (satisfied) {
        callbacks.onStepSkip(i);
        continue;
      }
      await handlers.executeStep(step, managers, realExec, { skillsDir });
      callbacks.onStepDone(i);
    } catch (err) {
      callbacks.onStepError(i, err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }
}

export async function runUninstallSteps(
  steps: AnyStep[],
  managers: PackageManagers,
  handlers: StepHandlers = defaultHandlers,
  otherInstalledTemplates: string[],
  _templateName: string,
  callbacks: RunCallbacks
): Promise<void> {
  const skillsDir = join(homedir(), '.pilot', 'skills');
  const cacheDir = join(homedir(), '.pilot', 'registry');

  // Build a set of pkg identifiers used by other templates (shared-package protection)
  const sharedPkgs = new Set<string>();
  if (otherInstalledTemplates.length > 0) {
    try {
      const { index } = await fetchRegistry({ cacheDir });
      for (const name of otherInstalledTemplates) {
        const entry = index.templates.find((t) => t.name === name);
        if (!entry) continue;
        for (const s of entry.steps) {
          if (s.type === 'pkg') {
            const p = s as PkgStep;
            if (p.nix) sharedPkgs.add(`nix:${p.nix}`);
            if (p.brew) sharedPkgs.add(`brew:${p.brew}`);
            if (p.winget) sharedPkgs.add(`winget:${p.winget}`);
          }
        }
      }
    } catch {
      // If registry fetch fails, skip shared-pkg protection (best-effort)
    }
  }

  const reversed = [...steps].reverse();
  for (let i = 0; i < reversed.length; i++) {
    const step = reversed[i];
    const originalIndex = steps.length - 1 - i;
    callbacks.onStepStart(originalIndex);

    // Shared-package protection
    if (step.type === 'pkg') {
      const p = step as PkgStep;
      const isShared =
        (managers.nix && p.nix && sharedPkgs.has(`nix:${p.nix}`)) ||
        (managers.brew && p.brew && sharedPkgs.has(`brew:${p.brew}`)) ||
        (managers.winget && p.winget && sharedPkgs.has(`winget:${p.winget}`));
      if (isShared) {
        callbacks.onStepSkip(originalIndex);
        continue;
      }
    }

    try {
      const unexecute = handlers.unexecuteStep ?? unexecuteStep;
      await unexecute(step, managers, realExec, { skillsDir });
      callbacks.onStepDone(originalIndex);
    } catch (err) {
      callbacks.onStepError(originalIndex, err instanceof Error ? err : new Error(String(err)));
    }
  }
}
