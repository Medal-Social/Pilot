// Copyright (c) Medal Social. All rights reserved.
// SPDX-License-Identifier: MIT

import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import { colors } from '../colors.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { Step } from '../components/Step.js';
import type { UpdateCheckResult } from '../update/checker.js';
import { applyUpdate, checkForUpdates } from '../update/checker.js';

type Phase = 'checking' | 'up-to-date' | 'confirm' | 'updating' | 'complete' | 'error';

interface UpdateProps {
  currentVersion: string;
}

export function Update({ currentVersion }: UpdateProps) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== 'checking') return;

    let cancelled = false;
    checkForUpdates(currentVersion).then((result) => {
      if (cancelled) return;
      setCheckResult(result);
      if (result.error) {
        setUpdateError(result.error.message);
        setPhase('error');
      } else if (result.hasUpdate) {
        setPhase('confirm');
      } else {
        setPhase('up-to-date');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [phase, currentVersion]);

  useInput((input, key) => {
    if (phase === 'confirm') {
      if (input === 'y' || input === 'Y' || key.return) {
        setPhase('updating');
      } else if (input === 'n' || input === 'N') {
        setPhase('up-to-date');
      }
    }
  });

  useEffect(() => {
    if (phase !== 'updating') return;

    let cancelled = false;
    applyUpdate().then((result) => {
      if (cancelled) return;
      if (result.success) {
        setPhase('complete');
      } else {
        setUpdateError(result.error?.message ?? 'Update could not be installed');
        setPhase('error');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [phase]);

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={colors.muted}>$ pilot update</Text>

      {phase === 'checking' && <Step label="Checking for updates..." status="active" />}

      {phase === 'up-to-date' && (
        <>
          <Step label="Version check complete" status="done" />
          <Box marginTop={1}>
            <Text color={colors.success} bold>
              ✈ Flight systems are current
            </Text>
          </Box>
        </>
      )}

      {phase === 'confirm' && checkResult && (
        <>
          <Step label="New version available" status="done" />
          <Box marginTop={1} flexDirection="column" gap={1}>
            <Text color={colors.text}>A newer version of Pilot is available.</Text>
            <Text color={colors.text}>Apply update? [Y/n]</Text>
          </Box>
        </>
      )}

      {phase === 'updating' && (
        <>
          <Step label="Downloading update" status="active" />
          <ProgressBar progress={0.5} label="Installing..." />
        </>
      )}

      {phase === 'complete' && (
        <>
          <Step label="Update downloaded" status="done" />
          <Step label="Update installed" status="done" />
          <Box marginTop={1}>
            <Text color={colors.success} bold>
              ✈ Flight systems upgraded!
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={colors.muted}>Restart Pilot to use new features</Text>
          </Box>
        </>
      )}

      {phase === 'error' && (
        <>
          <Step label="Update failed" status="error" />
          <Box marginTop={1} flexDirection="column" gap={1}>
            <Text color={colors.error}>{updateError}</Text>
            <Text color={colors.muted}>Visit medalsocial.com/pilot for help</Text>
          </Box>
        </>
      )}
    </Box>
  );
}
