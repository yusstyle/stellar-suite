import { useState, useCallback, useEffect, useRef } from "react";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { EditorTabs } from "@/components/ide/EditorTabs";
import CodeEditor from "@/components/editor/CodeEditor";
import { Terminal, LogEntry } from "@/components/ide/Terminal";
import { Toolbar } from "@/components/ide/Toolbar";
import { ContractPanel } from "@/components/ide/ContractPanel";
import { StatusBar } from "@/components/ide/StatusBar";
import { IdentityCard } from "@/components/ide/IdentityCard";
import { FileNode } from "@/lib/sample-contracts";
import { useFileStore } from "@/store/useFileStore";
import { useDiagnosticsStore } from "@/store/useDiagnosticsStore";
import { parseMixedOutput } from "@/utils/cargoParser";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  FolderTree,
  Rocket,
  X,
  FileText,
  Terminal as TerminalIcon,
} from "lucide-react";

import CodeEditor from "@/components/editor/CodeEditor";
import { ContractPanel } from "@/components/ide/ContractPanel";
import { EditorTabs } from "@/components/ide/EditorTabs";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { StatusBar } from "@/components/ide/StatusBar";
import { Terminal, LogEntry } from "@/components/ide/Terminal";
import { Toolbar } from "@/components/ide/Toolbar";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { toast } from "@/components/ui/use-toast";
import {
  CompileRequestError,
  compileWorkspace,
  createBuildWorkspacePayload,
} from "@/lib/build-contract";
import { FileNode } from "@/lib/sample-contracts";
import { useDiagnosticsStore } from "@/store/useDiagnosticsStore";
import { useFileStore } from "@/store/useFileStore";
import { parseMixedOutput } from "@/utils/cargoParser";

const findNode = (nodes: FileNode[], pathParts: string[]): FileNode | null => {
  for (const node of nodes) {
    if (node.name === pathParts[0]) {
      if (pathParts.length === 1) return node;
      if (node.children) return findNode(node.children, pathParts.slice(1));
    }
  }
  return null;
};

const Index = () => {
  const {
    files,
    openTabs,
    activeTabPath,
    unsavedFiles,
    setActiveTabPath,
    addTab,
    closeTab,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    markSaved,
    network,
    horizonUrl,
    customRpcUrl,
    setNetwork,
    setCustomRpcUrl,
  } = useFileStore();

  const { setDiagnostics, clearDiagnostics } = useDiagnosticsStore();

  const [terminalExpanded, setTerminalExpanded] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [buildState, setBuildState] = useState<
    "idle" | "building" | "success" | "error"
  >("idle");
  const [contractId, setContractId] = useState<string | null>(null);
  const [showExplorer, setShowExplorer] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [saveStatus, setSaveStatus] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"none" | "explorer" | "interact">(
    "none"
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    if (mq.matches) {
      setShowExplorer(true);
      setShowPanel(true);
    }
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setShowExplorer(true);
        setShowPanel(true);
      } else {
        setShowExplorer(false);
        setShowPanel(false);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const getTimestamp = () =>
    new Date().toLocaleTimeString("en-US", { hour12: false });

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogs((prev) => [...prev, { type, message, timestamp: getTimestamp() }]);
  }, []);

  const handleFileSelect = useCallback(
    (path: string[], file: FileNode) => {
      if (file.type !== "file") return;
      addTab(path, file.name);
      setMobilePanel("none");
    },
    [addTab]
  );

  const handleTabClose = useCallback(
    (path: string[]) => {
      closeTab(path);
    },
    [closeTab]
  );

  const handleSave = useCallback(() => {
    markSaved(activeTabPath);
    setSaveStatus("Saved");
    setTimeout(() => setSaveStatus(""), 2000);
  }, [activeTabPath, markSaved]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        window.dispatchEvent(new Event("ide:build-contract"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const handleCompile = useCallback(async () => {
    if (isCompiling) return;

    setIsCompiling(true);
    setBuildState("building");
    setTerminalExpanded(true);
    clearDiagnostics();
    addLog("info", "$ cargo build --message-format=json --target wasm32-unknown-unknown");
    addLog("info", `Target network: ${network}`);
    addLog("info", "Compressing workspace into JSON payload...");

    try {
      const payload = createBuildWorkspacePayload(files, network);
      const endpoint = import.meta.env.VITE_COMPILE_API_URL || "/api/compile";
      addLog("info", `POST ${endpoint}`);
      addLog("info", `Sending ${payload.files.length} file(s) to compiler API`);

      const result = await compileWorkspace(payload);
      const contractName = files[0]?.name ?? "hello_world";
      const parsed = parseMixedOutput(result.output, contractName);
      setDiagnostics(parsed);

      const errors = parsed.filter((d) => d.severity === "error");
      const warnings = parsed.filter((d) => d.severity === "warning");
      const buildSucceeded =
        typeof result.success === "boolean" ? result.success : errors.length === 0;

      for (const d of parsed) {
        const prefix = d.severity === "error" ? "error" : "warning";
        const code = d.code ? `[${d.code}]` : "";
        addLog(
          d.severity === "error" ? "error" : "warning",
          `${prefix}${code}: ${d.message}`
        );
        addLog("info", `  --> ${d.fileId}:${d.line}:${d.column}`);
      }

      if (result.output.trim() && parsed.length === 0) {
        result.output
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .forEach((line) => addLog("info", line));
      }

      if (!buildSucceeded || errors.length > 0) {
        setBuildState("error");
        addLog(
          "error",
          `Build failed: ${errors.length} error(s), ${warnings.length} warning(s)`
        );
        toast({
          variant: "destructive",
          title: "Build failed",
          description: "The compiler reported errors. Check the console for details.",
        });
        return;
      }

      setBuildState("success");
      addLog(
        "success",
        `Build successful${warnings.length > 0 ? ` with ${warnings.length} warning(s)` : ""}`
      );
      if (result.contractHash) {
        addLog("info", `Contract hash: ${result.contractHash}`);
      }
      toast({
        title: "Build complete",
        description:
          warnings.length > 0
            ? `Compiled with ${warnings.length} warning(s).`
            : "Contract compiled successfully.",
      });
    } catch (error) {
      setBuildState("error");

      if (error instanceof CompileRequestError) {
        addLog("error", `Compile API error (${error.status}): ${error.message}`);
        if (error.responseBody.trim() && error.responseBody !== error.message) {
          addLog("error", error.responseBody);
        }
      } else if (error instanceof Error) {
        addLog("error", `Build request failed: ${error.message}`);
      } else {
        addLog("error", "Build request failed for an unknown reason.");
      }

      toast({
        variant: "destructive",
        title: "Build request failed",
        description:
          error instanceof Error
            ? error.message
            : "The compile API could not be reached.",
      });
    } finally {
      setIsCompiling(false);
    }
  }, [isCompiling, clearDiagnostics, addLog, files, network, setDiagnostics]);

  const handleDeploy = useCallback(() => {
    setTerminalExpanded(true);
    addLog("info", `Deploying to ${network}...`);
    setTimeout(() => {
      const id = "CDLZ...X7YQ";
      setContractId(id);
      addLog("success", `Contract deployed. ID: ${id}`);
    }, 2000);
  }, [network, addLog]);

  const handleTest = useCallback(() => {
    setTerminalExpanded(true);
    addLog("info", "Running tests...");
    setTimeout(() => {
      addLog("success", "test_hello ... ok");
      addLog("info", "test result: ok. 1 passed; 0 failed;");
    }, 1200);
  }, [addLog]);

  const handleInvoke = useCallback(
    (fn: string, args: string) => {
      setTerminalExpanded(true);
      addLog("info", `Invoking ${fn}(${args})...`);
      setTimeout(() => addLog("success", 'Result: ["Hello", "Dev"]'), 800);
    },
    [addLog]
  );

  useEffect(() => {
    const onBuild = () => {
      void handleCompile();
    };
    const onDeploy = () => handleDeploy();
    const onTest = () => handleTest();

    window.addEventListener("ide:build-contract", onBuild);
    window.addEventListener("ide:deploy-contract", onDeploy);
    window.addEventListener("ide:run-tests", onTest);

    return () => {
      window.removeEventListener("ide:build-contract", onBuild);
      window.removeEventListener("ide:deploy-contract", onDeploy);
      window.removeEventListener("ide:run-tests", onTest);
    };
  }, [handleCompile, handleDeploy, handleTest]);

  const activeFile = findNode(files, activeTabPath);
  const language = activeFile?.language || "rust";

  const tabsWithStatus = openTabs.map((t) => ({
    ...t,
    unsaved: unsavedFiles.has(t.path.join("/")),
  }));

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Toolbar
        onCompile={() => {
          void handleCompile();
        }}
        onDeploy={handleDeploy}
        onTest={handleTest}
        isCompiling={isCompiling}
        buildState={buildState}
        network={network}
        onNetworkChange={setNetwork}
        saveStatus={saveStatus}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <div className="hidden shrink-0 flex-col border-r border-border bg-sidebar md:flex">
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className="p-2 text-muted-foreground transition-colors hover:text-foreground"
            title="Toggle Explorer"
          >
            {showExplorer ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </button>
        </div>

        {mobilePanel === "explorer" && (
          <div className="absolute inset-0 z-30 flex md:hidden">
            <div className="h-full w-64 border-r border-border bg-sidebar">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Explorer
                </span>
                <button
                  title="Close Explorer"
                  onClick={() => setMobilePanel("none")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <FileExplorer
                files={files}
                onFileSelect={handleFileSelect}
                activeFilePath={activeTabPath}
                onCreateFile={(parent, name) => createFile(parent, name)}
                onCreateFolder={createFolder}
                onDeleteNode={deleteNode}
                onRenameNode={renameNode}
              />
            </div>
            <div
              className="flex-1 bg-background/60"
              onClick={() => setMobilePanel("none")}
            />
          </div>
        )}

        {mobilePanel === "interact" && (
          <div className="absolute inset-0 z-30 flex justify-end md:hidden">
            <div
              className="flex-1 bg-background/60"
              onClick={() => setMobilePanel("none")}
            />
            <div className="h-full w-72 border-l border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Interact
                </span>
                <button
                  title="Close Interact"
                  onClick={() => setMobilePanel("none")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-col h-full">
                <IdentityCard />
                <div className="flex-1 overflow-y-auto">
                  <ContractPanel contractId={contractId} onInvoke={handleInvoke} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" autoSaveId="ide-main-layout">
            {showExplorer && (
              <>
                <ResizablePanel
                  id="explorer"
                  order={1}
                  defaultSize={20}
                  minSize={10}
                  maxSize={40}
                  className="hidden md:block"
                >
                  <div className="h-full w-full overflow-hidden border-r border-border bg-sidebar">
                    <FileExplorer
                      files={files}
                      onFileSelect={handleFileSelect}
                      activeFilePath={activeTabPath}
                      onCreateFile={(parent, name) => createFile(parent, name)}
                      onCreateFolder={createFolder}
                      onDeleteNode={deleteNode}
                      onRenameNode={renameNode}
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle className="hidden md:flex" />
              </>
            )}

            <ResizablePanel
              id="main-content"
              order={2}
              minSize={30}
              className="flex min-w-0 flex-col"
            >
              <ResizablePanelGroup direction="vertical" autoSaveId="ide-editor-terminal">
                <ResizablePanel
                  id="editor"
                  order={1}
                  defaultSize={75}
                  minSize={30}
                  className="flex min-w-0 flex-col"
                >
                  <EditorTabs
                    tabs={tabsWithStatus}
                    activeTab={activeTabPath.join("/")}
                    onTabSelect={setActiveTabPath}
                    onTabClose={handleTabClose}
                  />
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor
                      onCursorChange={(line, col) => setCursorPos({ line, col })}
                      onSave={handleSave}
                    />
                  </div>
                </ResizablePanel>

                {terminalExpanded ? (
                  <>
                    <ResizableHandle withHandle />
                    <ResizablePanel
                      id="terminal"
                      order={2}
                      defaultSize={25}
                      minSize={10}
                      className="flex min-w-0 flex-col"
                    >
                      <Terminal
                        logs={logs}
                        isExpanded={terminalExpanded}
                        onToggle={() => setTerminalExpanded(!terminalExpanded)}
                        onClear={() => setLogs([])}
                      />
                    </ResizablePanel>
                  </>
                ) : (
                  <div className="shrink-0 min-w-0">
                    <Terminal
                      logs={logs}
                      isExpanded={terminalExpanded}
                      onToggle={() => setTerminalExpanded(!terminalExpanded)}
                      onClear={() => setLogs([])}
                    />
                  </div>
                )}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <div className="hidden shrink-0 z-10 md:flex">
          {showPanel && (
            <div className="w-64 border-l border-border bg-card">
              <ContractPanel contractId={contractId} onInvoke={handleInvoke} />
            </div>
          )}
          <div className="flex flex-col bg-card border-l border-border h-full w-72">
            <IdentityCard />
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="mt-auto p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Toggle Interact Panel"
            >
              {showPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:block">
        <StatusBar
          language={language}
          line={cursorPos.line}
          col={cursorPos.col}
          network={network}
          horizonUrl={horizonUrl}
          customRpcUrl={customRpcUrl}
          onNetworkChange={setNetwork}
          onCustomRpcUrlChange={setCustomRpcUrl}
          unsavedCount={unsavedFiles.size}
        />
      </div>

      <div className="flex flex-col border-t border-border bg-sidebar md:hidden">
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-3 py-1">
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
            {unsavedFiles.size > 0 && (
              <span className="text-warning">{unsavedFiles.size} unsaved</span>
            )}
            <span>
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {network}
          </span>
        </div>

        <div className="flex items-stretch">
          <button
            onClick={() =>
              setMobilePanel(mobilePanel === "explorer" ? "none" : "explorer")
            }
            className={`flex-1 flex flex-col items-center gap-0.5 border-t-2 py-2.5 text-[10px] font-medium transition-colors ${
              mobilePanel === "explorer"
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderTree className="h-4 w-4" />
            Explorer
          </button>

          <button
            onClick={() => setMobilePanel("none")}
            className={`flex-1 flex flex-col items-center gap-0.5 border-t-2 py-2.5 text-[10px] font-medium transition-colors ${
              mobilePanel === "none"
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            Editor
          </button>

          <button
            onClick={() =>
              setMobilePanel(mobilePanel === "interact" ? "none" : "interact")
            }
            className={`flex-1 flex flex-col items-center gap-0.5 border-t-2 py-2.5 text-[10px] font-medium transition-colors ${
              mobilePanel === "interact"
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Rocket className="h-4 w-4" />
            Interact
          </button>

          <button
            onClick={() => {
              setTerminalExpanded(!terminalExpanded);
              setMobilePanel("none");
            }}
            className={`flex-1 flex flex-col items-center gap-0.5 border-t-2 py-2.5 text-[10px] font-medium transition-colors ${
              terminalExpanded
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <TerminalIcon className="h-4 w-4" />
            Console
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
