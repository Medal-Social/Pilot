// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { createAdminAPI } from '../admin/api.js';
import { createMockAdminSDK } from '../admin/mock-sdk.js';
import { Admin } from './Admin.js';

function createMockAPI() {
  return createAdminAPI(createMockAdminSDK());
}

describe('Admin', () => {
  const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

  it('renders the header with PILOT ADMIN', async () => {
    const api = createMockAPI();
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    expect(lastFrame()).toContain('PILOT ADMIN');
  });

  it('renders the health strip with service names', async () => {
    const api = createMockAPI();
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    expect(lastFrame()).toContain('AUTH');
    expect(lastFrame()).toContain('API');
  });

  it('renders tab bar with customer tabs', async () => {
    const api = createMockAPI();
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    expect(lastFrame()).toContain('Overview');
    expect(lastFrame()).toContain('Site');
    expect(lastFrame()).toContain('Content');
    expect(lastFrame()).toContain('Analytics');
    expect(lastFrame()).toContain('Settings');
  });

  it('renders status bar with keyboard hints', async () => {
    const api = createMockAPI();
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    expect(lastFrame()).toContain('navigate');
    expect(lastFrame()).toContain('q quit');
  });

  it('switches tabs with number keys', async () => {
    const api = createMockAPI();
    const { lastFrame, stdin } = render(<Admin api={api} />);
    await delay();

    stdin.write('2');
    await delay();
    expect(lastFrame()).toContain('SSL');
    expect(lastFrame()).toContain('DNS');
  });

  it('shows overview panel by default', async () => {
    const api = createMockAPI();
    const { lastFrame } = render(<Admin api={api} />);
    await delay();
    expect(lastFrame()).toContain('SITE STATUS');
  });
});
