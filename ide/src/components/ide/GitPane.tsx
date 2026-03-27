import { useWorkspaceStore } from "@/store/workspaceStore";
import { FileText, GitBranch, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function GitPane() {
  const { unsavedFiles, setDiffViewPath, setShowExplorer } = useWorkspaceStore();

  const handleDoubleClick = (pathStr: string) => {
    const path = pathStr.split("/");
    setDiffViewPath(path);
  };

  const modifiedFiles = Array.from(unsavedFiles);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span>Source Control</span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {modifiedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <GitBranch className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No local changes found.</p>
            </div>
          ) : (
            <>
              <div className="px-3 mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Changes</span>
              </div>
              <div className="space-y-0.5">
                {modifiedFiles.map((pathStr) => (
                  <button
                    key={pathStr}
                    onDoubleClick={() => handleDoubleClick(pathStr)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted/50 group transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-warning shrink-0" />
                    <span className="truncate flex-1 text-left font-mono">{pathStr}</span>
                    <span className="text-[10px] text-warning font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Modified</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {modifiedFiles.length > 0 && (
        <div className="p-3 border-t border-sidebar-border bg-sidebar/50">
          <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-500">
            <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
            <p>Double-click a file to view diff with HEAD</p>
          </div>
        </div>
      )}
    </div>
  );
}
