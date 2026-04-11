import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import { Training } from './Training.js';

const delay = (ms = 100) => new Promise((r) => setTimeout(r, ms));

describe('Training', () => {
  it('shows Training header', () => {
    const { lastFrame } = render(<Training />);
    expect(lastFrame()).toContain('Training');
  });

  it('shows source tabs', () => {
    const { lastFrame } = render(<Training />);
    expect(lastFrame()).toContain('Sources');
    expect(lastFrame()).toContain('Articles');
    expect(lastFrame()).toContain('Runs');
  });

  it('shows sources on default tab', () => {
    const { lastFrame } = render(<Training />);
    expect(lastFrame()).toContain('Sanity CMS');
    expect(lastFrame()).toContain('Slack');
    expect(lastFrame()).toContain('Manual articles');
  });

  it('switches to Articles tab with number key', async () => {
    const { lastFrame, stdin } = render(<Training />);
    await delay();
    stdin.write('2');
    await delay();
    expect(lastFrame()).toContain('No articles yet');
  });

  it('switches to Runs tab with number key', async () => {
    const { lastFrame, stdin } = render(<Training />);
    await delay();
    stdin.write('3');
    await delay();
    expect(lastFrame()).toContain('No training runs yet');
  });
});
