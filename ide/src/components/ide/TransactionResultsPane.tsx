import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { TransactionResultLog } from "@/components/ide/TransactionResultLog";
import { useTransactionResultsStore } from "@/store/useTransactionResultsStore";

export function TransactionResultsPane() {
  const logs = useTransactionResultsStore((state) => state.logs);
  const clearLogs = useTransactionResultsStore((state) => state.clearLogs);

  return (
    <div className="space-y-2 rounded-md border border-border bg-card/40 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Output / Transaction Results</p>
          <p className="text-[11px] text-muted-foreground">Chronological log of recent invocations</p>
        </div>
        <Button variant="ghost" size="sm" className="text-[11px]" onClick={clearLogs} disabled={logs.length === 0}>
          Clear
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-[12px] text-muted-foreground">
          No results yet. Invoke a function to see output.
        </div>
      ) : (
        <ScrollArea className="max-h-72">
          <div className="space-y-2 pr-2">
            {logs.map((log) => (
              <TransactionResultLog key={log.id} entry={log} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}