/**
 * coverageParser.ts
 *
 * Parses LCOV trace files and JSON coverage reports (llvm-cov / grcov output)
 * into a normalised CoverageData structure consumed by the editor and explorer.
 *
 * LCOV format reference:
 *   SF:<source file>
 *   DA:<line>,<hit count>
 *   end_of_record
 *
 * JSON format (llvm-cov export --format=json):
 *   { "data": [{ "files": [{ "filename": "...", "segments": [[line,col,count,...], ...] }] }] }
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Per-line hit count. 0 = uncovered, >0 = covered, -1 = not instrumented. */
export type LineCoverage = Record<number, number>;

/** Coverage summary for a single file. */
export interface FileCoverage {
  /** Virtual file ID matching the workspace store (e.g. "hello_world/lib.rs") */
  fileId: string;
  /** Map of 1-based line number → hit count */
  lines: LineCoverage;
  /** 0–100 */
  pct: number;
}

/** Project-wide coverage summary. */
export interface CoverageSummary {
  /** Per-file coverage keyed by fileId */
  files: Record<string, FileCoverage>;
  /** Overall project coverage percentage 0–100 */
  totalPct: number;
  /** ISO timestamp of when this report was parsed */
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Path normalisation (mirrors cargoParser.mapPathToVirtualId)
// ---------------------------------------------------------------------------

/**
 * Strips absolute prefixes and `src/` segments to produce a virtual file ID
 * matching the workspace store layout (e.g. "hello_world/lib.rs").
 */
export function normaliseFilePath(raw: string): string {
  const p = raw.replace(/\\/g, "/");

  // Already a short virtual path with no absolute prefix
  if (!p.startsWith("/") && !p.includes("/src/")) {
    if (p.startsWith("src/")) return p.replace(/^src\//, "");
    return p;
  }

  // /workspace/hello_world/src/lib.rs  →  hello_world/lib.rs
  // hello_world/src/lib.rs             →  hello_world/lib.rs  (relative with src/)
  const m = p.match(/(?:^|\/)([^/]+)\/src\/(.+)$/);
  if (m) return `${m[1]}/${m[2]}`;

  // /workspace/hello_world/lib.rs  →  hello_world/lib.rs
  const m2 = p.match(/\/([^/]+\/[^/]+)$/);
  if (m2) return m2[1];

  return p.split("/").slice(-2).join("/");
}

// ---------------------------------------------------------------------------
// Percentage helper
// ---------------------------------------------------------------------------

function calcPct(lines: LineCoverage): number {
  const instrumented = Object.values(lines).filter((h) => h >= 0);
  if (instrumented.length === 0) return 0;
  const covered = instrumented.filter((h) => h > 0).length;
  return Math.round((covered / instrumented.length) * 100);
}

// ---------------------------------------------------------------------------
// LCOV parser
// ---------------------------------------------------------------------------

/**
 * Parses an LCOV trace string into a CoverageSummary.
 *
 * @example
 * ```
 * SF:src/lib.rs
 * DA:1,1
 * DA:2,0
 * end_of_record
 * ```
 */
export function parseLcov(lcov: string): CoverageSummary {
  const files: Record<string, FileCoverage> = {};
  let currentId = "";
  let currentLines: LineCoverage = {};

  for (const raw of lcov.split(/\r?\n/)) {
    const line = raw.trim();

    if (line.startsWith("SF:")) {
      currentId = normaliseFilePath(line.slice(3));
      currentLines = {};
    } else if (line.startsWith("DA:")) {
      const [lineNo, hits] = line.slice(3).split(",").map(Number);
      if (!isNaN(lineNo) && !isNaN(hits)) {
        currentLines[lineNo] = hits;
      }
    } else if (line === "end_of_record" && currentId) {
      const pct = calcPct(currentLines);
      files[currentId] = { fileId: currentId, lines: currentLines, pct };
      currentId = "";
      currentLines = {};
    }
  }

  return {
    files,
    totalPct: calcTotalPct(files),
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// llvm-cov JSON parser
// ---------------------------------------------------------------------------

interface LlvmSegment {
  0: number; // line
  1: number; // col
  2: number; // count
  3: boolean; // has count
  4: boolean; // is region entry
}

interface LlvmFile {
  filename: string;
  segments: LlvmSegment[];
}

interface LlvmData {
  files: LlvmFile[];
}

interface LlvmReport {
  data: LlvmData[];
}

/**
 * Parses the JSON output of `llvm-cov export --format=json` or
 * `grcov ... --output-type covdir`.
 */
export function parseLlvmJson(json: string): CoverageSummary {
  let report: LlvmReport;
  try {
    report = JSON.parse(json) as LlvmReport;
  } catch {
    return { files: {}, totalPct: 0, generatedAt: new Date().toISOString() };
  }

  const files: Record<string, FileCoverage> = {};

  for (const data of report.data ?? []) {
    for (const file of data.files ?? []) {
      const fileId = normaliseFilePath(file.filename);
      const lines: LineCoverage = {};

      for (const seg of file.segments ?? []) {
        const lineNo = seg[0];
        const count = seg[2];
        const hasCount = seg[3];
        if (!hasCount) continue;
        // Keep the max hit count if a line appears in multiple segments
        lines[lineNo] = Math.max(lines[lineNo] ?? 0, count);
      }

      const pct = calcPct(lines);
      files[fileId] = { fileId, lines, pct };
    }
  }

  return {
    files,
    totalPct: calcTotalPct(files),
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Auto-detect and parse
// ---------------------------------------------------------------------------

/**
 * Detects whether the input is LCOV or JSON and delegates accordingly.
 */
export function parseCoverageReport(raw: string): CoverageSummary {
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return parseLlvmJson(raw);
  }
  return parseLcov(raw);
}

// ---------------------------------------------------------------------------
// Project summary text
// ---------------------------------------------------------------------------

/**
 * Generates a human-readable project coverage summary string,
 * suitable for printing to the terminal output.
 */
export function formatCoverageSummary(summary: CoverageSummary): string {
  const lines: string[] = [
    `Coverage Report — ${summary.generatedAt}`,
    `${"─".repeat(52)}`,
  ];

  const sorted = Object.values(summary.files).sort((a, b) =>
    a.fileId.localeCompare(b.fileId),
  );

  for (const f of sorted) {
    const bar = coverageBar(f.pct);
    lines.push(`  ${f.fileId.padEnd(36)} ${bar}  ${String(f.pct).padStart(3)}%`);
  }

  lines.push(`${"─".repeat(52)}`);
  lines.push(`  ${"TOTAL".padEnd(36)} ${coverageBar(summary.totalPct)}  ${String(summary.totalPct).padStart(3)}%`);
  return lines.join("\n");
}

function coverageBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return `[${"█".repeat(filled)}${"░".repeat(10 - filled)}]`;
}

function calcTotalPct(files: Record<string, FileCoverage>): number {
  const all = Object.values(files);
  if (all.length === 0) return 0;
  return Math.round(all.reduce((s, f) => s + f.pct, 0) / all.length);
}
