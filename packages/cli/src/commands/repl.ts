// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink';
import React from 'react';
import { Repl } from '../screens/Repl.js';

export async function runRepl() {
  render(React.createElement(Repl));
}
