import { NETWORK_CONFIG, NetworkKey, DEFAULT_CUSTOM_RPC } from '@/lib/networkConfig';

interface NetworkSelectorProps {
  network: NetworkKey;
  horizonUrl: string;
  customRpcUrl: string;
  onNetworkChange: (network: NetworkKey) => void;
  onCustomRpcUrlChange: (url: string) => void;
}

export function NetworkSelector({ network, horizonUrl, customRpcUrl, onNetworkChange, onCustomRpcUrlChange }: NetworkSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="network-select" className="text-[10px] text-muted-foreground font-mono">
        Network
      </label>

      <select
        id="network-select"
        value={network}
        onChange={(e) => onNetworkChange(e.target.value as NetworkKey)}
        className="text-xs rounded border border-border bg-secondary text-foreground px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {Object.entries(NETWORK_CONFIG).map(([key, details]) => (
          <option key={key} value={key}>
            {details.label}
          </option>
        ))}
        <option value="local">Local</option>
      </select>

      {network === 'local' && (
        <input
          type="text"
          aria-label="Local RPC endpoint"
          placeholder={DEFAULT_CUSTOM_RPC}
          value={customRpcUrl}
          onChange={(e) => onCustomRpcUrlChange(e.target.value)}
          className="text-xs rounded border border-border bg-secondary text-foreground px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
          style={{ minWidth: 220 }}
        />
      )}

      <span className="text-[10px] text-muted-foreground font-mono">Horizon: {horizonUrl}</span>
    </div>
  );
}
