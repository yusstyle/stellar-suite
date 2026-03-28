import { useMemo } from "react";
import {
  Lock,
  CheckCircle,
  LockOpen,
  MessageSquare,
  ArrowRight,
  Shield,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MessagePassingEvent {
  id: string;
  from: "origin" | "bridge" | "target";
  to: "origin" | "bridge" | "target";
  label: string;
  status: "pending" | "in-progress" | "completed" | "error";
  timestamp?: number;
}

interface BridgeVisualizerProps {
  currentPhase: "lock" | "verify" | "unlock" | "complete" | "error";
  messages: MessagePassingEvent[];
  securityCheckpoints: {
    name: string;
    passed: boolean;
    error?: string;
  }[];
}

export function BridgeVisualizer({
  currentPhase,
  messages,
  securityCheckpoints,
}: BridgeVisualizerProps) {
  const phases = useMemo(
    () => [
      { id: "lock", label: "Lock", icon: Lock },
      { id: "verify", label: "Verify", icon: Shield },
      { id: "unlock", label: "Unlock", icon: LockOpen },
    ],
    []
  );

  const phaseIndex = phases.findIndex((p) => p.id === currentPhase);
  const isComplete = currentPhase === "complete";
  const isError = currentPhase === "error";

  return (
    <div className="space-y-6">
      {/* Phase Timeline */}
      <div className="rounded-lg border border-muted bg-card p-6">
        <h4 className="text-sm font-semibold mb-4 text-foreground">Bridge Execution Timeline</h4>
        <div
          className="flex items-center justify-between gap-2"
          role="progressbar"
          aria-valuenow={phaseIndex + 1}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-label="Bridge execution progress"
        >
          {phases.map((phase, idx) => {
            const PhaseIcon = phase.icon;
            const isPhaseCompleted = idx < phaseIndex;
            const isPhaseActive = idx === phaseIndex;
            const isPhasePending = idx > phaseIndex;

            return (
              <div key={phase.id} className="flex items-center flex-1 gap-2">
                {/* Phase Circle */}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    isPhaseCompleted && "border-emerald-500 bg-emerald-500/10",
                    isPhaseActive &&
                      "border-primary bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-card",
                    isPhasePending && "border-muted-foreground/20 bg-muted"
                  )}
                  aria-label={`${phase.label}: ${
                    isPhaseCompleted ? "completed" : isPhaseActive ? "in progress" : "pending"
                  }`}
                >
                  <PhaseIcon
                    className={cn(
                      "h-5 w-5",
                      isPhaseCompleted && "text-emerald-500",
                      isPhaseActive && "text-primary",
                      isPhasePending && "text-muted-foreground/40"
                    )}
                    aria-hidden="true"
                  />
                </div>

                {/* Phase Label */}
                <div className="hidden sm:block">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isPhaseCompleted && "text-emerald-600 dark:text-emerald-400",
                      isPhaseActive && "text-primary font-semibold",
                      isPhasePending && "text-muted-foreground/50"
                    )}
                  >
                    {phase.label}
                  </p>
                </div>

                {/* Connector Line */}
                {idx < phases.length - 1 && (
                  <div
                    className={cn(
                      "hidden sm:block h-1 flex-1 rounded-full transition-colors",
                      idx < phaseIndex && "bg-emerald-500/30",
                      idx === phaseIndex && "bg-primary/30",
                      idx > phaseIndex && "bg-muted-foreground/10"
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Status Message */}
        <div className="mt-4 text-sm text-muted-foreground" role="status">
          {isComplete && (
            <span className="text-emerald-600 dark:text-emerald-400">
              ✓ Bridge interaction completed successfully
            </span>
          )}
          {isError && (
            <span className="text-destructive">× Bridge interaction failed</span>
          )}
          {!isComplete && !isError && (
            <span>
              Phase {phaseIndex + 1} of {phases.length}: {phases[phaseIndex]?.label}
            </span>
          )}
        </div>
      </div>

      {/* Message Passing Visualization */}
      <div className="rounded-lg border border-muted bg-card p-6">
        <h4 className="text-sm font-semibold mb-4 text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Message Passing
        </h4>

        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No messages to display
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-md border p-3 text-sm transition-colors",
                  msg.status === "completed" &&
                    "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
                  msg.status === "in-progress" &&
                    "border-primary/30 bg-primary/5 text-primary animate-pulse",
                  msg.status === "pending" &&
                    "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
                  msg.status === "error" &&
                    "border-destructive/30 bg-destructive/5 text-destructive"
                )}
                role="listitem"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold uppercase">
                    {msg.from.slice(0, 3)} → {msg.to.slice(0, 3)}
                  </span>
                  <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{msg.label}</span>
                  {msg.status === "completed" && (
                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" aria-label="completed" />
                  )}
                  {msg.status === "error" && (
                    <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-label="error" />
                  )}
                </div>
                {msg.timestamp && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    +{msg.timestamp}ms
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Checkpoints */}
      <div className="rounded-lg border border-muted bg-card p-6">
        <h4 className="text-sm font-semibold mb-4 text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4" aria-hidden="true" />
          Security Checkpoints
        </h4>

        <div className="space-y-2" role="list">
          {securityCheckpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No checkpoints evaluated</p>
          ) : (
            securityCheckpoints.map((checkpoint, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm flex items-center gap-2.5 transition-colors",
                  checkpoint.passed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-destructive/30 bg-destructive/5"
                )}
                role="listitem"
              >
                {checkpoint.passed ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      checkpoint.passed
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-destructive"
                    )}
                  >
                    {checkpoint.name}
                  </p>
                  {checkpoint.error && (
                    <p className="text-xs text-destructive/80 mt-0.5">{checkpoint.error}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
