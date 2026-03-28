import { describe, it, expect } from "vitest";
import { extractErrorCode, hasErrorHelp, KNOWN_ERROR_CODES } from "../errorCodeExtractor";

describe("errorCodeExtractor", () => {
  describe("extractErrorCode", () => {
    it("should extract Rust error codes from bracketed format", () => {
      expect(extractErrorCode("[E0277] trait not implemented")).toBe("E0277");
      expect(extractErrorCode("[E0425] cannot find value")).toBe("E0425");
      expect(extractErrorCode("[E0308] mismatched types")).toBe("E0308");
    });

    it("should extract custom Soroban error codes", () => {
      expect(extractErrorCode("[SOROBAN_STATE_LIMIT] exceeded")).toBe("SOROBAN_STATE_LIMIT");
      expect(extractErrorCode("[SOROBAN_AUTH] authorization required")).toBe("SOROBAN_AUTH");
      expect(extractErrorCode("[MATH001] unsafe math operation")).toBe("MATH001");
    });

    it("should detect E0277 from trait error messages", () => {
      expect(extractErrorCode("the trait `Clone` is not implemented for `MyStruct`")).toBe("E0277");
      expect(extractErrorCode("trait bound not satisfied")).toBe("E0277");
    });

    it("should detect E0425 from cannot find messages", () => {
      expect(extractErrorCode("cannot find value `foo` in this scope")).toBe("E0425");
      expect(extractErrorCode("cannot find function `bar`")).toBe("E0425");
    });

    it("should detect E0308 from type mismatch messages", () => {
      expect(extractErrorCode("mismatched types: expected u32, found i32")).toBe("E0308");
      expect(extractErrorCode("expected `String`, found `&str`")).toBe("E0308");
    });

    it("should detect E0382 from moved value messages", () => {
      expect(extractErrorCode("use of moved value: `data`")).toBe("E0382");
      expect(extractErrorCode("value used here after move")).toBe("E0382");
    });

    it("should detect E0599 from method not found messages", () => {
      expect(extractErrorCode("no method named `foo` found")).toBe("E0599");
      expect(extractErrorCode("no function or associated item named `bar`")).toBe("E0599");
    });

    it("should detect E0507 from cannot move out messages", () => {
      expect(extractErrorCode("cannot move out of borrowed content")).toBe("E0507");
      expect(extractErrorCode("cannot move out of `*data`")).toBe("E0507");
    });

    it("should detect SOROBAN_STATE_LIMIT from state limit messages", () => {
      expect(extractErrorCode("contract state limit exceeded")).toBe("SOROBAN_STATE_LIMIT");
      expect(extractErrorCode("storage exceeds 64kb limit")).toBe("SOROBAN_STATE_LIMIT");
      expect(extractErrorCode("64KB state limit reached")).toBe("SOROBAN_STATE_LIMIT");
    });

    it("should detect SOROBAN_AUTH from authorization messages", () => {
      expect(extractErrorCode("authorization required for this operation")).toBe("SOROBAN_AUTH");
      expect(extractErrorCode("missing require_auth call")).toBe("SOROBAN_AUTH");
    });

    it("should detect SOROBAN_PANIC from panic messages", () => {
      expect(extractErrorCode("contract panicked at 'index out of bounds'")).toBe("SOROBAN_PANIC");
      expect(extractErrorCode("called `Option::unwrap()` on a `None` value")).toBe("SOROBAN_PANIC");
    });

    it("should detect SOROBAN_OVERFLOW from overflow messages", () => {
      expect(extractErrorCode("integer overflow in arithmetic operation")).toBe("SOROBAN_OVERFLOW");
      expect(extractErrorCode("attempt to add with overflow")).toBe("SOROBAN_OVERFLOW");
      expect(extractErrorCode("underflow detected")).toBe("SOROBAN_OVERFLOW");
    });

    it("should return null for unknown error messages", () => {
      expect(extractErrorCode("some random error message")).toBeNull();
      expect(extractErrorCode("")).toBeNull();
      expect(extractErrorCode("warning: unused variable")).toBeNull();
    });
  });

  describe("hasErrorHelp", () => {
    it("should return true for known error codes", () => {
      expect(hasErrorHelp("E0277")).toBe(true);
      expect(hasErrorHelp("E0425")).toBe(true);
      expect(hasErrorHelp("SOROBAN_STATE_LIMIT")).toBe(true);
      expect(hasErrorHelp("MATH001")).toBe(true);
    });

    it("should return false for unknown error codes", () => {
      expect(hasErrorHelp("E9999")).toBe(false);
      expect(hasErrorHelp("UNKNOWN_ERROR")).toBe(false);
      expect(hasErrorHelp("")).toBe(false);
    });
  });

  describe("KNOWN_ERROR_CODES", () => {
    it("should contain all documented error codes", () => {
      const expectedCodes = [
        "E0277",
        "E0425",
        "E0308",
        "E0382",
        "E0599",
        "E0507",
        "SOROBAN_STATE_LIMIT",
        "SOROBAN_AUTH",
        "SOROBAN_PANIC",
        "SOROBAN_OVERFLOW",
        "MATH001",
      ];

      expectedCodes.forEach((code) => {
        expect(KNOWN_ERROR_CODES).toContain(code);
      });
    });

    it("should have at least 10 error codes", () => {
      expect(KNOWN_ERROR_CODES.length).toBeGreaterThanOrEqual(10);
    });
  });
});
