import { GitBranch, Circle, Save } from "lucide-react";
import { useWorkspaceStore } from "@/store/workspaceStore";

import { NetworkSelector } from './NetworkSelector';
import { NetworkKey } from '@/lib/networkConfig';

interface StatusBarProps {
  language?: string;
}

export function StatusBar({ language: propLanguage }: StatusBarProps) {
  const {
    cursorPos,
    network,
    horizonUrl,
    customRpcUrl,
    setNetwork,
    setCustomRpcUrl,
    unsavedFiles,
    files,
    activeTabPath,
  } = useWorkspaceStore();

  const activeFile = files.find(f => f.name === activeTabPath[activeTabPath.length - 1]);
  const language = propLanguage || activeFile?.language || "rust";
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
          onNetworkChange={setNetwork}
          onCustomRpcUrlChange={setCustomRpcUrl}
        />
        {unsavedFiles.size > 0 && (
          <div className="flex items-center gap-1 text-primary-foreground/70">
            <Save className="h-2.5 w-2.5" />
            <span>{unsavedFiles.size} unsaved</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-0.5">
        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        <span className="hidden sm:inline">{language}</span>
        <span className="hidden md:inline">UTF-8</span>
      </div>
    </div>
  );
}
