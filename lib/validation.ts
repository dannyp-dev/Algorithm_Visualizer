import { z } from 'zod';
import type { JsonValue, TraceFrame } from '@/lib/types';

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

const nodeStatusSchema = z.enum([
  'idle',
  'queued',
  'active',
  'visited',
  'complete',
  'rejected',
]);

const arrayVisualSchema = z.object({
  kind: z.literal('array'),
  values: z.array(z.number().finite()).max(500),
  comparing: z.array(z.number().int().nonnegative()).optional(),
  active: z.array(z.number().int().nonnegative()).optional(),
  settled: z.array(z.number().int().nonnegative()).optional(),
  pivot: z.number().int().nonnegative().optional(),
});

const graphVisualSchema = z.object({
  kind: z.literal('graph'),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        label: z.string().max(80).optional(),
        status: nodeStatusSchema.optional(),
        value: z.union([z.string(), z.number().finite(), z.null()]).optional(),
        x: z.number().finite().optional(),
        y: z.number().finite().optional(),
      }),
    )
    .max(300),
  edges: z
    .array(
      z.object({
        source: z.string().min(1).max(80),
        target: z.string().min(1).max(80),
        weight: z.number().finite().optional(),
        status: nodeStatusSchema.optional(),
      }),
    )
    .max(1_000),
});

const treeVisualSchema = z.object({
  kind: z.literal('tree'),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        label: z.string().max(80),
        parentId: z.string().max(80).nullable().optional(),
        status: nodeStatusSchema.optional(),
        depth: z.number().int().nonnegative().optional(),
        order: z.number().int().optional(),
      }),
    )
    .max(500),
});

const primitiveSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const coordinateSchema = z.tuple([
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
]);

const gridVisualSchema = z.object({
  kind: z.literal('grid'),
  cells: z.array(z.array(primitiveSchema).max(120)).max(120),
  rowLabels: z.array(z.string().max(80)).optional(),
  columnLabels: z.array(z.string().max(80)).optional(),
  activeCells: z.array(coordinateSchema).optional(),
  settledCells: z.array(coordinateSchema).optional(),
});

export const traceFrameSchema = z.object({
  id: z.string().min(1).max(100),
  step: z.number().int().nonnegative(),
  line: z.number().int().positive(),
  label: z.string().min(1).max(180),
  explanation: z.string().max(1_000),
  variables: z.record(z.string(), jsonValueSchema),
  visual: z.discriminatedUnion('kind', [
    arrayVisualSchema,
    graphVisualSchema,
    treeVisualSchema,
    gridVisualSchema,
  ]),
});

const traceFramesSchema = z.array(traceFrameSchema).max(2_000);

export function parseTraceFrames(value: unknown): TraceFrame[] {
  const result = traceFramesSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const location = issue.path.length ? ` at ${issue.path.join('.')}` : '';
    throw new Error(`Invalid execution snapshot${location}: ${issue.message}`);
  }
  return result.data;
}
