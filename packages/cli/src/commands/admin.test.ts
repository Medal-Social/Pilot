// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';

vi.mock('ink', () => ({
  render: vi.fn(),
}));

vi.mock('../admin/mock-sdk.js', () => ({
  createMockAdminSDK: vi.fn(() => ({
    getUser: vi.fn().mockResolvedValue({ email: 'ali@medalsocial.com', role: 'super_admin' }),
    getServices: vi.fn().mockResolvedValue([]),
    getQuickStats: vi
      .fn()
      .mockResolvedValue({ totalWorkspaces: 0, liveSites: 0, warnings: 0, mrr: 0 }),
    getWorkspaces: vi.fn().mockResolvedValue([]),
    getWorkspaceDetail: vi.fn().mockResolvedValue({}),
    getContentStats: vi
      .fn()
      .mockResolvedValue({ published: 0, drafts: 0, scheduled: 0, datasets: [] }),
  })),
}));

describe('runAdmin', () => {
  it('renders the Admin screen', async () => {
    const { render } = await import('ink');
    const { runAdmin } = await import('./admin.js');
    await runAdmin();
    expect(render).toHaveBeenCalledOnce();
  });
});
