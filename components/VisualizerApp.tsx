'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import GenerateDialog from '@/components/GenerateDialog';
import InspectorPanel from '@/components/InspectorPanel';
import TransportControls from '@/components/TransportControls';
import VisualizationStage from '@/components/VisualizationStage';
import { explainSnapshot, generateAlgorithm } from '@/lib/gemini';
import { pyodideEngine } from '@/lib/pyodide-client';
import { algorithmPresets } from '@/lib/presets';
import { useVisualizerStore } from '@/lib/store';
import type {
  AlgorithmDefinition,
  GraphEdge,
  JsonValue,
  VisualState,
} from '@/lib/types';

export default function VisualizerApp() {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const algorithm = useVisualizerStore((state) => state.algorithm);
  const source = useVisualizerStore((state) => state.source);
  const inputText = useVisualizerStore((state) => state.inputText);
  const frames = useVisualizerStore((state) => state.frames);
  const frameIndex = useVisualizerStore((state) => state.frameIndex);
  const setSource = useVisualizerStore((state) => state.setSource);
  const setInputText = useVisualizerStore((state) => state.setInputText);
  const setAlgorithm = useVisualizerStore((state) => state.setAlgorithm);
  const setRuntime = useVisualizerStore((state) => state.setRuntime);
  const setExecution = useVisualizerStore((state) => state.setExecution);
  const updateFrameExplanation = useVisualizerStore(
    (state) => state.updateFrameExplanation,
  );
  const setPlaying = useVisualizerStore((state) => state.setPlaying);
  const runtimeStatus = useVisualizerStore((state) => state.runtimeStatus);
  const runtimeMessage = useVisualizerStore((state) => state.runtimeMessage);

  const currentFrame = frames[frameIndex];
  const preview = useMemo(() => getInputPreview(algorithm), [algorithm]);
  const isWorking =
    runtimeStatus === 'loading' || runtimeStatus === 'running';

  const statusLabel = useMemo(() => {
    if (runtimeStatus === 'idle') return 'Runtime cold';
    if (runtimeStatus === 'loading') return 'Loading Python';
    if (runtimeStatus === 'running') return 'Executing';
    if (runtimeStatus === 'ready') return 'Trace ready';
    return 'Runtime error';
  }, [runtimeStatus]);

  const runAlgorithm = useCallback(async () => {
    if (isWorking) return;
    setPlaying(false);

    let input: JsonValue;
    try {
      input = JSON.parse(inputText) as JsonValue;
    } catch {
      setRuntime('error', 'Input must be valid JSON');
      return;
    }

    setRuntime('loading', 'Preparing the Python worker');
    try {
      const result = await pyodideEngine.execute(
        source,
        input,
        (status, message) => setRuntime(status, message),
      );
      if (!result.frames.length) {
        setRuntime(
          'error',
          'Execution finished without frames. Add at least one emit() call.',
        );
        return;
      }
      setExecution(result);
    } catch (error) {
      setRuntime(
        'error',
        error instanceof Error ? error.message : 'Execution failed.',
      );
    }
  }, [
    inputText,
    setExecution,
    setPlaying,
    setRuntime,
    source,
    isWorking,
  ]);

  const handleGenerate = async (request: string) => {
    setAiBusy(true);
    setAiError('');
    try {
      const generated = await generateAlgorithm(apiKey, request);
      setAlgorithm(generated);
      setGenerateOpen(false);
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : 'Algorithm generation failed.',
      );
    } finally {
      setAiBusy(false);
    }
  };

  const handleExplain = async () => {
    if (!currentFrame || !apiKey.trim() || isExplaining) return;
    setIsExplaining(true);
    try {
      const explanation = await explainSnapshot(
        apiKey,
        algorithm,
        currentFrame,
      );
      updateFrameExplanation(frameIndex, explanation);
    } catch (error) {
      updateFrameExplanation(
        frameIndex,
        error instanceof Error
          ? `Explanation unavailable: ${error.message}`
          : 'Explanation unavailable.',
      );
    } finally {
      setIsExplaining(false);
    }
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void runAlgorithm();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [runAlgorithm]);

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
        <button
          className="button button-quiet"
          type="button"
          onClick={() => {
            setAiError('');
            setGenerateOpen(true);
          }}
        >
          Generate
          <span className="button-spark">✦</span>
        </button>
        <button
          className="button button-primary"
          type="button"
          onClick={() => void runAlgorithm()}
          disabled={isWorking}
        >
          {isWorking ? 'Running…' : 'Run algorithm'}
          <kbd>⌘ ↵</kbd>
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
          <div className="editor-frame">
            <CodeEditor
              value={source}
              activeLine={currentFrame?.line}
              onChange={setSource}
            />
          </div>
        </article>

        <article className="workspace-panel stage-panel">
          <div className="panel-header">
            <span>02 / Structure</span>
            <span>D3 viewport</span>
          </div>
          <VisualizationStage frame={currentFrame} preview={preview} />
        </article>

        <aside className="workspace-panel inspector-panel">
          <div className="panel-header">
            <span>03 / State</span>
            <span>Live</span>
          </div>
          <InspectorPanel
            algorithm={algorithm}
            frame={currentFrame}
            frameCount={frames.length}
            canExplain={Boolean(apiKey.trim())}
            isExplaining={isExplaining}
            onExplain={() => void handleExplain()}
          />
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

      <TransportControls />
      <GenerateDialog
        open={generateOpen}
        apiKey={apiKey}
        busy={aiBusy}
        error={aiError}
        onApiKeyChange={setApiKey}
        onClose={() => {
          if (!aiBusy) setGenerateOpen(false);
        }}
        onGenerate={(request) => void handleGenerate(request)}
      />
    </main>
  );
}

function getInputPreview(
  algorithm: AlgorithmDefinition,
): VisualState | undefined {
  if (!isRecord(algorithm.input)) return undefined;

  if (
    algorithm.family === 'array' &&
    Array.isArray(algorithm.input.values) &&
    algorithm.input.values.every((value) => typeof value === 'number')
  ) {
    return {
      kind: 'array',
      values: algorithm.input.values,
    };
  }

  if (
    algorithm.family === 'graph' &&
    Array.isArray(algorithm.input.nodes) &&
    Array.isArray(algorithm.input.edges)
  ) {
    const nodes = algorithm.input.nodes
      .filter((node): node is string => typeof node === 'string')
      .map((id) => ({ id, status: 'idle' as const }));
    const edges: GraphEdge[] = algorithm.input.edges.flatMap((edge) => {
      if (
        !Array.isArray(edge) ||
        typeof edge[0] !== 'string' ||
        typeof edge[1] !== 'string'
      ) {
        return [];
      }
      return [
        {
          source: edge[0],
          target: edge[1],
          weight: typeof edge[2] === 'number' ? edge[2] : undefined,
        },
      ];
    });
    return { kind: 'graph', nodes, edges };
  }

  return undefined;
}

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
