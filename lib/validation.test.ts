import { describe, expect, it } from 'vitest';
import { parseTraceFrames } from './validation';

describe('parseTraceFrames', () => {
  it('accepts a valid reversible array snapshot', () => {
    const frames = parseTraceFrames([
      {
        id: 'frame-0',
        step: 0,
        line: 4,
        label: 'Compare adjacent values',
        explanation: 'Compare 8 and 3 before deciding whether to swap.',
        variables: { index: 0, left: 8, right: 3 },
        visual: {
          kind: 'array',
          values: [8, 3],
          comparing: [0, 1],
        },
      },
    ]);

    expect(frames).toHaveLength(1);
    expect(frames[0].visual.kind).toBe('array');
  });

  it('rejects a renderer shape outside the visual contract', () => {
    expect(() =>
      parseTraceFrames([
        {
          id: 'frame-0',
          step: 0,
          line: 1,
          label: 'Unknown state',
          explanation: '',
          variables: {},
          visual: { kind: 'particles', points: [] },
        },
      ]),
    ).toThrow(/Invalid execution snapshot/);
  });

  it('rejects non-finite values that cannot cross the JSON boundary', () => {
    expect(() =>
      parseTraceFrames([
        {
          id: 'frame-0',
          step: 0,
          line: 1,
          label: 'Invalid distance',
          explanation: '',
          variables: { distance: Number.POSITIVE_INFINITY },
          visual: { kind: 'array', values: [1] },
        },
      ]),
    ).toThrow(/Invalid execution snapshot/);
  });
});
