export const errorCodes = {
  UPDATE_CHECK_FAILED: 'UPDATE_CHECK_FAILED',
  UPDATE_INSTALL_FAILED: 'UPDATE_INSTALL_FAILED',
} as const;

type ErrorCode = (typeof errorCodes)[keyof typeof errorCodes];

const userMessages: Record<ErrorCode, string> = {
  UPDATE_CHECK_FAILED: 'Unable to check for updates — are you online?',
  UPDATE_INSTALL_FAILED: 'Update could not be installed. Please try again or visit medalsocial.com/pilot for help.',
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
