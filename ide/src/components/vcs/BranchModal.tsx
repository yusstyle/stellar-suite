import { useState, useCallback, useEffect } from "react";
import { AlertCircle, CheckCircle2, GitBranch, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useVCSStore } from "@/store/vcsStore";

interface BranchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBranch: string;
  action?: "create" | "switch" | null;
  targetBranch?: string | null;
}

type ModalStep = "action-select" | "create-branch" | "switch-with-changes" | "confirm";

// Git-safe branch name pattern: no spaces, no special chars except hyphen and underscore
const BRANCH_NAME_PATTERN = /^[a-zA-Z0-9._/-]+$/;
const INVALID_BRANCH_NAMES = [
  "HEAD",
  "main",
  "master",
  "develop",
  "release",
  "hotfix",
  "staging",
];

function validateBranchName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, error: "Branch name is required." };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: "Branch name must be 255 characters or less." };
  }

  if (!BRANCH_NAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: "Branch name can only contain alphanumeric, hyphens, underscores, dots, and slashes.",
    };
  }

  if (trimmed.startsWith("/") || trimmed.endsWith("/") || trimmed.includes("//")) {
    return { valid: false, error: "Branch name cannot start/end with slash or contain //." };
  }

  if (trimmed.endsWith(".lock")) {
    return { valid: false, error: "Branch name cannot end with .lock." };
  }

  if (trimmed.includes(" ")) {
    return { valid: false, error: "Branch name cannot contain spaces." };
  }

  return { valid: true };
}

export function BranchModal({
  open,
  onOpenChange,
  currentBranch,
  action = null,
  targetBranch = null,
}: BranchModalProps) {
  const { setBranch, localStatusMap } = useVCSStore();
  const [step, setStep] = useState<ModalStep>(
    action === "create" ? "create-branch" : action === "switch" && targetBranch ? "switch-with-changes" : "action-select"
  );
  const [newBranchName, setNewBranchName] = useState("");
  const [targetSwitchBranch, setTargetSwitchBranch] = useState<string | null>(targetBranch ?? null);
  const [stashChanges, setStashChanges] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasUncommittedChanges = Object.values(localStatusMap).some(
    (status) => status === "modified" || status === "new" || status === "deleted"
  );

  const handleReset = useCallback(() => {
    const initialStep = action === "create"
      ? "create-branch"
      : action === "switch" && targetBranch
      ? "switch-with-changes"
      : "action-select";
    setStep(initialStep);
    setNewBranchName("");
    setTargetSwitchBranch(targetBranch ?? null);
    setStashChanges(false);
    setValidationError(null);
    setIsProcessing(false);
  }, [action, targetBranch]);

  // Reset step when modal opens with new props
  useEffect(() => {
    if (open) {
      handleReset();
    }
  }, [open, action, targetBranch, handleReset]);

  const handleClose = useCallback(() => {
    handleReset();
    onOpenChange(false);
  }, [onOpenChange, handleReset]);

  const handleCreateBranchClick = useCallback(() => {
    setStep("create-branch");
  }, []);

  const handleCreateBranch = useCallback(async () => {
    const validation = validateBranchName(newBranchName);

    if (!validation.valid) {
      setValidationError(validation.error || "Invalid branch name.");
      return;
    }

    if (INVALID_BRANCH_NAMES.includes(newBranchName.trim().toLowerCase())) {
      setValidationError(`"${newBranchName}" is a reserved branch name.`);
      return;
    }

    setIsProcessing(true);
    setValidationError(null);

    try {
      // Simulate branch creation (in production, would call gitService)
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Switch to new branch
      setBranch(newBranchName.trim());
      toast.success(`Branch "${newBranchName.trim()}" created and checked out.`);
      handleClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create branch.";
      setValidationError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [newBranchName, setBranch, handleClose]);

  const handleSwitchBranchWithChanges = useCallback(
    (target: string) => {
      if (hasUncommittedChanges) {
        setTargetSwitchBranch(target);
        setStep("switch-with-changes");
      } else {
        handleProceedSwitch(target, false);
      }
    },
    [hasUncommittedChanges]
  );

  const handleProceedSwitch = useCallback(
    async (target: string, shouldStash: boolean) => {
      setIsProcessing(true);
      setValidationError(null);

      try {
        // Simulate stashing (if needed) and branch switch
        if (shouldStash && hasUncommittedChanges) {
          // Simulate stash operation
          await new Promise((resolve) => setTimeout(resolve, 400));
          toast.success("Changes stashed successfully.");
        }

        // Simulate branch checkout
        await new Promise((resolve) => setTimeout(resolve, 300));

        setBranch(target);
        toast.success(`Switched to branch "${target}".`);
        handleClose();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to switch branch.";
        setValidationError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [hasUncommittedChanges, setBranch, handleClose]
  );

  // ACTION SELECT STEP
  if (step === "action-select") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" aria-hidden="true" />
              Branch Management
            </DialogTitle>
            <DialogDescription>
              Current branch: <span className="font-mono font-semibold">{currentBranch}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Button
              onClick={handleCreateBranchClick}
              variant="outline"
              className="w-full justify-start h-auto py-3"
            >
              <GitBranch className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
              <div className="text-left">
                <div className="font-medium text-sm">Create New Branch</div>
                <div className="text-xs text-muted-foreground">From current HEAD</div>
              </div>
            </Button>

            <Separator />

            <div className="text-xs font-semibold text-muted-foreground px-1">Switch Branch</div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {["main", "develop", "staging"].map((b) => (
                <Button
                  key={b}
                  onClick={() => handleSwitchBranchWithChanges(b)}
                  variant={currentBranch === b ? "default" : "outline"}
                  className="w-full justify-start h-auto py-2.5"
                  disabled={currentBranch === b}
                >
                  <GitBranch className="h-3.5 w-3.5 mr-2 shrink-0" aria-hidden="true" />
                  <span className="truncate flex-1 text-xs">{b}</span>
                  {currentBranch === b && (
                    <span className="ml-2 text-xs font-bold" aria-label="current">
                      ✓
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose} variant="ghost" size="sm">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // CREATE BRANCH STEP
  if (step === "create-branch") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" aria-hidden="true" />
              Create New Branch
            </DialogTitle>
            <DialogDescription>
              Create a new branch from the current HEAD
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name" className="text-sm font-medium">
                Branch Name
              </Label>
              <Input
                id="branch-name"
                placeholder="e.g., feature/new-component, fix/issue-123"
                value={newBranchName}
                onChange={(e) => {
                  setNewBranchName(e.target.value);
                  setValidationError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateBranch();
                  }
                }}
                disabled={isProcessing}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use lowercase, hyphens, and slashes. No spaces or special characters.
              </p>
            </div>

            {validationError && (
              <div className="rounded-md bg-destructive/10 p-3 border border-destructive/30">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{validationError}</span>
                </p>
              </div>
            )}

            {newBranchName && !validationError && (
              <div className="rounded-md bg-emerald-500/10 p-3 border border-emerald-500/30">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Branch name looks good!</span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              onClick={() => setStep("action-select")}
              variant="ghost"
              size="sm"
              disabled={isProcessing}
            >
              Back
            </Button>
            <Button
              onClick={handleCreateBranch}
              disabled={!newBranchName || !!validationError || isProcessing}
              size="sm"
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
              {isProcessing ? "Creating..." : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // SWITCH WITH CHANGES STEP
  if (step === "switch-with-changes" && targetSwitchBranch) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              Uncommitted Changes
            </DialogTitle>
            <DialogDescription>
              You have uncommitted changes. Choose an action below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-md bg-amber-500/10 p-4 border border-amber-500/30">
              <h4 className="font-semibold text-sm mb-2">Changes to Commit or Stash:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {Object.entries(localStatusMap)
                  .filter(([_, status]) => status !== "new")
                  .slice(0, 5)
                  .map(([path, status]) => (
                    <li key={path}>
                      <span className="text-amber-600 dark:text-amber-400 font-mono">
                        {status[0].toUpperCase()}{" "}
                      </span>
                      {path}
                    </li>
                  ))}
              </ul>
              {Object.keys(localStatusMap).length > 5 && (
                <p className="text-xs text-muted-foreground mt-2">
                  and {Object.keys(localStatusMap).length - 5} more...
                </p>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setStashChanges(false)}
                className={cn(
                  "w-full rounded-lg border-2 p-3 text-left text-sm transition-colors",
                  !stashChanges
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-muted/30 hover:border-primary/50"
                )}
              >
                <div className="font-semibold">Cancel Switch</div>
                <div className="text-xs text-muted-foreground">
                  Keep working on {currentBranch}
                </div>
              </button>

              <button
                onClick={() => setStashChanges(true)}
                className={cn(
                  "w-full rounded-lg border-2 p-3 text-left text-sm transition-colors",
                  stashChanges
                    ? "border-primary bg-primary/5"
                    : "border-muted bg-muted/30 hover:border-primary/50"
                )}
              >
                <div className="font-semibold">Stash & Switch</div>
                <div className="text-xs text-muted-foreground">
                  Save changes and switch to {targetSwitchBranch}
                </div>
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button onClick={handleClose} variant="ghost" size="sm" disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={() => handleProceedSwitch(targetSwitchBranch, stashChanges)}
              disabled={isProcessing}
              variant={stashChanges ? "default" : "outline"}
              size="sm"
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />}
              {isProcessing
                ? stashChanges
                  ? "Stashing..."
                  : "Switching..."
                : stashChanges
                  ? "Stash & Switch"
                  : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
