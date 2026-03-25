import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Terminal as TermIcon, Trash2 } from "lucide-react";

interface TerminalProps {
  output: string;
  isExpanded: boolean;
  onToggle: () => void;
  onClear?: () => void;
}

export function Terminal({ output, isExpanded, onToggle, onClear }: TerminalProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isExpanded || !viewportRef.current) {
      return;
    }

    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [output, isExpanded]);

  return (
    <div className="flex h-full flex-col border-t border-border bg-terminal-bg">
      <button
        onClick={onToggle}
        className="flex items-center justify-between border-b border-border px-2 py-1.5 text-xs font-mono text-muted-foreground transition-colors hover:text-foreground md:px-3"
      >
        <div className="flex items-center gap-2">
          <TermIcon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider md:text-xs">
            Console
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isExpanded && onClear && output.length > 0 && (
            <span
              role="button"
              title="Clear console"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div ref={viewportRef} className="flex-1 overflow-y-auto p-2">
          {output.length === 0 ? (
            <div className="p-2 font-mono text-[10px] text-muted-foreground/50 md:text-xs">
              <span className="text-terminal-cyan">$</span> Ready. Build a contract to see output...
              <span className="ml-0.5 inline-block h-3.5 w-2 animate-blink bg-foreground/70" />
            </div>
          ) : (
            <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-5 text-foreground md:text-xs">
              {output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
