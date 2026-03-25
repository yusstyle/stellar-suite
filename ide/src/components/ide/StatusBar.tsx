import { GitBranch, Circle, Save } from "lucide-react";

import { NetworkSelector } from './NetworkSelector';
import { NetworkKey } from '@/lib/networkConfig';

interface StatusBarProps {
  language: string;
  line: number;
  col: number;
  network: NetworkKey;
  horizonUrl: string;
  customRpcUrl: string;
  onNetworkChange: (network: NetworkKey) => void;
  onCustomRpcUrlChange: (url: string) => void;
  unsavedCount?: number;
}

export function StatusBar({ language, line, col, network, horizonUrl, customRpcUrl, onNetworkChange, onCustomRpcUrlChange, unsavedCount = 0 }: StatusBarProps) {
  return (
    <div className="flex flex-col bg-primary text-primary-foreground text-[10px] md:text-[11px] font-mono">
      <div className="flex items-center justify-between px-2 md:px-3 py-0.5">
        <div className="flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          <span className="hidden sm:inline">main</span>
        </div>
        <NetworkSelector
          network={network}
          horizonUrl={horizonUrl}
          customRpcUrl={customRpcUrl}
          onNetworkChange={onNetworkChange}
          onCustomRpcUrlChange={onCustomRpcUrlChange}
        />
        {unsavedCount > 0 && (
          <div className="flex items-center gap-1 text-primary-foreground/70">
            <Save className="h-2.5 w-2.5" />
            <span>{unsavedCount} unsaved</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-0.5">
        <span>Ln {line}, Col {col}</span>
        <span className="hidden sm:inline">{language}</span>
        <span className="hidden md:inline">UTF-8</span>
      </div>
    </div>
  );
}
