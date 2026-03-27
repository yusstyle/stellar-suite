export type RustTestKind =
  | "test"
  | "tokio::test"
  | "soroban::test"
  | "soroban_sdk::testutils";

export interface RustDiscoveredTest {
  id: string;
  filePath: string;
  modulePath: string[];
  testName: string;
  kind: RustTestKind;
  line: number;
}

const TEST_RE =
  /#\[\s*(test|tokio::test|soroban::test|soroban_sdk::testutils)\s*(?:\([^\)]*\))?\s*\]\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)/gm;

const MOD_RE = /\bmod\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/g;

function lineNumberAt(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (source.charCodeAt(i) === 10) line++;
  }
  return line;
}

function modulePathAt(source: string, targetIndex: number): string[] {
  const mods: { name: string; index: number }[] = [];
  const modRegex = new RegExp(MOD_RE);
  let modMatch: RegExpExecArray | null;

  while ((modMatch = modRegex.exec(source)) !== null) {
    mods.push({ name: modMatch[1], index: modMatch.index });
  }

  const stack: { name: string; depth: number }[] = [];
  let modCursor = 0;
  let depth = 0;

  for (let i = 0; i < targetIndex; i++) {
    while (modCursor < mods.length && mods[modCursor].index <= i) {
      stack.push({ name: mods[modCursor].name, depth });
      modCursor++;
    }

    const ch = source[i];
    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
        stack.pop();
      }
    }
  }

  return stack.map((item) => item.name);
}

export function parseRustTests(
  filePath: string,
  source: string
): RustDiscoveredTest[] {
  if (!filePath.endsWith(".rs") || !source.includes("fn ")) return [];

  const results: RustDiscoveredTest[] = [];
  const regex = new RegExp(TEST_RE);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(source)) !== null) {
    const kind = match[1] as RustTestKind;
    const testName = match[2];
    const index = match.index;

    results.push({
      id: `${filePath}:${testName}:${index}`,
      filePath,
      modulePath: modulePathAt(source, index),
      testName,
      kind,
      line: lineNumberAt(source, index),
    });
  }

  return results;
}