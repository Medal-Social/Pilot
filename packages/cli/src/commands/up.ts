// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render, Text } from 'ink';
import React from 'react';
import { colors } from '../colors.js';

export async function runUp(_template?: string) {
  render(React.createElement(Text, { color: colors.muted }, 'pilot up — coming soon'));
}
