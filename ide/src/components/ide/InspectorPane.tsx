"use client";

import { useState, useCallback } from "react";
import {
  FileSearch,
  HardDrive,
  Cpu,
  Coins,
  Upload,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { analyzeWasm, type WasmAnalysis } from "@/utils/wasmParser";

type InspectorState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; analysis: WasmAnalysis; fileName: string };

export function InspectorPane() {
  const [state, setState] = useState<InspectorState>({ status: "idle" });

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.name.endsWith(".wasm")) {
        setState({ status: "error", message: "Please select a .wasm file." });
        return;
      }

      setState({ status: "loading" });

      try {
        const buffer = await file.arrayBuffer();
        const analysis = await analyzeWasm(buffer);
        setState({ status: "ready", analysis, fileName: file.name });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to parse WASM binary.";
        setState({ status: "error", message });
      }

      e.target.value = "";
    },
    [],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <FileSearch className="h-4 w-4 text-primary" />
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
          Contract Inspector
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          Advanced
        </span>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {/* Upload area */}
        <label
          htmlFor="wasm-upload"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border px-4 py-5 text-center transition-colors hover:border-primary hover:bg-primary/5"
        >
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="font-mono text-xs text-muted-foreground">
            Click to load a <strong>.wasm</strong> file
          </span>
          <input
            id="wasm-upload"
            type="file"
            accept=".wasm"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>

        {/* Loading */}
        {state.status === "loading" && (
          <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-mono text-xs">Analyzing binary…</span>
          </div>
        )}

        {/* Error */}
        {state.status === "error" && (
          <div className="mt-4 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span className="font-mono text-xs text-destructive">
              {state.message}
            </span>
          </div>
        )}

        {/* Results — hidden behind accordion as required */}
        {state.status === "ready" && (
          <Accordion
            type="multiple"
            defaultValue={["size", "exports", "cost"]}
            className="mt-4"
          >
            {/* --- Binary Size --- */}
            <AccordionItem value="size" className="border-border">
              <AccordionTrigger className="py-2 text-xs hover:no-underline">
                <span className="flex items-center gap-2 font-mono text-xs">
                  <HardDrive className="h-3.5 w-3.5 text-primary" />
                  Binary Size
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-0">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      File
                    </span>
                    <span className="font-mono text-xs text-foreground">
                      {state.fileName}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Size
                    </span>
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {state.analysis.sizeFormatted}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Raw bytes
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {state.analysis.sizeBytes.toLocaleString()}
                    </span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* --- Exported Functions (raw) --- */}
            <AccordionItem value="exports" className="border-border">
              <AccordionTrigger className="py-2 text-xs hover:no-underline">
                <span className="flex items-center gap-2 font-mono text-xs">
                  <Cpu className="h-3.5 w-3.5 text-primary" />
                  Exports
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {state.analysis.exports.length}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-0">
                {state.analysis.exports.length === 0 ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    No exports found.
                  </span>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {state.analysis.exports.map((exp) => (
                      <div
                        key={`${exp.kind}-${exp.name}`}
                        className="flex items-center justify-between rounded px-2 py-1 font-mono text-xs odd:bg-muted/40"
                      >
                        <span className="truncate text-foreground">
                          {exp.name}
                        </span>
                        <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {exp.kind}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* --- Estimated Deploy Cost --- */}
            <AccordionItem value="cost" className="border-border">
              <AccordionTrigger className="py-2 text-xs hover:no-underline">
                <span className="flex items-center gap-2 font-mono text-xs">
                  <Coins className="h-3.5 w-3.5 text-primary" />
                  Estimated Deploy Cost
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-0">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Estimated fee
                    </span>
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {state.analysis.estimatedDeployCostXLM} XLM
                    </span>
                  </div>
                  <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                    Based on Soroban resource fee model:{" "}
                    0.01 XLM base + 0.035 XLM/KB for WASM upload.
                    Actual cost may vary with network conditions.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Idle hint */}
        {state.status === "idle" && (
          <p className="mt-4 text-center font-mono text-[10px] leading-relaxed text-muted-foreground">
            Load a compiled <code>.wasm</code> contract to inspect its binary
            size, exported functions, and estimated deployment cost.
          </p>
        )}
      </div>
    </div>
  );
}
