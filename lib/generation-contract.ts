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

export function reconcileGeneratedInput(
  algorithm: AlgorithmDefinition,
  request: string,
): AlgorithmDefinition {
  const missing = findMissingInputKeys(algorithm.source, algorithm.input);
  if (!missing.length) return algorithm;

  if (Array.isArray(algorithm.input) && missing.length === 1) {
    return { ...algorithm, input: { [missing[0]]: algorithm.input } };
  }
  if (!isRecord(algorithm.input)) return algorithm;

  const input = { ...algorithm.input };
  if (missing.includes('values')) {
    const numericLists = Object.values(input).filter(
      (value): value is number[] =>
        Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'number'),
    );
    if (numericLists.length === 1) {
      input.values = numericLists[0];
    } else if (numericLists.length === 0 && /binary search tree|\bbst\b/i.test(request)) {
      input.values = [8, 3, 10, 1, 6, 14];
    }
  }

  return { ...algorithm, input };
}

function isRecord(value: JsonValue): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
