import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Step } from '../components/Step.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { colors } from '../colors.js';
import { checkForUpdates, applyUpdate } from '../update/checker.js';
import type { UpdateCheckResult } from '../update/checker.js';

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
        setUpdateError(result.error);
        setPhase('error');
      } else if (result.hasUpdate) {
        setPhase('confirm');
      } else {
        setPhase('up-to-date');
      }
    });

    return () => { cancelled = true; };
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

    const result = applyUpdate();
    if (result.success) {
      setPhase('complete');
    } else {
      setUpdateError(result.error ?? 'Update failed');
      setPhase('error');
    }
  }, [phase]);

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={colors.muted}>$ pilot update</Text>

      {phase === 'checking' && (
        <Step label="Checking for updates..." status="active" />
      )}

      {phase === 'up-to-date' && (
        <>
          <Step label="Version check complete" status="done" />
          <Box marginTop={1}>
            <Text color={colors.success} bold>
              ✈ Flight systems are current ({currentVersion})
            </Text>
          </Box>
        </>
      )}

      {phase === 'confirm' && checkResult && (
        <>
          <Step label="Update available" status="done" />
          <Box marginTop={1} flexDirection="column" gap={1}>
            <Text color={colors.text}>
              <Text bold>{checkResult.current}</Text>
              <Text color={colors.muted}> → </Text>
              <Text bold color={colors.success}>{checkResult.latest}</Text>
            </Text>
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

      {phase === 'complete' && checkResult && (
        <>
          <Step label="Update downloaded" status="done" />
          <Step label="Update installed" status="done" />
          <Box marginTop={1}>
            <Text color={colors.success} bold>
              ✈ Flight systems upgraded to {checkResult.latest}!
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text color={colors.muted}>Restart pilot to use new features</Text>
          </Box>
        </>
      )}

      {phase === 'error' && (
        <>
          <Step label="Update failed" status="error" />
          <Box marginTop={1} flexDirection="column" gap={1}>
            <Text color={colors.error}>{updateError}</Text>
            <Text color={colors.muted}>
              Try manually: npm install -g @medalsocial/pilot@latest
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
}
