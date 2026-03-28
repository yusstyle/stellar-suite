/**
 * GitBlameLines — inline git blame annotations for the Monaco editor.
 *
 * Renders faded "Author, Date • Commit message" text after each line using
 * Monaco's `after` content decoration. Hovering shows the full commit hash
 * and body in a tooltip message.
 *
 * Usage:
 *   <GitBlameLines editor={editorRef.current} monaco={monacoRef.current} filePath={activeTabPath} />
 *
 * The toggle button is exported separately as <GitBlameToggle /> for use in
 * the editor toolbar / Breadcrumbs bar.
 */

import { useEffect, useRef, useCallback } from "react";
import type * as Monaco from "monaco-editor";
import { GitCommit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGitBlameStore } from "@/store/useGitBlameStore";
import { getBlameData, type BlameHunk } from "@/lib/vcs/blameService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitBlameLinesProps {
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  monaco: typeof Monaco | null;
  /** Active file path segments, e.g. ["hello_world", "lib.rs"] */
  filePath: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DECORATION_CLASS = "git-blame-inline";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

// ---------------------------------------------------------------------------
// Inject CSS once
// ---------------------------------------------------------------------------

let cssInjected = false;
function injectBlameCSS() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .${DECORATION_CLASS}::after {
      opacity: 0.45;
      font-style: italic;
      font-size: 0.78em;
      letter-spacing: 0.01em;
      margin-left: 2.5em;
      color: var(--vscode-editorCodeLens-foreground, #888);
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GitBlameLines({ editor, monaco, filePath }: GitBlameLinesProps) {
  const { enabled } = useGitBlameStore();
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const fileKey = filePath.join("/");

  const applyDecorations = useCallback(
    async (
      ed: Monaco.editor.IStandaloneCodeEditor,
      mc: typeof Monaco,
    ) => {
      injectBlameCSS();

      const model = ed.getModel();
      if (!model) return;

      const lineCount = model.getLineCount();
      const hunks: BlameHunk[] = await getBlameData(filePath, lineCount);

      // Build a line → hunk map
      const lineMap = new Map<number, BlameHunk>();
      for (const hunk of hunks) {
        for (let l = hunk.startLine; l <= hunk.endLine; l++) {
          lineMap.set(l, hunk);
        }
      }

      const decorations: Monaco.editor.IModelDeltaDecoration[] = [];

      for (let line = 1; line <= lineCount; line++) {
        const hunk = lineMap.get(line);
        if (!hunk) continue;

        const shortMsg = truncate(hunk.commitMessage, 48);
        const inlineText = `${hunk.author}, ${formatDate(hunk.date)} • ${shortMsg}`;
        const hoverText = [
          `**${hunk.author}** — ${formatDate(hunk.date)}`,
          `\`${hunk.commitHash}\``,
          "",
          hunk.commitMessage,
        ].join("\n");

        decorations.push({
          range: new mc.Range(line, 1, line, 1),
          options: {
            isWholeLine: false,
            after: {
              content: `  ${inlineText}`,
              inlineClassName: DECORATION_CLASS,
            },
            hoverMessage: { value: hoverText, isTrusted: true },
          },
        });
      }

      // Lazily create collection
      if (!decorationsRef.current) {
        decorationsRef.current = ed.createDecorationsCollection([]);
      }
      decorationsRef.current.set(decorations);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fileKey]
  );

  const clearDecorations = useCallback(() => {
    decorationsRef.current?.clear();
  }, []);

  useEffect(() => {
    if (!editor || !monaco) return;

    if (enabled) {
      void applyDecorations(editor, monaco);
    } else {
      clearDecorations();
    }
  }, [enabled, editor, monaco, applyDecorations, clearDecorations, fileKey]);

  // Re-apply when file content changes (model change event)
  useEffect(() => {
    if (!editor || !monaco || !enabled) return;

    const disposable = editor.onDidChangeModelContent(() => {
      void applyDecorations(editor, monaco);
    });

    return () => disposable.dispose();
  }, [editor, monaco, enabled, applyDecorations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearDecorations();
  }, [clearDecorations]);

  return null; // purely imperative — no DOM output
}

// ---------------------------------------------------------------------------
// Toggle button — drop into any toolbar
// ---------------------------------------------------------------------------

export function GitBlameToggle() {
  const { enabled, toggle } = useGitBlameStore();

  return (
    <Button
      type="button"
      variant={enabled ? "secondary" : "ghost"}
      size="sm"
      className={`h-8 gap-1.5 text-xs ${enabled ? "text-primary" : ""}`}
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Disable Git Blame" : "Enable Git Blame"}
      title="Toggle Git Blame annotations"
    >
      <GitCommit className="h-3.5 w-3.5" />
      Git Blame
    </Button>
  );
}
