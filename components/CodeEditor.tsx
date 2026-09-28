'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { Monaco, OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="editor-loading">
      <span />
      Loading editor
    </div>
  ),
});

interface CodeEditorProps {
  value: string;
  activeLine?: number;
  onChange: (value: string) => void;
}

export default function CodeEditor({
  value,
  activeLine = 0,
  onChange,
}: CodeEditorProps) {
  const [isCompact, setIsCompact] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationRef =
    useRef<editor.IEditorDecorationsCollection | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 720px)');
    const update = () => setIsCompact(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!editorRef.current || !activeLine) {
      decorationRef.current?.clear();
      return;
    }

    decorationRef.current?.set([
      {
        range: {
          startLineNumber: activeLine,
          startColumn: 1,
          endLineNumber: activeLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: 'active-code-line',
          linesDecorationsClassName: 'active-code-gutter',
        },
      },
    ]);
    editorRef.current.revealLineInCenterIfOutsideViewport(activeLine);
  }, [activeLine]);

  const beforeMount = (monaco: Monaco) => {
    monaco.editor.defineTheme('algorithm-studio', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '9B7CFF' },
        { token: 'number', foreground: 'F2BD68' },
        { token: 'string', foreground: '68DDA8' },
        { token: 'comment', foreground: '5C5F69', fontStyle: 'italic' },
        { token: 'identifier', foreground: 'C8CED9' },
      ],
      colors: {
        'editor.background': '#0D0E12',
        'editor.foreground': '#C8CED9',
        'editorLineNumber.foreground': '#3D404A',
        'editorLineNumber.activeForeground': '#7A9CFF',
        'editor.selectionBackground': '#7A9CFF33',
        'editor.inactiveSelectionBackground': '#7A9CFF1C',
        'editorCursor.foreground': '#58D8DC',
        'editorIndentGuide.background1': '#FFFFFF0A',
        'editorIndentGuide.activeBackground1': '#FFFFFF18',
        'editor.lineHighlightBackground': '#FFFFFF05',
      },
    });
  };

  const handleMount: OnMount = (mountedEditor) => {
    editorRef.current = mountedEditor;
    decorationRef.current = mountedEditor.createDecorationsCollection();
  };

  if (isCompact) {
    return (
      <textarea
        className="mobile-code-editor"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Python source editor"
        spellCheck={false}
      />
    );
  }

  return (
    <MonacoEditor
      height="100%"
      language="python"
      theme="algorithm-studio"
      value={value}
      beforeMount={beforeMount}
      onMount={handleMount}
      onChange={(nextValue) => onChange(nextValue || '')}
      options={{
        minimap: { enabled: false },
        fontFamily:
          '"SFMono-Regular", "Cascadia Code", "Roboto Mono", Consolas, monospace',
        fontSize: 14,
        lineHeight: 23,
        padding: { top: 14, bottom: 28 },
        renderLineHighlight: 'line',
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        tabSize: 4,
        wordWrap: 'off',
        automaticLayout: true,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        folding: true,
        glyphMargin: false,
        lineNumbersMinChars: 3,
      }}
    />
  );
}
