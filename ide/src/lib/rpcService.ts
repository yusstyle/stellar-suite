import { ErrorTranslator, type TranslatedError } from "./errorTranslator";

export interface SimulationResult {
  success: boolean;
  result?: unknown;
  error?: string;
  translatedError?: TranslatedError;
  resourceUsage?: {
    cpuInstructions?: number;
    memoryBytes?: number;
    minResourceFee?: string;
  };
  events?: unknown[];
  auth?: unknown[];
}

export interface CustomHeaders {
  [key: string]: string;
}

export class RpcService {
  private rpcUrl: string;
  private customHeaders: CustomHeaders;

  constructor(rpcUrl: string, customHeaders: CustomHeaders = {}) {
    this.rpcUrl = rpcUrl.endsWith("/") ? rpcUrl.slice(0, -1) : rpcUrl;
    this.customHeaders = customHeaders;
  }

  setCustomHeaders(headers: CustomHeaders): void {
    this.customHeaders = headers;
  }

  async simulateTransaction(
    contractId: string,
    functionName: string,
    args: unknown[],
  ): Promise<SimulationResult> {
    try {
      const requestBody = {
        jsonrpc: "2.0",
        id: 1,
        method: "simulateTransaction",
        params: {
          transaction: {
            contractId,
            functionName,
            args: args.map((arg) => ({
              value: arg,
            })),
          },
        },
      };

      const response = await fetch(`${this.rpcUrl}/rpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.customHeaders,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        const errorMessage = `RPC request failed with status ${response.status}: ${response.statusText}`;
        return {
          success: false,
          error: errorMessage,
          translatedError: ErrorTranslator.translate(errorMessage, { operation: "RPC request" }),
        };
      }

      const data: {
        result?: {
          returnValue?: unknown;
          result?: unknown;
          resourceUsage?: unknown;
          resource_usage?: unknown;
        };
        error?: { message?: string };
      } = await response.json();

      if (data.error) {
        const errorMessage = data.error.message || "RPC error occurred";
        return {
          success: false,
          error: errorMessage,
          translatedError: ErrorTranslator.translate(errorMessage, { 
            operation: "simulateTransaction",
            functionName,
            contractId,
          }),
        };
      }

      const result = data.result;

      return {
        success: true,
        result: result?.returnValue ?? result?.result ?? result,
        resourceUsage: result?.resourceUsage ?? result?.resource_usage,
      };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        const errorMessage = `Network error: Unable to reach RPC endpoint at ${this.rpcUrl}. Check your connection and rpcUrl setting.`;
        return {
          success: false,
          error: errorMessage,
          translatedError: ErrorTranslator.translate(errorMessage, { operation: "Network request" }),
        };
      }

      if (error instanceof Error && error.name === "AbortError") {
        const errorMessage = "Request timed out. The RPC endpoint may be slow or unreachable.";
        return {
          success: false,
          error: errorMessage,
          translatedError: ErrorTranslator.translate(errorMessage, { operation: "RPC request" }),
        };
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: errorMessage,
        translatedError: ErrorTranslator.translate(errorMessage, { operation: "simulateTransaction" }),
      };
    }
  }
}
