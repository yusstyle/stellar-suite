/**
 * useStagingStore.ts
 *
 * Zustand store that bridges stagingService and the SourceControl UI.
 * Provides optimistic UI updates: files move between lists immediately
 * on action, then the real index state is fetched to reconcile.
 */

import { create } from "zustand";
import {
  stagingService,
  type StagedFile,
  type StagingState,
} from "@/lib/vcs/stagingService";

export type StagingOp = "idle" | "loading" | "staging" | "unstaging";

interface StagingStoreState extends StagingState {
  op: StagingOp;
  /** Path currently being acted on (for per-row spinners) */
  activePath: string | null;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  stageFile: (path: string) => Promise<void>;
  unstageFile: (path: string) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
  clearError: () => void;
}

export const useStagingStore = create<StagingStoreState>()((set, get) => ({
  staged: [],
  unstaged: [],
  op: "idle",
  activePath: null,
  error: null,

  refresh: async () => {
    set({ op: "loading", error: null });
    try {
      const state = await stagingService.getStatus();
      set({ ...state, op: "idle" });
    } catch (err) {
      set({
        op: "idle",
        error: err instanceof Error ? err.message : "Failed to read Git status.",
      });
    }
  },

  stageFile: async (path) => {
    // Optimistic: move file from unstaged → staged immediately
    const { unstaged, staged } = get();
    const file = unstaged.find((f) => f.path === path);
    if (file) {
      set({
        op: "staging",
        activePath: path,
        unstaged: unstaged.filter((f) => f.path !== path),
        staged: [...staged, { ...file, staged: true }].sort((a, b) =>
          a.path.localeCompare(b.path)
        ),
      });
    } else {
      set({ op: "staging", activePath: path });
    }

    try {
      await stagingService.stageFile(path);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Stage failed." });
    } finally {
      // Reconcile with real index state
      const real = await stagingService.getStatus();
      set({ ...real, op: "idle", activePath: null });
    }
  },

  unstageFile: async (path) => {
    // Optimistic: move file from staged → unstaged immediately
    const { staged, unstaged } = get();
    const file = staged.find((f) => f.path === path);
    if (file) {
      set({
        op: "unstaging",
        activePath: path,
        staged: staged.filter((f) => f.path !== path),
        unstaged: [...unstaged, { ...file, staged: false }].sort((a, b) =>
          a.path.localeCompare(b.path)
        ),
      });
    } else {
      set({ op: "unstaging", activePath: path });
    }

    try {
      await stagingService.unstageFile(path);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Unstage failed." });
    } finally {
      const real = await stagingService.getStatus();
      set({ ...real, op: "idle", activePath: null });
    }
  },

  stageAll: async () => {
    // Optimistic: move all unstaged → staged
    const { unstaged, staged } = get();
    const movedToStaged = unstaged.map((f) => ({ ...f, staged: true }));
    set({
      op: "staging",
      activePath: null,
      unstaged: [],
      staged: [...staged, ...movedToStaged].sort((a, b) =>
        a.path.localeCompare(b.path)
      ),
    });

    try {
      await stagingService.stageAll();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Stage all failed." });
    } finally {
      const real = await stagingService.getStatus();
      set({ ...real, op: "idle" });
    }
  },

  unstageAll: async () => {
    const { staged, unstaged } = get();
    const movedToUnstaged = staged.map((f) => ({ ...f, staged: false }));
    set({
      op: "unstaging",
      activePath: null,
      staged: [],
      unstaged: [...unstaged, ...movedToUnstaged].sort((a, b) =>
        a.path.localeCompare(b.path)
      ),
    });

    try {
      await stagingService.unstageAll();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Unstage all failed." });
    } finally {
      const real = await stagingService.getStatus();
      set({ ...real, op: "idle" });
    }
  },

  clearError: () => set({ error: null }),
}));
