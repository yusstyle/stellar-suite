import { toast } from "sonner";

import { NETWORK_CONFIG, type CustomHeaders, type NetworkKey } from "@/lib/networkConfig";

const DEFAULT_RPC_TIMEOUT_MS = 15_000;
const FAILOVER_TOAST_ID = "rpc-provider-failover";

export interface RpcCandidateOptions {
  network?: NetworkKey;
  primaryUrl: string;
}

export interface RpcFailoverContext {
  fromUrl: string;
  toUrl: string;
  reason: string;
}

export interface RpcFetchOptions extends RpcCandidateOptions {
  path?: string;
  init?: RequestInit;
  timeoutMs?: number;
  customHeaders?: CustomHeaders;
  notifyOnFailover?: boolean;
}

export interface RpcOperationOptions<T> extends RpcCandidateOptions {
  operation: (rpcUrl: string) => Promise<T>;
  notifyOnFailover?: boolean;
}

const normalizeRpcUrl = (url: string) => url.trim().replace(/\/+$/, "");

const describeRpcUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return url;
  }
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown RPC error";

const getFailoverReason = (error: unknown) => {
  const message = getErrorMessage(error);
  if (message.toLowerCase().includes("503")) {
    return "503 Service Unavailable";
  }
  if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("abort")) {
    return "request timeout";
  }
  return message;
};

export const shouldFailoverOnError = (error: unknown) => {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("503") ||
      message.includes("service unavailable") ||
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("aborterror") ||
      message.includes("failed to fetch")
    );
  }

  return false;
};

export const getRpcCandidateUrls = ({ network, primaryUrl }: RpcCandidateOptions) => {
  const primary = normalizeRpcUrl(primaryUrl);
  const configuredSecondaries =
    network !== undefined ? NETWORK_CONFIG[network].secondaryRpcUrls : [];

  return [primary, ...configuredSecondaries.map(normalizeRpcUrl)].filter(
    (url, index, urls) => url.length > 0 && urls.indexOf(url) === index,
  );
};

export const notifyRpcFailover = ({ fromUrl, toUrl, reason }: RpcFailoverContext) => {
  toast.warning("RPC provider switched", {
    id: FAILOVER_TOAST_ID,
    duration: 6000,
    description: `Requests moved from ${describeRpcUrl(fromUrl)} to ${describeRpcUrl(toUrl)} after ${reason}.`,
  });
};

const createTimeoutSignal = (timeoutMs: number) => {
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
};

const mergeHeaders = (initHeaders: HeadersInit | undefined, customHeaders: CustomHeaders) => {
  const headers = new Headers(initHeaders);
  Object.entries(customHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return headers;
};

export async function fetchWithRpcFailover({
  network,
  primaryUrl,
  path = "",
  init,
  timeoutMs = DEFAULT_RPC_TIMEOUT_MS,
  customHeaders = {},
  notifyOnFailover = true,
}: RpcFetchOptions) {
  const rpcUrls = getRpcCandidateUrls({ network, primaryUrl });
  let lastError: unknown = null;

  for (let index = 0; index < rpcUrls.length; index += 1) {
    const rpcUrl = rpcUrls[index];
    const requestUrl = `${rpcUrl}${path}`;

    try {
      const response = await fetch(requestUrl, {
        ...init,
        headers: mergeHeaders(init?.headers, customHeaders),
        signal: init?.signal ?? createTimeoutSignal(timeoutMs),
      });

      if (response.status === 503) {
        throw new Error(`RPC request failed with status 503: ${response.statusText}`);
      }

      if (index > 0 && notifyOnFailover) {
        notifyRpcFailover({
          fromUrl: rpcUrls[index - 1],
          toUrl: rpcUrl,
          reason: getFailoverReason(lastError),
        });
      }

      return {
        response,
        activeRpcUrl: rpcUrl,
        failedRpcUrl: index > 0 ? rpcUrls[index - 1] : null,
      };
    } catch (error) {
      lastError = error;

      if (!shouldFailoverOnError(error) || index === rpcUrls.length - 1) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("RPC request failed");
}

export async function withRpcFailover<T>({
  network,
  primaryUrl,
  operation,
  notifyOnFailover = true,
}: RpcOperationOptions<T>) {
  const rpcUrls = getRpcCandidateUrls({ network, primaryUrl });
  let lastError: unknown = null;

  for (let index = 0; index < rpcUrls.length; index += 1) {
    const rpcUrl = rpcUrls[index];

    try {
      const result = await operation(rpcUrl);

      if (index > 0 && notifyOnFailover) {
        notifyRpcFailover({
          fromUrl: rpcUrls[index - 1],
          toUrl: rpcUrl,
          reason: getFailoverReason(lastError),
        });
      }

      return {
        result,
        activeRpcUrl: rpcUrl,
        failedRpcUrl: index > 0 ? rpcUrls[index - 1] : null,
      };
    } catch (error) {
      lastError = error;

      if (!shouldFailoverOnError(error) || index === rpcUrls.length - 1) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("RPC operation failed");
}
