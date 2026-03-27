/**
 * src/lib/errorCodeMappings.ts
 * ============================================================
 * Comprehensive mappings for Soroban Host Error codes and
 * custom contract error codes. Translates cryptic numeric codes
 * to human-readable error messages.
 * ============================================================
 */

/**
 * Soroban Host Error codes
 * Reference: https://github.com/stellar/soroban-examples
 */
export const SOROBAN_HOST_ERROR_CODES: Record<number | string, string> = {
  // Success codes
  0: "Success (OK)",
  1: "Operation succeeded with value",
  2: "Operation succeeded without return value",
  3: "Function returned nothing",

  // Common Error codes
  100: "Contract error",
  101: "Standard contract invocation failed",
  102: "Invalid contract type",
  103: "Contract data not found",
  104: "Contract invocation failed",
  105: "Unknown error",
  106: "Invalid argument provided",
  107: "Contract function invocation not authorized",
  108: "Host buffer not empty",
  109: "Slice invalid start index",
  110: "Slice invalid end index",
  111: "Slice invalid length",
  112: "Memory exhausted",
  113: "Trapped - contract execution trapped",
  114: "Abort - contract execution aborted",
  115: "Authorization failed - caller not authorized",
  116: "Invalid action requested",
  117: "Internal error",
  118: "Host state store service error",
  119: "Object not found",
  120: "Protocol version mismatch",
  121: "Contract size exceeds maximum allowed",
  122: "Protocol buffer deserialization failed",
  123: "Authorization failed - not authorized",
  124: "Ledger entry not found",
  125: "Invalid trajectory",
  126: "Duplicate contract data",
  127: "Contract data mismatch",
  128: "Simulation error",
  129: "Request rate exceeded",
  130: "Insufficient balance for operation",
  131: "Missing required signature",
  132: "Invalid account sequence",
  133: "Invalid transaction",
  134: "Operation not allowed",
};

/**
 * Common Soroban error patterns and their friendly descriptions
 */
export const ERROR_PATTERNS: Record<string, { code: string; message: string; severity: "error" | "warning" }> = {
  AUTHORIZATION_FAILED: {
    code: "ERR_AUTH",
    message: "Authorization failed - the caller does not have permission to perform this action",
    severity: "error",
  },
  INSUFFICIENT_BALANCE: {
    code: "ERR_INSUFFICIENT_BALANCE",
    message: "Insufficient balance - the account does not have enough funds to complete this operation",
    severity: "error",
  },
  NOT_AUTHORIZED: {
    code: "ERR_NOT_AUTHORIZED",
    message: "Not authorized - this action requires proper authorization",
    severity: "error",
  },
  MISSING_CONTRACT: {
    code: "ERR_MISSING_CONTRACT",
    message: "Contract not found - the specified contract does not exist on this network",
    severity: "error",
  },
  TRAPPED: {
    code: "ERR_TRAPPED",
    message: "Contract execution trapped - an unrecoverable error occurred in the contract",
    severity: "error",
  },
  MEMORY_EXHAUSTED: {
    code: "ERR_MEMORY",
    message: "Memory exhausted - the contract ran out of available memory",
    severity: "error",
  },
  INVALID_ARGUMENT: {
    code: "ERR_INVALID_ARG",
    message: "Invalid argument - one or more arguments provided are invalid or malformed",
    severity: "error",
  },
  TIMEOUT: {
    code: "ERR_TIMEOUT",
    message: "Request timeout - the operation took too long to complete",
    severity: "error",
  },
  NETWORK_ERROR: {
    code: "ERR_NETWORK",
    message: "Network error - unable to communicate with the RPC endpoint",
    severity: "error",
  },
  INVALID_XDR: {
    code: "ERR_INVALID_XDR",
    message: "Invalid XDR - the transaction XDR is malformed or corrupted",
    severity: "error",
  },
  PROTOCOL_MISMATCH: {
    code: "ERR_PROTOCOL",
    message: "Protocol version mismatch - the contract or RPC endpoint uses an incompatible protocol version",
    severity: "warning",
  },
  LEDGER_NOT_FOUND: {
    code: "ERR_LEDGER",
    message: "Ledger entry not found - the required ledger data does not exist",
    severity: "error",
  },
};

/**
 * RPC-specific error messages
 */
export const RPC_ERROR_MESSAGES: Record<string, string> = {
  INVALID_PARAMS: "Invalid parameters - the request parameters are malformed or invalid",
  PARSE_ERROR: "JSON parse error - the request body is not valid JSON",
  METHOD_NOT_FOUND: "Method not found - the requested RPC method does not exist",
  INTERNAL_ERROR: "RPC internal error - the server encountered an unexpected error",
  SERVER_ERROR: "RPC server error - the server is experiencing issues",
  SERVICE_UNAVAILABLE: "Service unavailable - unable to reach the RPC endpoint",
  REQUEST_TIMEOUT: "Request timeout - the RPC endpoint took too long to respond",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded - too many requests in a short time",
};

/**
 * Common HTTP status error mappings
 */
export const HTTP_ERROR_CODES: Record<number, string> = {
  400: "Bad request - the request is malformed or invalid",
  401: "Unauthorized - authentication failed or credentials are invalid",
  403: "Forbidden - insufficient permissions to access this resource",
  404: "Not found - the requested resource does not exist",
  429: "Too many requests - rate limit exceeded",
  500: "Internal server error - the server encountered an unexpected error",
  502: "Bad gateway - invalid response from the upstream server",
  503: "Service unavailable - the service is temporarily unavailable",
  504: "Gateway timeout - the request timed out",
};

/**
 * Custom error code patterns from contract ABIs
 * Maps common Rust contract error patterns to friendly messages
 */
export const CUSTOM_CONTRACT_ERROR_PATTERNS: Record<string, string> = {
  // Authorization patterns
  UnauthorizedInvoker: "Unauthorized - the invoker does not have permission",
  NotAuthorized: "Not authorized - caller lacks required authorization",
  Unauthorized: "Unauthorized action - insufficient permissions",
  AccessDenied: "Access denied - you do not have permission to perform this action",
  InvalidAuthority: "Invalid authority - the provided authority is not valid",
  MissingSignature: "Missing signature - a required signature is not present",

  // Balance/Fund patterns
  InsufficientBalance: "Insufficient balance - not enough funds available",
  InsufficientFunds: "Insufficient funds - account balance is too low",
  NotEnoughBalance: "Not enough balance for this transaction",
  BalanceExceeded: "Balance exceeded - operation would exceed available balance",

  // Contract state patterns
  ContractNotFound: "Contract not found - the specified contract does not exist",
  InvalidContract: "Invalid contract - the contract is not properly initialized",
  ContractDataMissing: "Contract data missing - required contract data not found",
  StateNotInitialized: "State not initialized - contract state has not been set up",
  AlreadyInitialized: "Already initialized - contract has already been initialized",

  // Input validation patterns
  InvalidInput: "Invalid input - the provided input is not valid",
  InvalidArgument: "Invalid argument - argument does not meet requirements",
  InvalidAmount: "Invalid amount - the amount provided is invalid",
  InvalidAddress: "Invalid address - the address format is incorrect",
  InvalidParameter: "Invalid parameter - parameter value is not acceptable",

  // Limit patterns
  ExceedsMaximum: "Exceeds maximum - value exceeds allowed maximum",
  BelowMinimum: "Below minimum - value is below required minimum",
  LimitExceeded: "Limit exceeded - operation would exceed a limit",

  // Execution patterns
  ExecutionFailed: "Execution failed - contract execution did not complete successfully",
  Trapped: "Trapped - contract execution encountered a fatal error",
  Panicked: "Panicked - contract panicked during execution",
  AssertionFailed: "Assertion failed - a required assertion did not hold",

  // Other common patterns
  NotFound: "Not found - the requested item could not be found",
  AlreadyExists: "Already exists - the item already exists",
  Expired: "Expired - the data or permission has expired",
  InvalidState: "Invalid state - the current state does not allow this operation",
};

/**
 * Maps error patterns in error messages to error types
 */
export const ERROR_KEYWORD_MAPPINGS: Record<string, keyof typeof ERROR_PATTERNS> = {
  "not authorized": "AUTHORIZATION_FAILED",
  unauthorized: "NOT_AUTHORIZED",
  "insufficient balance": "INSUFFICIENT_BALANCE",
  "insufficient funds": "INSUFFICIENT_BALANCE",
  "no balance": "INSUFFICIENT_BALANCE",
  "not enough": "INSUFFICIENT_BALANCE",
  trapped: "TRAPPED",
  "contract not found": "MISSING_CONTRACT",
  "missing contract": "MISSING_CONTRACT",
  "memory exhausted": "MEMORY_EXHAUSTED",
  "out of memory": "MEMORY_EXHAUSTED",
  "invalid argument": "INVALID_ARGUMENT",
  "invalid input": "INVALID_ARGUMENT",
  timeout: "TIMEOUT",
  "network error": "NETWORK_ERROR",
  "fetch failed": "NETWORK_ERROR",
  "unable to reach": "NETWORK_ERROR",
  "invalid xdr": "INVALID_XDR",
  "xdr deserialization": "INVALID_XDR",
  "protocol mismatch": "PROTOCOL_MISMATCH",
  "ledger entry not found": "LEDGER_NOT_FOUND",
};
