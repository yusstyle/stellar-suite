import { scValToNative, xdr } from "@stellar/stellar-sdk";

export interface DecodeResult {
  value: unknown | null;
  error?: string;
}

export function decodeScValBase64(
  value: string | null | undefined,
): DecodeResult {
  if (!value) {
    return { value: null, error: "No value provided" };
  }

  try {
    const scVal = xdr.ScVal.fromXDR(value, "base64");
    const native = scValToNative(scVal);
    return { value: native };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to decode ScVal";
    return { value: null, error: message };
  }
}

export function stringifyDecodedValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to stringify value";
    return `"[Unserializable value] ${message}"`;
  }
}
