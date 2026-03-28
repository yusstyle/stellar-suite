/**
 * Extracts error codes from diagnostic messages
 * Supports both Rust error codes (E0277) and custom Soroban codes
 */
export function extractErrorCode(message: string): string | null {
  // Match Rust error codes like [E0277]
  const rustErrorMatch = message.match(/\[([E]\d{4})\]/);
  if (rustErrorMatch) {
    return rustErrorMatch[1];
  }

  // Match custom error codes like [SOROBAN_STATE_LIMIT]
  const customErrorMatch = message.match(/\[([A-Z_]+)\]/);
  if (customErrorMatch) {
    return customErrorMatch[1];
  }

  // Check for common error patterns in the message itself
  if (message.includes("trait") && message.includes("not implemented")) {
    return "E0277";
  }

  if (message.includes("cannot find")) {
    return "E0425";
  }

  if (message.includes("mismatched types") || message.includes("expected") && message.includes("found")) {
    return "E0308";
  }

  if (message.includes("use of moved value") || message.includes("value used here after move")) {
    return "E0382";
  }

  if (message.includes("no method named") || message.includes("no function or associated item named")) {
    return "E0599";
  }

  if (message.includes("cannot move out of")) {
    return "E0507";
  }

  // Soroban-specific patterns
  if (message.includes("state limit") || message.includes("64kb") || message.includes("64KB")) {
    return "SOROBAN_STATE_LIMIT";
  }

  if (message.includes("authorization") || message.includes("require_auth")) {
    return "SOROBAN_AUTH";
  }

  if (message.includes("panic") || message.includes("unwrap")) {
    return "SOROBAN_PANIC";
  }

  if (message.includes("overflow") || message.includes("underflow")) {
    return "SOROBAN_OVERFLOW";
  }

  return null;
}

/**
 * List of error codes that have help documentation available
 */
export const KNOWN_ERROR_CODES = [
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

/**
 * Checks if an error code has help documentation available
 */
export function hasErrorHelp(errorCode: string): boolean {
  return KNOWN_ERROR_CODES.includes(errorCode);
}
