import { useMemo } from "react";
import { Bug, Loader2, RefreshCcw, ShieldAlert, Sparkles, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CargoAuditFinding } from "@/utils/cargoAuditParser";
import type { ClippyCategory, ClippyLint } from "@/utils/clippyParser";

interface SecurityViewProps {
  clippyLints: ClippyLint[];
  clippyRunning: boolean;
  clippyError: string | null;
  onRunClippy: () => void;
  onApplyClippyFix: (lint: ClippyLint) => void;
  auditFindings: CargoAuditFinding[];
  auditRunning: boolean;
  auditError: string | null;
  onRunAudit: () => void;
  lastClippyRunAt?: string | null;
  lastAuditRunAt?: string | null;
}

const categoryLabel: Record<ClippyCategory, string> = {
  style: "Style",
  correctness: "Correctness",
  performance: "Performance",
};

const severityClass = {
  critical: "text-red-300 border-red-500/40 bg-red-500/10",
  high: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  medium: "text-yellow-200 border-yellow-500/40 bg-yellow-500/10",
  low: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  unknown: "text-muted-foreground border-border bg-muted/30",
};

export function SecurityView({
  clippyLints,
  clippyRunning,
  clippyError,
  onRunClippy,
  onApplyClippyFix,
  auditFindings,
  auditRunning,
  auditError,
  onRunAudit,
  lastClippyRunAt,
  lastAuditRunAt,
}: SecurityViewProps) {
  const lintGroups = useMemo(() => {
    const buckets: Record<ClippyCategory, ClippyLint[]> = {
      style: [],
      correctness: [],
      performance: [],
    };

    for (const lint of clippyLints) {
      buckets[lint.category].push(lint);
    }

    return buckets;
  }, [clippyLints]);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-sidebar-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Security & Quality
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <section className="space-y-2 rounded-md border border-border bg-card/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Clippy Lints
            </div>
            <Button type="button" size="sm" className="h-7 text-[10px]" onClick={onRunClippy} disabled={clippyRunning}>
              {clippyRunning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCcw className="mr-1 h-3 w-3" />}
              Run Clippy
            </Button>
          </div>

          {lastClippyRunAt ? <p className="text-[10px] text-muted-foreground">Last run: {lastClippyRunAt}</p> : null}
          {clippyError ? <p className="text-[10px] text-destructive">{clippyError}</p> : null}

          {clippyLints.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No clippy findings yet.</p>
          ) : (
            <div className="space-y-2">
              {(Object.keys(lintGroups) as ClippyCategory[]).map((category) => {
                const items = lintGroups[category];
                if (items.length === 0) {
                  return null;
                }

                return (
                  <div key={category} className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {categoryLabel[category]} ({items.length})
                    </div>
                    {items.map((lint) => (
                      <div key={lint.id} className="rounded border border-border bg-background/60 p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] text-foreground">{lint.title}</p>
                            <p className="truncate font-mono text-[10px] text-muted-foreground">
                              {lint.code} · {lint.fileId}:{lint.line}:{lint.column}
                            </p>
                          </div>
                          {lint.autoFix ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 shrink-0 gap-1 px-2 text-[10px]"
                              onClick={() => onApplyClippyFix(lint)}
                            >
                              <Wrench className="h-3 w-3" />
                              Auto-Fix
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-2 rounded-md border border-border bg-card/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-primary" />
              Dependency Audit
            </div>
            <Button type="button" size="sm" className="h-7 text-[10px]" onClick={onRunAudit} disabled={auditRunning}>
              {auditRunning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Bug className="mr-1 h-3 w-3" />}
              Run Audit
            </Button>
          </div>

          {lastAuditRunAt ? <p className="text-[10px] text-muted-foreground">Last run: {lastAuditRunAt}</p> : null}
          {auditError ? <p className="text-[10px] text-destructive">{auditError}</p> : null}

          {auditFindings.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No vulnerability findings yet.</p>
          ) : (
            <div className="space-y-2">
              {auditFindings.map((finding) => (
                <article key={finding.id} className="rounded border border-border bg-background/60 p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-foreground">{finding.advisoryId}</p>
                    <span className={`rounded border px-1.5 py-0.5 text-[9px] uppercase ${severityClass[finding.severity]}`}>
                      {finding.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground">{finding.title}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {finding.packageName} {finding.packageVersion}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{finding.recommendation}</p>
                  {finding.url ? (
                    <a
                      href={finding.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-[10px] text-primary underline underline-offset-2"
                    >
                      Advisory Details
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
