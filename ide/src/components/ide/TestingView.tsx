"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  FlaskConical,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  PackagePlus,
  BookOpen,
} from "lucide-react";
import {
  PROPTEST_SNIPPETS,
  getSnippetsByCategory,
  type PropTestSnippet,
  type SnippetCategory,
} from "@/utils/proptestSnippets";
import { useWorkspaceStore } from "@/store/workspaceStore";
import TEMPLATES_RAW from "@/data/proptestTemplates.json";

// ---------------------------------------------------------------------------
// Template types (mirrors proptestTemplates.json shape)
// ---------------------------------------------------------------------------

interface PropTestTemplate {
  id: string;
  label: string;
  description: string;
  category: string;
  requiredDeps: string[];
  code: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_META: Record<
  SnippetCategory,
  { label: string; description: string }
> = {
  integers: {
    label: "Integer Ranges",
    description: "Token amounts, counters, timestamps, fees",
  },
  addresses: {
    label: "Address Generation",
    description: "Auth checks, multi-party transfers, uniqueness",
  },
  state: {
    label: "Contract State",
    description: "Storage round-trips, monotonicity, TTL",
  },
  composite: {
    label: "Composite Scenarios",
    description: "Auction ordering, escrow conservation",
  },
  harness: {
    label: "Test Harness",
    description: "Module scaffold and Cargo.toml setup",
  },
};

const CATEGORY_ORDER: SnippetCategory[] = [
  "harness",
  "integers",
  "addresses",
  "state",
  "composite",
];

// ---------------------------------------------------------------------------
// SnippetCard
// ---------------------------------------------------------------------------

interface SnippetCardProps {
  snippet: PropTestSnippet;
  onInsert: (snippet: PropTestSnippet) => void;
}

function SnippetCard({ snippet, onInsert }: SnippetCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(snippet.previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [snippet.previewText],
  );

  const handleInsert = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onInsert(snippet);
    },
    [onInsert, snippet],
  );

  return (
    <div className="rounded border border-border bg-card/50 text-[11px]">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-2 px-2.5 py-2 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="flex-1 font-mono font-medium text-foreground leading-snug">
          {snippet.label}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border px-2.5 pb-2.5 pt-2 space-y-2">
          {/* Description */}
          <p className="text-muted-foreground leading-relaxed">
            {snippet.description}
          </p>

          {/* Code preview */}
          <pre className="overflow-x-auto rounded bg-[#0d1117] p-2 font-mono text-[10px] text-[#e6edf3] leading-relaxed whitespace-pre">
            {snippet.previewText}
          </pre>

          {/* Required deps hint */}
          {snippet.requiredDeps.length > 0 && (
            <div className="flex items-start gap-1.5 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" aria-hidden="true" />
              <div className="space-y-0.5">
                <p className="font-semibold text-amber-300/80">
                  Required in Cargo.toml [dev-dependencies]
                </p>
                {snippet.requiredDeps.map((dep) => (
                  <p key={dep} className="font-mono text-[10px] text-amber-200/60">
                    {dep}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={handleInsert}
              className="flex items-center gap-1 rounded bg-primary/15 px-2 py-1 font-mono text-[10px] text-primary transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
            >
              <PackagePlus className="h-3 w-3" aria-hidden="true" />
              Insert into editor
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
              aria-label="Copy snippet to clipboard"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-400" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategorySection
// ---------------------------------------------------------------------------

interface CategorySectionProps {
  category: SnippetCategory;
  snippets: PropTestSnippet[];
  onInsert: (snippet: PropTestSnippet) => void;
}

function CategorySection({ category, snippets, onInsert }: CategorySectionProps) {
  const [open, setOpen] = useState(category === "harness");
  const meta = CATEGORY_META[category];

  return (
    <section className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {meta.label}
        </span>
        <span className="ml-auto rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
          {snippets.length}
        </span>
      </button>

      {open && (
        <div className="space-y-1.5 pl-1">
          <p className="px-1 text-[10px] text-muted-foreground">{meta.description}</p>
          {snippets.map((s) => (
            <SnippetCard key={s.id} snippet={s} onInsert={onInsert} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// TemplateCard — mirrors SnippetCard but reads from PropTestTemplate
// ---------------------------------------------------------------------------

const TEMPLATES: PropTestTemplate[] = TEMPLATES_RAW as PropTestTemplate[];

const CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
  range:     { label: "Range",     color: "text-blue-400/80 bg-blue-400/10 border-blue-400/20" },
  state:     { label: "State",     color: "text-emerald-400/80 bg-emerald-400/10 border-emerald-400/20" },
  shrinking: { label: "Shrinking", color: "text-amber-400/80 bg-amber-400/10 border-amber-400/20" },
};

interface TemplateCardProps {
  template: PropTestTemplate;
  onInsert: (code: string) => void;
}

function TemplateCard({ template, onInsert }: TemplateCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const badge = CATEGORY_BADGE[template.category] ?? {
    label: template.category,
    color: "text-muted-foreground bg-muted border-border",
  };

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(template.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [template.code],
  );

  const handleInsert = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onInsert(template.code);
    },
    [onInsert, template.code],
  );

  return (
    <div className="rounded border border-border bg-card/50 text-[11px]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-2 px-2.5 py-2 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/50"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <span className="flex-1 font-mono font-medium text-foreground leading-snug">
          {template.label}
        </span>
        {/* Category badge */}
        <span
          className={`shrink-0 rounded border px-1.5 py-px text-[9px] uppercase tracking-wider ${badge.color}`}
        >
          {badge.label}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border px-2.5 pb-2.5 pt-2 space-y-2">
          <p className="text-muted-foreground leading-relaxed">{template.description}</p>

          {/* Code preview */}
          <pre className="overflow-x-auto rounded bg-[#0d1117] p-2 font-mono text-[10px] text-[#e6edf3] leading-relaxed whitespace-pre">
            {template.code}
          </pre>

          {/* Deps hint */}
          {template.requiredDeps.length > 0 && (
            <div className="flex items-start gap-1.5 rounded border border-amber-500/20 bg-amber-500/5 px-2 py-1.5">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" aria-hidden="true" />
              <div className="space-y-0.5">
                <p className="font-semibold text-amber-300/80">
                  Required in Cargo.toml [dev-dependencies]
                </p>
                {template.requiredDeps.map((dep) => (
                  <p key={dep} className="font-mono text-[10px] text-amber-200/60">
                    {dep}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={handleInsert}
              className="flex items-center gap-1 rounded bg-primary/15 px-2 py-1 font-mono text-[10px] text-primary transition-colors hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
            >
              <PackagePlus className="h-3 w-3" aria-hidden="true" />
              Insert into editor
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded border border-border px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
              aria-label={`Copy ${template.label} to clipboard`}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-400" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TemplatesView — the three JSON-driven templates
// ---------------------------------------------------------------------------

export function TemplatesView() {
  const { activeTabPath, files, updateFileContent } = useWorkspaceStore();

  const activeFile = useMemo(() => {
    const find = (nodes: typeof files, parts: string[]): (typeof files)[0] | null => {
      for (const n of nodes) {
        if (n.name === parts[0]) {
          if (parts.length === 1) return n;
          if (n.children) return find(n.children, parts.slice(1));
        }
      }
      return null;
    };
    return find(files, activeTabPath);
  }, [files, activeTabPath]);

  const isRustFile =
    activeFile?.type === "file" && (activeFile.name?.endsWith(".rs") ?? false);

  const handleInsert = useCallback(
    (code: string) => {
      if (!isRustFile || !activeFile) return;
      const current = activeFile.content ?? "";
      const sep = current.endsWith("\n") ? "\n" : "\n\n";
      updateFileContent(activeTabPath, current + sep + code + "\n");
    },
    [activeFile, activeTabPath, isRustFile, updateFileContent],
  );

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2 shrink-0">
        <BookOpen className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Templates
        </span>
        <span className="ml-auto rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
          {TEMPLATES.length}
        </span>
      </div>

      {/* Active-file banner */}
      <div className="border-b border-sidebar-border px-3 py-1.5 text-[10px] shrink-0">
        {isRustFile ? (
          <span className="text-muted-foreground">
            Inserting into{" "}
            <span className="font-mono text-foreground">{activeTabPath.join("/")}</span>
          </span>
        ) : (
          <span className="text-amber-400/70">
            Open a <span className="font-mono">.rs</span> file to enable insertion
          </span>
        )}
      </div>

      {/* Template list */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {TEMPLATES.map((t) => (
          <TemplateCard key={t.id} template={t} onInsert={handleInsert} />
        ))}
      </div>
    </div>
  );
}
export function TestingView() {
  const { activeTabPath, files, updateFileContent } = useWorkspaceStore();

  // Resolve the active file so we can append to it
  const activeFile = useMemo(() => {
    const find = (
      nodes: typeof files,
      parts: string[],
    ): (typeof files)[0] | null => {
      for (const n of nodes) {
        if (n.name === parts[0]) {
          if (parts.length === 1) return n;
          if (n.children) return find(n.children, parts.slice(1));
        }
      }
      return null;
    };
    return find(files, activeTabPath);
  }, [files, activeTabPath]);

  const isRustFile =
    activeFile?.type === "file" &&
    (activeFile.name?.endsWith(".rs") ?? false);

  const handleInsert = useCallback(
    (snippet: PropTestSnippet) => {
      if (!isRustFile || !activeFile) return;

      const current = activeFile.content ?? "";
      // Append the plain-text version after a blank line separator
      const separator = current.endsWith("\n") ? "\n" : "\n\n";
      updateFileContent(activeTabPath, current + separator + snippet.previewText + "\n");
    },
    [activeFile, activeTabPath, isRustFile, updateFileContent],
  );

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({
        category: cat,
        snippets: getSnippetsByCategory(cat),
      })),
    [],
  );

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-2">
        <FlaskConical className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Proptest Snippets
        </span>
        <span className="ml-auto rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
          {PROPTEST_SNIPPETS.length}
        </span>
      </div>

      {/* Active-file context banner */}
      <div className="border-b border-sidebar-border px-3 py-1.5 text-[10px]">
        {isRustFile ? (
          <span className="text-muted-foreground">
            Inserting into{" "}
            <span className="font-mono text-foreground">
              {activeTabPath.join("/")}
            </span>
          </span>
        ) : (
          <span className="text-amber-400/70">
            Open a <span className="font-mono">.rs</span> file to enable
            &ldquo;Insert into editor&rdquo;
          </span>
        )}
      </div>

      {/* Snippet list */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {grouped.map(({ category, snippets }) => (
          <CategorySection
            key={category}
            category={category}
            snippets={snippets}
            onInsert={handleInsert}
          />
        ))}
      </div>
    </div>
  );
}
