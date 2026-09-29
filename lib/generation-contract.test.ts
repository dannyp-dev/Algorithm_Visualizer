import { describe, expect, it } from 'vitest';
import { algorithmPresets } from './presets';
import {
  assertGeneratedInputContract,
  findMissingInputKeys,
  reconcileGeneratedInput,
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

  it('uses a supplied numeric list for a missing values field', () => {
    const candidate = {
      ...algorithmPresets[0],
      source: 'def run(input_data, emit):\n    values = input_data["values"]',
      input: { insertions: [8, 3, 10] },
    };
    expect(reconcileGeneratedInput(candidate, 'Binary search tree insertion').input)
      .toEqual({ insertions: [8, 3, 10], values: [8, 3, 10] });
  });

  it('provides a BST sample list when Gemini omits values entirely', () => {
    const candidate = {
      ...algorithmPresets[0],
      source: 'def run(input_data, emit):\n    values = input_data["values"]',
      input: {},
    };
    expect(reconcileGeneratedInput(candidate, 'Binary search tree insertion.').input)
      .toEqual({ values: [8, 3, 10, 1, 6, 14] });
  });
});
