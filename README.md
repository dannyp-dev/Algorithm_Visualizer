# Algorithm Studio

Algorithm Studio turns algorithm execution into a reversible visual timeline.
Write Python, run it in the browser, inspect each state transition, and move
forward or backward through arrays, graphs, trees, and grids.

The product is designed around one separation:

> The algorithm publishes meaningful state. The platform owns execution, time,
> visualization, and explanation.

## What works

- Edit Python in Monaco Editor
- Edit JSON input independently from source
- Execute Python in a Pyodide WebAssembly worker
- Capture immutable snapshots through a shared `emit()` contract
- Move to the first, previous, next, or any timeline frame
- Play and pause traces at four speeds
- Keep source lines, visual state, variables, and explanations synchronized
- Render arrays, graphs, trees, and grids with D3 geometry
- Generate new trace-compatible algorithms with Gemini
- Ask Gemini to explain the exact selected snapshot
- Use Bubble Sort, BFS, and Dijkstra without an API key

## Résumé architecture

| Technology | Role |
| --- | --- |
| Next.js | Application structure, metadata, static production build |
| TypeScript | Algorithm, frame, and renderer contracts |
| Monaco Editor | Low-latency Python editing surface |
| Pyodide / WebAssembly | Browser-side CPython runtime |
| Web Worker | Keeps Python execution off the interface thread |
| Zustand | Reversible snapshot and playback state |
| D3 | Scales, graph layout, and visual geometry |
| Gemini API | Algorithm generation and context-aware explanation |
| Zod | Validates model output and execution traces |

## Data flow

```text
Python source + JSON input
          |
          v
  Pyodide Web Worker
          |
       emit(...)
          |
          v
  validated snapshots
          |
          v
      Zustand store
      /     |      \
  Monaco   D3    Inspector
             \
            Timeline
```

Reverse execution is snapshot navigation. The engine runs forward once,
captures immutable states, and changes the selected frame index when the user
steps backward. It does not attempt to reverse arbitrary Python mutations.

## Local development

Requirements:

- Node.js 20.9 or newer
- npm
- Internet access the first time Pyodide loads

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

Before committing:

```bash
npm run check
```

The validation sequence runs:

1. ESLint
2. TypeScript
3. Vitest
4. Next.js production build

The current dependency audit reports zero known vulnerabilities.

## Add an algorithm manually

Every algorithm defines:

```python
def run(input_data, emit):
    # Execute real algorithm logic.
    emit(
        line=4,
        label="Compare adjacent values",
        variables={"left": 8, "right": 3},
        visual={
            "kind": "array",
            "values": [8, 3],
            "comparing": [0, 1]
        },
        explanation="Compare the pair before deciding whether to swap."
    )
```

`input_data` comes from the JSON input editor. `emit()` deep-copies JSON-safe
variables and one supported visual shape.

See [the complete algorithm contract](docs/algorithm-contract.md).

## Gemini key behavior

AI features use a visitor-supplied Gemini session key.

- The key is kept in React memory only.
- It is not stored in cookies, local storage, or session storage.
- It is never committed to source.
- It is sent to the same-origin worker, which forwards the request to Gemini.
- The worker does not log or persist the key.
- Presets, editing, execution, rendering, and playback work without Gemini.

For a future public launch using a shared application key, add authentication,
rate limits, usage monitoring, and a hosted secret before removing the
visitor-supplied-key model.

## Execution limits

The initial runtime applies:

- 12-second timeout
- 2,000-frame maximum
- 500-value maximum for an array frame
- 300 graph nodes
- 1,000 graph edges
- 120 × 120 grid maximum
- Standard-library import allowlist
- JSON-only input and snapshot boundary

Pyodide reduces capability and protects interface responsiveness, but it is not
presented as a hardened sandbox for hostile code.

## Project structure

```text
app/                       Next.js routes, metadata, design system
components/                Editor, renderers, inspector, transport, dialogs
lib/
  gemini.ts                Generation and explanation adapter
  presets.ts               Built-in instrumented algorithms
  pyodide-client.ts        Worker lifecycle and timeout boundary
  store.ts                 Reversible Zustand state
  types.ts                 Shared contracts
  validation.ts            Zod boundary validation
public/
  pyodide-worker.mjs       Restricted Python execution worker
server/
  worker.mjs               Static assets and Gemini proxy
legacy-prototype/          Preserved original proof of concept
docs/                      Maintainer-facing architecture notes
```

## Design intent

The interface is a dark computational studio: tool-like and precise, with the
same restrained blue-violet iridescence as Danny's portfolio. The desktop
layout follows the system itself:

1. Source
2. Structure
3. State
4. Input
5. Time

Color is reserved for active information. Motion explains transitions rather
than decorating the interface.
