import { useEffect, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { git } from "@/lib/git";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DiffEditorPaneProps {
  path: string[];
  currentContent: string;
  language: string;
}

export function DiffEditorPane({ path, currentContent, language }: DiffEditorPaneProps) {
  const [baseContent, setBaseContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setDiffViewPath } = useWorkspaceStore();

  useEffect(() => {
    async function fetchBase() {
      setIsLoading(true);
      try {
        const content = await git.readTree(path);
        setBaseContent(content);
      } catch (error) {
        console.error("Failed to fetch base content:", error);
        setBaseContent("");
      } finally {
        setIsLoading(false);
      }
    }
    fetchBase();
  }, [path]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg overflow-hidden border-border shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
            <span>Diff View</span>
          </div>
          <span className="text-xs font-mono font-medium text-foreground truncate max-w-[300px]">
            {path.join("/")} (HEAD ↔ Current)
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDiffViewPath(null)}
          className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
          title="Close Diff"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1">
        <DiffEditor
          original={baseContent ?? ""}
          modified={currentContent}
          language={language === "rust" ? "rust" : language}
          theme="vs-dark"
          options={{
            renderSideBySide: true,
            originalEditable: false,
            readOnly: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            minimap: { enabled: false },
            padding: { top: 10, bottom: 10 },
            diffWordWrap: "off",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            fontSize: 13,
            lineNumbers: "on",
            glyphMargin: true,
            folding: true,
            // Sync scrolling is enabled by default in Monaco DiffEditor
          }}
        />
      </div>
    </div>
  );
}
