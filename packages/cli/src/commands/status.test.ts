// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('ink', () => ({
  render: vi.fn(),
  Text: 'Text',
}));

vi.mock('react', () => ({
  default: { createElement: vi.fn((...args: unknown[]) => ({ type: args[0], props: args[1] })) },
  createElement: vi.fn((...args: unknown[]) => ({ type: args[0], props: args[1] })),
}));

describe('runStatus', () => {
  let stdoutWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWrite.mockRestore();
  });

  it('renders coming soon message when called without options', async () => {
    const { runStatus } = await import('./status.js');
    const { render } = await import('ink');
    await runStatus();
    expect(render).toHaveBeenCalled();
    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('renders coming soon message when json is false', async () => {
    const { runStatus } = await import('./status.js');
    const { render } = await import('ink');
    await runStatus({ json: false });
    expect(render).toHaveBeenCalled();
    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('outputs JSON to stdout when --json is passed', async () => {
    const { runStatus } = await import('./status.js');
    await runStatus({ json: true });
    expect(stdoutWrite).toHaveBeenCalledOnce();
    const output = stdoutWrite.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed).toMatchObject({
      pilot: expect.any(String),
      node: expect.any(String),
      platform: expect.any(String),
      arch: expect.any(String),
    });
  });

  it('JSON output includes correct node version', async () => {
    const { runStatus } = await import('./status.js');
    await runStatus({ json: true });
    const output = stdoutWrite.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.node).toBe(process.version);
  });

  it('JSON output includes correct platform and arch', async () => {
    const { runStatus } = await import('./status.js');
    await runStatus({ json: true });
    const output = stdoutWrite.mock.calls[0][0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.platform).toBe(process.platform);
    expect(parsed.arch).toBe(process.arch);
  });

  it('JSON output ends with newline', async () => {
    const { runStatus } = await import('./status.js');
    await runStatus({ json: true });
    const output = stdoutWrite.mock.calls[0][0] as string;
    expect(output.endsWith('\n')).toBe(true);
  });

  it('does not call render when --json is passed', async () => {
    const { runStatus } = await import('./status.js');
    const { render } = await import('ink');
    vi.mocked(render).mockClear();
    await runStatus({ json: true });
    expect(render).not.toHaveBeenCalled();
  });
});
