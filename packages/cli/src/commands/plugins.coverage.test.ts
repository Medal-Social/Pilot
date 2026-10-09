// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { homedir } from 'node:os';
import { join } from 'node:path';
import { render } from 'ink';
import { expect, it, vi } from 'vitest';
import { discoverPlugins } from '../plugins/discover.js';
import { Plugins } from '../screens/Plugins.js';
import { runPlugins } from './plugins.js';

vi.mock('ink', () => ({ render: vi.fn() }));
vi.mock('../screens/Plugins.js', () => ({ Plugins: () => null }));
vi.mock('../settings.js', () => ({ loadSettings: () => ({ plugins: { kit: false } }) }));
vi.mock('../plugins/discover.js', () => ({
  discoverPlugins: vi.fn(() => [{ name: 'kit', enabled: false }]),
}));

it('discovers user plugins with persisted enablement and passes them to the screen', async () => {
  await runPlugins();
  expect(discoverPlugins).toHaveBeenCalledWith({
    userDir: join(homedir(), '.pilot', 'plugins'),
    enabledState: { kit: false },
  });
  expect(render).toHaveBeenCalledWith(
    expect.objectContaining({
      type: Plugins,
      props: { plugins: [{ name: 'kit', enabled: false }] },
    })
  );
});
