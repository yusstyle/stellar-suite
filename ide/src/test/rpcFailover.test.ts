import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    warning: vi.fn(),
  },
}));

import { toast } from "sonner";

import { NETWORK_CONFIG } from "@/lib/networkConfig";
import { fetchWithRpcFailover, getRpcCandidateUrls, withRpcFailover } from "@/lib/rpcFailover";

describe("rpc failover", () => {
  const originalTestnetSecondaries = [...NETWORK_CONFIG.testnet.secondaryRpcUrls];
  const originalFetch = global.fetch;

  beforeEach(() => {
    NETWORK_CONFIG.testnet.secondaryRpcUrls = ["https://backup-testnet.example"];
    vi.clearAllMocks();
  });

  afterEach(() => {
    NETWORK_CONFIG.testnet.secondaryRpcUrls = [...originalTestnetSecondaries];
    global.fetch = originalFetch;
  });

  it("builds a priority-ordered candidate list without duplicates", () => {
    NETWORK_CONFIG.testnet.secondaryRpcUrls = [
      "https://backup-testnet.example/",
      "https://primary-testnet.example",
    ];

    expect(
      getRpcCandidateUrls({
        network: "testnet",
        primaryUrl: "https://primary-testnet.example/",
      }),
    ).toEqual([
      "https://primary-testnet.example",
      "https://backup-testnet.example",
    ]);
  });

  it("fails over raw fetches on 503 and shows a warning toast", async () => {
    global.fetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("down", { status: 503, statusText: "Service Unavailable" }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const result = await fetchWithRpcFailover({
      network: "testnet",
      primaryUrl: "https://primary-testnet.example",
      path: "/rpc",
      init: {
        method: "POST",
        body: "{}",
      },
    });

    expect(result.activeRpcUrl).toBe("https://backup-testnet.example");
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      "https://primary-testnet.example/rpc",
      expect.objectContaining({ method: "POST" }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "https://backup-testnet.example/rpc",
      expect.objectContaining({ method: "POST" }),
    );
    expect(toast.warning).toHaveBeenCalledWith(
      "RPC provider switched",
      expect.objectContaining({
        id: "rpc-provider-failover",
      }),
    );
  });

  it("fails over SDK-style operations on timeouts", async () => {
    const operation = vi
      .fn<(rpcUrl: string) => Promise<string>>()
      .mockImplementationOnce(async () => {
        const abortError = new DOMException("The operation was aborted", "AbortError");
        throw abortError;
      })
      .mockResolvedValueOnce("ok");

    const result = await withRpcFailover({
      network: "testnet",
      primaryUrl: "https://primary-testnet.example",
      operation,
    });

    expect(result.result).toBe("ok");
    expect(operation).toHaveBeenNthCalledWith(1, "https://primary-testnet.example");
    expect(operation).toHaveBeenNthCalledWith(2, "https://backup-testnet.example");
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });
});
