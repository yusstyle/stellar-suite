/**
 * ContractsRepo.tsx
 *
 * Displays all contracts that have been successfully deployed during this or
 * previous sessions.  Entries are read from the DeployedContracts Zustand
 * slice, which is persisted to IndexedDB — so the list survives page
 * refreshes and browser restarts.
 *
 * Each card shows:
 *  • Contract name / label
 *  • Truncated contract ID (with a copy button)
 *  • Network badge (colour-coded to avoid Mainnet / Testnet confusion)
 *  • Human-readable deployment timestamp
 *
 * A trash icon lets the user remove an entry from the local repo.
 */

import { useState } from "react";
import { Copy, Check, Trash2, Database } from "lucide-react";
import {
  useDeployedContractsStore,
  DeployedContract,
} from "@/store/useDeployedContractsStore";
import { NetworkKey } from "@/lib/networkConfig";

// Network badge colours – keeps Mainnet visually distinct from Testnet
const NETWORK_COLOURS: Record<NetworkKey, string> = {
  mainnet: "bg-red-500/20 text-red-400 border-red-500/30",
  testnet: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  futurenet: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  local: "bg-green-500/20 text-green-400 border-green-500/30",
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function ContractCard({ contract }: { contract: DeployedContract }) {
  const removeContract = useDeployedContractsStore((s) => s.removeContract);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contract.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available (non-secure context)
    }
  };

  return (
    <div className="rounded border border-border bg-muted/40 p-2 space-y-1.5 hover:bg-muted/60 transition-colors">
      {/* Header row */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-semibold text-foreground truncate">
          {contract.name}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${NETWORK_COLOURS[contract.network]}`}
          >
            {contract.network}
          </span>
          <button
            onClick={() => removeContract(contract.id)}
            title="Remove from repo"
            className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Contract ID row */}
      <div className="flex items-center gap-1">
        <code className="text-[10px] font-mono text-primary truncate flex-1 bg-background/60 px-1.5 py-0.5 rounded">
          {contract.id}
        </code>
        <button
          onClick={handleCopy}
          title="Copy contract ID"
          className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Timestamp */}
      <p className="text-[9px] text-muted-foreground/70 font-mono">
        {formatTimestamp(contract.deployedAt)}
      </p>
    </div>
  );
}

export function ContractsRepo() {
  const deployedContracts = useDeployedContractsStore(
    (s) => s.deployedContracts
  );

  // Show newest first
  const sorted = [...deployedContracts].reverse();

  return (
    <div className="flex flex-col h-full">
      {/* Section header */}
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border flex items-center gap-1.5">
        <Database className="h-3 w-3" />
        Contracts Repo
        {deployedContracts.length > 0 && (
          <span className="ml-auto text-[10px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">
            {deployedContracts.length}
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sorted.length === 0 ? (
          <p className="text-[10px] text-muted-foreground/50 italic text-center pt-4">
            No contracts deployed yet.
            <br />
            Successful deployments appear here.
          </p>
        ) : (
          sorted.map((c) => <ContractCard key={c.id + c.deployedAt} contract={c} />)
        )}
      </div>
    </div>
  );
}
