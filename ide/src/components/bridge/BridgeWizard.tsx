import { useState, useCallback, useEffect } from "react";
import { ArrowRight, Zap, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BridgeStep } from "./BridgeStep";
import { BridgeVisualizer } from "./BridgeVisualizer";

interface BridgeWizardProps {
  className?: string;
}

type BridgePhase = "lock" | "verify" | "unlock" | "complete" | "error";
type StepStatus = "completed" | "active" | "pending" | "error";

interface MessagePassingEvent {
  id: string;
  from: "origin" | "bridge" | "target";
  to: "origin" | "bridge" | "target";
  label: string;
  status: "pending" | "in-progress" | "completed" | "error";
  timestamp?: number;
}

interface SecurityCheckpoint {
  name: string;
  passed: boolean;
  error?: string;
}

interface DryRunState {
  phase: BridgePhase;
  messages: MessagePassingEvent[];
  checkpoints: SecurityCheckpoint[];
  isRunning: boolean;
  currentStep: number;
}

export function BridgeWizard({ className }: BridgeWizardProps) {
  const [dryRun, setDryRun] = useState<DryRunState>({
    phase: "lock",
    messages: [],
    checkpoints: [],
    isRunning: false,
    currentStep: 1,
  });

  const [stepErrors, setStepErrors] = useState<{ [key: number]: string | null }>({
    1: null,
    2: null,
    3: null,
  });

  // Mock dry-run simulation
  const runDryRunSimulation = useCallback(async () => {
    setDryRun((prev) => ({
      ...prev,
      isRunning: true,
      messages: [],
      checkpoints: [],
      phase: "lock",
    }));
    setStepErrors({ 1: null, 2: null, 3: null });

    try {
      // Phase 1: LOCK
      await new Promise((resolve) => setTimeout(resolve, 400));
      setDryRun((prev) => ({
        ...prev,
        phase: "lock",
        messages: [
          {
            id: "msg1",
            from: "origin",
            to: "bridge",
            label: "Lock assets in origin contract",
            status: "in-progress",
          },
        ],
      }));

      await new Promise((resolve) => setTimeout(resolve, 800));
      setDryRun((prev) => ({
        ...prev,
        messages: [
          {
            id: "msg1",
            from: "origin",
            to: "bridge",
            label: "Lock assets in origin contract",
            status: "completed",
            timestamp: 800,
          },
        ],
      }));

      // Phase 2: VERIFY
      await new Promise((resolve) => setTimeout(resolve, 300));
      setDryRun((prev) => ({
        ...prev,
        phase: "verify",
        messages: [
          {
            id: "msg1",
            from: "origin",
            to: "bridge",
            label: "Lock assets in origin contract",
            status: "completed",
            timestamp: 800,
          },
          {
            id: "msg2",
            from: "origin",
            to: "bridge",
            label: "Request bridge verification",
            status: "in-progress",
          },
        ],
      }));

      await new Promise((resolve) => setTimeout(resolve, 600));
      setDryRun((prev) => ({
        ...prev,
        messages: [
          {
            id: "msg1",
            from: "origin",
            to: "bridge",
            label: "Lock assets in origin contract",
            status: "completed",
            timestamp: 800,
          },
          {
            id: "msg2",
            from: "origin",
            to: "bridge",
            label: "Request bridge verification",
            status: "completed",
            timestamp: 1500,
          },
          {
            id: "msg3",
            from: "bridge",
            to: "target",
            label: "Validate target network state",
            status: "in-progress",
          },
        ],
      }));

      await new Promise((resolve) => setTimeout(resolve, 700));
      setDryRun((prev) => ({
        ...prev,
        messages: [
          {
            id: "msg1",
            from: "origin",
            to: "bridge",
            label: "Lock assets in origin contract",
            status: "completed",
            timestamp: 800,
          },
          {
            id: "msg2",
            from: "origin",
            to: "bridge",
            label: "Request bridge verification",
            status: "completed",
            timestamp: 1500,
          },
          {
            id: "msg3",
            from: "bridge",
            to: "target",
            label: "Validate target network state",
            status: "completed",
            timestamp: 2200,
          },
        ],
        checkpoints: [
          {
            name: "Origin contract signature verification",
            passed: true,
          },
          {
            name: "Bridge rate limit check",
            passed: true,
          },
          {
            name: "Target network availability",
            passed: true,
          },
          {
            name: "Cross-chain message validation",
            passed: true,
          },
        ],
      }));

      // Phase 3: UNLOCK
      await new Promise((resolve) => setTimeout(resolve, 300));
      setDryRun((prev) => ({
        ...prev,
        phase: "unlock",
        messages: [
          ...(prev.messages || []),
          {
            id: "msg4",
            from: "bridge",
            to: "target",
            label: "Unlock assets on target network",
            status: "in-progress",
          },
        ],
      }));

      await new Promise((resolve) => setTimeout(resolve, 800));
      setDryRun((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === "msg4"
            ? { ...msg, status: "completed" as const, timestamp: 3000 }
            : msg
        ),
      }));

      // Complete
      await new Promise((resolve) => setTimeout(resolve, 400));
      setDryRun((prev) => ({
        ...prev,
        phase: "complete",
        isRunning: false,
      }));
    } catch (error) {
      setDryRun((prev) => ({
        ...prev,
        phase: "error",
        isRunning: false,
      }));
      setStepErrors((prev) => ({
        ...prev,
        1: "Simulation failed during bridge interaction",
      }));
    }
  }, []);

  const resetWizard = useCallback(() => {
    setDryRun({
      phase: "lock",
      messages: [],
      checkpoints: [],
      isRunning: false,
      currentStep: 1,
    });
    setStepErrors({ 1: null, 2: null, 3: null });
  }, []);

  // Auto-advance steps based on phase
  useEffect(() => {
    if (dryRun.phase === "verify" && dryRun.currentStep === 1) {
      setDryRun((prev) => ({ ...prev, currentStep: 2 }));
    } else if (dryRun.phase === "unlock" && dryRun.currentStep === 2) {
      setDryRun((prev) => ({ ...prev, currentStep: 3 }));
    }
  }, [dryRun.phase, dryRun.currentStep]);

  const getStepStatus = useCallback(
    (stepNum: number): StepStatus => {
      if (stepErrors[stepNum as keyof typeof stepErrors]) return "error";
      if (stepNum < dryRun.currentStep) return "completed";
      if (stepNum === dryRun.currentStep && dryRun.isRunning) return "active";
      return "pending";
    },
    [dryRun.currentStep, dryRun.isRunning, stepErrors]
  );

  return (
    <div className={cn("w-full space-y-6", className)}>
      <Card className="border-muted bg-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
                Cross-chain Bridge Interaction
              </CardTitle>
              <CardDescription className="mt-1.5">
                Simulate and visualize the bridge flow: lock assets, verify state, and unlock on
                target network.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step 1: Origin Network */}
      <BridgeStep
        stepNumber={1}
        title="Origin Network Logic"
        description="Initialize bridge protocol and lock assets on the source chain"
        status={getStepStatus(1)}
        error={stepErrors[1]}
      >
        <div className="space-y-3">
          <div className="rounded-md bg-card border border-muted p-3 text-sm space-y-2">
            <p className="flex items-center gap-2 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              Contract: 0x1234...5678
            </p>
            <p className="flex items-center gap-2 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
              Network: Stellar Testnet
            </p>
            <p className="flex items-center gap-2 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
              Amount: 1,000 USDC
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Assets will be locked using the escrow contract. This prevents double-spending and
            ensures atomicity.
          </p>
        </div>
      </BridgeStep>

      {/* Step 2: Bridge Contract */}
      <BridgeStep
        stepNumber={2}
        title="Bridge Contract"
        description="Verify contract state and relay the cross-chain message"
        status={getStepStatus(2)}
        error={stepErrors[2]}
      >
        <div className="space-y-3">
          <div className="rounded-md bg-card border border-muted p-3 text-sm space-y-2">
            <p className="flex items-center gap-2 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-purple-500" aria-hidden="true" />
              Bridge ID: bridge-sol-eth-01
            </p>
            <p className="flex items-center gap-2 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" />
              Target Chain: Ethereum Mainnet
            </p>
            <p className="flex items-center gap-2 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-pink-500" aria-hidden="true" />
              Message Hash: 0xabcd...ef01
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
            Relaying verified state to target network...
          </div>
        </div>
      </BridgeStep>

      {/* Step 3: Target Network */}
      <BridgeStep
        stepNumber={3}
        title="Target Network Logic"
        description="Unlock assets on the destination chain"
        status={getStepStatus(3)}
        error={stepErrors[3]}
      >
        <div className="space-y-3">
          <div className="rounded-md bg-card border border-muted p-3 text-sm space-y-2">
            <p className="flex items-center gap-2 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
              Target Contract: 0xabcd...ef01
            </p>
            <p className="flex items-center gap-2 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-500" aria-hidden="true" />
              Network: Ethereum Mainnet
            </p>
            <p className="flex items-center gap-2 font-mono">
              <span className="inline-block h-2 w-2 rounded-full bg-lime-500" aria-hidden="true" />
              Recipient: 0x99...ff
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Assets will be minted or released on the destination chain after verification.
          </p>
        </div>
      </BridgeStep>

      <Separator className="my-4" />

      {/* Visualization */}
      <BridgeVisualizer
        currentPhase={dryRun.phase}
        messages={dryRun.messages}
        securityCheckpoints={dryRun.checkpoints}
      />

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          onClick={runDryRunSimulation}
          disabled={dryRun.isRunning}
          className="gap-2"
          size="lg"
          aria-label="Run dry-run simulation"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {dryRun.isRunning ? "Running Simulation..." : "Run Dry-Run"}
        </Button>
        <Button
          onClick={resetWizard}
          variant="outline"
          disabled={dryRun.isRunning}
          size="lg"
          aria-label="Reset wizard to initial state"
        >
          <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
          Reset
        </Button>
        <div className="flex-1" />
        <p className="text-sm text-muted-foreground">
          {dryRun.phase === "complete" && "✓ Simulation complete"}
          {dryRun.phase === "error" && "✗ Simulation failed"}
          {!["complete", "error"].includes(dryRun.phase) && dryRun.isRunning && "Simulating..."}
        </p>
      </div>
    </div>
  );
}
