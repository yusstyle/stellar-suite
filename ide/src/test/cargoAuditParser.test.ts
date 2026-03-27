import { describe, expect, it } from "vitest";

import {
  parseCargoAuditOutput,
  summarizeHighestSeverity,
} from "@/utils/cargoAuditParser";

describe("cargoAuditParser", () => {
  it("parses vulnerability records", () => {
    const output = JSON.stringify({
      vulnerabilities: {
        list: [
          {
            advisory: {
              id: "RUSTSEC-2024-0001",
              title: "Use-after-free in foo",
              severity: "high",
              url: "https://rustsec.org/advisories/RUSTSEC-2024-0001",
            },
            package: {
              name: "foo",
              version: "1.0.0",
            },
            versions: {
              patched: [">=1.0.3"],
            },
          },
        ],
      },
    });

    const result = parseCargoAuditOutput(output);

    expect(result.errors).toEqual([]);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      advisoryId: "RUSTSEC-2024-0001",
      packageName: "foo",
      packageVersion: "1.0.0",
      severity: "high",
    });
    expect(result.findings[0].recommendation).toContain(">=1.0.3");
  });

  it("returns raw error text when output is not JSON", () => {
    const result = parseCargoAuditOutput("cargo audit: command not found");
    expect(result.findings).toEqual([]);
    expect(result.errors).toEqual(["cargo audit: command not found"]);
  });

  it("summarizes highest severity", () => {
    const output = JSON.stringify({
      vulnerabilities: {
        list: [
          {
            advisory: { id: "A", title: "low", severity: "low" },
            package: { name: "a", version: "1" },
            versions: { patched: [] },
          },
          {
            advisory: { id: "B", title: "critical", severity: "critical" },
            package: { name: "b", version: "2" },
            versions: { patched: [] },
          },
        ],
      },
    });

    const parsed = parseCargoAuditOutput(output);
    expect(summarizeHighestSeverity(parsed.findings)).toBe("critical");
  });
});
