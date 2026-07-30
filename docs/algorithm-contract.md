# Algorithm Contract

Algorithm Studio supports new algorithms through instrumentation rather than
algorithm-specific React components.

## Definition

An algorithm definition contains:

```ts
interface AlgorithmDefinition {
  id: string;
  name: string;
  summary: string;
  family: "array" | "graph" | "tree" | "grid";
  source: string;
  input: JsonValue;
  complexity: {
    time: string;
    space: string;
  };
  origin: "preset" | "generated";
}
```

The source must define:

```python
def run(input_data, emit):
    ...
```

## Emit

```python
emit(line, label, variables, visual, explanation="")
```

- `line`: positive 1-based source line
- `label`: short action description
- `variables`: JSON-safe values to inspect
- `visual`: one supported renderer state
- `explanation`: deterministic explanation for the frame

The runtime adds a stable ID and sequential step number.

## Array visual

```json
{
  "kind": "array",
  "values": [8, 3, 5],
  "comparing": [0, 1],
  "active": [],
  "settled": [2],
  "pivot": 1
}
```

All state lists are optional.

## Graph visual

```json
{
  "kind": "graph",
  "nodes": [
    { "id": "A", "status": "active", "value": 0 },
    { "id": "B", "status": "idle", "value": "∞" }
  ],
  "edges": [
    { "source": "A", "target": "B", "weight": 4 }
  ]
}
```

Supported statuses:

- `idle`
- `queued`
- `active`
- `visited`
- `complete`
- `rejected`

## Tree visual

```json
{
  "kind": "tree",
  "nodes": [
    {
      "id": "root",
      "label": "8",
      "parentId": null,
      "depth": 0,
      "order": 0,
      "status": "complete"
    }
  ]
}
```

`parentId` defines the edge. `depth` and `order` can guide a stable layout.

## Grid visual

```json
{
  "kind": "grid",
  "cells": [[0, 1], [1, 2]],
  "rowLabels": ["0", "1"],
  "columnLabels": ["0", "1"],
  "activeCells": [[1, 1]],
  "settledCells": [[0, 0]]
}
```

## When a new renderer is required

Add a new visual family only when the state cannot be expressed as an array,
graph, tree, or grid.

The extension process is:

1. Add the new shape to `VisualState`.
2. Add Zod validation.
3. Add one renderer adapter.
4. Add the shape to the Gemini output instructions and schema.
5. Add valid and invalid contract tests.

This keeps customization explicit and reviewable.
