// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink';
import React from 'react';
import { Update } from '../screens/Update.js';
import { VERSION } from '../version.js';

export async function runUpdate() {
  render(React.createElement(Update, { currentVersion: VERSION }));
}
