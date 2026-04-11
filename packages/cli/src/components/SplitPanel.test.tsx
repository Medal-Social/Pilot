import { Text } from 'ink';
import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { SplitPanel } from './SplitPanel.js';

describe('SplitPanel', () => {
  it('renders sidebar and detail side by side', () => {
    const { lastFrame } = render(
      <SplitPanel sidebar={<Text>Sidebar</Text>} detail={<Text>Detail</Text>} />
    );
    expect(lastFrame()).toContain('Sidebar');
    expect(lastFrame()).toContain('Detail');
  });
});
