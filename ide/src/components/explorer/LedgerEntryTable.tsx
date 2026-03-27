"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { DecodedLedgerEntry } from "@/lib/scvalTransformer";

interface LedgerEntryTableProps {
  entries: DecodedLedgerEntry[];
  isLoading?: boolean;
  onRefresh?: () => void;
  contractId?: string;
}

/**
 * Formats the raw XDR for display (truncated if too long)
 */
function formatRawXdr(raw: string, maxLength: number = 60): string {
  if (raw.length <= maxLength) {
    return raw;
  }
  return `${raw.slice(0, maxLength)}...`;
}

/**
 * Returns a badge color based on durability
 */
function getDurabilityBadge(durability?: string) {
  switch (durability) {
    case "persistent":
      return <Badge variant="default">Persistent</Badge>;
    case "temporary":
      return <Badge variant="secondary">Temporary</Badge>;
    case "instance":
      return <Badge variant="outline">Instance</Badge>;
    default:
      return <Badge variant="ghost">Unknown</Badge>;
  }
}

/**
 * Returns a color based on key type
 */
function getKeyTypeColor(keyType: string): string {
  switch (keyType) {
    case "symbol":
      return "text-purple-500";
    case "string":
      return "text-blue-500";
    case "u64":
    case "u32":
    case "i64":
    case "i32":
      return "text-green-500";
    case "address":
      return "text-orange-500";
    case "bytes":
      return "text-yellow-500";
    case "map":
    case "vec":
      return "text-pink-500";
    default:
      return "text-gray-500";
  }
}

export function LedgerEntryTable({
  entries,
  isLoading = false,
  onRefresh,
  contractId,
}: LedgerEntryTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [keyTypeFilter, setKeyTypeFilter] = useState<
    "all" | "persistent" | "temporary" | "instance"
  >("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [detailEntry, setDetailEntry] = useState<DecodedLedgerEntry | null>(
    null,
  );

  // Filter entries based on search and durability
  const filteredEntries = useMemo(() => {
    let result = entries;

    // Filter by durability
    if (keyTypeFilter !== "all") {
      result = result.filter((entry) => entry.durability === keyTypeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.keyValue.toLowerCase().includes(term) ||
          entry.valueData.toLowerCase().includes(term) ||
          entry.key.toLowerCase().includes(term) ||
          entry.value.toLowerCase().includes(term),
      );
    }

    return result;
  }, [entries, searchTerm, keyTypeFilter]);

  // Copy to clipboard function
  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  // Open detail dialog
  const handleRowClick = (entry: DecodedLedgerEntry) => {
    setDetailEntry(entry);
    setExpandedRow(entry.rawKey);
  };

  if (entries.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Database className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Ledger Entries Found</h3>
        <p className="text-muted-foreground mb-4">
          {contractId
            ? `No storage entries found for contract ${contractId}`
            : "No contract selected"}
        </p>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-[250px]"
              />
            </div>

            {/* Durability Filter */}
            <Select
              value={keyTypeFilter}
              onValueChange={(value) =>
                setKeyTypeFilter(value as typeof keyTypeFilter)
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by durability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="persistent">Persistent</SelectItem>
                <SelectItem value="temporary">Temporary</SelectItem>
                <SelectItem value="instance">Instance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" disabled={isLoading}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredEntries.length} of {entries.length} entries
        </div>

        {/* Table */}
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Key Type</TableHead>
                <TableHead>Key Value</TableHead>
                <TableHead>Value Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Durability</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow
                  key={entry.rawKey}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(entry)}
                >
                  <TableCell>
                    {expandedRow === entry.rawKey ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={getKeyTypeColor(entry.key)}>
                      {entry.key}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm max-w-[200px] truncate">
                    {entry.keyValue}
                  </TableCell>
                  <TableCell>
                    <span className={getKeyTypeColor(entry.value)}>
                      {entry.value}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm max-w-[200px] truncate">
                    {entry.valueData}
                  </TableCell>
                  <TableCell>{getDurabilityBadge(entry.durability)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(entry.rawKey, "Key");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy key XDR</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(entry.rawValue, "Value");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy value XDR</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailEntry} onOpenChange={() => setDetailEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ledger Entry Details</DialogTitle>
            <DialogDescription>
              Detailed view of the selected ledger entry
            </DialogDescription>
          </DialogHeader>
          {detailEntry && (
            <div className="space-y-4">
              {/* Key Section */}
              <div className="space-y-2">
                <h4 className="font-semibold">Key</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Type:</div>
                  <div className={getKeyTypeColor(detailEntry.key)}>
                    {detailEntry.key}
                  </div>
                  <div className="text-muted-foreground">Value:</div>
                  <div className="font-mono break-all">{detailEntry.keyValue}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Raw XDR (Base64):</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded break-all">
                      {detailEntry.rawKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleCopy(detailEntry.rawKey, "Raw key")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Value Section */}
              <div className="space-y-2">
                <h4 className="font-semibold">Value</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Type:</div>
                  <div className={getKeyTypeColor(detailEntry.value)}>
                    {detailEntry.value}
                  </div>
                  <div className="text-muted-foreground">Value:</div>
                  <div className="font-mono break-all">{detailEntry.valueData}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Raw XDR (Base64):</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded break-all">
                      {detailEntry.rawValue}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleCopy(detailEntry.rawValue, "Raw value")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Metadata Section */}
              <div className="space-y-2">
                <h4 className="font-semibold">Metadata</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Durability:</div>
                  <div>{getDurabilityBadge(detailEntry.durability)}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

export default LedgerEntryTable;