import { useWorkspaceStore } from "@/store/workspaceStore";

// Backward-compatible alias for components still importing useFileStore.
export const useFileStore = useWorkspaceStore;
