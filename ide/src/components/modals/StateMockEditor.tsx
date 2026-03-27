"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MockLedgerEntry,
  MockLedgerEntryType,
  MockLedgerState,
} from "@/store/workspaceStore";

interface StateMockEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: MockLedgerState;
  onSave: (next: MockLedgerState) => void;
}

type PresetOption = "funded-account" | "admin-contract" | "token-holder";

const ENTRY_TYPE_OPTIONS: { label: string; value: MockLedgerEntryType }[] = [
  { label: "Account", value: "account" },
  { label: "Contract Data", value: "contractData" },
  { label: "Token Balance", value: "tokenBalance" },
];

function createEmptyEntry(type: MockLedgerEntryType = "account"): MockLedgerEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    key: "",
    value: "",
    metadata: {},
  };
}

function deepCloneState(state: MockLedgerState): MockLedgerState {
  return {
    entries: state.entries.map((entry) => ({
      ...entry,
      metadata: entry.metadata ? { ...entry.metadata } : {},
    })),
  };
}

function applyPreset(preset: PresetOption): MockLedgerState {
  switch (preset) {
    case "funded-account":
      return {
        entries: [
          {
            id: `preset-funded-${Date.now()}`,
            type: "account",
            key: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            value: "10000000000000",
            metadata: {
              label: "Funded account",
              asset: "native",
            },
          },
        ],
      };

    case "admin-contract":
      return {
        entries: [
          {
            id: `preset-admin-${Date.now()}`,
            type: "contractData",
            key: "admin",
            value: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            metadata: {
              contractId: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
              label: "Admin state",
            },
          },
        ],
      };

    case "token-holder":
      return {
        entries: [
          {
            id: `preset-holder-${Date.now()}`,
            type: "tokenBalance",
            key: "holder",
            value: "1000000000",
            metadata: {
              contractId: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
              address: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
              label: "Token holder",
            },
          },
        ],
      };

    default:
      return { entries: [] };
  }
}

function getEntryHint(type: MockLedgerEntryType) {
  switch (type) {
    case "account":
      return {
        keyLabel: "Account Address",
        keyPlaceholder: "G...",
        valueLabel: "Balance",
        valuePlaceholder: "10000000000000",
        metadataLabel: "Optional Metadata (JSON)",
      };
    case "contractData":
      return {
        keyLabel: "Data Key",
        keyPlaceholder: "admin",
        valueLabel: "Data Value",
        valuePlaceholder: '{"address":"G..."}',
        metadataLabel: "Optional Metadata (JSON)",
      };
    case "tokenBalance":
      return {
        keyLabel: "Holder Key",
        keyPlaceholder: "holder",
        valueLabel: "Token Amount",
        valuePlaceholder: "1000000000",
        metadataLabel: "Optional Metadata (JSON)",
      };
    default:
      return {
        keyLabel: "Key",
        keyPlaceholder: "",
        valueLabel: "Value",
        valuePlaceholder: "",
        metadataLabel: "Optional Metadata (JSON)",
      };
  }
}

export default function StateMockEditor({
  open,
  onOpenChange,
  value,
  onSave,
}: StateMockEditorProps) {
  const [draft, setDraft] = useState<MockLedgerState>(() => deepCloneState(value));
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>("funded-account");

  useEffect(() => {
    if (open) {
      setDraft(deepCloneState(value));
    }
  }, [open, value]);

  const previewJson = useMemo(() => JSON.stringify(draft, null, 2), [draft]);

  const updateEntry = (id: string, patch: Partial<MockLedgerEntry>) => {
    setDraft((prev) => ({
      entries: prev.entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      ),
    }));
  };

  const updateMetadataText = (id: string, text: string) => {
    if (!text.trim()) {
      updateEntry(id, { metadata: {} });
      return;
    }

    try {
      const parsed = JSON.parse(text) as Record<string, string>;
      updateEntry(id, { metadata: parsed });
    } catch {
      updateEntry(id, { metadata: { __raw: text } });
    }
  };

  const addEntry = (type: MockLedgerEntryType = "account") => {
    setDraft((prev) => ({
      entries: [...prev.entries, createEmptyEntry(type)],
    }));
  };

  const removeEntry = (id: string) => {
    setDraft((prev) => ({
      entries: prev.entries.filter((entry) => entry.id !== id),
    }));
  };

  const loadPreset = () => {
    setDraft(applyPreset(selectedPreset));
  };

  const clearAll = () => {
    setDraft({ entries: [] });
  };

  const handleSave = () => {
    const normalized: MockLedgerState = {
      entries: draft.entries.map((entry) => ({
        ...entry,
        key: entry.key.trim(),
        value: entry.value.trim(),
        metadata: entry.metadata ?? {},
      })),
    };

    onSave(normalized);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>State Editor</DialogTitle>
            <DialogDescription>
              Define mock ledger state overrides for simulations and tests.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[1.5fr_1fr]">
            <div className="min-h-0 border-r">
              <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
                <div className="flex items-center gap-2">
                  <Button type="button" onClick={() => addEntry()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Entry
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearAll}
                    disabled={draft.entries.length === 0}
                  >
                    Clear All
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value as PresetOption)}
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    aria-label="Preset selector"
                  >
                    <option value="funded-account">Funded account</option>
                    <option value="admin-contract">Admin contract state</option>
                    <option value="token-holder">Token holder</option>
                  </select>

                  <Button type="button" variant="secondary" onClick={loadPreset}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Load Preset
                  </Button>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-4">
                {draft.entries.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No mock ledger entries yet. Add an entry or load a preset to begin.
                  </div>
                ) : (
                  draft.entries.map((entry, index) => {
                    const hint = getEntryHint(entry.type);

                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl border bg-card p-4 shadow-sm"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">
                              Entry {index + 1}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Configure ledger key/value override
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEntry(entry.id)}
                            aria-label={`Remove entry ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`${entry.id}-type`}>Entry Type</Label>
                            <select
                              id={`${entry.id}-type`}
                              value={entry.type}
                              onChange={(e) =>
                                updateEntry(entry.id, {
                                  type: e.target.value as MockLedgerEntryType,
                                })
                              }
                              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            >
                              {ENTRY_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`${entry.id}-key`}>
                              {hint.keyLabel}
                            </Label>
                            <Input
                              id={`${entry.id}-key`}
                              value={entry.key}
                              placeholder={hint.keyPlaceholder}
                              onChange={(e) =>
                                updateEntry(entry.id, { key: e.target.value })
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <Label htmlFor={`${entry.id}-value`}>
                            {hint.valueLabel}
                          </Label>
                          <Textarea
                            id={`${entry.id}-value`}
                            value={entry.value}
                            placeholder={hint.valuePlaceholder}
                            onChange={(e) =>
                              updateEntry(entry.id, { value: e.target.value })
                            }
                            className="min-h-[88px]"
                          />
                        </div>

                        <div className="mt-4 space-y-2">
                          <Label htmlFor={`${entry.id}-metadata`}>
                            {hint.metadataLabel}
                          </Label>
                          <Textarea
                            id={`${entry.id}-metadata`}
                            defaultValue={JSON.stringify(entry.metadata ?? {}, null, 2)}
                            placeholder='{"contractId":"C...","label":"Example"}'
                            onBlur={(e) =>
                              updateMetadataText(entry.id, e.target.value)
                            }
                            className="min-h-[88px] font-mono text-xs"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="min-h-0 bg-muted/20">
              <div className="border-b px-6 py-4">
                <div className="text-sm font-semibold">Ledger Snapshot JSON</div>
                <div className="text-xs text-muted-foreground">
                  Preview of the persisted mock ledger override structure
                </div>
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                <pre className="whitespace-pre-wrap break-words rounded-lg border bg-background p-4 text-xs">
                  {previewJson}
                </pre>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              Save State
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
