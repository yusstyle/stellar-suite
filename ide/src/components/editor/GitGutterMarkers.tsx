/**
 * GitGutterMarkers
 *
 * Computes line-level diff between `headContent` (last commit) and the live
 * editor model, then renders additions/modifications/deletions as Monaco
 * glyph-margin decorations via deltaDecorations.
 *
 * - Uses a 500 ms debounce so diffing never blocks the UI or CI.
 * - Never mutates the document buffer (decorations only).
 * - Attaches an onMouseDown listener on the gutter for mini-diff preview.
 */

import { useEffect, useRef, useCallback } from "react";
import type * as Monaco from "monaco-editor";

export interface GitGutterMarkersProps {
  /** Monaco editor instance */
  editor: Monaco.editor.IStandaloneCodeEditor;
  /** Monaco namespace (from @monaco-editor/react onMount) */
  monaco: typeof Monaco;
  /** Content of the file at HEAD (last commit). Empty string = new file. */
  headContent: string;
}

// ── Minimal diff helpers ──────────────────────────────────────────────────

type LineStatus = "added" | "modified" | "deleted";

interface LineDiff {
  /** 1-based line number in the current (working) file */
  line: number;
  status: LineStatus;
  /** Original line content from HEAD (for deleted / modified lines) */
  headLine?: string;
}

/**
 * Produces a line-level diff between `head` and `current`.
 * This is a simple LCS-free heuristic: compare line-by-line by index,
 * then mark trailing head lines as deleted at the last current line.
 * Good enough for gutter markers without pulling in a full diff library.
 */
function computeLineDiffs(head: string, current: string): LineDiff[] {
  const headLines = head.split("\n");
  const currentLines = current.split("\n");
  const diffs: LineDiff[] = [];

  const maxLen = Math.max(headLines.length, currentLines.length);

  for (let i = 0; i < maxLen; i++) {
    const lineNumber = i + 1; // Monaco is 1-based
    const headLine = headLines[i];
    const currentLine = currentLines[i];

    if (headLine === undefined) {
      // Line exists in current but not in head → added
      diffs.push({ line: lineNumber, status: "added" });
    } else if (currentLine === undefined) {
      // Line exists in head but not in current → deleted marker at last line
      diffs.push({
        line: currentLines.length,
        status: "deleted",
        headLine,
      });
    } else if (headLine !== currentLine) {
      // Both exist but differ → modified
      diffs.push({ line: lineNumber, status: "modified", headLine });
    }
  }

  return diffs;
}

// ── Component ─────────────────────────────────────────────────────────────

export function GitGutterMarkers({ editor, monaco, headContent }: GitGutterMarkersProps) {
  // Stable ref to current decoration IDs so we can clear them on next update
  const decorationIdsRef = useRef<string[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store headContent in a ref so the debounced callback always reads latest
  const headContentRef = useRef(headContent);
  useEffect(() => {
    headContentRef.current = headContent;
  }, [headContent]);

  const applyDecorations = useCallback(() => {
    const model = editor.getModel();
    if (!model) return;

    const currentContent = model.getValue();
    const diffs = computeLineDiffs(headContentRef.current, currentContent);

    const newDecorations: Monaco.editor.IModelDeltaDecoration[] = diffs.map(
      ({ line, status }) => {
        const glyphClass =
          status === "added"
            ? "git-line-added"
            : status === "modified"
            ? "git-line-modified"
            : "git-line-deleted";

        return {
          range: new monaco.Range(line, 1, line, 1),
          options: {
            glyphMarginClassName: glyphClass,
            glyphMarginHoverMessage: {
              value:
                status === "added"
                  ? "Added line"
                  : status === "modified"
                  ? "Modified line"
                  : "Line(s) deleted here",
            },
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        };
      }
    );

    // deltaDecorations: clear old, apply new — buffer is never touched
    decorationIdsRef.current = editor.deltaDecorations(
      decorationIdsRef.current,
      newDecorations
    );
  }, [editor, monaco]);

  const scheduleUpdate = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(applyDecorations, 500);
  }, [applyDecorations]);

  useEffect(() => {
    // Verify glyphMargin is enabled (required for gutter decorations)
    const options = editor.getOptions();
    if (!options.get(monaco.editor.EditorOption.glyphMargin)) {
      console.warn(
        "[GitGutterMarkers] glyphMargin is not enabled. " +
          "Pass glyphMargin: true in Monaco editor options."
      );
    }

    // Initial render
    applyDecorations();

    // Re-run on every content change (debounced)
    const disposable = editor.onDidChangeModelContent(scheduleUpdate);

    // Mini-diff: log previous line content on gutter click
    const mouseDownDisposable = editor.onMouseDown((e) => {
      if (
        e.target.type ===
        monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      ) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber === undefined) return;

        const headLines = headContentRef.current.split("\n");
        const headLine = headLines[lineNumber - 1]; // 0-based index

        console.info(
          `[GitGutterMarkers] Line ${lineNumber} — HEAD content: ${
            headLine !== undefined ? JSON.stringify(headLine) : "(line did not exist at HEAD)"
          }`
        );
      }
    });

    return () => {
      // Cleanup: clear decorations and dispose listeners
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      editor.deltaDecorations(decorationIdsRef.current, []);
      decorationIdsRef.current = [];
      disposable.dispose();
      mouseDownDisposable.dispose();
    };
  }, [editor, monaco, applyDecorations, scheduleUpdate]);

  // Re-apply when headContent changes (e.g. after a commit)
  useEffect(() => {
    scheduleUpdate();
  }, [headContent, scheduleUpdate]);

  // This component renders no DOM — it's a pure side-effect hook
  return null;
}

export default GitGutterMarkers;
