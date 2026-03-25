const FRIENDBOT_URL = "https://friendbot.stellar.org/?addr=";

const getHorizonBaseUrl = (network: string): string | null => {
  switch (network) {
    case "testnet":
      return "https://horizon-testnet.stellar.org";
    case "futurenet":
      return "https://horizon-futurenet.stellar.org";
    case "mainnet":
      return "https://horizon.stellar.org";
    default:
      return null;
  }
};

const fetchNativeXlmBalance = async (publicKey: string, network: string): Promise<number> => {
  const baseUrl = getHorizonBaseUrl(network);
  if (!baseUrl) return 0;

  const res = await fetch(`${baseUrl}/accounts/${encodeURIComponent(publicKey)}`);
  if (res.status === 404) return 0;
  if (!res.ok) throw new Error(`Horizon request failed: ${res.status}`);

  const data = await res.json();
  const balances = (data?.balances ?? []) as Array<{ asset_type?: string; balance?: string }>;
  const native = balances.find((b) => b.asset_type === "native");
  const balStr = native?.balance ?? "0";
  const balNum = Number(balStr);
  return Number.isFinite(balNum) ? balNum : 0;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type FriendbotFundStatus = "funded" | "already_funded";

export interface FundWithFriendbotOptions {
  /**
   * Target balance (in XLM) to consider "success".
   * Defaults to 10_000 XLM (Friendbot's amount on test networks).
   */
  targetXlm?: number;
  /** Poll interval in milliseconds. */
  pollIntervalMs?: number;
  /** Maximum poll attempts. */
  maxAttempts?: number;
}

/**
 * Requests funding from Stellar Friendbot and polls Horizon until the
 * account has at least `targetXlm` native XLM.
 *
 * - On HTTP 400, we treat it as "already funded past threshold" and still poll.
 */
export async function fundWithFriendbot(
  publicKey: string,
  network: string,
  options: FundWithFriendbotOptions = {}
): Promise<{ status: FriendbotFundStatus; balance: number }> {
  const targetXlm = options.targetXlm ?? 10_000;
  const pollIntervalMs = options.pollIntervalMs ?? 1500;
  const maxAttempts = options.maxAttempts ?? 20;

  // Friendbot is only valid for public test networks.
  // (UI should already hide the button for Mainnet.)
  const friendbotUrl = `${FRIENDBOT_URL}${encodeURIComponent(publicKey)}`;

  let status: FriendbotFundStatus = "funded";

  const initial = await fetchNativeXlmBalance(publicKey, network);

  const res = await fetch(friendbotUrl, { method: "GET" });
  if (!res.ok) {
    if (res.status === 400) {
      // Usually means the account is already funded above Friendbot threshold.
      status = "already_funded";
    } else {
      throw new Error(`Friendbot request failed: ${res.status}`);
    }
  }

  // Poll for success: once the balance meets target, we return.
  let lastBalance = initial;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastBalance = await fetchNativeXlmBalance(publicKey, network);
    if (lastBalance >= targetXlm) {
      return { status, balance: lastBalance };
    }
    await sleep(pollIntervalMs);
  }

  // Even if Friendbot returned 400, balance might already be above threshold.
  // If we got here, it's not.
  if (status === "already_funded" && lastBalance > 0) {
    return { status, balance: lastBalance };
  }

  throw new Error(
    `Timed out waiting for Friendbot funding. Last known balance: ${lastBalance.toFixed(2)} XLM`
  );
}

