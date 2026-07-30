'use client';

import { useMemo, useState } from 'react';
import { algorithmPresets } from '@/lib/presets';
import { useVisualizerStore } from '@/lib/store';

export default function VisualizerApp() {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const algorithm = useVisualizerStore((state) => state.algorithm);
  const inputText = useVisualizerStore((state) => state.inputText);
  const setInputText = useVisualizerStore((state) => state.setInputText);
  const setAlgorithm = useVisualizerStore((state) => state.setAlgorithm);
  const runtimeStatus = useVisualizerStore((state) => state.runtimeStatus);
  const runtimeMessage = useVisualizerStore((state) => state.runtimeMessage);

  const statusLabel = useMemo(() => {
    if (runtimeStatus === 'idle') return 'Runtime cold';
    if (runtimeStatus === 'loading') return 'Loading Python';
    if (runtimeStatus === 'running') return 'Executing';
    if (runtimeStatus === 'ready') return 'Trace ready';
    return 'Runtime error';
  }, [runtimeStatus]);

  return (
    <main className="studio-shell">
      <header className="topbar">
        <button
          className="brand-lockup"
          type="button"
          onClick={() => setLibraryOpen((open) => !open)}
          aria-expanded={libraryOpen}
        >
          <span className="brand-mark">A∴</span>
          <span>
            <strong>Algorithm Studio</strong>
            <small>Code → state → structure</small>
          </span>
        </button>

        <div className="algorithm-heading">
          <span className="eyebrow">{algorithm.family} / python</span>
          <strong>{algorithm.name}</strong>
        </div>

        <div className="runtime-cluster" aria-live="polite">
          <span className={`runtime-dot runtime-dot-${runtimeStatus}`} />
          <span>
            <strong>{statusLabel}</strong>
            <small>{runtimeMessage}</small>
          </span>
        </div>

        <button
          className="button button-quiet"
          type="button"
          onClick={() => setLibraryOpen((open) => !open)}
        >
          Examples
        </button>
        <button className="button button-primary" type="button">
          Run algorithm
        </button>
      </header>

      {libraryOpen && (
        <section className="library-popover" aria-label="Algorithm library">
          <p className="eyebrow">Algorithm library</p>
          <div className="library-list">
            {algorithmPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={preset.id === algorithm.id ? 'is-selected' : ''}
                onClick={() => {
                  setAlgorithm(preset);
                  setLibraryOpen(false);
                }}
              >
                <span>
                  <strong>{preset.name}</strong>
                  <small>{preset.summary}</small>
                </span>
                <span className="complexity">
                  {preset.complexity.time} / {preset.complexity.space}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="workspace-grid">
        <article className="workspace-panel editor-panel">
          <div className="panel-header">
            <span>01 / Source</span>
            <span>Python 3.13 · WASM</span>
          </div>
          <div className="editor-placeholder">
            <div className="line-numbers" aria-hidden="true">
              {Array.from({ length: 18 }, (_, index) => (
                <span key={index}>{index + 1}</span>
              ))}
            </div>
            <pre>{algorithm.source}</pre>
          </div>
        </article>

        <article className="workspace-panel stage-panel">
          <div className="panel-header">
            <span>02 / Structure</span>
            <span>D3 viewport</span>
          </div>
          <div className="stage-placeholder">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="stage-copy">
              <span className="stage-index">00</span>
              <p>Run the algorithm to assemble its execution trace.</p>
              <small>
                Every emitted snapshot becomes a reversible frame.
              </small>
            </div>
          </div>
        </article>

        <aside className="workspace-panel inspector-panel">
          <div className="panel-header">
            <span>03 / State</span>
            <span>Live</span>
          </div>
          <div className="inspector-content">
            <div>
              <p className="eyebrow">Current operation</p>
              <h2>Awaiting execution</h2>
              <p>
                The worker will capture variables and visual state every time
                the algorithm calls <code>emit()</code>.
              </p>
            </div>
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
                <dd>—</dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>

      <section className="input-drawer">
        <div className="panel-header">
          <span>Input / JSON</span>
          <span>Editable</span>
        </div>
        <textarea
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          aria-label="Algorithm input as JSON"
          spellCheck={false}
        />
      </section>

      <footer className="transport-shell">
        <div className="transport-controls">
          <button type="button" aria-label="Return to first frame">
            ↤
          </button>
          <button type="button" aria-label="Previous frame">
            ←
          </button>
          <button className="transport-play" type="button" aria-label="Play">
            ▶
          </button>
          <button type="button" aria-label="Next frame">
            →
          </button>
          <span>00 / 00</span>
        </div>
        <div className="timeline-track" aria-hidden="true">
          <span />
        </div>
        <div className="technology-line">
          <span>Next.js</span>
          <span>Monaco</span>
          <span>Pyodide</span>
          <span>Zustand</span>
          <span>D3</span>
          <span>Gemini</span>
        </div>
      </footer>
    </main>
  );
}
