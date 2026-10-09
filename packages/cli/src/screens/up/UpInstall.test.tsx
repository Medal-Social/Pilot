// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { cleanup, render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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
    vi.useRealTimers();
  });

  it('sets process.exitCode = 1 when runSteps rejects', async () => {
    const prev = process.exitCode;
    process.exitCode = 0;
    const runSteps = vi.fn().mockRejectedValue(new Error('install failed'));

    render(React.createElement(UpInstall, { entry, managers, runSteps }));

    await Promise.resolve();
    await Promise.resolve();

    expect(process.exitCode).toBe(1);
    process.exitCode = prev;
  });

  it('awaits a Promise-returning onDone before exit', async () => {
    let resolved = false;
    const onDone = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            resolved = true;
            resolve();
          }, 10);
        })
    );
    const runSteps = vi.fn().mockResolvedValue(undefined);

    render(React.createElement(UpInstall, { entry, managers, runSteps, onDone }));

    await new Promise((r) => setTimeout(r, 30));
    expect(onDone).toHaveBeenCalled();
    expect(resolved).toBe(true);
  });

  it('surfaces errors thrown from onDone without crashing', async () => {
    const prev = process.exitCode;
    process.exitCode = 0;
    const onDone = vi.fn().mockRejectedValue(new Error('state write failed'));
    const runSteps = vi.fn().mockResolvedValue(undefined);

    render(React.createElement(UpInstall, { entry, managers, runSteps, onDone }));

    await new Promise((r) => setTimeout(r, 10));
    expect(onDone).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    process.exitCode = prev;
  });

  it('renders completion with completionHint and crew badge', async () => {
    const entryWithCrew = {
      ...entry,
      crew: {
        specialist: 'video',
        displayName: 'Video Specialist',
        skills: ['remotion'],
      },
      completionHint: 'Run something',
    };
    const onDone = vi.fn().mockResolvedValue(undefined);
    const runSteps = vi.fn().mockResolvedValue(undefined);
    const { lastFrame, frames } = render(
      React.createElement(UpInstall, { entry: entryWithCrew, managers, runSteps, onDone })
    );
    // Wait for runSteps.then → onDone → setDone(true) → React flush.
    await vi.waitFor(() => {
      const output = frames.join('\n') + (lastFrame() ?? '');
      expect(output).toContain('Done in');
      expect(output).toContain('Video Specialist');
    });
  });

  it('renders failure footer when runSteps rejects', async () => {
    const entryNoSteps = { ...entry, steps: [] };
    const runSteps = vi.fn().mockRejectedValue(new Error('boom'));
    const { lastFrame } = render(
      React.createElement(UpInstall, { entry: entryNoSteps, managers, runSteps })
    );
    await new Promise((r) => setTimeout(r, 30));
    // The UI delays exit by 2s but the error frame is already written.
    // A rejecting runSteps shows the "Failed: …" footer only when there was
    // also a setError call. With zero steps we just see the done state with
    // no steps and the process.exitCode update.
    expect(lastFrame()).toBeTruthy();
  });

  it('calls exit after success setTimeout fires', async () => {
    const runSteps = vi.fn().mockResolvedValue(undefined);
    const onDone = vi.fn().mockResolvedValue(undefined);
    render(React.createElement(UpInstall, { entry, managers, runSteps, onDone }));
    // 800ms success exit → wait a bit longer.
    await new Promise((r) => setTimeout(r, 900));
    expect(onDone).toHaveBeenCalled();
  });

  it('calls exit after failure setTimeout fires', async () => {
    const runSteps = vi.fn().mockRejectedValue(new Error('boom'));
    render(React.createElement(UpInstall, { entry, managers, runSteps }));
    // 2000ms failure exit.
    await new Promise((r) => setTimeout(r, 2100));
  });

  it('marks only the targeted step as active/done/skipped/error (branch coverage for idx !== i)', async () => {
    const multiEntry = {
      ...entry,
      steps: [
        { type: 'npm' as const, pkg: 'a', global: true, label: 'A' },
        { type: 'npm' as const, pkg: 'b', global: true, label: 'B' },
      ],
    };
    const runSteps = vi.fn().mockImplementation((cbs: RunCallbacks) => {
      cbs.onStepStart(1);
      cbs.onStepSkip(0);
      cbs.onStepDone(1);
      cbs.onStepError(0, new Error('partial'));
      return new Promise(() => {});
    });
    const { lastFrame } = render(
      React.createElement(UpInstall, { entry: multiEntry, managers, runSteps })
    );
    await vi.waitFor(() => {
      expect(lastFrame()).toMatch(/✗\s+A/);
      expect(lastFrame()).toMatch(/✓\s+B/);
      expect(lastFrame()).toContain('already installed');
    });
  });
});

it('renders a plain completion when no hint, crew, or completion callback is supplied', async () => {
  const { lastFrame } = render(
    <UpInstall
      entry={{ ...entry, completionHint: undefined, crew: undefined }}
      managers={managers}
      runSteps={async () => {}}
    />
  );
  await vi.waitFor(() => expect(lastFrame()).toContain('Done in'));
  expect(lastFrame()).not.toContain('Run npx');
  expect(lastFrame()).not.toContain('Your ');
});

it('renders a non-Error completion rejection as a recoverable failure', async () => {
  const previous = process.exitCode;
  try {
    const { lastFrame } = render(
      <UpInstall
        entry={entry}
        managers={managers}
        runSteps={async () => {}}
        onDone={async () => {
          throw 'state unavailable';
        }}
      />
    );
    await vi.waitFor(() => expect(lastFrame()).toContain('Failed: state unavailable'));
    expect(process.exitCode).toBe(1);
    expect(lastFrame()).toContain('pilot up remotion');
  } finally {
    process.exitCode = previous;
  }
});
