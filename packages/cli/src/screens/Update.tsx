import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { Step } from '../components/Step.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { colors } from '../colors.js';

type Phase = 'checking' | 'confirm' | 'updating' | 'complete';

const UPDATES = [
  'New crew skills available',
  'Plugin updates ready',
  'Performance improvements',
];

const STEPS = [
  'Crew skills refreshed',
  'Plugin updates applied',
  'Performance optimized',
  'Configuration finalized',
];

const WHATS_NEW = [
  'Your crew can now schedule Instagram Reels',
  'Brand voice is 40% more consistent',
  'Sanity plugin: live preview for document editing',
];

export function Update() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (phase === 'checking') {
      const t = setTimeout(() => setPhase('confirm'), 1500);
      return () => clearTimeout(t);
    }
    if (phase === 'updating') {
      const interval = setInterval(() => {
        setActiveStep((s) => {
          if (s >= STEPS.length - 1) {
            clearInterval(interval);
            setTimeout(() => setPhase('complete'), 500);
            return s;
          }
          return s + 1;
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [phase]);

  return (
    <Box flexDirection="column" padding={2} gap={1}>
      <Text color={colors.muted}>$ pilot update</Text>

      {phase === 'checking' && (
        <Text color={colors.warning}>⠸ Checking for updates...</Text>
      )}

      {phase === 'confirm' && (
        <>
          <Text bold color={colors.text}>Updates found:</Text>
          {UPDATES.map((u) => (
            <Text key={u} color={colors.success}>  ● {u}</Text>
          ))}
          <Box marginTop={1}>
            <Text color={colors.text}>Apply updates? [Y/n]</Text>
          </Box>
        </>
      )}

      {phase === 'updating' && (
        <>
          <Text bold color={colors.text}>Upgrading your Pilot...</Text>
          {STEPS.map((step, i) => (
            <Step
              key={step}
              label={step}
              status={i < activeStep ? 'done' : i === activeStep ? 'active' : 'waiting'}
            />
          ))}
          <ProgressBar
            progress={(activeStep + 1) / STEPS.length}
            label="Almost ready..."
          />
        </>
      )}

      {phase === 'complete' && (
        <>
          {STEPS.map((step) => (
            <Step key={step} label={step} status="done" />
          ))}
          <Box marginTop={1}>
            <Text color={colors.success} bold>✈ Flight systems upgraded!</Text>
          </Box>
          <Box
            flexDirection="column"
            borderStyle="single"
            borderColor={colors.border}
            paddingX={1}
            marginTop={1}
          >
            <Text color={colors.primary} bold>WHAT'S NEW FOR YOU</Text>
            {WHATS_NEW.map((item) => (
              <Text key={item} color={colors.text}>· {item}</Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color={colors.muted}>Run pilot to start using new features</Text>
          </Box>
        </>
      )}
    </Box>
  );
}
