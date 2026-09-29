import { z } from 'zod';
import type {
  AlgorithmDefinition,
  TraceFrame,
} from './types';
import { jsonValueSchema } from './validation';
import { findMissingInputKeys } from './generation-contract';

const generatedAlgorithmSchema = z.object({
  name: z.string().min(2).max(72),
  summary: z.string().min(12).max(180),
  family: z.enum(['array', 'graph', 'tree', 'grid']),
  source: z
    .string()
    .min(80)
    .max(12_000)
    .refine(
      (source) => source.includes('def run(input_data, emit)'),
      'Python source must define run(input_data, emit)',
    ),
  input: jsonValueSchema,
  complexity: z.object({
    time: z.string().min(2).max(40),
    space: z.string().min(2).max(40),
  }),
});

const algorithmResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'summary', 'family', 'source', 'input', 'complexity'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 72 },
    summary: { type: 'string', minLength: 12, maxLength: 180 },
    family: {
      type: 'string',
      enum: ['array', 'graph', 'tree', 'grid'],
    },
    source: { type: 'string', minLength: 80, maxLength: 12_000 },
    input: {
      type: ['object', 'array'],
    },
    complexity: {
      type: 'object',
      additionalProperties: false,
      required: ['time', 'space'],
      properties: {
        time: { type: 'string', minLength: 2, maxLength: 40 },
        space: { type: 'string', minLength: 2, maxLength: 40 },
      },
    },
  },
};

const generationSystemInstruction = `You design executable algorithm visualizations for Algorithm Studio.

Return one Python algorithm definition that follows this exact contract:

def run(input_data, emit):
    # execute the real algorithm
    emit(line, label, variables, visual, explanation)

Rules:
- The source must be complete, deterministic Python.
- Use only Python built-ins or these modules: bisect, collections, copy, functools, heapq, itertools, json, math, random, statistics.
- Never access files, networks, the DOM, environment variables, subprocesses, sockets, or system modules.
- Treat source and sample input as one executable pair. Every literal input_data["key"] used by the source must exist in the returned input object.
- Never read input_data["grid"] unless the returned input actually contains a grid matrix. For coordinate-based grids, prefer rows, columns, walls, start, and goal consistently in both source and input.
- Emit before and after meaningful decisions so the trace explains the algorithm.
- Keep traces between roughly 8 and 180 frames for the supplied sample input.
- Keep the source compact enough to return as one complete JSON object.
- line is a real 1-based source line number.
- variables and visual must contain JSON-safe values only.
- explanation is one concise sentence grounded in the current values.
- Choose the closest visual family: arrays for sequences, trees for recursion, graphs for relationships or state transitions, and grids for matrices, tables, or boards.

Visual contracts:

array:
{"kind":"array","values":[number],"comparing":[index],"active":[index],"settled":[index],"pivot":index}

graph:
{"kind":"graph","nodes":[{"id":"A","label":"A","status":"idle|queued|active|visited|complete|rejected","value":number|string|null}],"edges":[{"source":"A","target":"B","weight":number,"status":"idle|queued|active|visited|complete|rejected"}]}

tree:
{"kind":"tree","nodes":[{"id":"n1","label":"8","parentId":null,"status":"idle|queued|active|visited|complete|rejected","depth":0,"order":0}]}

grid:
{"kind":"grid","cells":[[number|string|boolean|null]],"rowLabels":[""],"columnLabels":[""],"activeCells":[[row,column]],"settledCells":[[row,column]]}

Only include properties that make sense for the selected family. The sample input must match the source.`;

export async function generateAlgorithm(
  apiKey: string,
  request: string,
): Promise<AlgorithmDefinition> {
  return requestAlgorithmDefinition(
    apiKey,
    generationSystemInstruction,
    `Create a visualization-ready algorithm for this request:\n\n${request}`,
    0.18,
  );
}

export async function repairGeneratedAlgorithm(
  apiKey: string,
  request: string,
  candidate: AlgorithmDefinition,
  failure: string,
): Promise<AlgorithmDefinition> {
  return requestAlgorithmDefinition(
    apiKey,
    `${generationSystemInstruction}

You are repairing a candidate that failed an actual browser-side Python preflight.
Return a complete corrected definition, not a patch.
Keep the original intent, but make the source and sample input agree exactly.
The repaired program must emit at least one valid snapshot when run with the repaired input.`,
    JSON.stringify({
      originalRequest: request,
      preflightFailure: failure,
      candidate: {
        name: candidate.name,
        summary: candidate.summary,
        family: candidate.family,
        source: candidate.source,
        input: candidate.input,
        complexity: candidate.complexity,
      },
    }),
    0.08,
  );
}

export async function repairGeneratedInput(
  apiKey: string,
  request: string,
  candidate: AlgorithmDefinition,
  missingKeys: string[],
): Promise<AlgorithmDefinition> {
  const response = await callGemini(apiKey, {
    systemInstruction: {
      parts: [{ text: 'Fix only the sample JSON input for the supplied Python source. Return one JSON object with an input property. Keep existing useful fields, add every missing key, and use small deterministic values that make the algorithm executable. Do not return Python or Markdown.' }],
    },
    contents: [{
      role: 'user',
      parts: [{ text: JSON.stringify({
        request,
        source: candidate.source,
        currentInput: candidate.input,
        missingKeys,
      }) }],
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4_000,
      thinkingConfig: { thinkingLevel: 'low' },
      responseMimeType: 'application/json',
    },
  });

  const text = readCandidateText(response);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(text));
  } catch {
    throw new Error('Gemini could not return a valid sample input.');
  }
  const possibleInput = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'input' in parsed
    ? parsed.input
    : parsed;
  const validInput = jsonValueSchema.safeParse(possibleInput);
  if (!validInput.success) {
    throw new Error('Gemini returned invalid sample input.');
  }
  const corrected = { ...candidate, input: validInput.data };
  const stillMissing = findMissingInputKeys(corrected.source, corrected.input);
  if (stillMissing.length) {
    throw new Error(`Gemini's sample input still lacks ${stillMissing.join(', ')}.`);
  }
  return corrected;
}

class GeminiOutputError extends Error {}

async function requestAlgorithmDefinition(
  apiKey: string,
  systemInstruction: string,
  userText: string,
  temperature: number,
): Promise<AlgorithmDefinition> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await callGemini(apiKey, {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{
        role: 'user',
        parts: [{ text: attempt === 0 ? userText : `${userText}\n\nReturn a complete compact JSON object. Keep the Python source under 120 lines and include every required field. The previous response was incomplete or invalid.` }],
      }],
      generationConfig: {
        temperature: attempt === 0 ? temperature : 0.08,
        maxOutputTokens: attempt === 0 ? 16_000 : 24_000,
        thinkingConfig: { thinkingLevel: 'low' },
        responseMimeType: 'application/json',
        responseJsonSchema: algorithmResponseSchema,
      },
    });

    try {
      return parseGeneratedAlgorithm(response);
    } catch (error) {
      if (!(error instanceof GeminiOutputError)) throw error;
      if (attempt === 1) {
        throw new Error(`${error.message} The response was still invalid after one regeneration.`);
      }
    }
  }
  throw new Error('Gemini could not return a complete algorithm.');
}

function parseGeneratedAlgorithm(response: unknown): AlgorithmDefinition {
  const text = readCandidateText(response);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(text));
  } catch {
    throw new GeminiOutputError('Gemini returned incomplete or malformed JSON.');
  }

  const result = generatedAlgorithmSchema.safeParse(parsed);
  if (!result.success) {
    throw new GeminiOutputError(
      `The generated algorithm did not satisfy the execution contract: ${result.error.issues[0]?.message || 'invalid response'}`,
    );
  }

  return {
    ...result.data,
    id: slugify(result.data.name),
    origin: 'generated',
  };
}

function stripJsonFence(text: string) {
  return text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
}

export async function explainSnapshot(
  apiKey: string,
  algorithm: AlgorithmDefinition,
  frame: TraceFrame,
): Promise<string> {
  const response = await callGemini(apiKey, {
    systemInstruction: {
      parts: [
        {
          text: 'You are a precise computer science tutor. Explain the selected execution snapshot in 2-4 concise sentences. Ground every claim in the supplied source line, variables, and visual state. Use plain text.',
        },
      ],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: JSON.stringify({
              algorithm: algorithm.name,
              complexity: algorithm.complexity,
              sourceLine: frame.line,
              operation: frame.label,
              variables: frame.variables,
              visual: frame.visual,
            }),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1_000,
      thinkingConfig: { thinkingLevel: 'low' },
    },
  });

  return readCandidateText(response).trim();
}

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'] as const;

class GeminiRequestError extends Error {
  constructor(
    readonly providerMessage: string,
    readonly status: number,
    readonly model: string,
  ) {
    super(`${providerMessage} (${model}, HTTP ${status})`);
  }
}

async function callGemini(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  if (!apiKey.trim()) {
    throw new Error('Add a Gemini session key to use AI features.');
  }

  const usesStaticHosting =
    process.env.NEXT_PUBLIC_STATIC_HOSTING === 'true';
  try {
    return await requestGemini(apiKey, payload, GEMINI_MODELS[0], usesStaticHosting);
  } catch (error) {
    if (!(error instanceof GeminiRequestError) || ![408, 429, 500, 502, 503, 504].includes(error.status)) {
      throw error;
    }
    // Retry a temporary provider failure once on another supported Flash model.
    await new Promise((resolve) => setTimeout(resolve, 750 + Math.random() * 500));
    try {
      return await requestGemini(apiKey, payload, GEMINI_MODELS[1], usesStaticHosting);
    } catch (fallbackError) {
      if (fallbackError instanceof GeminiRequestError) {
        throw new Error(
          `Gemini returned HTTP ${error.status} on ${error.model} and HTTP ${fallbackError.status} on ${fallbackError.model}. ${fallbackError.providerMessage}`,
        );
      }
      throw fallbackError;
    }
  }
}

async function requestGemini(
  apiKey: string,
  payload: Record<string, unknown>,
  model: (typeof GEMINI_MODELS)[number],
  usesStaticHosting: boolean,
): Promise<unknown> {
  const endpoint = usesStaticHosting
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    : '/api/gemini';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: usesStaticHosting
      ? {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey.trim(),
        }
      : {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey.trim()}`,
          'x-gemini-model': model,
        },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({
    error: `Gemini request failed (${response.status})`,
  }))) as {
    error?: string | { message?: string };
  };

  if (!response.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : data.error?.message || `Gemini request failed (${response.status})`;
    throw new GeminiRequestError(message, response.status, model);
  }

  return data;
}

function readCandidateText(payload: unknown) {
  const result = payload as {
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const finishReason = result.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    throw new GeminiOutputError('Gemini reached its output token limit before finishing the response.');
  }
  if (finishReason && finishReason !== 'STOP') {
    throw new Error(`Gemini stopped generating because of ${finishReason}.`);
  }
  const text = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('');

  if (!text) {
    throw new GeminiOutputError('Gemini returned an empty response.');
  }
  return text;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 58);
  return `${slug || 'generated-algorithm'}-${Date.now().toString(36)}`;
}
