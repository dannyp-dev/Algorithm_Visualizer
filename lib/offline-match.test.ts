import { describe, expect, it } from 'vitest';
import { findOfflineExample } from './offline-match';

describe('offline example matching', () => {
  it('offers the A* example for the default generation request', () => {
    expect(findOfflineExample('A* pathfinding on a 7 × 7 grid with walls')?.id)
      .toBe('a-star-grid-pathfinding');
  });

  it('does not claim an unrelated sort is a built-in example', () => {
    expect(findOfflineExample('Merge sort on eight integers')).toBeUndefined();
  });
});
