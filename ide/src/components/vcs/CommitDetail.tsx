/**
 * CommitDetail.tsx
 *
 * Slide-in panel that shows full details for a selected commit:
 * author, date, full SHA, subject, and the list of changed files.
 */

import { memo } from "react";
import { X, FileText, FilePlus, FileMinus, GitCommit } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CommitNode } from "@/lib/vcs/historyService";

interface CommitDetailProps {
  commit: CommitNode;
  onClose: () => void;
}

const fileStatusIcon = {
  added:    <FilePlus  className="h-3 w-3 text-emerald-400 shrink-0" />,
  modified: <FileText  className="h-3 w-3 text-amber-400  shrink-0" />,
  deleted:  <FileMinus className="h-3 w-3 text-rose-400   shrink-0" />,
};

const fileStatusColour = {
  added:    "text-emerald-400",
  modified: "text-amber-400",
  deleted:  "text-rose-400",
};

export const CommitDetail = memo(function CommitDetail({
  commit,
  onClose,
}: CommitDetailProps) {
  return (
    <div className="flex flex-col border-t border-sidebar-border bg-sidebar text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
          <GitCommit className="h-3.5 w-3.5" />
          <span>Commit Detail</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close commit detail"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <ScrollArea className="max-h-64">
        <div className="px-3 py-2 space-y-2">
          {/* Subject */}
          <p className="font-medium text-foreground leading-snug">
            {commit.subject}
          </p>

          {/* Meta */}
          <dl className="space-y-0.5">
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-14 shrink-0">SHA</dt>
              <dd className="font-mono text-[10px] text-foreground truncate" title={commit.oid}>
                {commit.oid}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-14 shrink-0">Author</dt>
              <dd className="text-foreground truncate">{commit.author}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-14 shrink-0">Date</dt>
              <dd className="text-foreground">{commit.date}</dd>
            </div>
            {commit.parents.length > 0 && (
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-14 shrink-0">
                  {commit.parents.length > 1 ? "Parents" : "Parent"}
                </dt>
                <dd className="font-mono text-[10px] text-foreground space-y-0.5">
                  {commit.parents.map((p) => (
                    <div key={p} className="truncate" title={p}>
                      {p.slice(0, 7)}
                    </div>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          {/* Changed files */}
          {commit.changedFiles.length > 0 ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Changed files ({commit.changedFiles.length})
              </p>
              <ul className="space-y-0.5">
                {commit.changedFiles.map((f) => (
                  <li
                    key={f.path}
                    className="flex items-center gap-1.5"
                    title={f.path}
                  >
                    {fileStatusIcon[f.status]}
                    <span
                      className={`font-mono text-[10px] truncate ${fileStatusColour[f.status]}`}
                    >
                      {f.path}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground/60 italic">
              No file changes recorded.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
});
