import { create } from "zustand";

export type DeploymentStep =
  | "idle"
  | "simulating"
  | "signing"
  | "uploading"
  | "instantiating"
  | "success"
  | "error";

interface DeploymentStore {
  isDeployModalOpen: boolean;
  deploymentStep: DeploymentStep;
  deploymentError: string | null;
  /**
   * Hex-encoded WASM hash retained after a successful upload.
   * Allows the user to retry the instantiation step without re-uploading.
   */
  pendingWasmHash: string | null;

  openDeployModal: () => void;
  closeDeployModal: () => void;
  setDeploymentStep: (step: DeploymentStep) => void;
  setDeploymentError: (error: string | null) => void;
  setPendingWasmHash: (hash: string | null) => void;
  resetDeployment: () => void;
}

export const useDeploymentStore = create<DeploymentStore>()((set) => ({
  isDeployModalOpen: false,
  deploymentStep: "idle",
  deploymentError: null,
  pendingWasmHash: null,

  openDeployModal: () => set({ isDeployModalOpen: true }),

  closeDeployModal: () => set({ isDeployModalOpen: false }),

  setDeploymentStep: (step) => set({ deploymentStep: step }),

  setDeploymentError: (error) => set({ deploymentError: error }),

  setPendingWasmHash: (hash) => set({ pendingWasmHash: hash }),

  resetDeployment: () =>
    set({
      isDeployModalOpen: false,
      deploymentStep: "idle",
      deploymentError: null,
      pendingWasmHash: null,
    }),
}));
