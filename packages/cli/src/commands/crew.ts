// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render, Text } from 'ink';
import React from 'react';
import { colors } from '../colors.js';

export async function runCrew() {
  render(React.createElement(Text, { color: colors.muted }, 'pilot crew — coming soon'));
}
