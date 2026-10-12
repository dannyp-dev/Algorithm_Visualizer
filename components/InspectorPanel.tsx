'use client';

import { useState } from 'react';
import type { AlgorithmDefinition, TraceFrame } from '@/lib/types';

interface InspectorPanelProps {
  algorithm: AlgorithmDefinition;
  frame?: TraceFrame;
  frameCount: number;
  canExplain: boolean;
  isExplaining: boolean;
  isExplainingThisFrame: boolean;
  onExplain: () => void;
  onAskFollowUp: (question: string) => Promise<boolean>;
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
  isExplainingThisFrame,
  onExplain,
  onAskFollowUp,
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
            <p>Ask Gemini about this moment. Your questions stay with this step as you move through the timeline.</p>
            {frame.aiExplanation ? (
              <div className="step-conversation" aria-label="Questions about this step">
                <div className="step-conversation-message assistant-message">
                  <span className="message-speaker">Gemini</span>
                  <p>{frame.aiExplanation}</p>
                </div>
                {frame.aiFollowUps?.map(({ question, answer }, index) => (
                  <div className="step-conversation-turn" key={index}>
                    <div className="step-conversation-message user-message">
                      <span className="message-speaker">You</span>
                      <p>{question}</p>
                    </div>
                    <div className="step-conversation-message assistant-message">
                      <span className="message-speaker">Gemini</span>
                      <p>{answer}</p>
                    </div>
                  </div>
                ))}
                <FollowUpForm
                  key={frame.id}
                  onAskFollowUp={onAskFollowUp}
                  disabled={isExplaining || !canExplain}
                  busy={isExplainingThisFrame}
                />
                {!canExplain && (
                  <>
                    <label htmlFor="explanation-key">Gemini API key</label>
                    <input id="explanation-key" type="password" value={apiKey} onChange={(event) => onApiKeyChange(event.target.value)} placeholder="Paste your key to keep asking" autoComplete="off" />
                  </>
                )}
                {explanationError && <p className="inline-error" role="alert">{explanationError}</p>}
              </div>
            ) : (
              <>
                <label htmlFor="explanation-key">Gemini API key</label>
                <input id="explanation-key" type="password" value={apiKey} onChange={(event) => onApiKeyChange(event.target.value)} placeholder="Paste your key to enable explanations" autoComplete="off" />
                <button className="explain-button" type="button" onClick={onExplain} disabled={!canExplain || isExplaining}>
                  {isExplainingThisFrame ? 'Explaining this step…' : 'Explain this step ✦'}
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

function FollowUpForm({
  onAskFollowUp,
  disabled,
  busy,
}: {
  onAskFollowUp: (question: string) => Promise<boolean>;
  disabled: boolean;
  busy: boolean;
}) {
  const [question, setQuestion] = useState('');

  return (
    <form className="follow-up-form" onSubmit={async (event) => {
      event.preventDefault();
      const trimmed = question.trim();
      if (!trimmed || disabled) return;
      if (await onAskFollowUp(trimmed)) setQuestion('');
    }}>
      <label htmlFor="step-follow-up">Ask a follow-up</label>
      <textarea
        id="step-follow-up"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Why did it choose this node?"
        maxLength={500}
        rows={3}
        disabled={disabled}
      />
      <button className="explain-button" type="submit" disabled={disabled || !question.trim()}>
        {busy ? 'Thinking…' : 'Ask Gemini ✦'}
      </button>
    </form>
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
