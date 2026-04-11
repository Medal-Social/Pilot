// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render, Text } from 'ink';
import React from 'react';
import { colors } from '../colors.js';

export async function runStatus() {
  render(React.createElement(Text, { color: colors.muted }, 'pilot status — coming soon'));
}
