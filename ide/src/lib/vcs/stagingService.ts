/**
 * stagingService.ts
 *
 * Browser-side Git index (staging area) management built on isomorphic-git.
 *
 * isomorphic-git's statusMatrix returns a 4-tuple per file:
 *   [filepath, HEAD, workdir, stage]
 *
 *   HEAD   : 0 = absent,  1 = present
 *   workdir: 0 = absent,  1 = identical to HEAD, 2 = different from HEAD
 *   stage  : 0 = absent,  1 = identical to HEAD, 2 = identical to workdir,
 *            3 = different from both
 *
 * From those three numbers we derive:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ HEAD │ workdir │ stage │ Meaning                                 │
 *   ├──────┼─────────┼───────┼─────────────────────────────────────────┤
 *   │  0   │    2    │   0   │ Untracked (new, not staged)             │
 *   │  0   │    2    │   2   │ Added     (new, staged)                 │
 *   │  1   │    2    │   1   │ Modified  (changed, not staged)         │
 *   │  1   │    2    │   2   │ Modified  (changed, staged)             │
 *   │  1   │    2    │   3   │ Modified  (partially staged)            │
 *   │  1   │    0    │   1   │ Deleted   (removed, not staged)         │
 *   │  1   │    0    │   0   │ Deleted   (removed, staged)             │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Safety guarantee:
 *   - stageFile   → git.add()    (index only, workdir untouched)
 *   - unstageFile → git.resetIndex() (index only, NO --hard, workdir untouched)
 *   - stageAll    → git.add() for every unstaged file
 *
 * All operations are fully async and never block the main thread.
 */

import LightningFS from "@isomorphic-git/lightning-fs";
import * as git from "isomorphic-git";

// ── Constants ─────────────────────────────────────────────────────────────

const FS_NAME = "stellar-suite-ide-repo";
const DIR = "/workspace";

// ── Types ─────────────────────────────────────────────────────────────────

/** The three groups shown in the staging UI */
export type StagingStatus = "modified" | "untracked" | "deleted";

export interface StagedFile {
  /** Normalized path relative to repo root (no leading slash) */
  path: string;
  /** Working-tree status symbol shown in the UI */
  status: StagingStatus;
  /** Whether this file is currently in the index (staged) */
  staged: boolean;
}

export interface StagingState {
  /** Files in the index ready to commit */
  staged: StagedFile[];
  /** Files with changes not yet added to the index */
  unstaged: StagedFile[];
}

// ── FS registry (mirrors gitService.ts pattern exactly) ───────────────────

const browserFsRegistry = globalThis as typeof globalThis & {
  __stellarSuiteGitFsRegistry__?: Map<string, LightningFS>;
};

function getFs(): LightningFS {
  if (typeof window === "undefined") {
    throw new Error("stagingService is only available in the browser.");
  }
  if (!browserFsRegistry.__stellarSuiteGitFsRegistry__) {
    browserFsRegistry.__stellarSuiteGitFsRegistry__ = new Map();
  }
  const registry = browserFsRegistry.__stellarSuiteGitFsRegistry__;
  if (!registry.has(FS_NAME)) {
    registry.set(FS_NAME, new LightningFS(FS_NAME, { wipe: false }));
  }
  return registry.get(FS_NAME)!;
}

// ── Status matrix decoder ─────────────────────────────────────────────────

type StatusRow = [string, 0 | 1, 0 | 1 | 2, 0 | 1 | 2 | 3];

/**
 * Decode a single statusMatrix row into zero, one, or two StagedFile entries.
 * Returns null for rows that represent a clean / uninteresting state.
 */
function decodeRow(
  [filepath, head, workdir, stage]: StatusRow
): { unstaged: StagedFile | null; staged: StagedFile | null } {
  const result = { unstaged: null as StagedFile | null, staged: null as StagedFile | null };

  // ── Untracked (new file, not staged) ──────────────────────────────────
  if (head === 0 && workdir === 2 && stage === 0) {
    result.unstaged = { path: filepath, status: "untracked", staged: false };
    return result;
  }

  // ── Added (new file, staged) ──────────────────────────────────────────
  if (head === 0 && workdir === 2 && stage === 2) {
    result.staged = { path: filepath, status: "untracked", staged: true };
    return result;
  }

  // ── Added (new file, staged — workdir absent edge case) ───────────────
  if (head === 0 && workdir === 0 && stage === 2) {
    result.staged = { path: filepath, status: "untracked", staged: true };
    return result;
  }

  // ── Modified, not staged ──────────────────────────────────────────────
  if (head === 1 && workdir === 2 && stage === 1) {
    result.unstaged = { path: filepath, status: "modified", staged: false };
    return result;
  }

  // ── Modified, staged ─────────────────────────────────────────────────
  if (head === 1 && workdir === 2 && stage === 2) {
    result.staged = { path: filepath, status: "modified", staged: true };
    return result;
  }

  // ── Partially staged (both staged and unstaged changes) ───────────────
  if (head === 1 && workdir === 2 && stage === 3) {
    result.unstaged = { path: filepath, status: "modified", staged: false };
    result.staged   = { path: filepath, status: "modified", staged: true };
    return result;
  }

  // ── Deleted, not staged ───────────────────────────────────────────────
  if (head === 1 && workdir === 0 && stage === 1) {
    result.unstaged = { path: filepath, status: "deleted", staged: false };
    return result;
  }

  // ── Deleted, staged ───────────────────────────────────────────────────
  if (head === 1 && workdir === 0 && stage === 0) {
    result.staged = { path: filepath, status: "deleted", staged: true };
    return result;
  }

  return result; // clean file — both null
}

// ── Public API ────────────────────────────────────────────────────────────

export function createStagingService() {
  /**
   * Fetch the full staging state from the isomorphic-git index.
   * Returns { staged, unstaged } — both sorted alphabetically.
   * Returns empty lists if the repository is not initialized.
   */
  const getStatus = async (): Promise<StagingState> => {
    const fs = getFs();

    // Guard: repo must exist
    try {
      await git.currentBranch({ fs, dir: DIR });
    } catch {
      return { staged: [], unstaged: [] };
    }

    let rows: StatusRow[] = [];
    try {
      rows = (await git.statusMatrix({ fs, dir: DIR })) as StatusRow[];
    } catch {
      return { staged: [], unstaged: [] };
    }

    const staged: StagedFile[] = [];
    const unstaged: StagedFile[] = [];

    for (const row of rows) {
      const { staged: s, unstaged: u } = decodeRow(row);
      if (s) staged.push(s);
      if (u) unstaged.push(u);
    }

    staged.sort((a, b) => a.path.localeCompare(b.path));
    unstaged.sort((a, b) => a.path.localeCompare(b.path));

    return { staged, unstaged };
  };

  /**
   * Stage a single file.
   * Equivalent to: git add "<path>"
   * Only modifies the Git index — working directory is never touched.
   */
  const stageFile = async (filePath: string): Promise<void> => {
    const fs = getFs();
    // Normalize: strip leading slash, handle spaces safely (isomorphic-git
    // takes a plain string filepath, not a shell command, so no quoting needed)
    const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
    await git.add({ fs, dir: DIR, filepath: normalized });
  };

  /**
   * Unstage a single file.
   * Equivalent to: git reset HEAD "<path>"  (index-only, NO --hard)
   * The working-directory file content is NEVER modified.
   */
  const unstageFile = async (filePath: string): Promise<void> => {
    const fs = getFs();
    const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");

    // git.resetIndex resets the index entry for the file back to HEAD,
    // leaving the working-tree file completely untouched.
    await git.resetIndex({ fs, dir: DIR, filepath: normalized });
  };

  /**
   * Stage all currently unstaged files in one pass.
   * Equivalent to: git add -A  (but scoped to known unstaged files only)
   */
  const stageAll = async (): Promise<void> => {
    const { unstaged } = await getStatus();
    if (unstaged.length === 0) return;

    const fs = getFs();
    // Run in parallel — isomorphic-git operations on separate files are safe
    await Promise.all(
      unstaged.map((f) =>
        git.add({ fs, dir: DIR, filepath: f.path })
      )
    );
  };

  /**
   * Unstage all currently staged files in one pass.
   */
  const unstageAll = async (): Promise<void> => {
    const { staged } = await getStatus();
    if (staged.length === 0) return;

    const fs = getFs();
    // Deduplicate paths (partially-staged files appear in both lists)
    const paths = [...new Set(staged.map((f) => f.path))];
    await Promise.all(
      paths.map((p) =>
        git.resetIndex({ fs, dir: DIR, filepath: p })
      )
    );
  };

  return { getStatus, stageFile, unstageFile, stageAll, unstageAll };
}

export const stagingService = createStagingService();
