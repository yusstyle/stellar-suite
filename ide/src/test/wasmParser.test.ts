import { describe, it, expect } from "vitest";
import { analyzeWasm } from "@/utils/wasmParser";

// Minimal valid WASM module that exports a single function returning i32
// (module (func (export "hello") (result i32) (i32.const 42)))
const MINIMAL_WASM = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, // magic
  0x01, 0x00, 0x00, 0x00, // version
  0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7f, // type section: () -> i32
  0x03, 0x02, 0x01, 0x00, // function section: func 0 uses type 0
  0x07, 0x09, 0x01, 0x05, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x00, // export "hello" = func 0
  0x0a, 0x06, 0x01, 0x04, 0x00, 0x41, 0x2a, 0x0b, // code: i32.const 42, end
]);

describe("wasmParser", () => {
  it("reports correct byte size", async () => {
    const result = await analyzeWasm(MINIMAL_WASM.buffer);
    expect(result.sizeBytes).toBe(MINIMAL_WASM.byteLength);
  });

  it("formats size in human-readable form", async () => {
    const result = await analyzeWasm(MINIMAL_WASM.buffer);
    expect(result.sizeFormatted).toMatch(/B$/);
  });

  it("extracts exported functions", async () => {
    const result = await analyzeWasm(MINIMAL_WASM.buffer);
    expect(result.exports).toEqual([
      { name: "hello", kind: "function" },
    ]);
  });

  it("estimates a deploy cost in XLM", async () => {
    const result = await analyzeWasm(MINIMAL_WASM.buffer);
    const cost = parseFloat(result.estimatedDeployCostXLM);
    expect(cost).toBeGreaterThan(0);
  });
});
