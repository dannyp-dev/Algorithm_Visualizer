export type AlgorithmFamily = 'array' | 'graph' | 'tree' | 'grid';
export type RuntimeStatus = 'idle' | 'loading' | 'running' | 'ready' | 'error';
export type NodeStatus =
  | 'idle'
  | 'queued'
  | 'active'
  | 'visited'
  | 'complete'
  | 'rejected';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface ArrayVisual {
  kind: 'array';
  values: number[];
  comparing?: number[];
  active?: number[];
  settled?: number[];
  pivot?: number;
}

export interface GraphNode {
  id: string;
  label?: string;
  status?: NodeStatus;
  value?: number | string | null;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
  status?: NodeStatus;
}

export interface GraphVisual {
  kind: 'graph';
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TreeNode {
  id: string;
  label: string;
  parentId?: string | null;
  status?: NodeStatus;
  depth?: number;
  order?: number;
}

export interface TreeVisual {
  kind: 'tree';
  nodes: TreeNode[];
}

export interface GridVisual {
  kind: 'grid';
  cells: JsonPrimitive[][];
  rowLabels?: string[];
  columnLabels?: string[];
  activeCells?: [number, number][];
  settledCells?: [number, number][];
}

export type VisualState =
  | ArrayVisual
  | GraphVisual
  | TreeVisual
  | GridVisual;

export interface TraceFrame {
  id: string;
  step: number;
  line: number;
  label: string;
  explanation: string;
  aiExplanation?: string;
  variables: Record<string, JsonValue>;
  visual: VisualState;
}

export interface AlgorithmComplexity {
  time: string;
  space: string;
}

export interface AlgorithmDefinition {
  id: string;
  name: string;
  summary: string;
  family: AlgorithmFamily;
  source: string;
  input: JsonValue;
  complexity: AlgorithmComplexity;
  origin: 'preset' | 'generated';
}

export interface ExecutionResult {
  frames: TraceFrame[];
  durationMs: number;
}
