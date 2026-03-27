import { describe, expect, it } from "vitest";
import {
  formatCoverageSummary,
  normaliseFilePath,
  parseCoverageReport,
  parseLcov,
  parseLlvmJson,
} from "@/utils/coverageParser";

// ---------------------------------------------------------------------------
// normaliseFilePath
// ---------------------------------------------------------------------------
describe("normaliseFilePath", () => {
  it("strips absolute workspace prefix and src/ segment", () => {
    expect(normaliseFilePath("/workspace/hello_world/src/lib.rs")).toBe("hello_world/lib.rs");
    expect(normaliseFilePath("/workspace/token/src/lib.rs")).toBe("token/lib.rs");
  });

  it("handles relative src/ paths", () => {
    expect(normaliseFilePath("src/lib.rs")).toBe("lib.rs");
  });

  it("returns short virtual paths unchanged", () => {
    expect(normaliseFilePath("hello_world/lib.rs")).toBe("hello_world/lib.rs");
  });

  it("normalises Windows backslashes", () => {
    expect(normaliseFilePath("hello_world\\src\\lib.rs")).toBe("hello_world/lib.rs");
  });
});

// ---------------------------------------------------------------------------
// parseLcov
// ---------------------------------------------------------------------------
const LCOV_FIXTURE = `
SF:/workspace/hello_world/src/lib.rs
DA:1,1
DA:2,1
DA:3,0
DA:4,0
end_of_record
SF:/workspace/token/src/lib.rs
DA:1,3
DA:2,0
end_of_record
`.trim();

describe("parseLcov", () => {
  it("parses multiple SF blocks", () => {
    const summary = parseLcov(LCOV_FIXTURE);
    expect(Object.keys(summary.files)).toHaveLength(2);
    expect(summary.files["hello_world/lib.rs"]).toBeDefined();
    expect(summary.files["token/lib.rs"]).toBeDefined();
  });

  it("records correct hit counts", () => {
    const { files } = parseLcov(LCOV_FIXTURE);
    expect(files["hello_world/lib.rs"].lines[1]).toBe(1);
    expect(files["hello_world/lib.rs"].lines[3]).toBe(0);
  });

  it("calculates per-file percentage", () => {
    const { files } = parseLcov(LCOV_FIXTURE);
    // 2 covered / 4 total = 50%
    expect(files["hello_world/lib.rs"].pct).toBe(50);
    // 1 covered / 2 total = 50%
    expect(files["token/lib.rs"].pct).toBe(50);
  });

  it("calculates totalPct as average of file percentages", () => {
    const summary = parseLcov(LCOV_FIXTURE);
    expect(summary.totalPct).toBe(50);
  });

  it("sets generatedAt to a valid ISO string", () => {
    const { generatedAt } = parseLcov(LCOV_FIXTURE);
    expect(() => new Date(generatedAt)).not.toThrow();
    expect(new Date(generatedAt).getFullYear()).toBeGreaterThan(2020);
  });

  it("returns empty files for empty input", () => {
    const summary = parseLcov("");
    expect(Object.keys(summary.files)).toHaveLength(0);
    expect(summary.totalPct).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseLlvmJson
// ---------------------------------------------------------------------------
const LLVM_FIXTURE = JSON.stringify({
  data: [
    {
      files: [
        {
          filename: "/workspace/hello_world/src/lib.rs",
          segments: [
            [1, 1, 2, true, true],
            [2, 1, 0, true, true],
            [3, 1, 5, true, true],
          ],
        },
      ],
    },
  ],
});

describe("parseLlvmJson", () => {
  it("parses llvm-cov JSON format", () => {
    const summary = parseLlvmJson(LLVM_FIXTURE);
    expect(summary.files["hello_world/lib.rs"]).toBeDefined();
  });

  it("records correct hit counts from segments", () => {
    const { files } = parseLlvmJson(LLVM_FIXTURE);
    expect(files["hello_world/lib.rs"].lines[1]).toBe(2);
    expect(files["hello_world/lib.rs"].lines[2]).toBe(0);
    expect(files["hello_world/lib.rs"].lines[3]).toBe(5);
  });

  it("calculates percentage correctly", () => {
    const { files } = parseLlvmJson(LLVM_FIXTURE);
    // 2 covered / 3 total = 67%
    expect(files["hello_world/lib.rs"].pct).toBe(67);
  });

  it("skips segments where hasCount is false", () => {
    const json = JSON.stringify({
      data: [{ files: [{ filename: "src/lib.rs", segments: [[1, 1, 99, false, true]] }] }],
    });
    const { files } = parseLlvmJson(json);
    expect(files["lib.rs"]?.lines[1]).toBeUndefined();
  });

  it("returns empty summary for invalid JSON", () => {
    const summary = parseLlvmJson("not json");
    expect(Object.keys(summary.files)).toHaveLength(0);
    expect(summary.totalPct).toBe(0);
  });

  it("keeps max hit count when a line appears in multiple segments", () => {
    const json = JSON.stringify({
      data: [{
        files: [{
          filename: "src/lib.rs",
          segments: [
            [5, 1, 3, true, true],
            [5, 5, 7, true, true],
          ],
        }],
      }],
    });
    const { files } = parseLlvmJson(json);
    expect(files["lib.rs"].lines[5]).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// parseCoverageReport — auto-detect
// ---------------------------------------------------------------------------
describe("parseCoverageReport", () => {
  it("auto-detects LCOV format", () => {
    const summary = parseCoverageReport(LCOV_FIXTURE);
    expect(summary.files["hello_world/lib.rs"]).toBeDefined();
  });

  it("auto-detects JSON format", () => {
    const summary = parseCoverageReport(LLVM_FIXTURE);
    expect(summary.files["hello_world/lib.rs"]).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// formatCoverageSummary
// ---------------------------------------------------------------------------
describe("formatCoverageSummary", () => {
  it("includes file IDs and percentages", () => {
    const summary = parseLcov(LCOV_FIXTURE);
    const text = formatCoverageSummary(summary);
    expect(text).toContain("hello_world/lib.rs");
    expect(text).toContain("50%");
    expect(text).toContain("TOTAL");
  });

  it("renders a progress bar", () => {
    const summary = parseLcov(LCOV_FIXTURE);
    const text = formatCoverageSummary(summary);
    expect(text).toMatch(/\[█+░*\]/);
  });
});
