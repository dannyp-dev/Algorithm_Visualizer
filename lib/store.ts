import { create } from 'zustand';
import { initialAlgorithm } from '@/lib/presets';
import type {
  AlgorithmDefinition,
  ExecutionResult,
  JsonValue,
  RuntimeStatus,
  TraceFrame,
} from '@/lib/types';

interface VisualizerState {
  algorithm: AlgorithmDefinition;
  source: string;
  inputText: string;
  frames: TraceFrame[];
  frameIndex: number;
  runtimeStatus: RuntimeStatus;
  runtimeMessage: string;
  isPlaying: boolean;
  playbackSpeed: number;
  setAlgorithm: (algorithm: AlgorithmDefinition) => void;
  setSource: (source: string) => void;
  setInputText: (inputText: string) => void;
  setRuntime: (status: RuntimeStatus, message?: string) => void;
  setExecution: (result: ExecutionResult) => void;
  updateFrameExplanation: (index: number, explanation: string) => void;
  setFrameIndex: (index: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  setPlaying: (isPlaying: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  parseInput: () => JsonValue;
}

export const useVisualizerStore = create<VisualizerState>((set, get) => ({
  algorithm: initialAlgorithm,
  source: initialAlgorithm.source,
  inputText: JSON.stringify(initialAlgorithm.input, null, 2),
  frames: [],
  frameIndex: 0,
  runtimeStatus: 'idle',
  runtimeMessage: 'Ready to execute',
  isPlaying: false,
  playbackSpeed: 1,

  setAlgorithm: (algorithm) =>
    set({
      algorithm,
      source: algorithm.source,
      inputText: JSON.stringify(algorithm.input, null, 2),
      frames: [],
      frameIndex: 0,
      runtimeStatus: 'idle',
      runtimeMessage: 'Ready to execute',
      isPlaying: false,
    }),
  setSource: (source) => set({ source, frames: [], frameIndex: 0, isPlaying: false, runtimeStatus: 'idle', runtimeMessage: 'Code changed. Run to see the new trace.' }),
  setInputText: (inputText) => set({ inputText, frames: [], frameIndex: 0, isPlaying: false, runtimeStatus: 'idle', runtimeMessage: 'Input changed. Run to see the new trace.' }),
  setRuntime: (runtimeStatus, runtimeMessage = '') =>
    set({ runtimeStatus, runtimeMessage }),
  setExecution: ({ frames, durationMs }) =>
    set({
      frames,
      frameIndex: 0,
      runtimeStatus: 'ready',
      runtimeMessage: `${frames.length} snapshots · ${Math.round(durationMs)} ms`,
      isPlaying: false,
    }),
  updateFrameExplanation: (index, explanation) =>
    set((state) => ({
      frames: state.frames.map((frame, frameIndex) =>
        frameIndex === index ? { ...frame, aiExplanation: explanation } : frame,
      ),
    })),
  setFrameIndex: (frameIndex) => {
    const lastIndex = Math.max(0, get().frames.length - 1);
    set({
      frameIndex: Math.max(0, Math.min(frameIndex, lastIndex)),
    });
  },
  stepForward: () => get().setFrameIndex(get().frameIndex + 1),
  stepBackward: () => get().setFrameIndex(get().frameIndex - 1),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  parseInput: () => JSON.parse(get().inputText) as JsonValue,
}));
