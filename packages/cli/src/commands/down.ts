// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { homedir } from 'node:os';
import { join } from 'node:path';
import { render } from 'ink';
import React from 'react';
import { getInstalledTemplateNames, removeTemplateFromState } from '../device/state.js';
import { errorCodes, PilotError } from '../errors.js';
import { detectPackageManagers } from '../installer/detect.js';
import { realExec } from '../installer/exec.js';
import type { RunCallbacks } from '../installer/runner.js';
import { runUninstallSteps } from '../installer/runner.js';
import { fetchRegistry } from '../registry/fetch.js';
import type { TemplateEntry } from '../registry/types.js';
import { loadSettings, saveSettings } from '../settings.js';

async function removeCrewSpecialist(entry: TemplateEntry): Promise<void> {
  if (!entry.crew) return;
  const settings = loadSettings();
  delete settings.crew.specialists[entry.crew.specialist];
  saveSettings(settings);
}

export async function runDown(template: string): Promise<void> {
  const cacheDir = join(homedir(), '.pilot', 'registry');
  const { index } = await fetchRegistry({ cacheDir });

  const entry = index.templates.find((t) => t.name === template);
  if (!entry) throw new PilotError(errorCodes.DOWN_UNKNOWN_TEMPLATE, template);

  const installedNames = getInstalledTemplateNames();
  const otherInstalled = installedNames.filter((n) => n !== template);
  const managers = await detectPackageManagers(realExec);

  const { UpInstall } = await import('../screens/up/UpInstall.js');
  const { waitUntilExit } = render(
    React.createElement(UpInstall, {
      entry: {
        ...entry,
        displayName: `Removing ${entry.displayName}...`,
        completionHint: `Run \`pilot up ${template}\` to reinstall`,
      },
      managers,
      runSteps: (callbacks: RunCallbacks) =>
        runUninstallSteps(entry.steps, managers, undefined, otherInstalled, template, callbacks),
      onDone: async () => {
        removeTemplateFromState(template);
        await removeCrewSpecialist(entry);
      },
    })
  );
  await waitUntilExit();
}
