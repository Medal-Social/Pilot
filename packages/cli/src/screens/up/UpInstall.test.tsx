// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { RunCallbacks } from '../../installer/runner.js';
import type { TemplateEntry } from '../../registry/types.js';
import { UpInstall } from './UpInstall.js';

const entry: TemplateEntry = {
  name: 'remotion',
  displayName: 'Remotion Video Studio',
  description: 'Video with React',
  version: '1.0.0',
  category: 'video',
  platforms: ['darwin'],
  steps: [{ type: 'npm', pkg: '@remotion/cli', global: true, label: 'Remotion CLI' }],
  completionHint: 'Run npx remotion studio',
};

const managers = { nix: false, brew: false, winget: false, npm: true };

describe('UpInstall', () => {
  it('renders the template displayName', () => {
    const runSteps = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    const { lastFrame } = render(React.createElement(UpInstall, { entry, managers, runSteps }));
    expect(lastFrame()).toContain('Remotion Video Studio');
  });

  it('renders step labels with waiting status initially', () => {
    const runSteps = vi.fn().mockReturnValue(new Promise(() => {}));
    const { lastFrame } = render(React.createElement(UpInstall, { entry, managers, runSteps }));
    expect(lastFrame()).toContain('Remotion CLI');
    expect(lastFrame()).toContain('○'); // waiting icon from Step component
  });

  it('invokes all step callbacks during runSteps execution', () => {
    const runSteps = vi.fn().mockImplementation((cbs: RunCallbacks) => {
      cbs.onStepStart(0);
      cbs.onStepSkip(0);
      cbs.onStepDone(0);
      cbs.onStepError(0, new Error('boom'));
      return new Promise(() => {});
    });
    render(React.createElement(UpInstall, { entry, managers, runSteps }));
    expect(runSteps).toHaveBeenCalled();
  });

  it('calls onDone after runSteps resolves', async () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const runSteps = vi.fn().mockResolvedValue(undefined);

    render(React.createElement(UpInstall, { entry, managers, runSteps, onDone }));

    await Promise.resolve();
    await Promise.resolve();

    expect(onDone).toHaveBeenCalled();
    // Advance timers to execute the setTimeout(() => exit(), 800) callback
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('does not call onDone when runSteps rejects', async () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const runSteps = vi.fn().mockRejectedValue(new Error('install failed'));

    render(React.createElement(UpInstall, { entry, managers, runSteps, onDone }));

    await Promise.resolve();
    await Promise.resolve();

    expect(onDone).not.toHaveBeenCalled();
    // Advance timers to execute the setTimeout(() => exit(), 2000) callback in catch
    vi.runAllTimers();
    vi.useRealTimers();
  });
});
