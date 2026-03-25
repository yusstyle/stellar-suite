import { create } from "zustand";
import { Horizon, Keypair } from "@stellar/stellar-sdk";
import { get as idbGet, set as idbSet } from "idb-keyval";

export interface Identity {
  nickname: string;
  publicKey: string;
  secretKey: string;
}

export type ActiveContext =
  | { type: "web-wallet" }
  | { type: "local-keypair"; publicKey: string }
  | null;

interface IdentityStore {
  identities: Identity[];
  activeIdentity: Identity | null;
  activeContext: ActiveContext;
  webWalletPublicKey: string | null;
  balancesByPublicKey: Record<string, string>;
  loading: boolean;
  loadingBalances: boolean;
  loadIdentities: () => Promise<void>;
  addIdentity: (nickname: string, keypair: { publicKey: string; secretKey: string }) => Promise<void>;
  generateNewIdentity: (nickname: string) => Promise<void>;
  setActiveIdentity: (identity: Identity | null) => void;
  setActiveContext: (context: ActiveContext) => void;
  setWebWalletPublicKey: (publicKey: string | null) => void;
  deleteIdentity: (publicKey: string) => Promise<void>;
  refreshBalances: (network: string) => Promise<void>;
}

const STORAGE_KEY = "stellar_kit_identities";

const getHorizonUrl = (network: string) => {
  switch (network) {
    case "mainnet":
      return "https://horizon.stellar.org";
    case "futurenet":
      return "https://horizon-futurenet.stellar.org";
    case "testnet":
    default:
      return "https://horizon-testnet.stellar.org";
  }
};

const fetchXlmBalance = async (server: Horizon.Server, publicKey: string): Promise<string> => {
  try {
    const account = await server.loadAccount(publicKey);
    const native = account.balances.find((balance) => balance.asset_type === "native");
    const amount = Number(native?.balance ?? "0");
    return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
  } catch {
    return "0.00";
  }
};

export const useIdentityStore = create<IdentityStore>((set, get) => ({
  identities: [],
  activeIdentity: null,
  activeContext: { type: "web-wallet" },
  webWalletPublicKey: null,
  balancesByPublicKey: {},
  loading: true,
  loadingBalances: false,

  loadIdentities: async () => {
    set({ loading: true });
    try {
      const stored = (await idbGet<Identity[]>(STORAGE_KEY)) ?? [];
      const previousContext = get().activeContext;
      const nextActiveIdentity =
        previousContext?.type === "local-keypair"
          ? stored.find((id) => id.publicKey === previousContext.publicKey) ?? null
          : null;

      set({
        identities: stored,
        activeIdentity: nextActiveIdentity,
        activeContext: nextActiveIdentity ? previousContext : { type: "web-wallet" },
      });
    } catch (error) {
      console.error("Failed to load identities:", error);
    } finally {
      set({ loading: false });
    }
  },

  addIdentity: async (nickname, { publicKey, secretKey }) => {
    const { identities } = get();
    const newIdentity: Identity = { nickname, publicKey, secretKey };
    const nextIdentities = [...identities, newIdentity];
    await idbSet(STORAGE_KEY, nextIdentities);
    set({ identities: nextIdentities });
    if (get().activeContext?.type !== "local-keypair") {
      set({
        activeContext: { type: "local-keypair", publicKey },
        activeIdentity: newIdentity,
      });
    }
  },

  generateNewIdentity: async (nickname) => {
    const keypair = Keypair.random();
    await get().addIdentity(nickname, {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
    });
  },

  setActiveIdentity: (identity) =>
    set({
      activeIdentity: identity,
      activeContext: identity ? { type: "local-keypair", publicKey: identity.publicKey } : { type: "web-wallet" },
    }),

  setActiveContext: (context) => {
    if (!context) {
      set({ activeContext: null, activeIdentity: null });
      return;
    }
    if (context.type === "web-wallet") {
      set({ activeContext: context, activeIdentity: null });
      return;
    }
    const identity = get().identities.find((id) => id.publicKey === context.publicKey) ?? null;
    set({ activeContext: context, activeIdentity: identity });
  },

  setWebWalletPublicKey: (publicKey) => set({ webWalletPublicKey: publicKey }),

  deleteIdentity: async (publicKey) => {
    const { identities, activeContext } = get();
    const nextIdentities = identities.filter((id) => id.publicKey !== publicKey);
    await idbSet(STORAGE_KEY, nextIdentities);
    const nextState: Partial<IdentityStore> = {
      identities: nextIdentities,
    };
    if (activeContext?.type === "local-keypair" && activeContext.publicKey === publicKey) {
      nextState.activeContext = { type: "web-wallet" };
      nextState.activeIdentity = null;
    }
    set(nextState);
  },

  refreshBalances: async (network) => {
    const { identities, webWalletPublicKey } = get();
    const server = new Horizon.Server(getHorizonUrl(network));
    const keys = [...identities.map((id) => id.publicKey), ...(webWalletPublicKey ? [webWalletPublicKey] : [])];
    if (keys.length === 0) {
      set({ balancesByPublicKey: {} });
      return;
    }
    set({ loadingBalances: true });
    const entries = await Promise.all(keys.map(async (publicKey) => [publicKey, await fetchXlmBalance(server, publicKey)] as const));
    set({
      balancesByPublicKey: Object.fromEntries(entries),
      loadingBalances: false,
    });
  },
}));
