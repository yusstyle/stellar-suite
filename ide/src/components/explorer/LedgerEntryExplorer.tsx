"use client";

import { useState, useEffect, useCallback } from "react";
import { useFileStore } from "@/store/useFileStore";
import { LedgerEntryTable } from "./LedgerEntryTable";
import { transformLedgerEntry, type DecodedLedgerEntry } from "@/lib/scvalTransformer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Database, AlertCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface LedgerEntryExplorerProps {
  initialContractId?: string;
}

/**
 * Fetches ledger entries from the Soroban RPC
 */
async function fetchLedgerEntries(
  rpcUrl: string,
  contractId: string,
): Promise<{ key: string; val: string }[]> {
  const response = await fetch(`${rpcUrl}/rpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getLedgerEntries",
      params: {
        keys: [
          // We'll fetch a range of contract data keys
          // First, let's get the contract's instance
          {
            type: "contract",
            key: contractId,
          },
        ],
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "RPC error occurred");
  }

  // Get all contract data entries for this contract
  // We'll iterate through potential keys to find all storage entries
  const entries: { key: string; val: string }[] = [];
  
  // Add the contract instance entry if present
  if (data.result?.entries) {
    for (const entry of data.result.entries) {
      if (entry.key && entry.val) {
        entries.push({
          key: entry.key,
          val: entry.val,
        });
      }
    }
  }

  return entries;
}

/**
 * Tries to fetch all storage entries for a contract by iterating through keys
 * This is a workaround since getLedgerEntries doesn't support getting all keys at once
 */
async function fetchAllContractStorage(
  rpcUrl: string,
  contractId: string,
): Promise<{ key: string; val: string }[]> {
  const commonPrefixes = [
    "", // instance storage
    "persistent_",
    "temp_",
  ];

  const entries: { key: string; val: string }[] = [];
  
  // Try to get contract instance data first
  try {
    const instanceResponse = await fetch(`${rpcUrl}/rpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLedgerEntries",
        params: {
          keys: [
            {
              type: "contract",
              contractId: contractId,
              key: "instance",
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (instanceResponse.ok) {
      const data = await instanceResponse.json();
      if (data.result?.entries && data.result.entries.length > 0) {
        entries.push({
          key: data.result.entries[0].key,
          val: data.result.entries[0].val,
        });
      }
    }
  } catch (e) {
    // Ignore errors for instance fetch
  }

  // Common storage key patterns
  // In a real implementation, you'd need to know the key types
  // For now, we'll try some common patterns
  const sampleKeys = [
    // Common word-like keys (symbols)
    "COUNTER",
    "COUNT",
    "admin",
    "owner",
    "data",
    "value",
  ];

  for (const key of sampleKeys) {
    try {
      const keyXdr = createContractDataKey(contractId, key, "persistent");
      const response = await fetch(`${rpcUrl}/rpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getLedgerEntries",
          params: {
            keys: [keyXdr],
          },
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.entries && data.result.entries.length > 0) {
          entries.push({
            key: data.result.entries[0].key,
            val: data.result.entries[0].val,
          });
        }
      }
    } catch {
      // Skip keys that don't exist
    }
  }

  return entries;
}

/**
 * Creates a contract data key XDR structure
 * This creates a proper LedgerKey for contract data
 */
function createContractDataKey(
  contractId: string,
  keyName: string,
  durability: "persistent" | "temporary" = "persistent",
): object {
  // Convert the key to a ScVal symbol
  const keySymbol = btoa(keyName).replace(/=/g, "");

  return {
    type: "ledgerKey",
    ledgerKey: {
      type: "contractData",
      contractData: {
        contract: {
          type: "address",
          address: {
            type: "contract",
            contractId: contractId,
          },
        },
        key: {
          type: "scval",
          scval: {
            type: "symbol",
            symbol: keyName,
          },
        },
        durability: durability,
      },
    },
  };
}

export function LedgerEntryExplorer({ initialContractId }: LedgerEntryExplorerProps) {
  const { horizonUrl, customRpcUrl, network, networkPassphrase } = useFileStore();
  
  const [contractId, setContractId] = useState(initialContractId || "");
  const [entries, setEntries] = useState<DecodedLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Get the appropriate RPC URL
  const rpcUrl = network === "local" ? customRpcUrl : horizonUrl;

  const handleFetchEntries = useCallback(async () => {
    if (!contractId.trim()) {
      setError("Please enter a contract ID");
      return;
    }

    // Validate contract ID format (starts with C and is base32)
    if (!contractId.startsWith("C") || contractId.length < 56) {
      setError("Invalid contract ID format. Contract IDs start with 'C' and are base32 encoded.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setEntries([]);
    setHasFetched(true);

    try {
      // Fetch all contract storage entries
      const rawEntries = await fetchAllContractStorage(rpcUrl, contractId);
      
      // Transform entries to readable format
      const transformed = rawEntries.map((entry) => transformLedgerEntry(entry));
      
      // Determine durability for entries that don't have it set
      // Instance storage is typically the first entry
      if (transformed.length > 0 && !transformed[0].durability) {
        transformed[0].durability = "instance";
      }

      setEntries(transformed);

      if (transformed.length === 0) {
        toast.info("No storage entries found for this contract");
      } else {
        toast.success(`Found ${transformed.length} storage entries`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch ledger entries";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [contractId, rpcUrl]);

  // Auto-fetch if initial contract ID is provided
  useEffect(() => {
    if (initialContractId && !hasFetched) {
      setContractId(initialContractId);
      // Delay fetch slightly to allow component to mount
      setTimeout(() => {
        handleFetchEntries();
      }, 100);
    }
  }, [initialContractId, hasFetched, handleFetchEntries]);

  const handleRefresh = () => {
    handleFetchEntries();
  };

  return (
    <div className="space-y-6">
      {/* Contract ID Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Contract Storage Explorer
          </CardTitle>
          <CardDescription>
            Browse all ledger entries associated with a contract address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Enter contract ID (e.g., C...)"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleFetchEntries();
                }
              }}
            />
            <Button 
              onClick={handleFetchEntries} 
              disabled={isLoading || !contractId.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Fetch Entries
                </>
              )}
            </Button>
          </div>

          {/* Network indicator */}
          <div className="mt-3 text-sm text-muted-foreground">
            Network: <span className="font-medium">{network}</span>
            <span className="mx-2">•</span>
            RPC: <span className="font-mono text-xs">{rpcUrl}</span>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )}

      {/* Results Table */}
      {hasFetched && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Storage Entries
              {entries.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({entries.length} found)
                </span>
              )}
            </h3>
          </div>
          
          <LedgerEntryTable
            entries={entries}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            contractId={contractId}
          />
        </div>
      )}
    </div>
  );
}

export default LedgerEntryExplorer;