import { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BridgeStepProps {
  stepNumber: number;
  title: string;
  description: string;
  status: "completed" | "active" | "pending" | "error";
  children: ReactNode;
  error?: string | null;
  icon?: ReactNode;
}

export function BridgeStep({
  stepNumber,
  title,
  description,
  status,
  children,
  error,
  icon,
}: BridgeStepProps) {
  const isActive = status === "active";
  const isCompleted = status === "completed";
  const isError = status === "error";

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        isActive && "border-primary/50 bg-primary/5",
        isCompleted && "border-emerald-500/30 bg-emerald-500/5",
        isError && "border-destructive/50 bg-destructive/5",
        !isActive && !isCompleted && !isError && "border-muted bg-muted/20"
      )}
      role="region"
      aria-label={`Step ${stepNumber}: ${title}`}
      aria-current={isActive ? "step" : undefined}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Step Status Icon */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
              isCompleted && "border-emerald-500 bg-emerald-500/10",
              isActive && "border-primary bg-primary/10",
              isError && "border-destructive bg-destructive/10",
              !isActive && !isCompleted && !isError && "border-muted-foreground/20 bg-muted"
            )}
            aria-label={
              isCompleted ? "completed" : isActive ? "in progress" : isError ? "error" : "pending"
            }
          >
            {isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
            )}
            {isActive && <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />}
            {isError && <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />}
            {!isActive && !isCompleted && !isError && (
              <>
                {icon || <Circle className="h-5 w-5 text-muted-foreground/40" aria-hidden="true" />}
              </>
            )}
          </div>

          {/* Step Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold">Step {stepNumber}: {title}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{description}</p>

            {/* Step Body */}
            <div className={cn("rounded-md bg-background/50 p-4", isError && "bg-destructive/5")}>
              {children}
            </div>

            {/* Error Message */}
            {isError && error && (
              <div className="mt-3 rounded-md bg-destructive/10 p-3 border border-destructive/30">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
