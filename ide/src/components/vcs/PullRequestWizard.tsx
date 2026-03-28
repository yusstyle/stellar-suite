import { useCallback, useState, useEffect } from "react";
import { GitPullRequest, Loader2, CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useVCSStore } from "@/store/vcsStore";
import { getPAT } from "@/lib/vcs/githubAuth";

interface PullRequestWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner?: string;
  repo?: string;
  baseBranch?: string;
  headBranch?: string;
  commitMessage?: string;
}

type PullRequestStep = "form" | "creating" | "success" | "error";

interface CreatePRPayload {
  title: string;
  body: string;
  head: string;
  base: string;
}

interface GitHubPRResponse {
  id: number;
  number: number;
  html_url: string;
  title: string;
  state: string;
}

export function PullRequestWizard({
  open,
  onOpenChange,
  owner = "stellar-suite",
  repo = "stellar-suite",
  baseBranch = "main",
  headBranch,
  commitMessage = "",
}: PullRequestWizardProps) {
  const { branch } = useVCSStore();
  const [step, setStep] = useState<PullRequestStep>("form");
  const [prTitle, setPrTitle] = useState("");
  const [prDescription, setPrDescription] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdPR, setCreatedPR] = useState<GitHubPRResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveHeadBranch = headBranch || branch;

  // Auto-fill description from commit message
  useEffect(() => {
    if (open && !prDescription && commitMessage) {
      setPrDescription(commitMessage);
    }
  }, [open, commitMessage, prDescription]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep("form");
      setPrTitle("");
      setPrDescription(commitMessage || "");
      setValidationError(null);
      setApiError(null);
      setCreatedPR(null);
    }
  }, [open, commitMessage]);

  const validateForm = useCallback((): boolean => {
    setValidationError(null);

    const titleTrimmed = prTitle.trim();
    if (!titleTrimmed) {
      setValidationError("PR title is required.");
      return false;
    }

    if (titleTrimmed.length > 256) {
      setValidationError("PR title must be 256 characters or less.");
      return false;
    }

    if (prDescription.length > 65536) {
      setValidationError("PR description must be 65536 characters or less.");
      return false;
    }

    if (!effectiveHeadBranch || effectiveHeadBranch === baseBranch) {
      setValidationError("Head branch must be different from base branch.");
      return false;
    }

    return true;
  }, [prTitle, prDescription, effectiveHeadBranch, baseBranch]);

  const createPullRequest = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    const pat = getPAT();
    if (!pat) {
      setValidationError("GitHub authentication required. Please authenticate first.");
      return;
    }

    setIsSubmitting(true);
    setApiError(null);
    setStep("creating");

    try {
      const payload: CreatePRPayload = {
        title: prTitle.trim(),
        body: prDescription.trim(),
        head: effectiveHeadBranch,
        base: baseBranch,
      };

      // Call GitHub API via Octokit to create PR
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        {
          method: "POST",
          headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: `token ${pat}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData?.message ||
          `GitHub API error: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const prData: GitHubPRResponse = await response.json();

      setCreatedPR(prData);
      setStep("success");
      toast.success(`Pull request #${prData.number} created successfully!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create pull request.";
      setApiError(message);
      setStep("error");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, prTitle, prDescription, effectiveHeadBranch, baseBranch, owner, repo]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleOpenPR = useCallback(() => {
    if (createdPR?.html_url) {
      window.open(createdPR.html_url, "_blank");
    }
  }, [createdPR]);

  // FORM STEP
  if (step === "form" || step === "creating") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5" aria-hidden="true" />
              Create Pull Request
            </DialogTitle>
            <DialogDescription>
              Create a PR from <span className="font-mono font-semibold">{effectiveHeadBranch}</span> into{" "}
              <span className="font-mono font-semibold">{baseBranch}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="pr-title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pr-title"
                placeholder="e.g., Add new bridge component"
                value={prTitle}
                onChange={(e) => {
                  setPrTitle(e.target.value);
                  setValidationError(null);
                }}
                disabled={step === "creating"}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {prTitle.length}/256 characters
              </p>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="pr-description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="pr-description"
                placeholder="Describe the changes in this pull request (optional)"
                value={prDescription}
                onChange={(e) => {
                  setPrDescription(e.target.value);
                  setValidationError(null);
                }}
                disabled={step === "creating"}
                className="text-sm min-h-24"
              />
              <p className="text-xs text-muted-foreground">
                {prDescription.length}/65536 characters
              </p>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="rounded-md bg-destructive/10 p-3 border border-destructive/30">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{validationError}</span>
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="rounded-md bg-card border border-muted p-3">
              <p className="text-xs text-muted-foreground space-y-1">
                <div className="font-semibold">PR Details:</div>
                <div className="flex items-center gap-2">
                  <span>Head:</span>
                  <span className="font-mono text-primary">{effectiveHeadBranch}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Base:</span>
                  <span className="font-mono text-primary">{baseBranch}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Repo:</span>
                  <span className="font-mono text-primary">
                    {owner}/{repo}
                  </span>
                </div>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              disabled={step === "creating"}
            >
              Cancel
            </Button>
            <Button
              onClick={createPullRequest}
              disabled={!prTitle.trim() || step === "creating"}
              size="sm"
            >
              {step === "creating" && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
              )}
              {step === "creating" ? "Creating..." : "Create PR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // SUCCESS STEP
  if (step === "success" && createdPR) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              Pull Request Created
            </DialogTitle>
            <DialogDescription>
              Your pull request has been created successfully.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/30 p-4">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                <span className="font-semibold">PR #{createdPR.number}:</span> {createdPR.title}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">PR URL:</p>
              <div className="rounded-md bg-muted p-2 font-mono text-xs break-all">
                {createdPR.html_url}
              </div>
            </div>

            <div className="bg-card border border-muted rounded-md p-3">
              <p className="text-xs text-muted-foreground space-y-1">
                <div className="font-semibold mb-1">Next Steps:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Review the PR on GitHub</li>
                  <li>Add reviewers and labels</li>
                  <li>Wait for CI checks to pass</li>
                  <li>Merge when approved</li>
                </ul>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
            >
              Close
            </Button>
            <Button
              onClick={handleOpenPR}
              className="gap-2"
              size="sm"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              View on GitHub
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ERROR STEP
  if (step === "error") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" aria-hidden="true" />
              Failed to Create PR
            </DialogTitle>
            <DialogDescription>
              An error occurred while creating the pull request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {apiError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4">
                <p className="text-sm text-destructive font-mono break-words">
                  {apiError}
                </p>
              </div>
            )}

            <div className="bg-card border border-muted rounded-md p-3">
              <p className="text-xs text-muted-foreground space-y-1">
                <div className="font-semibold mb-1">Troubleshooting:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Verify GitHub authentication is valid</li>
                  <li>Check that both branches exist on GitHub</li>
                  <li>Ensure head branch is different from base</li>
                  <li>Check repository permissions</li>
                </ul>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button onClick={handleClose} variant="ghost" size="sm">
              Close
            </Button>
            <Button
              onClick={() => setStep("form")}
              variant="outline"
              size="sm"
            >
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
