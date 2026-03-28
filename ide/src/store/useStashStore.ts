/**
 * useStashStore.ts
 *
 * Zustand store for stash state. Keeps the UI in sync with IndexedDB
 * after every push / pop / apply / drop operation.
 */

import { create } from "zustand";
import { stashService, type StashEntry } from "@/lib/vcs/stashService";
import { flattenWorkspaceFiles, useWorkspaceStore } from "@/store/workspaceStore";

export type StashOperation = "idle" | "pushing" | "popping" | "applying" | "dropping";

interface StashState {
  entries: StashEntry[];
  operation: StashOperation;
  error: string | null;
  /** Index of the entry currently being acted on (for per-row loading states) */
  activeIndex: number | null;

  // Actions
  loadEntries: () => Promise<void>;
  pushStash: (message?: string) => Promise<{ hadConflictRisk?: boolean; success: boolean; message: string }>;
  applyStash: (index: number) => Promise<{ hadConflictRisk: boolean; success: boolean; message: string }>;
  popStash: (index: number) => Promise<{ hadConflictRisk: boolean; success: boolean; message: string }>;
  dropStash: (index: number) => Promise<void>;
  clearError: () => void;
}

export const useStashStore = create<StashState>()((set, get) => ({
  entries: [],
  operation: "idle",
  error: null,
  activeIndex: null,

  loadEntries: async () => {
    const entries = await stashService.list();
    set({ entries });
  },

  pushStash: async (message) => {
    set({ operation: "pushing", error: null });
    try {
      const { files } = useWorkspaceStore.getState();
      const workspaceFiles = Object.fromEntries(
        flattenWorkspaceFiles(files).map((f) => [f.path, f.content])
      );

      const result = await stashService.push({ message, workspaceFiles });

      if (result.success) {
        // Restore files to HEAD content in the workspace
        const { updateFileContent } = useWorkspaceStore.getState();
        for (const [path, content] of Object.entries(result.restoredFiles)) {
          updateFileContent(path.split("/"), content);
        }
        // Refresh stash list immediately
        await get().loadEntries();
      }

      set({ operation: "idle" });
      return { success: result.success, message: result.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stash push failed.";
      set({ operation: "idle", error: message });
      return { success: false, message };
    }
  },

  applyStash: async (index) => {
    set({ operation: "applying", activeIndex: index, error: null });
    try {
      const { files } = useWorkspaceStore.getState();
      const workspaceFiles = Object.fromEntries(
        flattenWorkspaceFiles(files).map((f) => [f.path, f.content])
      );

      const result = await stashService.apply(index, workspaceFiles);

      if (result.success && result.restoredFiles) {
        const { updateFileContent } = useWorkspaceStore.getState();
        for (const [path, content] of Object.entries(result.restoredFiles)) {
          updateFileContent(path.split("/"), content);
        }
        await get().loadEntries();
      }

      set({ operation: "idle", activeIndex: null });
      return {
        success: result.success,
        message: result.message,
        hadConflictRisk: result.hadConflictRisk ?? false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stash apply failed.";
      set({ operation: "idle", activeIndex: null, error: message });
      return { success: false, message, hadConflictRisk: false };
    }
  },

  popStash: async (index) => {
    set({ operation: "popping", activeIndex: index, error: null });
    try {
      const { files } = useWorkspaceStore.getState();
      const workspaceFiles = Object.fromEntries(
        flattenWorkspaceFiles(files).map((f) => [f.path, f.content])
      );

      const result = await stashService.pop(workspaceFiles, index);

      if (result.success && result.restoredFiles) {
        const { updateFileContent } = useWorkspaceStore.getState();
        for (const [path, content] of Object.entries(result.restoredFiles)) {
          updateFileContent(path.split("/"), content);
        }
        await get().loadEntries();
      }

      set({ operation: "idle", activeIndex: null });
      return {
        success: result.success,
        message: result.message,
        hadConflictRisk: result.hadConflictRisk ?? false,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stash pop failed.";
      set({ operation: "idle", activeIndex: null, error: message });
      return { success: false, message, hadConflictRisk: false };
    }
  },

  dropStash: async (index) => {
    set({ operation: "dropping", activeIndex: index, error: null });
    try {
      await stashService.drop(index);
      await get().loadEntries();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stash drop failed.";
      set({ error: message });
    } finally {
      set({ operation: "idle", activeIndex: null });
    }
  },

  clearError: () => set({ error: null }),
}));
