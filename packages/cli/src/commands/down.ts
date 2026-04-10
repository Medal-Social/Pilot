import React from 'react';
import { render, Text } from 'ink';
import { colors } from '../colors.js';
import { getTemplate } from '../device/templates.js';
import { getInstalledTemplateNames } from '../device/state.js';
import { uninstallTemplate } from '../device/uninstaller.js';
import { PilotError, errorCodes } from '../errors.js';

export async function runDown(template: string) {
  const manifest = getTemplate(template);
  if (!manifest) {
    throw new PilotError(errorCodes.DOWN_UNKNOWN_TEMPLATE);
  }

  const installed = getInstalledTemplateNames();
  if (!installed.includes(template)) {
    render(
      React.createElement(
        Text,
        { color: colors.muted },
        `${manifest.displayName} is not installed. Nothing to remove.`
      )
    );
    return;
  }

  render(
    React.createElement(
      Text,
      { color: colors.warning },
      `Removing ${manifest.displayName}...`
    )
  );

  const result = await uninstallTemplate(template);

  if (result.removed.length > 0) {
    for (const label of result.removed) {
      render(
        React.createElement(Text, { color: colors.success }, `  ✓ ${label} removed`)
      );
    }
  }

  for (const label of result.failed) {
    render(
      React.createElement(
        Text,
        { color: colors.error },
        `  ✗ ${label} could not be removed`
      )
    );
  }

  if (result.failed.length > 0) {
    throw new PilotError(errorCodes.DOWN_REMOVE_FAILED);
  }

  render(
    React.createElement(
      Text,
      { color: colors.muted },
      `\nDone. Run \`pilot up ${template}\` to reinstall.`
    )
  );
}
