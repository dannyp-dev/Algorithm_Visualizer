'use client';

import { useEffect, useRef, useState } from 'react';

interface GenerateDialogProps {
  open: boolean;
  apiKey: string;
  busy: boolean;
  error: string;
  onApiKeyChange: (value: string) => void;
  onClose: () => void;
  onGenerate: (request: string) => void;
}

const suggestions = [
  'A* pathfinding on a weighted grid',
  'Merge sort on eight integers',
  'Binary search tree insertion',
  'Longest common subsequence',
];

export default function GenerateDialog({
  open,
  apiKey,
  busy,
  error,
  onApiKeyChange,
  onClose,
  onGenerate,
}: GenerateDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [request, setRequest] = useState(
    'A* pathfinding on a 7 × 7 grid with walls, showing the open set, closed set, and final path.',
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="generate-dialog"
      onCancel={(event) => {
        if (busy) {
          event.preventDefault();
        } else {
          onClose();
        }
      }}
      onClose={onClose}
    >
      <div className="dialog-header">
        <div>
          <p className="eyebrow">Gemini adapter</p>
          <h2>Describe an algorithm.</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close generator"
        >
          ×
        </button>
      </div>

      <p className="dialog-intro">
        Gemini will write Python that follows the same trace contract as the
        built-in examples. The response is executed against its own sample
        input before it enters the editor, with one automatic repair attempt if
        the pair disagrees.
      </p>

      <label className="dialog-field">
        <span>Algorithm request</span>
        <textarea
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          disabled={busy}
          placeholder="Describe the algorithm, sample input, and the decisions you want to see."
        />
      </label>

      <div className="suggestion-row">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setRequest(suggestion)}
            disabled={busy}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <label className="dialog-field">
        <span>Gemini session key</span>
        <input
          type="password"
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          disabled={busy}
          placeholder="Paste a Gemini API key"
          autoComplete="off"
        />
      </label>

      <p className="key-note">
        The key is kept only in this page&apos;s memory and{' '}
        {process.env.NEXT_PUBLIC_STATIC_HOSTING === 'true'
          ? 'sent directly to Google from your browser.'
          : 'sent through the same-origin proxy.'}{' '}
        It is never saved or committed.{' '}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
        >
          Open Google AI Studio
        </a>
      </p>

      {error && (
        <p className="dialog-error" role="alert">
          {error}
        </p>
      )}

      <div className="dialog-actions">
        <button type="button" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          className="button-primary"
          type="button"
          onClick={() => onGenerate(request)}
          disabled={busy || !request.trim() || !apiKey.trim()}
        >
          {busy ? 'Generating and checking…' : 'Generate algorithm'}
        </button>
      </div>
    </dialog>
  );
}
