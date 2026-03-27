import type { Diagnostic } from "@/utils/cargoParser";
import { mapPathToVirtualId } from "@/utils/cargoParser";

export type ClippyCategory = "style" | "correctness" | "performance";

export interface ClippyAutoFix {
  fileId: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  replacement: string;
  applicability: string;
}

export interface ClippyLint extends Diagnostic {
  id: string;
  lintCode: string;
  category: ClippyCategory;
  title: string;
  autoFix?: ClippyAutoFix;
}

interface CargoSpan {
  file_name: string;
  line_start: number;
  line_end: number;
  column_start: number;
  column_end: number;
  is_primary: boolean;
  suggested_replacement?: string | null;
  suggestion_applicability?: string | null;
}

interface CargoMessage {
  message: string;
  level: string;
  code: { code: string } | null;
  spans: CargoSpan[];
  children: CargoMessage[];
}

interface CargoCompilerMessage {
  reason: "compiler-message";
  message: CargoMessage;
}

const CORRECTNESS_HINTS = [
  "unwrap",
  "expect",
  "panic",
  "unsafe",
  "invalid",
  "overflow",
  "unreachable",
  "lossy",
  "checked",
];

const PERFORMANCE_HINTS = [
  "inefficient",
  "slow",
  "alloc",
  "clone",
  "collect",
  "large",
  "bytes",
  "vec",
  "string",
  "iter",
];

function inferCategory(lintCode: string): ClippyCategory {
  const code = lintCode.toLowerCase();

  if (CORRECTNESS_HINTS.some((hint) => code.includes(hint))) {
    return "correctness";
  }

  if (PERFORMANCE_HINTS.some((hint) => code.includes(hint))) {
    return "performance";
  }

  return "style";
}

function isMachineApplicable(span: CargoSpan): boolean {
  return (
    typeof span.suggested_replacement === "string" &&
    span.suggested_replacement.length >= 0 &&
    span.suggestion_applicability === "MachineApplicable"
  );
}

function findMachineApplicableFix(msg: CargoMessage, contractName: string): ClippyAutoFix | undefined {
  const queue: CargoMessage[] = [msg, ...msg.children];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    for (const span of current.spans) {
      if (!isMachineApplicable(span)) {
        continue;
      }

      return {
        fileId: mapPathToVirtualId(span.file_name, contractName),
        line: span.line_start,
        column: span.column_start,
        endLine: span.line_end,
        endColumn: span.column_end,
        replacement: span.suggested_replacement ?? "",
        applicability: span.suggestion_applicability ?? "Unspecified",
      };
    }

    queue.push(...current.children);
  }

  return undefined;
}

function mapSeverity(level: string): Diagnostic["severity"] {
  if (level === "error") return "error";
  if (level === "warning") return "warning";
  return "info";
}

export function parseClippyOutput(output: string, contractName = "hello_world") {
  const diagnostics: Diagnostic[] = [];
  const lints: ClippyLint[] = [];

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("{")) continue;

    let parsed: CargoCompilerMessage | { reason?: string };
    try {
      parsed = JSON.parse(line) as CargoCompilerMessage;
    } catch {
      continue;
    }

    if (parsed.reason !== "compiler-message") {
      continue;
    }

    const message = parsed.message;
    const lintCode = message.code?.code;
    if (!lintCode?.startsWith("clippy::")) {
      continue;
    }

    const primarySpans = message.spans.filter((span) => span.is_primary);
    if (primarySpans.length === 0) {
      continue;
    }

    const autoFix = findMachineApplicableFix(message, contractName);
    const category = inferCategory(lintCode);
    const severity = mapSeverity(message.level);

    for (const span of primarySpans) {
      const fileId = mapPathToVirtualId(span.file_name, contractName);
      const lintId = `${lintCode}:${fileId}:${span.line_start}:${span.column_start}:${message.message}`;

      const diagnostic: Diagnostic = {
        fileId,
        line: span.line_start,
        column: span.column_start,
        endLine: span.line_end,
        endColumn: span.column_end,
        message: message.message,
        severity,
        code: lintCode,
      };

      diagnostics.push(diagnostic);
      lints.push({
        ...diagnostic,
        id: lintId,
        lintCode,
        category,
        title: message.message,
        autoFix: autoFix && autoFix.fileId === fileId ? autoFix : undefined,
      });
    }
  }

  const dedupe = new Set<string>();
  const uniqueLints = lints.filter((lint) => {
    if (dedupe.has(lint.id)) return false;
    dedupe.add(lint.id);
    return true;
  });

  const diagnosticDedupe = new Set<string>();
  const uniqueDiagnostics = diagnostics.filter((diag) => {
    const key = `${diag.fileId}:${diag.line}:${diag.column}:${diag.message}:${diag.code}`;
    if (diagnosticDedupe.has(key)) return false;
    diagnosticDedupe.add(key);
    return true;
  });

  return {
    diagnostics: uniqueDiagnostics,
    lints: uniqueLints,
  };
}
