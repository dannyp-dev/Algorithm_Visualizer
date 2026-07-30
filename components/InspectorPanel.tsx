'use client';

import type { AlgorithmDefinition, TraceFrame } from '@/lib/types';

interface InspectorPanelProps {
  algorithm: AlgorithmDefinition;
  frame?: TraceFrame;
  frameCount: number;
  canExplain: boolean;
  isExplaining: boolean;
  onExplain: () => void;
}

export default function InspectorPanel({
  algorithm,
  frame,
  frameCount,
  canExplain,
  isExplaining,
  onExplain,
}: InspectorPanelProps) {
  return (
    <div className="inspector-content">
      <div>
        <p className="eyebrow">Current operation</p>
        <h2>{frame?.label || 'Awaiting execution'}</h2>
        <p>
          {frame?.explanation ||
            'Run the source to capture variables and visual state at every emit call.'}
        </p>
        {frame && (
          <button
            className="explain-button"
            type="button"
            onClick={onExplain}
            disabled={!canExplain || isExplaining}
          >
            <span>✦</span>
            {isExplaining
              ? 'Reading this snapshot…'
              : canExplain
                ? 'Explain this snapshot'
                : 'Add a Gemini key to explain'}
          </button>
        )}
      </div>

      {frame && (
        <div className="variable-stack">
          <p className="eyebrow">Variables</p>
          {Object.entries(frame.variables).length ? (
            Object.entries(frame.variables).map(([name, value]) => (
              <div className="variable-row" key={name}>
                <span>{name}</span>
                <code>{formatValue(value)}</code>
              </div>
            ))
          ) : (
            <p className="empty-state">No variables emitted in this frame.</p>
          )}
        </div>
      )}

      <dl>
        <div>
          <dt>Time</dt>
          <dd>{algorithm.complexity.time}</dd>
        </div>
        <div>
          <dt>Space</dt>
          <dd>{algorithm.complexity.space}</dd>
        </div>
        <div>
          <dt>Frames</dt>
          <dd>{frameCount || '—'}</dd>
        </div>
        <div>
          <dt>Line</dt>
          <dd>{frame?.line || '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

function formatValue(value: unknown) {
  const serialized =
    typeof value === 'string' ? value : JSON.stringify(value, null, 0);
  if (!serialized) return '—';
  return serialized.length > 72
    ? `${serialized.slice(0, 69)}…`
    : serialized;
}
