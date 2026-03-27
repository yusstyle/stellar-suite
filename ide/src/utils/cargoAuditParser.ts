export type AuditSeverity = "critical" | "high" | "medium" | "low" | "unknown";

export interface CargoAuditFinding {
  id: string;
  advisoryId: string;
  packageName: string;
  packageVersion: string;
  title: string;
  severity: AuditSeverity;
  url?: string;
  patchedVersions: string[];
  recommendation: string;
}

export interface CargoAuditParseResult {
  findings: CargoAuditFinding[];
  errors: string[];
}

interface CargoAuditJson {
  vulnerabilities?: {
    list?: Array<{
      advisory?: {
        id?: string;
        title?: string;
        url?: string;
        severity?: string;
        cvss?: string;
      };
      package?: {
        name?: string;
        version?: string;
      };
      versions?: {
        patched?: string[];
      };
    }>;
  };
  errors?: Array<{
    error?: string;
  }>;
}

const severityRank = ["low", "medium", "high", "critical"] as const;

function normalizeSeverity(value: string | undefined): AuditSeverity {
  if (!value) return "unknown";
  const lower = value.toLowerCase();

  if (lower.includes("critical")) return "critical";
  if (lower.includes("high")) return "high";
  if (lower.includes("medium")) return "medium";
  if (lower.includes("low")) return "low";

  return "unknown";
}

function recommendationFor(packageName: string, patched: string[]) {
  if (patched.length > 0) {
    return `Update ${packageName} to one of: ${patched.join(", ")}`;
  }
  return `Check ${packageName} release notes for a non-vulnerable version.`;
}

export function summarizeHighestSeverity(findings: CargoAuditFinding[]): AuditSeverity {
  let max = -1;

  for (const finding of findings) {
    const rank = severityRank.indexOf(finding.severity as (typeof severityRank)[number]);
    if (rank > max) {
      max = rank;
    }
  }

  return max === -1 ? "unknown" : severityRank[max];
}

export function parseCargoAuditOutput(raw: string): CargoAuditParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { findings: [], errors: ["cargo-audit returned empty output."] };
  }

  let parsed: CargoAuditJson;
  try {
    parsed = JSON.parse(trimmed) as CargoAuditJson;
  } catch {
    return {
      findings: [],
      errors: [trimmed],
    };
  }

  const findings = (parsed.vulnerabilities?.list ?? []).map((item, index) => {
    const advisoryId = item.advisory?.id || `unknown-${index}`;
    const packageName = item.package?.name || "unknown-package";
    const packageVersion = item.package?.version || "unknown-version";
    const patchedVersions = item.versions?.patched ?? [];

    return {
      id: `${advisoryId}:${packageName}:${packageVersion}`,
      advisoryId,
      packageName,
      packageVersion,
      title: item.advisory?.title || "Untitled advisory",
      severity: normalizeSeverity(item.advisory?.severity ?? item.advisory?.cvss),
      url: item.advisory?.url,
      patchedVersions,
      recommendation: recommendationFor(packageName, patchedVersions),
    } satisfies CargoAuditFinding;
  });

  const errors = (parsed.errors ?? [])
    .map((entry) => entry.error)
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);

  return {
    findings,
    errors,
  };
}
