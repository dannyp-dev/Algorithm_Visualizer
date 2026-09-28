'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import GenerateDialog from '@/components/GenerateDialog';
import InspectorPanel from '@/components/InspectorPanel';
import TransportControls from '@/components/TransportControls';
import VisualizationStage from '@/components/VisualizationStage';
import {
  explainSnapshot,
  generateAlgorithm,
  repairGeneratedAlgorithm,
} from '@/lib/gemini';
import { assertGeneratedInputContract } from '@/lib/generation-contract';
import { pyodideEngine } from '@/lib/pyodide-client';
import { algorithmPresets } from '@/lib/presets';
import { useVisualizerStore } from '@/lib/store';
import type {
  AlgorithmDefinition,
  ExecutionResult,
  GraphEdge,
  JsonValue,
  RuntimeStatus,
  VisualState,
} from '@/lib/types';

export default function VisualizerApp() {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanationError, setExplanationError] = useState('');
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
  const preview = useMemo(() => {
    try {
      return getInputPreview({ ...algorithm, input: JSON.parse(inputText) as JsonValue });
    } catch {
      return undefined;
    }
  }, [algorithm, inputText]);
  const inputError = useMemo(() => {
    try { JSON.parse(inputText); return ''; }
    catch { return 'Input needs valid JSON before you can run it.'; }
  }, [inputText]);
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
      const latest = useVisualizerStore.getState();
      if (latest.source !== source || latest.inputText !== inputText) {
        setRuntime('idle', 'Code or input changed during the run. Run again.');
        return;
      }
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

  const randomizeInput = () => {
    if (algorithm.family !== 'array') return;
    const values = Array.from({ length: 9 }, () => Math.floor(Math.random() * 88) + 8);
    setInputText(JSON.stringify({ values }, null, 2));
  };

  const handleGenerate = async (request: string) => {
    setAiBusy(true);
    setAiError('');
    try {
      let generated = await generateAlgorithm(apiKey, request);
      let validation: ExecutionResult;

      try {
        validation = await preflightGeneratedAlgorithm(
          generated,
          setRuntime,
        );
      } catch (firstError) {
        const failure =
          firstError instanceof Error
            ? firstError.message
            : 'The generated algorithm failed its execution preflight.';
        setRuntime('loading', 'Repairing the generated source and input');
        generated = await repairGeneratedAlgorithm(
          apiKey,
          request,
          generated,
          failure,
        );
        validation = await preflightGeneratedAlgorithm(
          generated,
          setRuntime,
        );
      }

      setAlgorithm(generated);
      setExecution(validation);
      setGenerateOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Algorithm generation failed.';
      setRuntime('error', message);
      setAiError(
        `The generated algorithm could not pass its execution check after one repair attempt. ${message}`,
      );
    } finally {
      setAiBusy(false);
    }
  };

  const handleExplain = async () => {
    if (!currentFrame || !apiKey.trim() || isExplaining) return;
    const selectedIndex = frameIndex;
    const selectedFrame = currentFrame;
    setExplanationError('');
    setIsExplaining(true);
    try {
      const explanation = await explainSnapshot(
        apiKey,
        algorithm,
        selectedFrame,
      );
      if (useVisualizerStore.getState().frames[selectedIndex]?.id === selectedFrame.id) {
        updateFrameExplanation(selectedIndex, explanation);
      }
    } catch (error) {
      setExplanationError(error instanceof Error ? error.message : 'Explanation unavailable.');
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

      {runtimeStatus === 'error' && <div className="runtime-alert" role="alert"><strong>Run stopped</strong><span>{runtimeMessage}</span></div>}

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
            <span>Edit, then run</span>
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
            <span>{algorithm.summary}</span>
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
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
            explanationError={explanationError}
          />
        </aside>
      </section>

      <section className="input-drawer">
        <div className="panel-header">
          <span>Input / JSON</span>
          <div className="input-tools">
            <span className={inputError ? 'inline-error' : ''}>{inputError || 'Change values, then run again'}</span>
            {algorithm.family === 'array' && <button type="button" onClick={randomizeInput}>↻ New numbers</button>}
          </div>
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

async function preflightGeneratedAlgorithm(
  algorithm: AlgorithmDefinition,
  setRuntime: (
    status: RuntimeStatus,
    message?: string,
  ) => void,
): Promise<ExecutionResult> {
  assertGeneratedInputContract(algorithm);
  setRuntime('loading', 'Checking generated source against its sample input');
  const result = await pyodideEngine.execute(
    algorithm.source,
    algorithm.input,
    (status, message) => setRuntime(status, message),
  );
  if (!result.frames.length) {
    throw new Error(
      'Generated code ran without emitting any visualization snapshots.',
    );
  }
  return result;
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

  if (
    algorithm.family === 'grid' &&
    typeof algorithm.input.rows === 'number' &&
    Number.isInteger(algorithm.input.rows) &&
    algorithm.input.rows > 0 &&
    algorithm.input.rows <= 120 &&
    typeof algorithm.input.columns === 'number' &&
    Number.isInteger(algorithm.input.columns) &&
    algorithm.input.columns > 0 &&
    algorithm.input.columns <= 120
  ) {
    const rows = algorithm.input.rows;
    const columns = algorithm.input.columns;
    const walls = new Set(
      Array.isArray(algorithm.input.walls)
        ? algorithm.input.walls
            .map(toCoordinate)
            .filter((cell): cell is [number, number] => Boolean(cell))
            .map(([row, column]) => `${row}-${column}`)
        : [],
    );
    const start = toCoordinate(algorithm.input.start);
    const goal = toCoordinate(algorithm.input.goal);
    const cells = Array.from({ length: rows }, (_, row) =>
      Array.from({ length: columns }, (_, column) => {
        if (start?.[0] === row && start[1] === column) return 'S';
        if (goal?.[0] === row && goal[1] === column) return 'G';
        return walls.has(`${row}-${column}`) ? '■' : '·';
      }),
    );

    return {
      kind: 'grid',
      cells,
      rowLabels: Array.from({ length: rows }, (_, index) => String(index)),
      columnLabels: Array.from(
        { length: columns },
        (_, index) => String(index),
      ),
    };
  }

  return undefined;
}

function toCoordinate(value: JsonValue | undefined): [number, number] | null {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number' ||
    !Number.isInteger(value[0]) ||
    !Number.isInteger(value[1])
  ) {
    return null;
  }
  return [value[0], value[1]];
}

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
