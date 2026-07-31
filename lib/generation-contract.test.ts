import { describe, expect, it } from 'vitest';
import { algorithmPresets } from './presets';
import {
  assertGeneratedInputContract,
  findMissingInputKeys,
} from './generation-contract';

describe('generated input contract', () => {
  it('identifies the grid mismatch that caused the A* runtime error', () => {
    expect(
      findMissingInputKeys(
        'def run(input_data, emit):\n    grid = input_data["grid"]',
        { rows: 7, columns: 7, walls: [] },
      ),
    ).toEqual(['grid']);
  });

  it('accepts every built-in preset as an executable source/input pair', () => {
    algorithmPresets.forEach((preset) => {
      expect(() => assertGeneratedInputContract(preset)).not.toThrow();
    });
  });
});
