import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ShieldOff,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitIgnorePattern {
  pattern: string;
  source: "user" | "recommended";
}

// ---------------------------------------------------------------------------
// Recommended defaults grouped by category
// ---------------------------------------------------------------------------

const RECOMMENDED_GROUPS: { label: string; patterns: string[] }[] = [
  {
    label: "Build Artifacts",
    patterns: ["target/", "dist/", "build/", "out/", ".next/", ".turbo/"],
  },
  {
    label: "Dependencies",
    patterns: ["node_modules/", ".pnp", ".pnp.js", "vendor/"],
  },
  {
    label: "Environment & Secrets",
    patterns: [".env", ".env.local", ".env.*.local", "*.pem", "*.key"],
  },
  {
    label: "OS & Editor",
    patterns: [
      ".DS_Store",
      "Thumbs.db",
      ".vscode/",
      ".idea/",
      "*.swp",
      "*.swo",
    ],
  },
  {
    label: "Logs & Cache",
    patterns: [
      "*.log",
      "npm-debug.log*",
      ".cache/",
      ".eslintcache",
      "*.tsbuildinfo",
    ],
  },
  {
    label: "Rust / Soroban",
    patterns: ["target/", "Cargo.lock", "*.wasm", ".soroban/"],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serializePatterns(patterns: GitIgnorePattern[]): string {
  const lines: string[] = [
    "# .gitignore — managed by Stellar Suite IDE",
    "",
  ];
  const recommended = patterns.filter((p) => p.source === "recommended");
  const user = patterns.filter((p) => p.source === "user");

  if (recommended.length > 0) {
    lines.push("# Recommended defaults");
    recommended.forEach((p) => lines.push(p.pattern));
    lines.push("");
  }
  if (user.length > 0) {
    lines.push("# Custom patterns");
    user.forEach((p) => lines.push(p.pattern));
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RecommendedGroup({
  label,
  patterns,
  activePatterns,
  onToggle,
}: {
  label: string;
  patterns: string[];
  activePatterns: Set<string>;
  onToggle: (pattern: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const allAdded = patterns.every((p) => activePatterns.has(p));

  return (
    <div className="border border-sidebar-border rounded mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {label}
        </span>
        {allAdded && (
          <Badge
            variant="outline"
            className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
          >
            All added
          </Badge>
        )}
      </button>

      {open && (
        <div className="px-3 pb-2 space-y-1">
          {patterns.map((pattern) => {
            const added = activePatterns.has(pattern);
            return (
              <div
                key={pattern}
                className="flex items-center justify-between gap-2 py-0.5"
              >
                <code className="text-[11px] font-mono text-muted-foreground flex-1 truncate">
                  {pattern}
                </code>
                <Button
                  size="sm"
                  variant={added ? "ghost" : "outline"}
                  className={`h-6 px-2 text-[10px] gap-1 ${
                    added
                      ? "text-emerald-400 hover:text-emerald-400"
                      : "text-foreground"
                  }`}
                  onClick={() => onToggle(pattern)}
                  aria-label={added ? `Remove ${pattern}` : `Add ${pattern}`}
                >
                  {added ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GitIgnoreEditor() {
  const [patterns, setPatterns] = useState<GitIgnorePattern[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"recommended" | "active">(
    "recommended"
  );

  const activeSet: Set<string> = new Set(patterns.map((p) => p.pattern));

  const addPattern = useCallback(
    (pattern: string, source: GitIgnorePattern["source"] = "user") => {
      const trimmed = pattern.trim();
      if (!trimmed || activeSet.has(trimmed)) return;
      setPatterns((prev) => [...prev, { pattern: trimmed, source }]);
      setSaved(false);
    },
    [activeSet]
  );

  const removePattern = useCallback((pattern: string) => {
    setPatterns((prev) => prev.filter((p) => p.pattern !== pattern));
    setSaved(false);
  }, []);

  const toggleRecommended = useCallback(
    (pattern: string) => {
      if (activeSet.has(pattern)) {
        removePattern(pattern);
      } else {
        addPattern(pattern, "recommended");
      }
    },
    [activeSet, addPattern, removePattern]
  );

  const handleAddCustom = () => {
    addPattern(customInput, "user");
    setCustomInput("");
  };

  const handleSave = () => {
    const content = serializePatterns(patterns);
    // In a real environment this would write to the virtual FS root .gitignore.
    // Here we store in localStorage as the IDE uses an in-memory/IDB virtual FS.
    localStorage.setItem("stellar-suite-gitignore", content);
    setSaved(true);
  };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-sidebar">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ShieldOff className="h-4 w-4" />
          <span>.gitignore Manager</span>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-sidebar-border text-xs">
          {(["recommended", "active"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-primary text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "active"
                ? `Active (${patterns.length})`
                : "Recommended"}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {activeTab === "recommended" ? (
              <>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Click a pattern to add it to your .gitignore. Expand a group
                  to see individual entries.
                </p>
                {RECOMMENDED_GROUPS.map((group) => (
                  <RecommendedGroup
                    key={group.label}
                    label={group.label}
                    patterns={group.patterns}
                    activePatterns={activeSet}
                    onToggle={toggleRecommended}
                  />
                ))}
              </>
            ) : (
              <>
                {patterns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ShieldOff className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No patterns yet. Add from Recommended or enter a custom
                      pattern below.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {patterns.map(({ pattern, source }) => (
                      <div
                        key={pattern}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/40 group"
                      >
                        <code className="flex-1 truncate font-mono text-[11px] text-foreground">
                          {pattern}
                        </code>
                        {source === "recommended" && (
                          <Badge
                            variant="outline"
                            className="text-[9px] border-primary/30 text-primary/70 shrink-0"
                          >
                            default
                          </Badge>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => removePattern(pattern)}
                              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                              aria-label={`Remove ${pattern}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs">
                            Remove pattern
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Custom pattern input */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Custom pattern (e.g. *.log)"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customInput.trim()) handleAddCustom();
              }}
              className="h-7 text-xs flex-1 font-mono"
              aria-label="Custom gitignore pattern"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[10px] gap-1"
              onClick={handleAddCustom}
              disabled={!customInput.trim()}
              aria-label="Add custom pattern"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>

          <Button
            size="sm"
            className="w-full h-7 text-[10px] gap-1"
            onClick={handleSave}
            disabled={patterns.length === 0}
            aria-label="Save .gitignore"
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Saved
              </>
            ) : (
              "Save .gitignore"
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
