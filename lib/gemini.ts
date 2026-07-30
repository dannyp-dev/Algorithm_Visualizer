import { z } from 'zod';
import type {
  AlgorithmDefinition,
  JsonValue,
  TraceFrame,
} from '@/lib/types';

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

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
- Emit before and after meaningful decisions so the trace explains the algorithm.
- Keep traces between roughly 8 and 180 frames for the supplied sample input.
- line is a real 1-based source line number.
- variables and visual must contain JSON-safe values only.
- explanation is one concise sentence grounded in the current values.

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
  const response = await callGemini(apiKey, {
    systemInstruction: {
      parts: [{ text: generationSystemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Create a visualization-ready algorithm for this request:\n\n${request}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.18,
      maxOutputTokens: 12_000,
      responseMimeType: 'application/json',
      responseJsonSchema: algorithmResponseSchema,
    },
  });

  const text = readCandidateText(response);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned malformed JSON. Try the request again.');
  }

  const result = generatedAlgorithmSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `The generated algorithm did not satisfy the execution contract: ${result.error.issues[0]?.message || 'invalid response'}`,
    );
  }

  return {
    ...result.data,
    id: slugify(result.data.name),
    origin: 'generated',
  };
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
      maxOutputTokens: 420,
    },
  });

  return readCandidateText(response).trim();
}

async function callGemini(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  if (!apiKey.trim()) {
    throw new Error('Add a Gemini session key to use AI features.');
  }

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    error?: string | { message?: string };
  };

  if (!response.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : data.error?.message || `Gemini request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
}

function readCandidateText(payload: unknown) {
  const result = payload as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('');

  if (!text) {
    throw new Error('Gemini returned an empty response.');
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
