'use client';

import { useEffect } from 'react';
import { useVisualizerStore } from '@/lib/store';

export default function TransportControls() {
  const frames = useVisualizerStore((state) => state.frames);
  const frameIndex = useVisualizerStore((state) => state.frameIndex);
  const isPlaying = useVisualizerStore((state) => state.isPlaying);
  const playbackSpeed = useVisualizerStore((state) => state.playbackSpeed);
  const setFrameIndex = useVisualizerStore((state) => state.setFrameIndex);
  const stepForward = useVisualizerStore((state) => state.stepForward);
  const stepBackward = useVisualizerStore((state) => state.stepBackward);
  const setPlaying = useVisualizerStore((state) => state.setPlaying);
  const setPlaybackSpeed = useVisualizerStore(
    (state) => state.setPlaybackSpeed,
  );

  useEffect(() => {
    if (!isPlaying || frames.length < 2) return;

    const interval = window.setInterval(() => {
      const state = useVisualizerStore.getState();
      if (state.frameIndex >= state.frames.length - 1) {
        state.setPlaying(false);
      } else {
        state.stepForward();
      }
    }, 760 / playbackSpeed);

    return () => window.clearInterval(interval);
  }, [frames.length, isPlaying, playbackSpeed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], .monaco-editor, dialog')) return;
      if (!useVisualizerStore.getState().frames.length) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); stepForward(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); stepBackward(); }
      if (event.key === ' ') { event.preventDefault(); setPlaying(!useVisualizerStore.getState().isPlaying); }
      if (event.key === 'Home') { event.preventDefault(); setFrameIndex(0); }
      if (event.key === 'End') { event.preventDefault(); setFrameIndex(useVisualizerStore.getState().frames.length - 1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setFrameIndex, setPlaying, stepBackward, stepForward]);

  const hasFrames = frames.length > 0;
  const lastIndex = Math.max(0, frames.length - 1);
  const progress = hasFrames ? (frameIndex / Math.max(lastIndex, 1)) * 100 : 0;

  return (
    <footer className="transport-shell">
      <div className="transport-controls">
        <button
          type="button"
          aria-label="Return to first frame"
          onClick={() => setFrameIndex(0)}
          disabled={!hasFrames || frameIndex === 0}
        >
          ↤
        </button>
        <button
          type="button"
          aria-label="Previous frame"
          onClick={stepBackward}
          disabled={!hasFrames || frameIndex === 0}
        >
          ←
        </button>
        <button
          className="transport-play"
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={() => {
            if (!isPlaying && frameIndex === lastIndex) setFrameIndex(0);
            setPlaying(!isPlaying);
          }}
          disabled={frames.length < 2}
        >
          {isPlaying ? 'Ⅱ' : '▶'}
        </button>
        <button
          type="button"
          aria-label="Next frame"
          onClick={stepForward}
          disabled={!hasFrames || frameIndex === lastIndex}
        >
          →
        </button>
        <span>
          {hasFrames ? String(frameIndex + 1).padStart(2, '0') : '00'} /{' '}
          {String(frames.length).padStart(2, '0')}
        </span>
      </div>

      <label className="timeline-control">
        <span className="sr-only">Execution timeline</span>
        <span className="timeline-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </span>
        <input
          type="range"
          min="0"
          max={lastIndex}
          value={Math.min(frameIndex, lastIndex)}
          onChange={(event) => setFrameIndex(Number(event.target.value))}
          disabled={!hasFrames}
          aria-label="Execution timeline"
        />
      </label>

      <div className="transport-meta">
        <label>
          <span>Speed</span>
          <select
            value={playbackSpeed}
            onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
          >
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
          </select>
        </label>
        <div className="technology-line">
          <span>← → step</span>
          <span>space play / pause</span>
        </div>
      </div>
    </footer>
  );
}
