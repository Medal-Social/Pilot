// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from 'vitest';

vi.mock('ink', () => ({
  render: vi.fn(),
  Text: 'Text',
  Box: 'Box',
}));

vi.mock('react', () => ({
  default: { createElement: vi.fn((...args: unknown[]) => ({ type: args[0], props: args[1] })) },
  createElement: vi.fn((...args: unknown[]) => ({ type: args[0], props: args[1] })),
}));

describe('command handlers', () => {
  it('runRepl renders Repl screen', async () => {
    const { runRepl } = await import('./repl.js');
    const { render } = await import('ink');
    await runRepl();
    expect(render).toHaveBeenCalled();
  });

  it('runUpdate renders Update screen with version', async () => {
    const { runUpdate } = await import('./update.js');
    const { render } = await import('ink');
    await runUpdate();
    expect(render).toHaveBeenCalled();
  });

  it('runTraining renders Training screen', async () => {
    const { runTraining } = await import('./training.js');
    const { render } = await import('ink');
    await runTraining();
    expect(render).toHaveBeenCalled();
  });

  it('runCrew renders coming soon message', async () => {
    const { runCrew } = await import('./crew.js');
    const { render } = await import('ink');
    await runCrew();
    expect(render).toHaveBeenCalled();
  });

  it('runHelp renders coming soon message', async () => {
    const { runHelp } = await import('./help.js');
    const { render } = await import('ink');
    await runHelp();
    expect(render).toHaveBeenCalled();
  });

  it('runStatus renders coming soon message', async () => {
    const { runStatus } = await import('./status.js');
    const { render } = await import('ink');
    await runStatus();
    expect(render).toHaveBeenCalled();
  });

  it('runUp renders coming soon message', async () => {
    const { runUp } = await import('./up.js');
    const { render } = await import('ink');
    await runUp();
    expect(render).toHaveBeenCalled();
  });
});
