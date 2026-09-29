import { afterEach, describe, expect, it, vi } from 'vitest';
import { explainSnapshot } from './gemini';
import { algorithmPresets } from './presets';
import type { TraceFrame } from './types';

const frame: TraceFrame = {
  id: 'test-frame',
  step: 1,
  line: 2,
  label: 'Compare values',
  explanation: 'Compare the first two values.',
  variables: { left: 3, right: 5 },
  visual: { kind: 'array', values: [3, 5], comparing: [0, 1] },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Gemini requests', () => {
  it('uses another model after a temporary provider failure', async () => {
    vi.stubEnv('NEXT_PUBLIC_STATIC_HOSTING', 'true');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { message: 'The model is currently experiencing high demand.' },
      }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'These values are in order.' }] } }],
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(explainSnapshot('test-key', algorithmPresets[0], frame))
      .resolves.toBe('These values are in order.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('gemini-3.8-flash');
    expect(fetchMock.mock.calls[1][0]).toContain('gemini-3.5-flash');
  });

  it('does not retry a key or permission error', async () => {
    vi.stubEnv('NEXT_PUBLIC_STATIC_HOSTING', 'true');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'API key is invalid.' },
    }), { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(explainSnapshot('invalid-key', algorithmPresets[0], frame))
      .rejects.toThrow('API key is invalid.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
