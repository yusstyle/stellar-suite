import { useCallback, useState, useEffect } from "react";
import { GitBranch, ChevronDown, Plus, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useVCSStore } from "@/store/vcsStore";
import { BranchModal } from "@/components/vcs";

interface BranchPickerState {
  branches: string[];
  isLoading: boolean;
  error: string | null;
}

export function BranchPicker() {
  const { branch, setBranch, localRepoInitialized, localStatusMap } = useVCSStore();
  const [state, setState] = useState<BranchPickerState>({
    branches: ["main", "develop"],
    isLoading: false,
    error: null,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"create" | "switch" | null>(null);
  const [modalTargetBranch, setModalTargetBranch] = useState<string | null>(null);

  // Determine if there are uncommitted changes
  const hasUncommittedChanges = Object.values(localStatusMap).some(
    (status) => status === "modified" || status === "new" || status === "deleted"
  );

  const refetchBranches = useCallback(async () => {
    if (!localRepoInitialized) {
      setState((prev) => ({ ...prev, branches: ["main"] }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Mock branch list - in production would use gitService
      // For now, we keep a static list of common branches
      const mockBranches = ["main", "develop", "staging"];
      setState((prev) => ({
        ...prev,
        branches: mockBranches,
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch branches";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [localRepoInitialized]);

  useEffect(() => {
    refetchBranches();
  }, [refetchBranches]);

  const handleSwitchBranch = useCallback(
    (targetBranch: string) => {
      if (targetBranch === branch) return;

      if (hasUncommittedChanges) {
        // Show modal offering stash or cancel
        setModalAction("switch");
        setModalTargetBranch(targetBranch);
        setModalOpen(true);
        return;
      }

      // Proceed with checkout
      setBranch(targetBranch);
    },
    [branch, hasUncommittedChanges, setBranch]
  );

  const handleCreateBranch = useCallback(() => {
    setModalAction("create");
    setModalTargetBranch(null);
    setModalOpen(true);
  }, []);

  if (!localRepoInitialized) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 h-8 px-2 font-mono text-xs"
                aria-label={`Current branch: ${branch}`}
              >
                <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="truncate">{branch}</span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {hasUncommittedChanges
              ? "Switch branch (will prompt to stash changes)"
              : "Switch to another branch"}
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel className="text-xs font-semibold">
            {hasUncommittedChanges && (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                ⚠ Uncommitted changes
              </span>
            )}
            {!hasUncommittedChanges && "Branches"}
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {state.isLoading ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
              <Loader2 className="h-3 w-3 animate-spin inline mr-1" aria-hidden="true" />
              Loading...
            </div>
          ) : state.branches.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
              No branches found
            </div>
          ) : (
            state.branches.map((b) => (
              <DropdownMenuItem
                key={b}
                onClick={() => handleSwitchBranch(b)}
                className={cn(
                  "text-xs cursor-pointer",
                  b === branch && "bg-accent font-semibold"
                )}
                aria-current={b === branch ? "true" : "false"}
              >
                <GitBranch className="h-3 w-3 mr-2 shrink-0" aria-hidden="true" />
                <span className="truncate flex-1">{b}</span>
                {b === branch && (
                  <span className="ml-2 text-xs font-bold text-primary" aria-label="current">
                    ✓
                  </span>
                )}
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={refetchBranches}
            className="text-xs cursor-pointer"
            aria-label="Refresh branches"
          >
            <RefreshCw className="h-3 w-3 mr-2 shrink-0" aria-hidden="true" />
            Refresh
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleCreateBranch}
            className="text-xs cursor-pointer"
            aria-label="Create new branch"
          >
            <Plus className="h-3 w-3 mr-2 shrink-0" aria-hidden="true" />
            New Branch...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <BranchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        currentBranch={branch}
        action={modalAction}
        targetBranch={modalTargetBranch}
      />
    </>
  );
}
