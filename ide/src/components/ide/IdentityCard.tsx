import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { fundWithFriendbot } from "@/utils/friendbot";
import { useFileStore } from "@/store/useFileStore";

export function IdentityCard() {
  const { identities, activeIdentityId, setActiveIdentity, network, tokenBalances, refreshBalances } =
    useFileStore();

  const activeIdentity = useMemo(
    () => identities.find((i) => i.id === activeIdentityId) ?? null,
    [identities, activeIdentityId]
  );

  const canUseFriendbot = network === "testnet" || network === "futurenet";

  const [isFunding, setIsFunding] = useState(false);

  const xlmBalance = tokenBalances?.XLM ?? "0.00";

  const handleFund = async () => {
    if (!activeIdentity) return;
    setIsFunding(true);
    try {
      await fundWithFriendbot(activeIdentity.publicKey, network, { targetXlm: 10_000 });
      toast.success("Funded account with Friendbot.");
      await refreshBalances();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Friendbot funding failed.";
      toast.error(message);
    } finally {
      setIsFunding(false);
    }
  };

  return (
    <div className="p-3 border-b border-border bg-card">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 font-mono">
        Identity
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground font-mono block">Active identity</label>
        <select
          value={activeIdentityId ?? ""}
          onChange={(e) => setActiveIdentity(e.target.value || null)}
          className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={identities.length === 0}
          aria-label="Active identity"
        >
          {identities.map((id) => (
            <option key={id.id} value={id.id}>
              {id.name}
            </option>
          ))}
        </select>

        {activeIdentity ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-muted-foreground font-mono">Public key</div>
                <code className="text-[10px] bg-muted px-2 py-1 rounded font-mono truncate block">
                  {activeIdentity.publicKey}
                </code>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] text-muted-foreground font-mono">XLM balance</div>
                <div className="text-xs font-mono text-foreground">{Number(xlmBalance).toFixed(2)}</div>
              </div>

              {canUseFriendbot && (
                <button
                  type="button"
                  onClick={handleFund}
                  disabled={!activeIdentity || isFunding}
                  aria-busy={isFunding}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors"
                >
                  {isFunding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {isFunding ? "Funding..." : "Fund"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground/70 italic font-mono">No active identity</p>
        )}
      </div>
    </div>
  );
}

