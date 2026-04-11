// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink';
import React from 'react';
import { Training } from '../screens/Training.js';

export async function runTraining() {
  render(React.createElement(Training));
}
