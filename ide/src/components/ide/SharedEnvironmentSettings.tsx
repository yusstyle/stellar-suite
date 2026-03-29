"use client";

import React, { useEffect, useState } from "react";
import {
  Badge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Download,
  Globe,
  Lock,
  Network,
  Plus,
  Trash2,
  Upload,
  User,
  Wifi,
} from "lucide-react";
import {
  type CustomNetwork,
  useSharedEnvironmentStore,
} from "@/store/useSharedEnvironmentStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { NETWORK_CONFIG, type NetworkKey } from "@/lib/networkConfig";
import { NetworkHeaderEditor } from "./NetworkHeaderEditor";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function SharedBadge() {
  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30"
    >
      <Lock className="h-2.5 w-2.5" />
      Shared
    </Badge>
  );
}

function PersonalBadge() {
  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1 text-[10px] text-muted-foreground"
    >
      <User className="h-2.5 w-2.5" />
      Personal
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Custom network row
// ---------------------------------------------------------------------------

function CustomNetworkRow({
  network,
  onUpdate,
  onRemove,
}: {
  network: CustomNetwork;
  onUpdate: (update: Partial<Omit<CustomNetwork, "id">>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-md border ${
        network.isShared
          ? "border-blue-500/30 bg-blue-500/5"
          : "border-border bg-secondary/30"
      } p-3`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{network.label}</span>
          {network.isShared ? <SharedBadge /> : <PersonalBadge />}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground p-1"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={onRemove}
            className="text-red-400 hover:text-red-300 p-1"
            title="Remove network"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={network.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">RPC URL</Label>
            <Input
              value={network.rpcUrl}
              onChange={(e) => onUpdate({ rpcUrl: e.target.value })}
              className="h-7 text-xs font-mono"
              placeholder="https://rpc.example.com"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Network Passphrase</Label>
            <Input
              value={network.passphrase}
              onChange={(e) => onUpdate({ passphrase: e.target.value })}
              className="h-7 text-xs font-mono"
              placeholder="Network passphrase"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Share with team</Label>
            <Switch
              checked={network.isShared}
              onCheckedChange={(v) => onUpdate({ isShared: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add custom network form
// ---------------------------------------------------------------------------

function AddNetworkForm({
  onAdd,
}: {
  onAdd: (network: Omit<CustomNetwork, "id">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [isShared, setIsShared] = useState(true);

  const submit = () => {
    if (!label.trim() || !rpcUrl.trim()) return;
    onAdd({ label: label.trim(), rpcUrl: rpcUrl.trim(), passphrase: passphrase.trim(), isShared });
    setLabel("");
    setRpcUrl("");
    setPassphrase("");
    setIsShared(true);
    setOpen(false);
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add Custom Network
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-border p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">New Custom Network</p>
      <div className="space-y-1">
        <Label className="text-xs">Label *</Label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="h-7 text-xs"
          placeholder="e.g. Staging RPC"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">RPC URL *</Label>
        <Input
          value={rpcUrl}
          onChange={(e) => setRpcUrl(e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder="https://rpc.example.com"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Network Passphrase</Label>
        <Input
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          className="h-7 text-xs font-mono"
          placeholder="Optional passphrase"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Share with team</Label>
        <Switch checked={isShared} onCheckedChange={setIsShared} />
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1" onClick={submit} disabled={!label.trim() || !rpcUrl.trim()}>
          Add
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import / Export panel
// ---------------------------------------------------------------------------

function ImportExportPanel() {
  const { exportConfig, importConfig } = useSharedEnvironmentStore();
  const [importText, setImportText] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  const handleExport = () => {
    const json = exportConfig();
    navigator.clipboard.writeText(json).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

  const handleImport = () => {
    setImportError(null);
    const result = importConfig(importText);
    if (result.success) {
      setImportText("");
      setImportOpen(false);
    } else {
      setImportError(result.error ?? "Import failed");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={handleExport}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          {copyDone ? "Copied!" : "Export Config"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => setImportOpen(!importOpen)}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Import Config
        </Button>
      </div>

      {importOpen && (
        <div className="space-y-2">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full h-32 text-xs font-mono rounded-md border border-border bg-secondary/50 p-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            placeholder="Paste exported JSON here..."
          />
          {importError && (
            <p className="text-xs text-destructive">{importError}</p>
          )}
          <Button
            size="sm"
            className="w-full"
            onClick={handleImport}
            disabled={!importText.trim()}
          >
            Apply Import
          </Button>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Export shared settings as JSON to distribute across your team. Team
        members paste the JSON to sync network configuration instantly.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Effective settings preview
// ---------------------------------------------------------------------------

function EffectiveSettingsRow({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source: "shared" | "personal";
}) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-xs font-mono text-foreground flex-1 text-right truncate" title={value}>
        {value || <span className="text-muted-foreground italic">default</span>}
      </span>
      <div className="shrink-0">
        {source === "shared" ? <SharedBadge /> : <PersonalBadge />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const SharedEnvironmentSettings: React.FC = () => {
  const {
    config,
    setEnabled,
    setWorkspaceName,
    setSharedNetwork,
    setSharedRpcUrl,
    setSharedPassphrase,
    setSharedHeaders,
    addCustomNetwork,
    updateCustomNetwork,
    removeCustomNetwork,
  } = useSharedEnvironmentStore();

  const {
    network: personalNetwork,
    customRpcUrl: personalRpcUrl,
    networkPassphrase: personalPassphrase,
    customHeaders: personalHeaders,
    setNetwork,
    setCustomRpcUrl,
    setNetworkPassphrase,
    setCustomHeaders,
  } = useWorkspaceStore();

  // Apply shared settings to the personal workspace store whenever
  // shared settings are enabled or the shared config changes.
  useEffect(() => {
    if (config.enabled) {
      if (config.network) setNetwork(config.network);
      if (config.rpcUrl) setCustomRpcUrl(config.rpcUrl);
      if (config.networkPassphrase) setNetworkPassphrase(config.networkPassphrase);
      if (Object.keys(config.headers).length > 0) setCustomHeaders(config.headers);
    }
  }, [
    config.enabled,
    config.network,
    config.rpcUrl,
    config.networkPassphrase,
    config.headers,
    setNetwork,
    setCustomRpcUrl,
    setNetworkPassphrase,
    setCustomHeaders,
  ]);

  // Effective (merged) settings
  const effectiveNetwork = config.enabled && config.network ? config.network : personalNetwork;
  const effectiveRpc = config.enabled && config.rpcUrl ? config.rpcUrl : personalRpcUrl;
  const effectivePassphrase =
    config.enabled && config.networkPassphrase
      ? config.networkPassphrase
      : personalPassphrase;

  const sharedNetworks = config.customNetworks.filter((n) => n.isShared);
  const personalNetworks = config.customNetworks.filter((n) => !n.isShared);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Shared Environments</h2>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Workspace Settings Card                                              */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Workspace Settings
            {config.enabled && <SharedBadge />}
          </CardTitle>
          <CardDescription>
            Override personal settings with team-wide RPC endpoints and network
            configuration. When enabled, these take precedence over individual
            preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-1">
              <Label htmlFor="shared-enabled" className="font-medium">
                Enable Workspace Overrides
              </Label>
              <p className="text-sm text-muted-foreground">
                Enforce shared network settings for all team members
              </p>
            </div>
            <Switch
              id="shared-enabled"
              checked={config.enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {/* Workspace name */}
          <div className="space-y-1.5">
            <Label htmlFor="workspace-name" className="text-sm font-medium">
              Workspace / Organization Name
            </Label>
            <Input
              id="workspace-name"
              value={config.workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="h-8 text-sm"
              placeholder="e.g. Acme Corp Dev Team"
            />
          </div>

          {/* Network override fields — only show when enabled */}
          <div
            className={`space-y-4 transition-opacity ${
              config.enabled ? "opacity-100" : "opacity-40 pointer-events-none"
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="shared-network" className="text-sm font-medium">
                  Network Override
                </Label>
                {config.enabled && config.network && <SharedBadge />}
              </div>
              <div className="flex gap-2">
                <select
                  id="shared-network"
                  value={config.network ?? ""}
                  onChange={(e) =>
                    setSharedNetwork(
                      e.target.value ? (e.target.value as NetworkKey) : null
                    )
                  }
                  className="flex-1 text-sm h-8 rounded-md border border-border bg-secondary text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— No override (use personal) —</option>
                  {Object.entries(NETWORK_CONFIG).map(([key, details]) => (
                    <option key={key} value={key}>
                      {details.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Set to force all team members to a specific Stellar network.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="shared-rpc" className="text-sm font-medium">
                  RPC Endpoint Override
                </Label>
                {config.enabled && config.rpcUrl && <SharedBadge />}
              </div>
              <Input
                id="shared-rpc"
                value={config.rpcUrl ?? ""}
                onChange={(e) =>
                  setSharedRpcUrl(e.target.value || null)
                }
                className="h-8 text-sm font-mono"
                placeholder="https://rpc.yourorg.com (leave blank for no override)"
              />
              <p className="text-[11px] text-muted-foreground">
                Standardizes the RPC endpoint to prevent &apos;Works on my
                machine&apos; errors across your team.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="shared-passphrase" className="text-sm font-medium">
                  Network Passphrase Override
                </Label>
                {config.enabled && config.networkPassphrase && <SharedBadge />}
              </div>
              <Input
                id="shared-passphrase"
                value={config.networkPassphrase ?? ""}
                onChange={(e) =>
                  setSharedPassphrase(e.target.value || null)
                }
                className="h-8 text-sm font-mono"
                placeholder="Leave blank for no override"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">
                  Shared RPC Headers
                </Label>
                {config.enabled &&
                  Object.keys(config.headers).length > 0 && <SharedBadge />}
              </div>
              <NetworkHeaderEditor
                headers={config.headers}
                onHeadersChange={setSharedHeaders}
              />
              <p className="text-[11px] text-muted-foreground">
                Headers (e.g. API keys, auth tokens) propagated to the entire
                team&apos;s workspace automatically.
              </p>
            </div>
          </div>

          {/* Last updated */}
          {config.lastUpdated && (
            <p className="text-[10px] text-muted-foreground">
              Last updated:{" "}
              {new Date(config.lastUpdated).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Effective Settings Preview                                           */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Effective Settings
          </CardTitle>
          <CardDescription>
            What your IDE is currently using — shared settings override personal
            ones when workspace overrides are enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EffectiveSettingsRow
            label="Network"
            value={effectiveNetwork}
            source={config.enabled && config.network ? "shared" : "personal"}
          />
          <EffectiveSettingsRow
            label="RPC Endpoint"
            value={effectiveRpc}
            source={config.enabled && config.rpcUrl ? "shared" : "personal"}
          />
          <EffectiveSettingsRow
            label="Passphrase"
            value={effectivePassphrase}
            source={
              config.enabled && config.networkPassphrase ? "shared" : "personal"
            }
          />
          <EffectiveSettingsRow
            label="Custom Headers"
            value={
              config.enabled && Object.keys(config.headers).length > 0
                ? `${Object.keys(config.headers).length} shared header(s)`
                : Object.keys(personalHeaders).length > 0
                ? `${Object.keys(personalHeaders).length} personal header(s)`
                : ""
            }
            source={
              config.enabled && Object.keys(config.headers).length > 0
                ? "shared"
                : "personal"
            }
          />
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Custom Networks                                                      */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Custom Network List
          </CardTitle>
          <CardDescription>
            Manage shared and personal custom networks. Shared networks are
            distributed to the whole team via the export/import flow below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.customNetworks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No custom networks yet. Add one below.
            </p>
          )}

          {sharedNetworks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Shared Networks
              </p>
              {sharedNetworks.map((network) => (
                <CustomNetworkRow
                  key={network.id}
                  network={network}
                  onUpdate={(u) => updateCustomNetwork(network.id, u)}
                  onRemove={() => removeCustomNetwork(network.id)}
                />
              ))}
            </div>
          )}

          {personalNetworks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Personal Networks
              </p>
              {personalNetworks.map((network) => (
                <CustomNetworkRow
                  key={network.id}
                  network={network}
                  onUpdate={(u) => updateCustomNetwork(network.id, u)}
                  onRemove={() => removeCustomNetwork(network.id)}
                />
              ))}
            </div>
          )}

          <AddNetworkForm onAdd={addCustomNetwork} />
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Import / Export                                                      */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Import / Export
          </CardTitle>
          <CardDescription>
            Share workspace settings across your team. Export generates a JSON
            config — paste it in the import box on another machine to sync
            environments instantly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportExportPanel />
        </CardContent>
      </Card>
    </div>
  );
};

export default SharedEnvironmentSettings;
