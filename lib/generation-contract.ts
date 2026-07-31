import type { AlgorithmDefinition, JsonValue } from '@/lib/types';

const literalInputAccess = /input_data\s*\[\s*["']([^"']+)["']\s*\]/g;

export function findMissingInputKeys(
  source: string,
  input: JsonValue,
): string[] {
  const keys = new Set(
    Array.from(source.matchAll(literalInputAccess), (match) => match[1]),
  );
  if (!isRecord(input)) return [...keys];
  return [...keys].filter((key) => !(key in input));
}

export function assertGeneratedInputContract(
  algorithm: AlgorithmDefinition,
): void {
  const missing = findMissingInputKeys(algorithm.source, algorithm.input);
  if (!missing.length) return;

  const fields = missing.map((key) => `"${key}"`).join(', ');
  throw new Error(
    `Generated source expects missing input field${missing.length === 1 ? '' : 's'} ${fields}.`,
  );
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
