// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { createAdminAPI } from '../admin/api.js';
import { createMockAdminSDK } from '../admin/mock-sdk.js';
import { Admin } from './Admin.js';

describe('Admin integration', () => {
  const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

  it('loads dashboard data and renders all sections', async () => {
    const sdk = createMockAdminSDK();
    const api = createAdminAPI(sdk);
    const { lastFrame } = render(<Admin api={api} />);
    await delay();

    const frame = lastFrame() ?? '';
    expect(frame).toContain('AUTH');
    expect(frame).toContain('REALTI');
    expect(frame).toContain('workspac');
    expect(frame).toContain('live');
    expect(frame).toContain('SITE STATUS');
  });

  it('navigates through all tabs', async () => {
    const sdk = createMockAdminSDK();
    const api = createAdminAPI(sdk);
    const { lastFrame, stdin } = render(<Admin api={api} />);
    await delay();

    stdin.write('2');
    await delay();
    expect(lastFrame()).toContain('SSL');
    expect(lastFrame()).toContain('DNS');

    stdin.write('3');
    await delay();
    expect(lastFrame()).toContain('Published');
    expect(lastFrame()).toContain('Drafts');

    stdin.write('4');
    await delay();
    expect(lastFrame()).toContain('MONTHLY VISITS');

    stdin.write('5');
    await delay();
    expect(lastFrame()).toContain('WORKSPACE');
    expect(lastFrame()).toContain('PLAN');
  });

  it('renders workspace-scoped view for owners', async () => {
    const sdk = createMockAdminSDK({ role: 'owner', workspaceId: 'ws-2' });
    const api = createAdminAPI(sdk);
    const { lastFrame } = render(<Admin api={api} workspaceId="ws-2" />);
    await delay();

    expect(lastFrame()).toContain('PILOT ADMIN');
    expect(lastFrame()).toContain('AUTH');
  });
});
