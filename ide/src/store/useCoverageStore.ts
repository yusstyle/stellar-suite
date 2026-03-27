/**
 * useCoverageStore.ts
 *
 * Zustand store for line coverage data.
 * Populated by parseCoverageReport() after each test run and consumed by:
 *   - CodeEditor  (gutter decorations)
 *   - FileExplorer (per-file coverage badge)
 */
import { create } from "zustand";
import { CoverageSummary, FileCoverage } from "@/utils/coverageParser";

interface CoverageState {
  summary: CoverageSummary | null;

  /** Replace the entire coverage snapshot (called after each test run). */
  setCoverage: (summary: CoverageSummary) => void;

  /** Clear coverage (e.g. when a new build starts). */
  clearCoverage: () => void;

  /** Returns coverage for a single file, or null if not available. */
  getFileCoverage: (fileId: string) => FileCoverage | null;
}

export const useCoverageStore = create<CoverageState>((set, get) => ({
  summary: null,

  setCoverage: (summary) => set({ summary }),

  clearCoverage: () => set({ summary: null }),

  getFileCoverage: (fileId) => get().summary?.files[fileId] ?? null,
}));
