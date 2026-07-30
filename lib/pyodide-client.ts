import type {
  ExecutionResult,
  JsonValue,
  RuntimeStatus,
  TraceFrame,
} from '@/lib/types';
import { parseTraceFrames } from '@/lib/validation';

const EXECUTION_TIMEOUT_MS = 12_000;

type StatusHandler = (status: RuntimeStatus, message: string) => void;

type WorkerMessage =
  | { type: 'status'; status: 'loading' | 'running'; id?: string }
  | { type: 'result'; id: string; frames: unknown }
  | { type: 'error'; id: string; message: string };

interface PendingExecution {
  resolve: (result: ExecutionResult) => void;
  reject: (error: Error) => void;
  startedAt: number;
  timeout: number;
  onStatus?: StatusHandler;
}

class PyodideExecutionEngine {
  private worker: Worker | null = null;
  private sequence = 0;
  private pending = new Map<string, PendingExecution>();

  execute(
    source: string,
    input: JsonValue,
    onStatus?: StatusHandler,
  ): Promise<ExecutionResult> {
    const worker = this.getWorker();
    const id = `execution-${++this.sequence}`;

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(id);
        this.resetWorker();
        reject(
          new Error(
            'Execution exceeded 12 seconds. Check for an infinite loop or reduce the input size.',
          ),
        );
      }, EXECUTION_TIMEOUT_MS);

      this.pending.set(id, {
        resolve,
        reject,
        startedAt: window.performance.now(),
        timeout,
        onStatus,
      });

      worker.postMessage({ id, source, input });
    });
  }

  private getWorker() {
    if (!this.worker) {
      this.worker = new Worker('/pyodide-worker.mjs', { type: 'module' });
      this.worker.addEventListener('message', this.handleMessage);
      this.worker.addEventListener('error', this.handleWorkerError);
    }
    return this.worker;
  }

  private handleMessage = (event: MessageEvent<WorkerMessage>) => {
    const message = event.data;

    if (message.type === 'status') {
      const statusText =
        message.status === 'loading'
          ? 'Loading Python into the browser'
          : 'Executing inside the WebAssembly worker';
      this.pending.forEach((pending) =>
        pending.onStatus?.(message.status, statusText),
      );
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) return;

    window.clearTimeout(pending.timeout);
    this.pending.delete(message.id);

    if (message.type === 'error') {
      pending.reject(new Error(this.cleanError(message.message)));
      return;
    }

    try {
      const frames: TraceFrame[] = parseTraceFrames(message.frames);
      pending.resolve({
        frames,
        durationMs: window.performance.now() - pending.startedAt,
      });
    } catch (error) {
      pending.reject(
        error instanceof Error
          ? error
          : new Error('The worker returned an invalid execution trace.'),
      );
    }
  };

  private handleWorkerError = () => {
    this.pending.forEach((pending) => {
      window.clearTimeout(pending.timeout);
      pending.reject(new Error('The Python worker could not be started.'));
    });
    this.pending.clear();
    this.resetWorker();
  };

  private cleanError(message: string) {
    const lines = message.split('\n').filter(Boolean);
    return lines.at(-1)?.replace(/^.*Error:\s*/, '') || 'Execution failed.';
  }

  private resetWorker() {
    this.worker?.terminate();
    this.worker = null;
  }
}

export const pyodideEngine = new PyodideExecutionEngine();
