import { afterEach, describe, expect, it, vi } from 'vitest';
import { explainSnapshot, generateAlgorithm, repairGeneratedInput } from './gemini';
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
    expect(fetchMock.mock.calls[1][0]).toContain('gemini-3.1-flash-lite');
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

  it('reports both model failures when the provider stays unavailable', async () => {
    vi.stubEnv('NEXT_PUBLIC_STATIC_HOSTING', 'true');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'This model is currently experiencing high demand.' },
    }), { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(explainSnapshot('test-key', algorithmPresets[0], frame))
      .rejects.toThrow('HTTP 503 on gemini-3.8-flash and HTTP 503 on gemini-3.1-flash-lite');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('regenerates an algorithm when the first JSON response is cut off', async () => {
    vi.stubEnv('NEXT_PUBLIC_STATIC_HOSTING', 'true');
    const definition = {
      name: 'Test Sort',
      summary: 'A small test algorithm that emits one array snapshot.',
      family: 'array',
      source: 'def run(input_data, emit):\n    values = list(input_data["values"])\n    emit(3, "Show values", {"n": len(values)}, {"kind": "array", "values": values})',
      input: { values: [3, 1] },
      complexity: { time: 'O(n)', space: 'O(n)' },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"name":' }] } }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(definition) }] } }],
      }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateAlgorithm('test-key', 'Show a simple sort'))
      .resolves.toMatchObject({ name: 'Test Sort', origin: 'generated' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstRequest = JSON.parse(fetchMock.mock.calls[0][1].body);
    const retryRequest = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(firstRequest.generationConfig.thinkingConfig.thinkingLevel).toBe('low');
    expect(retryRequest.generationConfig.maxOutputTokens).toBe(24_000);
  });

  it('reports a malformed response only after regeneration also fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_STATIC_HOSTING', 'true');
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"name":' }] } }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(generateAlgorithm('test-key', 'Binary search tree insertion'))
      .rejects.toThrow('incomplete or malformed JSON. The response was still invalid after one regeneration.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('accepts a focused sample input repair only when required keys are present', async () => {
    vi.stubEnv('NEXT_PUBLIC_STATIC_HOSTING', 'true');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ input: { values: [8, 3, 10] } }) }] } }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const candidate = {
      ...algorithmPresets[0],
      source: 'def run(input_data, emit):\n    values = input_data["values"]',
      input: {},
    };

    await expect(repairGeneratedInput('test-key', 'BST insertion', candidate, ['values']))
      .resolves.toMatchObject({ input: { values: [8, 3, 10] } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
