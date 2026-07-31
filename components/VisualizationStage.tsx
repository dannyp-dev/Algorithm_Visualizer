'use client';

import { useMemo } from 'react';
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  max,
  scaleLinear,
  scalePoint,
} from 'd3';
import type {
  GraphNode,
  GraphVisual,
  GridVisual,
  NodeStatus,
  TraceFrame,
  TreeNode,
  TreeVisual,
  VisualState,
} from '@/lib/types';

interface VisualizationStageProps {
  frame?: TraceFrame;
  preview?: VisualState;
}

const statusColors: Record<NodeStatus, string> = {
  idle: '#626773',
  queued: '#7a9cff',
  active: '#f2bd68',
  visited: '#9b7cff',
  complete: '#68dda8',
  rejected: '#fa7881',
};

export default function VisualizationStage({
  frame,
  preview,
}: VisualizationStageProps) {
  const visual = frame?.visual || preview;

  if (!visual) {
    return (
      <div className="stage-placeholder">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="stage-copy">
          <span className="stage-index">00</span>
          <p>Run the algorithm to assemble its execution trace.</p>
          <small>Every emitted snapshot becomes a reversible frame.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="visual-stage">
      <div className="visual-stage-meta">
        <span>{visual.kind}</span>
        <span>{frame ? `snapshot ${frame.step + 1}` : 'input preview'}</span>
      </div>
      {visual.kind === 'array' && <ArrayRenderer visual={visual} />}
      {visual.kind === 'graph' && <GraphRenderer visual={visual} />}
      {visual.kind === 'tree' && <TreeRenderer visual={visual} />}
      {visual.kind === 'grid' && <GridRenderer visual={visual} />}
    </div>
  );
}

function ArrayRenderer({
  visual,
}: {
  visual: Extract<VisualState, { kind: 'array' }>;
}) {
  const width = 680;
  const height = 350;
  const top = 54;
  const bottom = 52;
  const chartHeight = height - top - bottom;
  const maxValue = max(visual.values.map((value) => Math.abs(value))) || 1;
  const heightScale = scaleLinear()
    .domain([0, maxValue])
    .range([12, chartHeight]);
  const gap = Math.min(12, width / Math.max(visual.values.length * 4, 1));
  const barWidth = Math.max(
    15,
    (width - gap * (visual.values.length + 1)) /
      Math.max(visual.values.length, 1),
  );

  const stateFor = (index: number) => {
    if (visual.active?.includes(index)) return 'active';
    if (visual.comparing?.includes(index)) return 'queued';
    if (visual.settled?.includes(index)) return 'complete';
    if (visual.pivot === index) return 'visited';
    return 'idle';
  };

  return (
    <svg
      className="data-visualization array-visualization"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Array values: ${visual.values.join(', ')}`}
    >
      <line
        className="visual-axis"
        x1="0"
        y1={height - bottom}
        x2={width}
        y2={height - bottom}
      />
      {visual.values.map((value, index) => {
        const barHeight = heightScale(Math.abs(value));
        const x = gap + index * (barWidth + gap);
        const y = height - bottom - barHeight;
        const status = stateFor(index);
        const color = statusColors[status];

        return (
          <g key={`${index}-${value}`} className={`array-item state-${status}`}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="5"
              fill={color}
              fillOpacity={status === 'idle' ? 0.42 : 0.82}
            />
            <text
              x={x + barWidth / 2}
              y={y - 10}
              textAnchor="middle"
              className="visual-value"
            >
              {value}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - bottom + 22}
              textAnchor="middle"
              className="visual-index"
            >
              {index}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
}

interface PositionedEdge {
  source: string | PositionedNode;
  target: string | PositionedNode;
  weight?: number;
  status?: NodeStatus;
  index?: number;
}

function GraphRenderer({ visual }: { visual: GraphVisual }) {
  const width = 680;
  const height = 380;

  const layout = useMemo(() => {
    const nodes: PositionedNode[] = visual.nodes.map((node, index) => {
      const angle = (index / Math.max(visual.nodes.length, 1)) * Math.PI * 2;
      return {
        ...node,
        x: node.x ?? width / 2 + Math.cos(angle) * 130,
        y: node.y ?? height / 2 + Math.sin(angle) * 130,
      };
    });
    const edges: PositionedEdge[] = visual.edges.map((edge) => ({ ...edge }));

    const simulation = forceSimulation<PositionedNode>(nodes)
      .force(
        'link',
        forceLink<PositionedNode, PositionedEdge>(edges)
          .id((node) => node.id)
          .distance((edge) => 115 + (edge.weight || 0) * 2)
          .strength(0.65),
      )
      .force('charge', forceManyBody().strength(-310))
      .force('center', forceCenter(width / 2, height / 2))
      .stop();

    for (let iteration = 0; iteration < 100; iteration += 1) {
      simulation.tick();
    }
    simulation.stop();

    return { nodes, edges };
  }, [visual]);

  const resolveNode = (node: string | PositionedNode) =>
    typeof node === 'string'
      ? layout.nodes.find((candidate) => candidate.id === node)
      : node;

  return (
    <svg
      className="data-visualization graph-visualization"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Graph with ${visual.nodes.length} nodes and ${visual.edges.length} edges`}
    >
      {layout.edges.map((edge, index) => {
        const source = resolveNode(edge.source);
        const target = resolveNode(edge.target);
        if (!source || !target) return null;
        const active =
          source.status === 'active' || target.status === 'active';

        return (
          <g key={`${source.id}-${target.id}-${index}`}>
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              className={active ? 'graph-edge is-active' : 'graph-edge'}
            />
            {edge.weight !== undefined && (
              <text
                x={(source.x + target.x) / 2}
                y={(source.y + target.y) / 2 - 6}
                textAnchor="middle"
                className="edge-weight"
              >
                {edge.weight}
              </text>
            )}
          </g>
        );
      })}
      {layout.nodes.map((node) => {
        const status = node.status || 'idle';
        const color = statusColors[status];
        return (
          <g
            key={node.id}
            className={`graph-node state-${status}`}
            transform={`translate(${node.x} ${node.y})`}
          >
            <circle r="25" fill={color} fillOpacity="0.11" stroke={color} />
            <circle r="3" fill={color} />
            <text y="-34" textAnchor="middle" className="node-label">
              {node.label || node.id}
            </text>
            {node.value !== undefined && node.value !== null && (
              <text y="43" textAnchor="middle" className="node-value">
                {node.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface PositionedTreeNode extends TreeNode {
  x: number;
  y: number;
}

function TreeRenderer({ visual }: { visual: TreeVisual }) {
  const width = 680;
  const height = 380;

  const nodes = useMemo(() => {
    const withDepth = visual.nodes.map((node) => ({
      ...node,
      depth: resolveDepth(node, visual.nodes),
    }));
    const depthGroups = new Map<number, typeof withDepth>();
    withDepth.forEach((node) => {
      const group = depthGroups.get(node.depth) || [];
      group.push(node);
      depthGroups.set(node.depth, group);
    });

    const positioned: PositionedTreeNode[] = [];
    depthGroups.forEach((group, depth) => {
      const xScale = scalePoint<string>()
        .domain(group.map((node) => node.id))
        .range([60, width - 60])
        .padding(0.5);
      group
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .forEach((node) => {
          positioned.push({
            ...node,
            x: xScale(node.id) || width / 2,
            y: 58 + depth * 92,
          });
        });
    });
    return positioned;
  }, [visual.nodes]);

  return (
    <svg
      className="data-visualization tree-visualization"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Tree with ${visual.nodes.length} nodes`}
    >
      {nodes.map((node) => {
        const parent = nodes.find((candidate) => candidate.id === node.parentId);
        if (!parent) return null;
        return (
          <line
            key={`${parent.id}-${node.id}`}
            x1={parent.x}
            y1={parent.y}
            x2={node.x}
            y2={node.y}
            className="graph-edge"
          />
        );
      })}
      {nodes.map((node) => {
        const status = node.status || 'idle';
        const color = statusColors[status];
        return (
          <g
            key={node.id}
            transform={`translate(${node.x} ${node.y})`}
            className={`tree-node state-${status}`}
          >
            <circle r="24" fill={color} fillOpacity="0.12" stroke={color} />
            <text textAnchor="middle" dominantBaseline="central">
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function resolveDepth(node: TreeNode, nodes: TreeNode[], depth = 0): number {
  if (node.depth !== undefined) return node.depth;
  if (!node.parentId || depth > nodes.length) return 0;
  const parent = nodes.find((candidate) => candidate.id === node.parentId);
  return parent ? resolveDepth(parent, nodes, depth + 1) + 1 : 0;
}

function GridRenderer({ visual }: { visual: GridVisual }) {
  const active = new Set(
    (visual.activeCells || []).map(([row, column]) => `${row}-${column}`),
  );
  const settled = new Set(
    (visual.settledCells || []).map(([row, column]) => `${row}-${column}`),
  );

  return (
    <div
      className="grid-visualization"
      role="img"
      aria-label={`Grid with ${visual.cells.length} rows`}
    >
      {visual.columnLabels && (
        <div
          className="grid-row grid-label-row"
          style={{
            gridTemplateColumns: `repeat(${visual.columnLabels.length + 1}, minmax(42px, 1fr))`,
          }}
        >
          <span />
          {visual.columnLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
      {visual.cells.map((row, rowIndex) => (
        <div
          className="grid-row"
          key={rowIndex}
          style={{
            gridTemplateColumns: `repeat(${row.length + (visual.rowLabels ? 1 : 0)}, minmax(42px, 1fr))`,
          }}
        >
          {visual.rowLabels && (
            <span className="grid-row-label">
              {visual.rowLabels[rowIndex] || rowIndex}
            </span>
          )}
          {row.map((cell, columnIndex) => {
            const key = `${rowIndex}-${columnIndex}`;
            const token = String(cell ?? '—');
            const classes = ['grid-cell'];
            if (active.has(key)) classes.push('is-active');
            else if (settled.has(key)) classes.push('is-settled');
            if (token === '■') classes.push('is-wall');
            if (token === '○') classes.push('is-open');
            if (token === '◆') classes.push('is-path');
            if (token === 'S') classes.push('is-start');
            if (token === 'G') classes.push('is-goal');
            return (
              <span className={classes.join(' ')} key={key}>
                {token}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
