export interface WasmExport {
  name: string;
  kind: "function" | "memory" | "table" | "global";
}

export interface WasmAnalysis {
  sizeBytes: number;
  sizeFormatted: string;
  exports: WasmExport[];
  estimatedDeployCostXLM: string;
}

const BYTES_PER_KB = 1024;

// Stellar fee metrics: base fee + per-byte cost for WASM upload
// Based on current Soroban resource fee model
const BASE_DEPLOY_FEE_XLM = 0.01;
const PER_KB_FEE_XLM = 0.035;

function formatSize(bytes: number): string {
  if (bytes < BYTES_PER_KB) return `${bytes} B`;
  const kb = bytes / BYTES_PER_KB;
  return `${kb.toFixed(2)} KB`;
}

function estimateDeployCost(bytes: number): string {
  const kb = bytes / BYTES_PER_KB;
  const cost = BASE_DEPLOY_FEE_XLM + kb * PER_KB_FEE_XLM;
  return cost.toFixed(4);
}

export async function analyzeWasm(buffer: ArrayBuffer): Promise<WasmAnalysis> {
  const module = await WebAssembly.compile(buffer);
  const rawExports = WebAssembly.Module.exports(module);

  const exports: WasmExport[] = rawExports.map((e) => ({
    name: e.name,
    kind: e.kind as WasmExport["kind"],
  }));

  const sizeBytes = buffer.byteLength;

  return {
    sizeBytes,
    sizeFormatted: formatSize(sizeBytes),
    exports,
    estimatedDeployCostXLM: estimateDeployCost(sizeBytes),
  };
}
