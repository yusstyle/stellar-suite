/**
 * src/lib/errorTranslator.ts
 * ============================================================
 * ErrorTranslator service for converting cryptic Soroban errors
 * into human-readable, developer-friendly messages.
 * ============================================================
 */

import {
  SOROBAN_HOST_ERROR_CODES,
  ERROR_PATTERNS,
  RPC_ERROR_MESSAGES,
  HTTP_ERROR_CODES,
  CUSTOM_CONTRACT_ERROR_PATTERNS,
  ERROR_KEYWORD_MAPPINGS,
} from "./errorCodeMappings";

export interface TranslatedError {
  title: string;
  message: string;
  code: string;
  severity: "error" | "warning" | "info";
  details: {
    originalError: string;
    errorCode?: string | number;
    errorType: "host-error" | "rpc-error" | "http-error" | "custom-error" | "network-error" | "unknown";
    suggestions?: string[];
  };
}

export class ErrorTranslator {
  /**
   * Translates a Soroban error into a human-readable format
   * @param error - The error object or string to translate
   * @param context - Optional context about where the error occurred
   * @returns TranslatedError with readable message and original details
   */
  static translate(
    error: unknown,
    context?: { operation?: string; contractId?: string; functionName?: string }
  ): TranslatedError {
    const errorString = this.extractErrorString(error);

    // Try to extract numeric error code
    const numericCode = this.extractNumericCode(errorString);
    if (numericCode !== null) {
      return this.translateHostError(numericCode, errorString, context);
    }

    // Check for RPC errors
    if (this.isRpcError(errorString)) {
      return this.translateRpcError(errorString, context);
    }

    // Check for HTTP errors
    const httpStatus = this.extractHttpStatus(errorString);
    if (httpStatus) {
      return this.translateHttpError(httpStatus, errorString, context);
    }

    // Check for custom contract errors
    const customError = this.matchCustomError(errorString);
    if (customError) {
      return this.translateCustomError(customError, errorString, context);
    }

    // Check for error keywords
    const keywordMatch = this.matchErrorKeywords(errorString);
    if (keywordMatch) {
      return this.translateKeywordError(keywordMatch, errorString, context);
    }

    // Default fallback
    return this.createUnknownError(errorString, context);
  }

  /**
   * Extracts the error message string from various error formats
   */
  private static extractErrorString(error: unknown): string {
    if (typeof error === "string") {
      return error.toLowerCase();
    }

    if (error instanceof Error) {
      return error.message.toLowerCase();
    }

    if (typeof error === "object" && error !== null) {
      const obj = error as Record<string, unknown>;

      // Check for common error object properties
      if (typeof obj.message === "string") return obj.message.toLowerCase();
      if (typeof obj.error === "string") return obj.error.toLowerCase();
      if (typeof obj.text === "string") return obj.text.toLowerCase();
      if (typeof obj.reason === "string") return obj.reason.toLowerCase();

      return JSON.stringify(error).toLowerCase();
    }

    return String(error).toLowerCase();
  }

  /**
   * Extracts numeric error code from error message
   * Looks for patterns like "error 123", "code: 123", etc.
   */
  private static extractNumericCode(errorString: string): number | null {
    // Pattern: "error 123" or "code 123" or "code: 123"
    const patterns = [
      /error\s+(\d+)/i,
      /code[:\s]+(\d+)/i,
      /host\s*error\s+(\d+)/i,
      /\((\d+)\)/,
      /error code:\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = errorString.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  }

  /**
   * Extracts HTTP status code from error message
   */
  private static extractHttpStatus(errorString: string): number | null {
    const match = errorString.match(/status\s+(\d{3})/);
    if (match && match[1]) {
      const status = parseInt(match[1], 10);
      if (status >= 400 && status <= 599) {
        return status;
      }
    }
    return null;
  }

  /**
   * Checks if error is RPC-related
   */
  private static isRpcError(errorString: string): boolean {
    const rpcKeywords = ["rpc", "jsonrpc", "method not found", "invalid params", "parse error", "simulate"];
    return rpcKeywords.some((keyword) => errorString.includes(keyword));
  }

  /**
   * Matches against custom error patterns from contract ABIs
   */
  private static matchCustomError(errorString: string): string | null {
    for (const pattern of Object.keys(CUSTOM_CONTRACT_ERROR_PATTERNS)) {
      if (errorString.includes(pattern.toLowerCase())) {
        return pattern;
      }
    }
    return null;
  }

  /**
   * Matches against error keyword mappings
   */
  private static matchErrorKeywords(errorString: string): keyof typeof ERROR_PATTERNS | null {
    for (const [keyword, errorType] of Object.entries(ERROR_KEYWORD_MAPPINGS)) {
      if (errorString.includes(keyword)) {
        return errorType;
      }
    }
    return null;
  }

  /**
   * Translates a host error code
   */
  private static translateHostError(
    code: number,
    originalError: string,
    context?: { operation?: string; contractId?: string; functionName?: string }
  ): TranslatedError {
    const hostErrorMessage = SOROBAN_HOST_ERROR_CODES[code];
    const suggestions = this.generateSuggestions(code, context);

    // Severity based on error code
    let severity: "error" | "warning" | "info" = "error";
    if (code < 10) severity = "info";
    if ([120, 128, 129].includes(code)) severity = "warning";

    return {
      title: `Host Error (${code})`,
      message: hostErrorMessage || `Unknown host error code: ${code}`,
      code: `HOST_${code}`,
      severity,
      details: {
        originalError,
        errorCode: code,
        errorType: "host-error",
        suggestions,
      },
    };
  }

  /**
   * Translates an RPC error
   */
  private static translateRpcError(
    errorString: string,
    context?: { operation?: string }
  ): TranslatedError {
    let message = "RPC error occurred";
    let code = "RPC_ERROR";

    if (errorString.includes("method not found")) {
      message = RPC_ERROR_MESSAGES.METHOD_NOT_FOUND;
      code = "RPC_METHOD_NOT_FOUND";
    } else if (errorString.includes("invalid params")) {
      message = RPC_ERROR_MESSAGES.INVALID_PARAMS;
      code = "RPC_INVALID_PARAMS";
    } else if (errorString.includes("parse error")) {
      message = RPC_ERROR_MESSAGES.PARSE_ERROR;
      code = "RPC_PARSE_ERROR";
    } else if (errorString.includes("internal error")) {
      message = RPC_ERROR_MESSAGES.INTERNAL_ERROR;
      code = "RPC_INTERNAL_ERROR";
    } else if (errorString.includes("unable to reach")) {
      message = RPC_ERROR_MESSAGES.SERVICE_UNAVAILABLE;
      code = "RPC_UNREACHABLE";
    } else if (errorString.includes("timeout")) {
      message = RPC_ERROR_MESSAGES.REQUEST_TIMEOUT;
      code = "RPC_TIMEOUT";
    } else if (errorString.includes("rate limit")) {
      message = RPC_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
      code = "RPC_RATE_LIMIT";
    }

    return {
      title: "RPC Communication Error",
      message,
      code,
      severity: "error",
      details: {
        originalError: errorString,
        errorType: "rpc-error",
        suggestions: [
          "Check your RPC endpoint URL is correct",
          "Verify the RPC endpoint is operational",
          "Check your network connectivity",
          "Try again in a few moments",
        ],
      },
    };
  }

  /**
   * Translates an HTTP error
   */
  private static translateHttpError(
    status: number,
    originalError: string,
    context?: { operation?: string }
  ): TranslatedError {
    const message = HTTP_ERROR_CODES[status] || `HTTP Error ${status}`;

    let suggestions: string[] = [];
    if (status === 401 || status === 403) {
      suggestions = ["Check your authentication credentials", "Verify you have proper permissions"];
    } else if (status === 404) {
      suggestions = ["Verify the resource exists", "Check the URL or endpoint path"];
    } else if (status === 429) {
      suggestions = ["Wait a few moments before retrying", "Reduce the rate of requests"];
    } else if (status >= 500) {
      suggestions = ["Try again in a few moments", "Contact the service provider if the issue persists"];
    }

    return {
      title: `HTTP ${status} Error`,
      message,
      code: `HTTP_${status}`,
      severity: status >= 500 ? "error" : "warning",
      details: {
        originalError,
        errorCode: status,
        errorType: "http-error",
        suggestions,
      },
    };
  }

  /**
   * Translates a custom contract error
   */
  private static translateCustomError(
    pattern: string,
    originalError: string,
    context?: { contractId?: string; functionName?: string }
  ): TranslatedError {
    const message = CUSTOM_CONTRACT_ERROR_PATTERNS[pattern];

    return {
      title: `Contract Error: ${pattern}`,
      message: message || pattern,
      code: `CUSTOM_${pattern.toUpperCase()}`,
      severity: "error",
      details: {
        originalError,
        errorType: "custom-error",
        suggestions: [
          "Review the contract function logic",
          "Verify input parameters are correct",
          "Check account balance and permissions",
          "Examine the contract ABI for expected parameters",
        ],
      },
    };
  }

  /**
   * Translates a keyword-matched error
   */
  private static translateKeywordError(
    errorType: keyof typeof ERROR_PATTERNS,
    originalError: string,
    context?: { operation?: string }
  ): TranslatedError {
    const pattern = ERROR_PATTERNS[errorType];

    const suggestions = this.generateKeywordSuggestions(errorType);

    return {
      title: pattern.code,
      message: pattern.message,
      code: pattern.code,
      severity: pattern.severity,
      details: {
        originalError,
        errorType: "custom-error",
        suggestions,
      },
    };
  }

  /**
   * Creates an unknown/fallback error
   */
  private static createUnknownError(
    errorString: string,
    context?: { operation?: string }
  ): TranslatedError {
    const operation = context?.operation ? ` during ${context.operation}` : "";

    return {
      title: "Unknown Error",
      message: `An unexpected error occurred${operation}. Please review the details below for more information.`,
      code: "UNKNOWN_ERROR",
      severity: "error",
      details: {
        originalError: errorString,
        errorType: "unknown",
        suggestions: [
          "Review the error details and contract code",
          "Check the RPC endpoint status",
          "Try the operation again",
          "Enable debug logging for more information",
        ],
      },
    };
  }

  /**
   * Generates suggestions for host errors
   */
  private static generateSuggestions(
    code: number,
    context?: { operation?: string; contractId?: string; functionName?: string }
  ): string[] {
    const suggestions: string[] = [];

    switch (code) {
      case 107: // Not authorized
      case 115: // Authorization failed
      case 123: // Not authorized
        suggestions.push("Verify the signer has authorization");
        suggestions.push("Check the contract's authorization requirements");
        break;

      case 112: // Memory exhausted
        suggestions.push("The contract operation is too complex");
        suggestions.push("Simplify the contract function or reduce data size");
        break;

      case 113: // Trapped
      case 114: // Abort
        suggestions.push("A fatal error occurred in contract execution");
        suggestions.push("Review the contract code for panics or assertions");
        suggestions.push("Enable contract logging to diagnose the issue");
        break;

      case 121: // Exceeds max contract size
        suggestions.push("The contract code is too large");
        suggestions.push("Optimize or split the contract into smaller modules");
        break;

      case 103: // Contract data missing
        suggestions.push("The contract has not been properly initialized");
        suggestions.push("Ensure the contract's setup step has completed");
        break;

      case 130: // Insufficient balance
        suggestions.push("Account balance is insufficient for this operation");
        suggestions.push("Add funds to the account and try again");
        break;

      default:
        suggestions.push("Review the contract function implementation");
        suggestions.push("Check input parameters for validity");
        suggestions.push("Verify network and account are properly configured");
    }

    return suggestions;
  }

  /**
   * Generates suggestions for keyword-matched errors
   */
  private static generateKeywordSuggestions(errorType: keyof typeof ERROR_PATTERNS): string[] {
    const suggestions: string[] = [];

    switch (errorType) {
      case "AUTHORIZATION_FAILED":
      case "NOT_AUTHORIZED":
        suggestions.push("Ensure you are signing with an authorized account");
        suggestions.push("Verify the contract's authorization policy");
        break;

      case "INSUFFICIENT_BALANCE":
        suggestions.push("Check your account balance");
        suggestions.push("Request more funds if needed");
        suggestions.push("Reduce the operation amount");
        break;

      case "TRAPPED":
        suggestions.push("Review contract logs for error details");
        suggestions.push("Check for failed assertions or panic conditions");
        break;

      case "MISSING_CONTRACT":
        suggestions.push("Verify the contract ID is correct");
        suggestions.push("Ensure the contract is deployed on this network");
        break;

      case "INVALID_ARGUMENT":
        suggestions.push("Review the function signature");
        suggestions.push("Verify argument types and formats");
        suggestions.push("Check the contract ABI for expected parameters");
        break;

      case "NETWORK_ERROR":
        suggestions.push("Check your internet connection");
        suggestions.push("Verify the RPC endpoint URL");
        suggestions.push("Try a different RPC endpoint");
        break;

      case "TIMEOUT":
        suggestions.push("The operation took too long");
        suggestions.push("Try again - the network may be congested");
        break;

      default:
        suggestions.push("Enable debug logging for more details");
        suggestions.push("Review the error details section below");
    }

    return suggestions;
  }

  /**
   * Formats the error for display in a toast or UI
   */
  static formatForDisplay(
    translatedError: TranslatedError,
    includeDetails: boolean = false
  ): { title: string; description: string; details?: string } {
    let description = translatedError.message;

    if (translatedError.details.suggestions && translatedError.details.suggestions.length > 0) {
      description += "\n\nTry:\n" + translatedError.details.suggestions.map((s) => `• ${s}`).join("\n");
    }

    const result: { title: string; description: string; details?: string } = {
      title: translatedError.title,
      description,
    };

    if (includeDetails && translatedError.details.originalError) {
      result.details = `Details: ${translatedError.details.originalError}\nCode: ${translatedError.code}`;
    }

    return result;
  }
}
