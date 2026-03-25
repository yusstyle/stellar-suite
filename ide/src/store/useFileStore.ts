import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FileNode, sampleContracts } from '@/lib/sample-contracts';
import { NETWORK_CONFIG, NetworkKey, DEFAULT_CUSTOM_RPC } from '@/lib/networkConfig';

interface TabInfo {
  path: string[];
  name: string;
}

interface FileStore {
  files: FileNode[];
  openTabs: TabInfo[];
  activeTabPath: string[];
  unsavedFiles: Set<string>;

  network: NetworkKey;
  horizonUrl: string;
  networkPassphrase: string;
  customRpcUrl: string;
  identities: Array<{ id: string; name: string; publicKey: string }>;
  activeIdentityId: string | null;
  tokenBalances: Record<string, string>;
  hydrationComplete: boolean;

  // Actions
  setFiles: (files: FileNode[]) => void;
  setActiveTabPath: (path: string[]) => void;
  setOpenTabs: (tabs: TabInfo[]) => void;

  setNetwork: (network: NetworkKey) => void;
  setHorizonUrl: (url: string) => void;
  setNetworkPassphrase: (passphrase: string) => void;
  setCustomRpcUrl: (url: string) => void;
  setActiveIdentity: (identityId: string | null) => void;
  setTokenBalances: (balances: Record<string,string>) => void;
  setHydrationComplete: (ready: boolean) => void;
  refreshBalances: () => Promise<void>;

  addTab: (path: string[], name: string) => void;
  closeTab: (path: string[]) => void;
  updateFileContent: (path: string[], content: string) => void;
  markSaved: (path: string[]) => void;
  createFile: (parentPath: string[], name: string, content?: string) => void;
  createFolder: (parentPath: string[], name: string) => void;
  deleteNode: (path: string[]) => void;
  renameNode: (path: string[], newName: string) => void;
}

const cloneFiles = (files: FileNode[]): FileNode[] =>
  JSON.parse(JSON.stringify(files));

const findNode = (nodes: FileNode[], pathParts: string[]): FileNode | null => {
  for (const node of nodes) {
    if (node.name === pathParts[0]) {
      if (pathParts.length === 1) return node;
      if (node.children) return findNode(node.children, pathParts.slice(1));
    }
  }
  return null;
};

const findParent = (nodes: FileNode[], pathParts: string[]): FileNode[] | null => {
  if (pathParts.length <= 1) return nodes;
  const parent = findNode(nodes, pathParts.slice(0, -1));
  return parent?.children ?? null;
};

const getHorizonBaseUrl = (network: string): string | null => {
  switch (network) {
    case "testnet":
      return "https://horizon-testnet.stellar.org";
    case "futurenet":
      return "https://horizon-futurenet.stellar.org";
    case "mainnet":
      return "https://horizon.stellar.org";
    default:
      return null;
  }
};

const fetchNativeXlmBalance = async (publicKey: string, network: string): Promise<number> => {
  const baseUrl = getHorizonBaseUrl(network);
  if (!baseUrl) return 0;

  const res = await fetch(`${baseUrl}/accounts/${encodeURIComponent(publicKey)}`);
  if (res.status === 404) return 0;

  if (!res.ok) {
    throw new Error(`Horizon request failed: ${res.status}`);
  }

  const data = await res.json();
  const balances = (data?.balances ?? []) as Array<{ asset_type?: string; balance?: string }>;
  const native = balances.find((b) => b.asset_type === "native");
  const balStr = native?.balance ?? "0";
  const balNum = Number(balStr);
  return Number.isFinite(balNum) ? balNum : 0;
};

export const useFileStore = create<FileStore>()(
  persist(
    (set, get) => ({
      files: cloneFiles(sampleContracts),
      openTabs: [{ path: ["hello_world", "lib.rs"], name: "lib.rs" }],
      activeTabPath: ["hello_world", "lib.rs"],
      unsavedFiles: new Set<string>(),

      network: "testnet",
      horizonUrl: NETWORK_CONFIG.testnet.horizon,
      networkPassphrase: NETWORK_CONFIG.testnet.passphrase,
      customRpcUrl: DEFAULT_CUSTOM_RPC,
      identities: [
        { id: "local-1", name: "Local Keypair 1", publicKey: "GDEXAMPLELOCAL1" },
        { id: "local-2", name: "Local Keypair 2", publicKey: "GDEXAMPLELOCAL2" },
      ],
      activeIdentityId: "local-1",
      tokenBalances: {},
      hydrationComplete: false,

      setFiles: (files) => set({ files }),
      setActiveTabPath: (path) => set({ activeTabPath: path }),
      setOpenTabs: (tabs) => set({ openTabs: tabs }),

      setNetwork: (network) => {
        const config = NETWORK_CONFIG[network] || NETWORK_CONFIG.testnet;
        const customRpcUrl = get().customRpcUrl || DEFAULT_CUSTOM_RPC;
        const horizonUrl = network === "local" ? customRpcUrl : config.horizon;
        set({
          network,
          horizonUrl,
          networkPassphrase: config.passphrase,
        });

        // Update balances after network switch.
        get().refreshBalances();
      },
      setHorizonUrl: (url) => set({ horizonUrl: url }),
      setNetworkPassphrase: (passphrase) => set({ networkPassphrase: passphrase }),
      setCustomRpcUrl: (customRpcUrl) => {
        set({ customRpcUrl });
        if (get().network === "local") {
          set({ horizonUrl: customRpcUrl });
          get().refreshBalances();
        }
      },
      setActiveIdentity: (identityId) => set({ activeIdentityId: identityId }),
      setTokenBalances: (balances) => set({ tokenBalances: balances }),
      setHydrationComplete: (ready) => set({ hydrationComplete: ready }),
      refreshBalances: async () => {
        const { activeIdentityId, network } = get();
        if (!activeIdentityId) {
          set({ tokenBalances: {} });
          return;
        }
        try {
          const xlm = await fetchNativeXlmBalance(activeIdentityId, network);
          set({
            tokenBalances: {
              XLM: xlm.toFixed(2),
            },
          });
        } catch {
          // Don't hard-fail the IDE if Horizon is temporarily unavailable.
          set({ tokenBalances: {} });
        }
      },

      addTab: (path, name) => {
        const key = path.join("/");
        const { openTabs } = get();
        if (!openTabs.some(t => t.path.join("/") === key)) {
          set({ openTabs: [...openTabs, { path, name }] });
        }
        set({ activeTabPath: path });
      },

      closeTab: (path) => {
        const key = path.join("/");
        const { openTabs, activeTabPath, unsavedFiles } = get();
        const nextTabs = openTabs.filter(t => t.path.join("/") !== key);
        
        let nextActivePath = activeTabPath;
        if (activeTabPath.join("/") === key && nextTabs.length > 0) {
          nextActivePath = nextTabs[nextTabs.length - 1].path;
        } else if (nextTabs.length === 0) {
            nextActivePath = [];
        }

        const nextUnsaved = new Set(unsavedFiles);
        nextUnsaved.delete(key);

        set({ openTabs: nextTabs, activeTabPath: nextActivePath, unsavedFiles: nextUnsaved });
      },

      updateFileContent: (path, content) => {
        const key = path.join("/");
        const { files, unsavedFiles } = get();
        const nextFiles = cloneFiles(files);
        const node = findNode(nextFiles, path);
        if (node) {
          node.content = content;
          set({ files: nextFiles });
          
          // We could add logic here to compare with "saved" content if needed
          // for now we'll just mark it as unsaved if it's changing
          const nextUnsaved = new Set(unsavedFiles);
          nextUnsaved.add(key);
          set({ unsavedFiles: nextUnsaved });
        }
      },

      markSaved: (path) => {
        const key = path.join("/");
        const { unsavedFiles } = get();
        const nextUnsaved = new Set(unsavedFiles);
        nextUnsaved.delete(key);
        set({ unsavedFiles: nextUnsaved });
      },

      createFile: (parentPath, name, content = "") => {
        const { files } = get();
        const nextFiles = cloneFiles(files);
        const parent = parentPath.length === 0 ? nextFiles : findNode(nextFiles, parentPath)?.children;
        if (parent) {
          parent.push({
            name,
            type: "file",
            language: name.endsWith(".rs") ? "rust" : name.endsWith(".toml") ? "toml" : "text",
            content,
          });
          set({ files: nextFiles });
          get().addTab([...parentPath, name], name);
        }
      },

      createFolder: (parentPath, name) => {
        const { files } = get();
        const nextFiles = cloneFiles(files);
        const parent = parentPath.length === 0 ? nextFiles : findNode(nextFiles, parentPath)?.children;
        if (parent) {
          parent.push({ name, type: "folder", children: [] });
          set({ files: nextFiles });
        }
      },

      deleteNode: (path) => {
        const { files, activeTabPath } = get();
        const nextFiles = cloneFiles(files);
        const parent = findParent(nextFiles, path);
        if (parent) {
          const idx = parent.findIndex(n => n.name === path[path.length - 1]);
          if (idx !== -1) {
            parent.splice(idx, 1);
            set({ files: nextFiles });
            
            // Close tab if open
            get().closeTab(path);
          }
        }
      },

      renameNode: (path, newName) => {
        const { files, openTabs, activeTabPath } = get();
        const oldKey = path.join("/");
        const nextPath = [...path.slice(0, -1), newName];
        const nextKey = nextPath.join("/");

        const nextFiles = cloneFiles(files);
        const node = findNode(nextFiles, path);
        if (node) {
          node.name = newName;
          
          // Update tabs
          const nextTabs = openTabs.map(t => {
            const tKey = t.path.join("/");
            if (tKey === oldKey || tKey.startsWith(oldKey + "/")) {
              const updatedPath = [...nextPath, ...t.path.slice(path.length)];
              return { ...t, path: updatedPath, name: updatedPath[updatedPath.length - 1] };
            }
            return t;
          });

          // Update active tab
          let nextActivePath = activeTabPath;
          if (activeTabPath.join("/") === oldKey || activeTabPath.join("/").startsWith(oldKey + "/")) {
            nextActivePath = [...nextPath, ...activeTabPath.slice(path.length)];
          }

          set({ 
            files: nextFiles, 
            openTabs: nextTabs, 
            activeTabPath: nextActivePath 
          });
        }
      }
    }),
    {
      name: 'stellar-suite-ide-store',
      partialize: (state) => ({
        network: state.network,
        activeIdentityId: state.activeIdentityId,
        identities: state.identities,
        customRpcUrl: state.customRpcUrl,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const network = state.network || "testnet";
          const config = NETWORK_CONFIG[network] || NETWORK_CONFIG.testnet;
          state.setNetwork(network);

          if (state.customRpcUrl) {
            state.setCustomRpcUrl(state.customRpcUrl);
          }

          state.refreshBalances().finally(() => {
            state.setHydrationComplete(true);
          });
        }
      },
    }
  )
);
