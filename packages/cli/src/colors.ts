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
// Values are `string | undefined` so that NO_COLOR mode can return undefined and
// `<Text color={colors.x}>` becomes `<Text color={undefined}>` — equivalent to omitting
// the prop entirely. Empty strings (the previous approach) still get treated as a
// color value by Ink and apply styling, defeating NO_COLOR.
type Colors = { [K in ColorKey]: string | undefined };

// When NO_COLOR is set, all color values are undefined so Ink omits color styling.
const undefinedColors: Colors = {
  bg: undefined,
  card: undefined,
  border: undefined,
  primary: undefined,
  info: undefined,
  success: undefined,
  warning: undefined,
  error: undefined,
  text: undefined,
  muted: undefined,
};

export const colors: Colors = noColor ? undefinedColors : { ...brandColors };

export const isColorEnabled = !noColor;
