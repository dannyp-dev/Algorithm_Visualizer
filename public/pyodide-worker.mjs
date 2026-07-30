import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v314.0.3/full/pyodide.mjs';

const PYODIDE_URL =
  'https://cdn.jsdelivr.net/pyodide/v314.0.3/full/';
const MAX_FRAMES = 2_000;

let runtimePromise;

function getRuntime() {
  if (!runtimePromise) {
    self.postMessage({ type: 'status', status: 'loading' });
    runtimePromise = loadPyodide({ indexURL: PYODIDE_URL });
  }
  return runtimePromise;
}

self.onmessage = async (event) => {
  const { id, source, input } = event.data;

  try {
    const pyodide = await getRuntime();
    self.postMessage({ type: 'status', status: 'running', id });

    const inputJson = JSON.stringify(input);
    const python = `
import ast
import builtins
import copy
import json

SOURCE_CODE = ${JSON.stringify(source)}
INPUT_DATA = json.loads(${JSON.stringify(inputJson)})
MAX_FRAMES = ${MAX_FRAMES}

ALLOWED_MODULES = {
    "bisect", "collections", "copy", "functools", "heapq",
    "itertools", "json", "math", "random", "statistics"
}

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    root = name.split(".")[0]
    if root not in ALLOWED_MODULES:
        raise ImportError(f"Module '{root}' is not available in Algorithm Studio")
    return builtins.__import__(name, globals, locals, fromlist, level)

tree = ast.parse(SOURCE_CODE, filename="algorithm.py")
for node in ast.walk(tree):
    if isinstance(node, ast.Import):
        for alias in node.names:
            if alias.name.split(".")[0] not in ALLOWED_MODULES:
                raise ImportError(f"Module '{alias.name}' is not available in Algorithm Studio")
    if isinstance(node, ast.ImportFrom):
        root = (node.module or "").split(".")[0]
        if root not in ALLOWED_MODULES:
            raise ImportError(f"Module '{root}' is not available in Algorithm Studio")

SAFE_BUILTINS = {
    "__build_class__": builtins.__build_class__,
    "__import__": safe_import,
    "abs": abs, "all": all, "any": any, "bool": bool,
    "dict": dict, "enumerate": enumerate, "Exception": Exception,
    "filter": filter, "float": float, "int": int, "isinstance": isinstance,
    "len": len, "list": list, "map": map, "max": max, "min": min,
    "next": next, "object": object, "pow": pow, "range": range,
    "reversed": reversed, "round": round, "set": set, "slice": slice,
    "sorted": sorted, "str": str, "sum": sum, "tuple": tuple,
    "ValueError": ValueError, "zip": zip
}

trace = []

def emit(line, label, variables, visual, explanation=""):
    if len(trace) >= MAX_FRAMES:
        raise RuntimeError(f"Execution exceeded the {MAX_FRAMES} frame limit")
    trace.append({
        "id": f"frame-{len(trace)}",
        "step": len(trace),
        "line": int(line),
        "label": str(label),
        "explanation": str(explanation or label),
        "variables": copy.deepcopy(variables or {}),
        "visual": copy.deepcopy(visual)
    })

namespace = {
    "__builtins__": SAFE_BUILTINS,
    "__name__": "algorithm",
}
exec(compile(tree, "algorithm.py", "exec"), namespace, namespace)
runner = namespace.get("run")
if not callable(runner):
    raise ValueError("Source must define run(input_data, emit)")

runner(INPUT_DATA, emit)
json.dumps(trace, ensure_ascii=False, allow_nan=False)
`;

    const result = await pyodide.runPythonAsync(python);
    self.postMessage({
      type: 'result',
      id,
      frames: JSON.parse(result),
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
