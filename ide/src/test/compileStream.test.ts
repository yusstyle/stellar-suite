import { describe, expect, it } from "vitest";
import { createStreamProcessor, formatTerminalChunk } from "@/utils/compileStream";

describe("compileStream", () => {
  it("formats line endings for terminal output", () => {
    expect(formatTerminalChunk("line 1\nline 2")).toBe("line 1\r\nline 2");
    expect(formatTerminalChunk("line 1\r\nline 2")).toBe("line 1\r\nline 2");
  });

  it("keeps the raw output while writing formatted terminal chunks", () => {
    const writes: string[] = [];
    const processor = createStreamProcessor({
      onTerminalData: (chunk) => writes.push(chunk),
    });

    processor.push("stderr line\n");
    processor.push("stdout line");

    expect(processor.getOutput()).toBe("stderr line\nstdout line");
    expect(writes).toEqual(["stderr line\r\n", "stdout line"]);
  });
});
