// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// https://no-color.org/ — if NO_COLOR is present (any value), disable colors.
// FORCE_COLOR overrides piped/non-TTY output suppression (handled natively by chalk/Ink).
const noColor = 'NO_COLOR' in process.env;

const brandColors = {
  bg: '#09090B',
  card: '#18181B',
  border: '#2E2E33',
  primary: '#9A6AC2',
  info: '#3B82F6',
  success: '#2DD4BF',
  warning: '#FBBF24',
  error: '#EF4444',
  text: '#F4F4F5',
  muted: '#71717A',
} as const;

type ColorKey = keyof typeof brandColors;
type Colors = { [K in ColorKey]: string };

// When NO_COLOR is set, all color values become empty strings so Ink renders plain text.
const emptyColors: Colors = {
  bg: '',
  card: '',
  border: '',
  primary: '',
  info: '',
  success: '',
  warning: '',
  error: '',
  text: '',
  muted: '',
};

export const colors: Colors = noColor ? emptyColors : { ...brandColors };

export const isColorEnabled = !noColor;
