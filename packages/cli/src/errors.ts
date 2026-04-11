export const errorCodes = {
  UPDATE_CHECK_FAILED: 'UPDATE_CHECK_FAILED',
  UPDATE_INSTALL_FAILED: 'UPDATE_INSTALL_FAILED',
  UNINSTALL_NOT_INSTALLED: 'UNINSTALL_NOT_INSTALLED',
  UNINSTALL_BACKUP_FAILED: 'UNINSTALL_BACKUP_FAILED',
  UNINSTALL_STEP_FAILED: 'UNINSTALL_STEP_FAILED',
  UNINSTALL_NPM_FAILED: 'UNINSTALL_NPM_FAILED',
  DOWN_UNKNOWN_TEMPLATE: 'DOWN_UNKNOWN_TEMPLATE',
  DOWN_NOT_INSTALLED: 'DOWN_NOT_INSTALLED',
  DOWN_REMOVE_FAILED: 'DOWN_REMOVE_FAILED',
  PLUGIN_INVALID_MANIFEST: 'PLUGIN_INVALID_MANIFEST',
} as const;

type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

const userMessages: Record<ErrorCode, string> = {
  UPDATE_CHECK_FAILED: 'Unable to check for updates — are you online?',
  UPDATE_INSTALL_FAILED:
    'Update could not be installed. Please try again or visit medalsocial.com/pilot for help.',
  UNINSTALL_NOT_INSTALLED: 'Pilot is not installed. Nothing to remove.',
  UNINSTALL_BACKUP_FAILED: 'Could not back up knowledge files. Uninstall aborted for safety.',
  UNINSTALL_STEP_FAILED: 'A removal step failed — continuing with remaining steps.',
  UNINSTALL_NPM_FAILED:
    'Could not remove the global package. Run: sudo npm uninstall -g @medalsocial/pilot',
  DOWN_UNKNOWN_TEMPLATE: 'Unknown template. Run pilot up to see available templates.',
  DOWN_NOT_INSTALLED: 'That template is not installed. Nothing to remove.',
  DOWN_REMOVE_FAILED: 'Could not remove template dependencies. Some files may remain.',
  PLUGIN_INVALID_MANIFEST: 'Plugin has an invalid manifest — missing name or namespace.',
};

export class PilotError extends Error {
  code: ErrorCode;

  constructor(code: ErrorCode, detail?: string) {
    super(userMessages[code]);
    this.code = code;
    this.name = 'PilotError';
    if (detail) this.cause = detail;
  }
}
