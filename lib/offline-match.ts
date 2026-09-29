import { algorithmPresets } from './presets';
import type { AlgorithmDefinition } from './types';

export function findOfflineExample(request: string): AlgorithmDefinition | undefined {
  const normalized = request.toLowerCase().replace(/[\s_-]+/g, ' ');
  const id = /\ba\s*\*|\ba star\b|\bastar\b/.test(normalized)
    ? 'a-star-grid-pathfinding'
    : /\bdijkstra\b/.test(normalized)
      ? 'dijkstra-shortest-path'
      : /\bbreadth first\b|\bbfs\b/.test(normalized)
        ? 'breadth-first-search'
        : /\bbubble sort\b/.test(normalized)
          ? 'bubble-sort'
          : undefined;
  return algorithmPresets.find((preset) => preset.id === id);
}
