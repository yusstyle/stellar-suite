import { describe, expect, it } from "vitest";
import { nativeToScVal } from "@stellar/stellar-sdk";
import { decodeScValBase64 } from "@/utils/scValDecoder";

describe("decodeScValBase64", () => {
  it("decodes a string ScVal", () => {
    const base64 = nativeToScVal("hello").toXDR("base64");
    const { value, error } = decodeScValBase64(base64);
    expect(error).toBeUndefined();
    expect(value).toBe("hello");
  });

  it("decodes a composite ScVal", () => {
    const base64 = nativeToScVal(["foo", 42]).toXDR("base64");
    const { value, error } = decodeScValBase64(base64);
    expect(error).toBeUndefined();
    expect(value).toEqual(["foo", 42n]);
  });

  it("returns error for invalid base64", () => {
    const { value, error } = decodeScValBase64("not-base64");
    expect(value).toBeNull();
    expect(error).toBeTruthy();
  });
});
