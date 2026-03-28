import { create } from "zustand";
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import type { Identity } from "@/store/useIdentityStore";

export interface MultisigSession {
  xdr: string;
  originalXdr: string;
  signers: string[]; // public keys that have already signed
  threshold: number;
  networkPassphrase: string;
}

export type BroadcastStatus = "idle" | "broadcasting" | "success" | "error";

interface MultisigStore {
  session: MultisigSession | null;
  broadcastStatus: BroadcastStatus;
  broadcastError: string | null;
  broadcastHash: string | null;

  startSession: (xdr: string, threshold: number, networkPassphrase: string) => void;
  appendSignature: (identity: Identity) => string;
  setThreshold: (threshold: number) => void;
  clearSession: () => void;
  broadcastTransaction: (rpcUrl: string) => Promise<void>;
}

export const useMultisigStore = create<MultisigStore>((set, get) => ({
  session: null,
  broadcastStatus: "idle",
  broadcastError: null,
  broadcastHash: null,

  startSession: (xdr, threshold, networkPassphrase) => {
    set({
      session: {
        xdr,
        originalXdr: xdr,
        signers: [],
        threshold,
        networkPassphrase,
      },
      broadcastStatus: "idle",
      broadcastError: null,
      broadcastHash: null,
    });
  },

  appendSignature: (identity) => {
    const { session } = get();
    if (!session) throw new Error("No active multisig session.");
    if (session.signers.includes(identity.publicKey)) {
      throw new Error(`${identity.nickname} has already signed this transaction.`);
    }

    const tx = TransactionBuilder.fromXDR(session.xdr, session.networkPassphrase);
    tx.sign(Keypair.fromSecret(identity.secretKey));
    const newXdr = tx.toXDR();

    set({
      session: {
        ...session,
        xdr: newXdr,
        signers: [...session.signers, identity.publicKey],
      },
    });

    return newXdr;
  },

  setThreshold: (threshold) => {
    const { session } = get();
    if (!session) return;
    set({ session: { ...session, threshold } });
  },

  clearSession: () => {
    set({
      session: null,
      broadcastStatus: "idle",
      broadcastError: null,
      broadcastHash: null,
    });
  },

  broadcastTransaction: async (rpcUrl) => {
    const { session } = get();
    if (!session) throw new Error("No active multisig session.");

    set({ broadcastStatus: "broadcasting", broadcastError: null, broadcastHash: null });

    try {
      const allowHttp = rpcUrl.startsWith("http://");
      const server = new Server(rpcUrl, { allowHttp });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tx = TransactionBuilder.fromXDR(session.xdr, session.networkPassphrase) as any;
      const response = await server.sendTransaction(tx);

      if (response.status !== "PENDING" && response.status !== "DUPLICATE") {
        throw new Error(`Broadcast failed with status: ${response.status}`);
      }

      set({ broadcastStatus: "success", broadcastHash: response.hash });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Broadcast failed.";
      set({ broadcastStatus: "error", broadcastError: message });
      throw err;
    }
  },
}));
