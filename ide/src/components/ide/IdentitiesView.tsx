import { useEffect } from "react";
import { KeyRound, Wallet2, Loader2 } from "lucide-react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useIdentityStore } from "@/store/useIdentityStore";

interface IdentitiesViewProps {
  network: string;
}

const shortKey = (key: string | null) => {
  if (!key) return "Not connected";
  if (key.length < 12) return key;
  return `${key.slice(0, 6)}...${key.slice(-6)}`;
};

export function IdentitiesView({ network }: IdentitiesViewProps) {
  const {
    identities,
    activeContext,
    webWalletPublicKey,
    balancesByPublicKey,
    loadingBalances,
    setActiveContext,
    refreshBalances,
  } = useIdentityStore();

  useEffect(() => {
    refreshBalances(network);
  }, [network, identities, webWalletPublicKey, refreshBalances]);

  const currentValue =
    activeContext?.type === "local-keypair"
      ? `local:${activeContext.publicKey}`
      : "wallet";

  return (
    <div className="h-full bg-sidebar flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-sidebar-border">
        Identities
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <RadioGroup
          value={currentValue}
          onValueChange={(value) => {
            if (value === "wallet") {
              setActiveContext({ type: "web-wallet" });
              return;
            }
            const publicKey = value.replace("local:", "");
            setActiveContext({ type: "local-keypair", publicKey });
          }}
          className="space-y-2"
          aria-label="Select active signing identity"
        >
          <label className="flex items-start gap-2 rounded-md border border-border bg-card/80 px-2 py-2 cursor-pointer">
            <RadioGroupItem value="wallet" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Wallet2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">Browser Wallet</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">
                {shortKey(webWalletPublicKey)}
              </p>
              {webWalletPublicKey && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {balancesByPublicKey[webWalletPublicKey] ?? "0.00"} XLM
                </p>
              )}
            </div>
          </label>

          {identities.map((identity) => (
            <label
              key={identity.publicKey}
              className="flex items-start gap-2 rounded-md border border-border bg-card/80 px-2 py-2 cursor-pointer"
            >
              <RadioGroupItem value={`local:${identity.publicKey}`} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-warning" />
                  <span className="text-xs font-medium text-foreground">{identity.nickname}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-1 truncate">
                  {identity.publicKey}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {balancesByPublicKey[identity.publicKey] ?? "0.00"} XLM
                </p>
              </div>
            </label>
          ))}
        </RadioGroup>

        {loadingBalances && (
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Refreshing balances...
          </div>
        )}
      </div>
    </div>
  );
}
