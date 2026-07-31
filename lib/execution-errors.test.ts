import { describe, expect, it } from 'vitest';
import { formatExecutionErrorMessage } from './execution-errors';

describe('formatExecutionErrorMessage', () => {
  it('turns a Python KeyError into an actionable input message', () => {
    expect(
      formatExecutionErrorMessage(
        'Traceback (most recent call last):\nKeyError: \'grid\'',
      ),
    ).toBe(
      'Input is missing the "grid" field. The algorithm source and sample input do not match.',
    );
  });

  it('preserves the useful final line for other Python errors', () => {
    expect(
      formatExecutionErrorMessage(
        'Traceback (most recent call last):\nValueError: Start is blocked',
      ),
    ).toBe('ValueError: Start is blocked');
  });
});
