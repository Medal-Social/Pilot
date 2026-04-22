// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Text, useApp } from 'ink';
import { useEffect, useState } from 'react';
import { colors } from '../../colors.js';
import { Step } from '../../components/Step.js';
import type { PackageManagers } from '../../installer/detect.js';
import type { RunCallbacks } from '../../installer/runner.js';
import type { TemplateEntry } from '../../registry/types.js';
import type { StepStatus } from '../../types.js';

export interface UpInstallProps {
  entry: TemplateEntry;
  managers: PackageManagers;
  runSteps: (callbacks: RunCallbacks) => Promise<void>;
  onDone?: () => void | Promise<void>;
}

export function UpInstall({ entry, managers: _managers, runSteps, onDone }: UpInstallProps) {
  const { exit } = useApp();
  const [statuses, setStatuses] = useState<StepStatus[]>(entry.steps.map(() => 'waiting'));
  const [details, setDetails] = useState<(string | undefined)[]>(entry.steps.map(() => undefined));
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [elapsed, setElapsed] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-once
  useEffect(() => {
    const start = Date.now();
    runSteps({
      onStepStart: (i) => {
        setStatuses((prev) => prev.map((s, idx) => (idx === i ? 'active' : s)));
      },
      onStepSkip: (i) => {
        setStatuses((prev) => prev.map((s, idx) => (idx === i ? 'done' : s)));
        setDetails((prev) => prev.map((d, idx) => (idx === i ? 'already installed' : d)));
      },
      onStepDone: (i) => {
        setStatuses((prev) => prev.map((s, idx) => (idx === i ? 'done' : s)));
      },
      onStepError: (i, err) => {
        setStatuses((prev) => prev.map((s, idx) => (idx === i ? 'error' : s)));
        setError(err.message);
      },
    })
      .then(async () => {
        setElapsed(Math.round((Date.now() - start) / 1000));
        try {
          await onDone?.();
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
          process.exitCode = 1;
        }
        setDone(true);
        setTimeout(() => exit(), 800);
      })
      .catch(() => {
        setElapsed(Math.round((Date.now() - start) / 1000));
        setDone(true);
        // Signal failure to CLI callers / CI even though the UI already
        // reported the error via onStepError.
        process.exitCode = 1;
        setTimeout(() => exit(), 2000);
      });
  }, []);

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={colors.text}>
          {entry.displayName}
        </Text>
        <Text color={colors.muted}>{entry.description}</Text>
      </Box>
      <Box flexDirection="column">
        {entry.steps.map((step, i) => (
          <Step key={step.label} label={step.label} status={statuses[i]} detail={details[i]} />
        ))}
      </Box>
      {done && !error && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={colors.success}>
            Done in {elapsed}s.{entry.completionHint ? ` ${entry.completionHint}.` : ''}
          </Text>
          {entry.crew && (
            <Text color={colors.muted}>
              Your {entry.crew.displayName} is ready — ask them anything.
            </Text>
          )}
        </Box>
      )}
      {done && error && (
        <Box marginTop={1}>
          <Text color={colors.error}>Failed: {error}</Text>
          <Text color={colors.muted}>
            {' '}
            Fix the error above and run `pilot up {entry.name}` again.
          </Text>
        </Box>
      )}
    </Box>
  );
}
