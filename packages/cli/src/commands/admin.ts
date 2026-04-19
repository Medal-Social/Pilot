// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink';
import React from 'react';
import { createAdminAPI } from '../admin/api.js';
import { createMockAdminSDK } from '../admin/mock-sdk.js';
import { Admin } from '../screens/Admin.js';

export async function runAdmin() {
  // TODO: Replace with real SDK once Medal Social SDK is available
  const sdk = createMockAdminSDK();
  const api = createAdminAPI(sdk);

  render(React.createElement(Admin, { api }));
}
