import { type NetworkKey } from "@/lib/networkConfig";

const EXPLORER_BASE: Record<NetworkKey, string | null> = {
  mainnet: "https://stellar.expert/explorer/public",
  testnet: "https://stellar.expert/explorer/testnet",
  futurenet: "https://stellar.expert/explorer/futurenet",
  local: null,
};

export function txLink(
  network: NetworkKey,
  txHash: string | null | undefined,
): string | null {
  if (!txHash) return null;
  const base = EXPLORER_BASE[network];
  if (!base) return null;
  return `${base}/tx/${txHash}`;
}

export function truncateHash(txHash: string | null | undefined): string {
  if (!txHash) return "";
  if (txHash.length <= 10) return txHash;
  return `${txHash.slice(0, 6)}…${txHash.slice(-4)}`;
}
