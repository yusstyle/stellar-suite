"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type NetworkKey, type CustomHeaders } from "@/lib/networkConfig";

export interface CustomNetwork {
  id: string;
  label: string;
  rpcUrl: string;
  passphrase: string;
  isShared: boolean;
}

export interface SharedWorkspaceConfig {
  enabled: boolean;
  workspaceName: string;
  network: NetworkKey | null;
  rpcUrl: string | null;
  networkPassphrase: string | null;
  headers: CustomHeaders;
  customNetworks: CustomNetwork[];
  lastUpdated: string | null;
}

interface SharedEnvironmentState {
  config: SharedWorkspaceConfig;
  setEnabled: (enabled: boolean) => void;
  setWorkspaceName: (name: string) => void;
  setSharedNetwork: (network: NetworkKey | null) => void;
  setSharedRpcUrl: (url: string | null) => void;
  setSharedPassphrase: (passphrase: string | null) => void;
  setSharedHeaders: (headers: CustomHeaders) => void;
  addCustomNetwork: (network: Omit<CustomNetwork, "id">) => void;
  updateCustomNetwork: (
    id: string,
    update: Partial<Omit<CustomNetwork, "id">>
  ) => void;
  removeCustomNetwork: (id: string) => void;
  exportConfig: () => string;
  importConfig: (json: string) => { success: boolean; error?: string };
}

const DEFAULT_CONFIG: SharedWorkspaceConfig = {
  enabled: false,
  workspaceName: "My Team Workspace",
  network: null,
  rpcUrl: null,
  networkPassphrase: null,
  headers: {},
  customNetworks: [],
  lastUpdated: null,
};

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function withTimestamp<T>(update: T): T & { lastUpdated: string } {
  return { ...update, lastUpdated: new Date().toISOString() };
}

export const useSharedEnvironmentStore = create<SharedEnvironmentState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,

      setEnabled: (enabled) =>
        set((s) => ({
          config: withTimestamp({ ...s.config, enabled }),
        })),

      setWorkspaceName: (workspaceName) =>
        set((s) => ({
          config: withTimestamp({ ...s.config, workspaceName }),
        })),

      setSharedNetwork: (network) =>
        set((s) => ({
          config: withTimestamp({ ...s.config, network }),
        })),

      setSharedRpcUrl: (rpcUrl) =>
        set((s) => ({
          config: withTimestamp({ ...s.config, rpcUrl }),
        })),

      setSharedPassphrase: (networkPassphrase) =>
        set((s) => ({
          config: withTimestamp({ ...s.config, networkPassphrase }),
        })),

      setSharedHeaders: (headers) =>
        set((s) => ({
          config: withTimestamp({ ...s.config, headers }),
        })),

      addCustomNetwork: (network) =>
        set((s) => ({
          config: withTimestamp({
            ...s.config,
            customNetworks: [
              ...s.config.customNetworks,
              { ...network, id: generateId() },
            ],
          }),
        })),

      updateCustomNetwork: (id, update) =>
        set((s) => ({
          config: withTimestamp({
            ...s.config,
            customNetworks: s.config.customNetworks.map((n) =>
              n.id === id ? { ...n, ...update } : n
            ),
          }),
        })),

      removeCustomNetwork: (id) =>
        set((s) => ({
          config: withTimestamp({
            ...s.config,
            customNetworks: s.config.customNetworks.filter((n) => n.id !== id),
          }),
        })),

      exportConfig: () => {
        const { config } = get();
        const exportData = {
          workspaceName: config.workspaceName,
          network: config.network,
          rpcUrl: config.rpcUrl,
          networkPassphrase: config.networkPassphrase,
          headers: config.headers,
          customNetworks: config.customNetworks.filter((n) => n.isShared),
          exportedAt: new Date().toISOString(),
        };
        return JSON.stringify(exportData, null, 2);
      },

      importConfig: (json) => {
        try {
          const data = JSON.parse(json) as Partial<SharedWorkspaceConfig> & {
            exportedAt?: string;
          };
          set((s) => ({
            config: withTimestamp({
              ...s.config,
              workspaceName: data.workspaceName ?? s.config.workspaceName,
              network: data.network ?? s.config.network,
              rpcUrl: data.rpcUrl ?? s.config.rpcUrl,
              networkPassphrase:
                data.networkPassphrase ?? s.config.networkPassphrase,
              headers: data.headers ?? s.config.headers,
              customNetworks: [
                ...s.config.customNetworks.filter((n) => !n.isShared),
                ...(data.customNetworks ?? []).map(
                  (n: Omit<CustomNetwork, "id">) => ({
                    ...n,
                    id: generateId(),
                    isShared: true,
                  })
                ),
              ],
            }),
          }));
          return { success: true };
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : "Invalid JSON",
          };
        }
      },
    }),
    {
      name: "stellar-suite-shared-env",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
