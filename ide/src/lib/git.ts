import { sampleContracts, findFile, FileNode } from "./sample-contracts";

/**
 * Simulated Git utilities for the IDE.
 */
export const git = {
  /**
   * Fetches the "base" content (HEAD) for a given path.
   * In this simulated environment, it returns the initial content from sampleContracts.
   */
  readTree: async (path: string[]): Promise<string> => {
    const file = findFile(sampleContracts, path);
    if (!file || file.type !== "file") {
      throw new Error(`File not found at path: ${path.join("/")}`);
    }
    return file.content ?? "";
  },

  /**
   * Checks if a file has local changes compared to its base version.
   */
  isModified: (path: string[], currentContent: string): boolean => {
    const file = findFile(sampleContracts, path);
    if (!file || file.type !== "file") return false;
    return file.content !== currentContent;
  }
};
