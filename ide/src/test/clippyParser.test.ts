import { describe, expect, it } from "vitest";

import { parseClippyOutput } from "@/utils/clippyParser";

const makeClippyMessage = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    reason: "compiler-message",
    message: {
      message: "unneeded return statement",
      code: { code: "clippy::needless_return" },
      level: "warning",
      spans: [
        {
          file_name: "/workspace/hello_world/src/lib.rs",
          line_start: 10,
          line_end: 10,
          column_start: 9,
          column_end: 18,
          is_primary: true,
          suggested_replacement: "",
          suggestion_applicability: "MachineApplicable",
        },
      ],
      children: [],
      ...overrides,
    },
  });

describe("clippyParser", () => {
  it("parses clippy diagnostics and lints", () => {
    const output = makeClippyMessage();
    const result = parseClippyOutput(output, "hello_world");

    expect(result.diagnostics).toHaveLength(1);
    expect(result.lints).toHaveLength(1);
    expect(result.lints[0]).toMatchObject({
      fileId: "hello_world/lib.rs",
      lintCode: "clippy::needless_return",
      category: "style",
      severity: "warning",
    });
  });

  it("extracts machine-applicable auto-fixes", () => {
    const output = makeClippyMessage();
    const result = parseClippyOutput(output, "hello_world");

    expect(result.lints[0].autoFix).toMatchObject({
      fileId: "hello_world/lib.rs",
      line: 10,
      column: 9,
      applicability: "MachineApplicable",
    });
  });

  it("ignores non-clippy compiler diagnostics", () => {
    const output = JSON.stringify({
      reason: "compiler-message",
      message: {
        message: "mismatched types",
        code: { code: "E0308" },
        level: "error",
        spans: [],
        children: [],
      },
    });

    const result = parseClippyOutput(output, "hello_world");
    expect(result.lints).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it("categorizes correctness/performance based on lint code", () => {
    const correctness = makeClippyMessage({
      code: { code: "clippy::unwrap_used" },
    });
    const performance = makeClippyMessage({
      code: { code: "clippy::inefficient_to_string" },
    });

    const output = `${correctness}\n${performance}`;
    const result = parseClippyOutput(output, "hello_world");

    expect(result.lints[0].category).toBe("correctness");
    expect(result.lints[1].category).toBe("performance");
  });
});
