/**
 * src/lib/__tests__/errorTranslator.test.ts
 * ============================================================
 * Test suite for ErrorTranslator service
 * Demonstrates human-readable error translation in action
 * ============================================================
 */

import { ErrorTranslator } from "../errorTranslator";

/**
 * Test utility to demonstrate error translation
 */
function testErrorTranslation(errorInput: unknown, context?: { operation?: string; contractId?: string; functionName?: string }) {
  const translated = ErrorTranslator.translate(errorInput, context);
  const formatted = ErrorTranslator.formatForDisplay(translated, true);

  console.log("\n" + "=".repeat(80));
  console.log(`INPUT: ${typeof errorInput === "string" ? errorInput : JSON.stringify(errorInput)}`);
  console.log("=".repeat(80));
  console.log(`TITLE: ${translated.title}`);
  console.log(`MESSAGE: ${translated.message}`);
  console.log(`CODE: ${translated.code}`);
  console.log(`SEVERITY: ${translated.severity}`);
  console.log(`ERROR TYPE: ${translated.details.errorType}`);

  if (translated.details.suggestions && translated.details.suggestions.length > 0) {
    console.log("\nSUGGESTIONS:");
    translated.details.suggestions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s}`);
    });
  }

  if (formatted.details) {
    console.log(`\nDETAILS: ${formatted.details}`);
  }

  return translated;
}

/**
 * Main test suite
 */
export function runErrorTranslatorTests() {
  console.log("\n🧪 SOROBAN ERROR TRANSLATOR TEST SUITE");
  console.log("=" .repeat(80));

  // Test 1: Host Error Codes
  console.log("\n📋 TEST 1: Host Error Codes");
  testErrorTranslation("Error 115: Authorization failed", { operation: "contract invocation" });
  testErrorTranslation("error code: 113 trapped", { operation: "contract execution" });
  testErrorTranslation("Host error 130", { operation: "fund transfer" });

  // Test 2: Keyword Matching
  console.log("\n TEST 2: Keyword-Based Error Detection");
  testErrorTranslation("unauthorized access denied", { functionName: "transfer" });
  testErrorTranslation("insufficient balance for operation", { contractId: "CAB123..." });
  testErrorTranslation("contract not found on network", { operation: "deployment" });

  // Test 3: Custom Contract Errors
  console.log("\n TEST 3: Custom Contract Error Patterns");
  testErrorTranslation("Custom error: NotAuthorized", { functionName: "admin_action" });
  testErrorTranslation("error InsufficientBalance", { operation: "payment" });
  testErrorTranslation("InvalidArgument provided", { functionName: "set_value" });

  // Test 4: RPC Errors
  console.log("\n TEST 4: RPC Communication Errors");
  testErrorTranslation("RPC method not found: simulateTransaction", { operation: "simulation" });
  testErrorTranslation("jsonrpc invalid params", { operation: "contract deployment" });
  testErrorTranslation("Unable to reach RPC endpoint at http://localhost:8000", { operation: "network request" });

  // Test 5: HTTP Errors
  console.log("\n TEST 5: HTTP Status Errors");
  testErrorTranslation("Request failed with status 429: Too Many Requests");
  testErrorTranslation("HTTP 504 gateway timeout", { operation: "ledger query" });
  testErrorTranslation("Status 403: Forbidden", { operation: "authentication" });

  // Test 6: Network & Timeout Errors
  console.log("\n TEST 6: Network & Timeout Issues");
  testErrorTranslation("Network error: ECONNREFUSED", { operation: "RPC connection" });
  testErrorTranslation("Request timeout - operation timed out after 30 seconds");
  testErrorTranslation("TypeError: fetch failed");

  // Test 7: Unknown Errors
  console.log("\n TEST 7: Unknown/Fallback Errors");
  testErrorTranslation("Something went terribly wrong");
  testErrorTranslation({ message: "Random error object" });
  testErrorTranslation(new Error("Generic JavaScript error"));

  // Test 8: Error with Full Context
  console.log("\n TEST 8: Errors with Rich Context");
  testErrorTranslation("Error 107", {
    operation: "token transfer",
    contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
    functionName: "transfer",
  });

  console.log("\n" + "=".repeat(80));
  console.log(" TEST SUITE COMPLETE");
  console.log("=".repeat(80) + "\n");
}

/**
 * Performance test
 */
export function runPerformanceTest() {
  console.log("\n⚡ PERFORMANCE TEST: Error Translation Speed");
  console.log("=".repeat(80));

  const testErrors = [
    "Error 115",
    "unauthorized",
    "insufficient balance",
    "RPC error",
    "Network error",
    "Contract not found",
  ];

  const iterations = 1000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const error = testErrors[i % testErrors.length];
    ErrorTranslator.translate(error);
  }

  const end = performance.now();
  const avgTime = (end - start) / iterations;

  console.log(`Translated ${iterations} errors in ${(end - start).toFixed(2)}ms`);
  console.log(`Average time per translation: ${avgTime.toFixed(4)}ms`);
  console.log(" Performance test complete\n");
}

/**
 * Batch testing for multiple error scenarios
 */
export function batchTestErrors() {
  console.log("\n BATCH TEST: Multiple Error Scenarios");
  console.log("=".repeat(80));

  const scenarios = [
    {
      name: "Authorization Failure",
      errors: [
        "Error 115: Authorization failed not authorized",
        "Unauthorized invoker cannot call this",
        "Not authorized for this operation",
      ],
    },
    {
      name: "Insufficient Balance",
      errors: [
        "Error 130",
        "Insufficient balance for transfer",
        "Not enough funds in account",
      ],
    },
    {
      name: "Contract Issues",
      errors: [
        "Contract not found",
        "Error 103: Contract data missing",
        "Invalid contract - not deployed",
      ],
    },
    {
      name: "Network Issues",
      errors: [
        "Network error: timeout",
        "Unable to reach RPC endpoint",
        "Request failed status 503",
      ],
    },
  ];

  scenarios.forEach(({ name, errors }) => {
    console.log(`\n${name}:`);
    errors.forEach((error) => {
      const translated = ErrorTranslator.translate(error);
      console.log(`  • "${error}"`);
      console.log(`    → "${translated.title}: ${translated.message}"`);
    });
  });

  console.log("\n Batch test complete\n");
}

// Export test functions for integration into test runner
export const errorTranslatorTests = {
  runErrorTranslatorTests,
  runPerformanceTest,
  batchTestErrors,
};
