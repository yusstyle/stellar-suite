import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GitBlameState {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
}

export const useGitBlameStore = create<GitBlameState>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: "stellar-suite-git-blame" }
  )
);
