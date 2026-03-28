"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Key, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteSSHKeyPair,
  generateSSHKeyPair,
  listSSHKeyPairs,
  type SSHKeyPair,
} from "@/lib/vcs/sshKeyManager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CopyButtonProps {
  text: string;
  label?: string;
}

function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Public key copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  }, [text]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-6 shrink-0 gap-1 px-2 text-[10px]"
      onClick={() => void handleCopy()}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {label}
    </Button>
  );
}

interface KeyCardProps {
  pair: SSHKeyPair;
  onDelete: (id: string) => void;
  deleting: boolean;
}

function KeyCard({ pair, onDelete, deleting }: KeyCardProps) {
  return (
    <article className="rounded border border-border bg-background/60 p-2 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-foreground truncate">{pair.name}</p>
          <p className="font-mono text-[9px] text-muted-foreground truncate">{pair.fingerprint}</p>
          <p className="text-[9px] text-muted-foreground">
            {pair.algorithm} · Added {formatDate(pair.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CopyButton text={pair.publicKey} label="Copy Public Key" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(pair.id)}
            disabled={deleting}
            aria-label={`Delete key ${pair.name}`}
          >
            {deleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Truncated public key preview */}
      <div className="rounded bg-muted/30 px-2 py-1">
        <p className="font-mono text-[9px] text-muted-foreground break-all line-clamp-2">
          {pair.publicKey}
        </p>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SSHKeyManager() {
  const [keys, setKeys] = useState<SSHKeyPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [keyName, setKeyName] = useState("");

  // Load keys on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSSHKeyPairs()
      .then((pairs) => {
        if (!cancelled) setKeys(pairs);
      })
      .catch(() => toast.error("Failed to load SSH keys."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    const trimmed = keyName.trim();
    if (!trimmed) {
      toast.error("Please enter a name for the key.");
      return;
    }

    setGenerating(true);
    try {
      const pair = await generateSSHKeyPair(trimmed);
      setKeys((prev) => [...prev, pair]);
      setKeyName("");
      setShowForm(false);
      toast.success(`SSH key "${pair.name}" generated.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Key generation failed.";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }, [keyName]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSSHKeyPair(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("SSH key removed.");
    } catch {
      toast.error("Failed to delete SSH key.");
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <section className="space-y-2 rounded-md border border-border bg-card/60 p-3">
      {/* Section header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Key className="h-3.5 w-3.5 text-primary" />
          SSH Keys
        </div>
        <Button
          type="button"
          size="sm"
          className="h-7 text-[10px]"
          onClick={() => setShowForm((v) => !v)}
          disabled={generating}
        >
          <Plus className="mr-1 h-3 w-3" />
          Generate New Keypair
        </Button>
      </div>

      {/* Security warning */}
      <div className="flex items-start gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 p-2">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
        <p className="text-[10px] text-amber-300/90 leading-relaxed">
          Private keys are stored in your browser&apos;s IndexedDB (origin-scoped). They are
          protected by the same-origin policy but{" "}
          <strong className="font-semibold">not passphrase-encrypted</strong>. Never share or
          export private key material. Only use this on trusted devices.
        </p>
      </div>

      {/* Inline generation form */}
      {showForm ? (
        <div className="flex items-center gap-2 rounded border border-border bg-background/40 p-2">
          <Input
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="Key name, e.g. work-laptop"
            className="h-7 flex-1 text-[11px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleGenerate();
              if (e.key === "Escape") {
                setShowForm(false);
                setKeyName("");
              }
            }}
            autoFocus
          />
          <Button
            type="button"
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => void handleGenerate()}
            disabled={generating || !keyName.trim()}
          >
            {generating ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => {
              setShowForm(false);
              setKeyName("");
            }}
            disabled={generating}
          >
            Cancel
          </Button>
        </div>
      ) : null}

      {/* Key list */}
      {loading ? (
        <div className="flex items-center gap-1.5 py-2">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <p className="text-[10px] text-muted-foreground">Loading keys…</p>
        </div>
      ) : keys.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          No SSH keys yet. Generate a keypair to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {keys.map((pair) => (
            <KeyCard
              key={pair.id}
              pair={pair}
              onDelete={(id) => void handleDelete(id)}
              deleting={deletingId === pair.id}
            />
          ))}
        </div>
      )}

      {/* Usage hint */}
      {keys.length > 0 ? (
        <p className="text-[10px] text-muted-foreground">
          Copy a public key and add it to{" "}
          <span className="font-mono">GitHub → Settings → SSH and GPG keys → New SSH key</span>.
        </p>
      ) : null}
    </section>
  );
}
