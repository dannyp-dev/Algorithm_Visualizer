'use client';

import type { AlgorithmDefinition, TraceFrame } from '@/lib/types';

interface InspectorPanelProps {
  algorithm: AlgorithmDefinition;
  frame?: TraceFrame;
  frameCount: number;
  canExplain: boolean;
  isExplaining: boolean;
  onExplain: () => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  explanationError: string;
}

export default function InspectorPanel({
  algorithm,
  frame,
  frameCount,
  canExplain,
  isExplaining,
  onExplain,
  apiKey,
  onApiKeyChange,
  explanationError,
}: InspectorPanelProps) {
  return (
    <div className="inspector-content">
      <div>
        <p className="eyebrow">Current operation</p>
        <h2>{frame?.label || 'Awaiting execution'}</h2>
        <p className="step-explanation">
          {frame?.explanation ||
            'Run the algorithm to watch each decision, then use the timeline to move at your own pace.'}
        </p>
        {frame && (
          <div className="explain-card">
            <div className="explain-card-heading"><span>✦</span><strong>Go deeper on this step</strong></div>
            <p>Generate an optional explanation for this exact moment. Each frame keeps its own answer.</p>
            {frame.aiExplanation ? <p className="ai-explanation">{frame.aiExplanation}</p> : (
              <>
                <label htmlFor="explanation-key">Gemini API key</label>
                <input id="explanation-key" type="password" value={apiKey} onChange={(event) => onApiKeyChange(event.target.value)} placeholder="Paste your key to enable explanations" autoComplete="off" />
                <button className="explain-button" type="button" onClick={onExplain} disabled={!canExplain || isExplaining}>
                  {isExplaining ? 'Explaining this step…' : 'Explain this step ✦'}
                </button>
                {explanationError && <p className="inline-error" role="alert">{explanationError}</p>}
              </>
            )}
          </div>
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
