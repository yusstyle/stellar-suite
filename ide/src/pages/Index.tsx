import { useState, useCallback, useEffect, useRef } from "react";
import { FileExplorer } from "@/components/ide/FileExplorer";
import { EditorTabs, TabInfo } from "@/components/ide/EditorTabs";
import { CodeEditor } from "@/components/ide/CodeEditor";
import { Terminal, LogEntry } from "@/components/ide/Terminal";
import { Toolbar } from "@/components/ide/Toolbar";
import { ContractPanel } from "@/components/ide/ContractPanel";
import { IdentitiesView } from "@/components/ide/IdentitiesView";
import { StatusBar } from "@/components/ide/StatusBar";
import { useFileStore } from "@/store/useFileStore";
import { useIdentityStore } from "@/store/useIdentityStore";
import { sampleContracts, FileNode } from "@/lib/sample-contracts";
import { NETWORK_CONFIG, type NetworkKey } from "@/lib/networkConfig";
import { DROP_LIMIT_BYTES, mapDroppedEntriesToTree, mergeFileNodes, readDropPayload } from "@/lib/file-drop";
import {
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  FolderTree, Rocket, X, FileText, Terminal as TerminalIcon, History, Users,
} from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { DeploymentsView } from "@/components/ide/DeploymentsView";
import { useDeployedContractsStore } from "@/store/useDeployedContractsStore";

const cloneFiles = (files: FileNode[]): FileNode[] =>
  JSON.parse(JSON.stringify(files));

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
   // Local state for UI components that don't need persistence yet or are UI-only
  const [terminalExpanded, setTerminalExpanded] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [contractId, setContractId] = useState<string | null>(null);
  const [showExplorer, setShowExplorer] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [saveStatus, setSaveStatus] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"none" | "explorer" | "interact" | "deployments" | "identities">("none");
  const [isExplorerDragActive, setIsExplorerDragActive] = useState(false);
  const [leftSidebarTab, setLeftSidebarTab] = useState<"explorer" | "deployments" | "identities">("explorer");
  const dragDepthRef = useRef(0);

  // Store hooks
  const {
    files,
    setFiles,
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
    network,
    horizonUrl,
    customRpcUrl,
    setNetwork,
    setCustomRpcUrl,
  } = useFileStore();

  const { loadIdentities, activeIdentity, activeContext } = useIdentityStore();
  const { addContract } = useDeployedContractsStore();

  // Lifecycle
  useEffect(() => {
    loadIdentities();
  }, [loadIdentities]);

  // Desktop defaults — show panels on wide screens
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

  const getTimestamp = () => new Date().toLocaleTimeString("en-US", { hour12: false });

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

  const handleContentChange = useCallback((newContent: string) => {
    const nextFiles = cloneFiles(files);
    const file = findNode(nextFiles, activeTabPath);
    if (file) {
        file.content = newContent;
        setFiles(nextFiles);
        // Mark as unsaved in store or local state
        // (Assuming store handles unsaved state via updateFileContent or similar if needed)
    }
  }, [activeTabPath, files, setFiles]);

  const handleSave = useCallback(() => {
    // In current store architecture, markSaved handles the unsavedFiles set
    useFileStore.getState().markSaved(activeTabPath);
    setSaveStatus("Saved");
    setTimeout(() => setSaveStatus(""), 2000);
  }, [activeTabPath]);

  // Global Ctrl/Cmd+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const handleCompile = useCallback(() => {
    setIsCompiling(true);
    setTerminalExpanded(true);
    addLog("info", "Compiling contract...");
    addLog("info", `Target network: ${network}`);
    setTimeout(() => addLog("info", "Resolving dependencies..."), 400);
    setTimeout(() => addLog("info", "Building release target..."), 900);
    setTimeout(() => {
      addLog("success", "✓ Compilation successful! WASM binary: 1.2 KB");
      addLog("info", "Contract hash: 7a8b9c...d4e5f6");
      setIsCompiling(false);
    }, 1800);
  }, [network, addLog]);

  const handleDeploy = useCallback(() => {
    setTerminalExpanded(true);
    addLog("info", `Deploying to ${network}...`);
    setTimeout(() => {
      const fullId = `CD${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`.substring(0, 56).toUpperCase();
      
      setContractId(fullId);
      addLog("success", `✓ Contract deployed! ID: ${fullId}`);
      
      // Persist to store
      addContract(fullId, network as NetworkKey, "hello_world");
    }, 2000);
  }, [network, addLog, addContract]);

  const handleTest = useCallback(() => {
    setTerminalExpanded(true);
    addLog("info", "Running tests...");
    setTimeout(() => {
      addLog("success", "✓ test_hello ... ok");
      addLog("info", "test result: ok. 1 passed; 0 failed;");
    }, 1200);
  }, [addLog]);

  const handleInvoke = useCallback(
    (fn: string, args: string) => {
      setTerminalExpanded(true);
      const signer = activeContext?.type === "web-wallet" 
        ? "browser-wallet" 
        : activeIdentity?.nickname ?? "anonymous";
      addLog("info", `Invoking ${fn}(${args}) as ${signer}...`);
      setTimeout(() => addLog("success", `✓ Result: ["Hello", "Dev"]`), 800);
    },
    [addLog, activeIdentity, activeContext]
  );

  const handleExplorerDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsExplorerDragActive(true);
  }, []);

  const handleExplorerDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsExplorerDragActive(true);
  }, []);

  const handleExplorerDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsExplorerDragActive(false);
    }
  }, []);

  const handleExplorerDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsExplorerDragActive(false);

    try {
      const dropped = await readDropPayload(event.dataTransfer);
      const { nodes, uploadedFiles, totalBytes } = await mapDroppedEntriesToTree(dropped);

      if (uploadedFiles === 0) {
        addLog("error", `Upload skipped. No eligible files found.`);
        return;
      }

      setFiles(mergeFileNodes(files, nodes));
      addLog("success", `Uploaded ${uploadedFiles} file${uploadedFiles === 1 ? "" : "s"} (${(totalBytes / 1024).toFixed(1)} KB).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      addLog("error", `Upload failed: ${message}`);
    }
  }, [addLog, files, setFiles]);

  const getActiveContent = (): { content: string; language: string } => {
    const file = findNode(files, activeTabPath);
    return {
      content: file?.content || "// Select a file to begin editing",
      language: file?.language || "rust",
    };
  };

  const { content, language } = getActiveContent();

  const tabsWithStatus = openTabs.map((t) => ({
    ...t,
    unsaved: unsavedFiles.has(t.path.join("/")),
  }));

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Toolbar
        onCompile={handleCompile}
        onDeploy={handleDeploy}
        onTest={handleTest}
        isCompiling={isCompiling}
        buildState={isCompiling ? "building" : "idle"}
        network={network}
        onNetworkChange={setNetwork}
        saveStatus={saveStatus}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toggle Bar */}
        <div className="hidden md:flex flex-col bg-sidebar border-r border-border shrink-0 z-10 w-12 items-center py-4 gap-4">
          <button
            onClick={() => {
              if (leftSidebarTab === "explorer" && showExplorer) {
                setShowExplorer(false);
              } else {
                setLeftSidebarTab("explorer");
                setShowExplorer(true);
              }
            }}
            className={`p-2 rounded-md transition-all ${
              showExplorer && leftSidebarTab === "explorer" 
                ? "bg-primary/20 text-primary shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="File Explorer"
          >
            <FolderTree className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => {
              if (leftSidebarTab === "identities" && showExplorer) {
                setShowExplorer(false);
              } else {
                setLeftSidebarTab("identities");
                setShowExplorer(true);
              }
            }}
            className={`p-2 rounded-md transition-all ${
                showExplorer && leftSidebarTab === "identities" 
                  ? "bg-primary/20 text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            title="Identities"
          >
            <Users className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              if (leftSidebarTab === "deployments" && showExplorer) {
                setShowExplorer(false);
              } else {
                setLeftSidebarTab("deployments");
                setShowExplorer(true);
              }
            }}
            className={`p-2 rounded-md transition-all ${
              showExplorer && leftSidebarTab === "deployments" 
                ? "bg-primary/20 text-primary shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title="Recent Deployments"
          >
            <History className="h-5 w-5" />
          </button>

          <div className="mt-auto border-t border-border w-full pt-4 flex flex-col items-center">
            <button
              onClick={() => setShowExplorer(!showExplorer)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Toggle Sidebar"
            >
              {showExplorer ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile overlay panels */}
        {mobilePanel === "explorer" && (
          <div className="md:hidden absolute inset-0 z-30 flex">
            <div className="w-64 bg-sidebar border-r border-border h-full">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Explorer</span>
                <button title="Close Explorer" onClick={() => setMobilePanel("none")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <FileExplorer
                files={files}
                onFileSelect={handleFileSelect}
                activeFilePath={activeTabPath}
                onCreateFile={(path, name) => createFile(path, name)}
                onCreateFolder={(path, name) => createFolder(path, name)}
                onDeleteNode={(path) => deleteNode(path)}
                onRenameNode={(path, name) => renameNode(path, name)}
                isDragActive={isExplorerDragActive}
                onDragEnter={handleExplorerDragEnter}
                onDragOver={handleExplorerDragOver}
                onDragLeave={handleExplorerDragLeave}
                onDrop={handleExplorerDrop}
              />
            </div>
            <div className="flex-1 bg-background/60" onClick={() => setMobilePanel("none")} />
          </div>
        )}
        {mobilePanel === "identities" && (
          <div className="md:hidden absolute inset-0 z-30 flex">
            <div className="w-64 bg-sidebar border-r border-border h-full">
               <IdentitiesView network={network} />
            </div>
            <div className="flex-1 bg-background/60" onClick={() => setMobilePanel("none")} />
          </div>
        )}
        {mobilePanel === "deployments" && (
          <div className="md:hidden absolute inset-0 z-30 flex">
            <div className="w-64 bg-sidebar border-r border-border h-full">
               <DeploymentsView 
                  activeContractId={contractId}
                  onSelectContract={(id, net) => {
                    setContractId(id);
                    setNetwork(net as NetworkKey);
                    setMobilePanel("none");
                    addLog("info", `Targeting contract ${id.substring(0,8)}... on ${net}`);
                  }}
                />
            </div>
            <div className="flex-1 bg-background/60" onClick={() => setMobilePanel("none")} />
          </div>
        )}
        {mobilePanel === "interact" && (
          <div className="md:hidden absolute inset-0 z-30 flex justify-end">
            <div className="flex-1 bg-background/60" onClick={() => setMobilePanel("none")} />
            <div className="w-72 bg-card border-l border-border h-full">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Interact</span>
                <button title="Close Interact" onClick={() => setMobilePanel("none")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ContractPanel contractId={contractId} onInvoke={handleInvoke} />
            </div>
          </div>
        )}

        {/* Resizable Layout for Desktop Content */}
        <div className="flex-1 flex overflow-hidden">
          <ResizablePanelGroup direction="horizontal" autoSaveId="ide-main-layout">
            
            {showExplorer && (
              <>
                <ResizablePanel id="explorer" order={1} defaultSize={20} minSize={10} maxSize={40} className="hidden md:block">
                  <div className="h-full w-full overflow-hidden border-r border-border bg-sidebar">
                    {leftSidebarTab === "explorer" && (
                      <FileExplorer
                        files={files}
                        onFileSelect={handleFileSelect}
                        activeFilePath={activeTabPath}
                        onCreateFile={(path, name) => createFile(path, name)}
                        onCreateFolder={(path, name) => createFolder(path, name)}
                        onDeleteNode={(path) => deleteNode(path)}
                        onRenameNode={(path, name) => renameNode(path, name)}
                        isDragActive={isExplorerDragActive}
                        onDragEnter={handleExplorerDragEnter}
                        onDragOver={handleExplorerDragOver}
                        onDragLeave={handleExplorerDragLeave}
                        onDrop={handleExplorerDrop}
                      />
                    )}
                    {leftSidebarTab === "identities" && (
                        <IdentitiesView network={network} />
                    )}
                    {leftSidebarTab === "deployments" && (
                      <DeploymentsView 
                        activeContractId={contractId}
                        onSelectContract={(id, net) => {
                          setContractId(id);
                          setNetwork(net as NetworkKey);
                          addLog("info", `Targeting contract ${id.substring(0,8)}... on ${net}`);
                        }}
                      />
                    )}
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle className="hidden md:flex" />
              </>
            )}

            <ResizablePanel id="main-content" order={2} minSize={30} className="flex flex-col min-w-0">
              <ResizablePanelGroup direction="vertical" autoSaveId="ide-editor-terminal">
                
                <ResizablePanel id="editor" order={1} defaultSize={75} minSize={30} className="flex flex-col min-w-0">
                  <EditorTabs
                    tabs={tabsWithStatus}
                    activeTab={activeTabPath.join("/")}
                    onTabSelect={setActiveTabPath}
                    onTabClose={handleTabClose}
                  />
                  <div className="flex-1 overflow-hidden">
                    <CodeEditor
                      content={content}
                      language={language}
                      onChange={(newContent) => handleContentChange(newContent)}
                      onCursorChange={(line, col) => setCursorPos({ line, col })}
                      onSave={handleSave}
                    />
                  </div>
                </ResizablePanel>

                {terminalExpanded ? (
                  <>
                    <ResizableHandle withHandle />
                    <ResizablePanel id="terminal" order={2} defaultSize={25} minSize={10} className="flex flex-col min-w-0">
                      <Terminal
                        logs={logs}
                        isExpanded={terminalExpanded}
                        onToggle={() => setTerminalExpanded(!terminalExpanded)}
                        onClear={() => setLogs([])}
                      />
                    </ResizablePanel>
                  </>
                ) : (
                  <div className="shrink-0 flex flex-col min-w-0">
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

        {/* Desktop contract panel */}
        <div className="hidden md:flex shrink-0 z-10">
          {showPanel && (
            <div className="w-64 border-l border-border bg-card">
              <ContractPanel contractId={contractId} onInvoke={handleInvoke} />
            </div>
          )}
          <div className="flex flex-col bg-card border-l border-border h-full">
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Toggle Panel"
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
          network={network as NetworkKey}
          horizonUrl={horizonUrl}
          customRpcUrl={customRpcUrl}
          onNetworkChange={(n) => setNetwork(n)}
          onCustomRpcUrlChange={(url) => setCustomRpcUrl(url)}
          unsavedCount={unsavedFiles.size}
        />
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden flex flex-col border-t border-border bg-sidebar">
        <div className="flex items-center justify-between px-3 py-1 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
            {unsavedFiles.size > 0 && <span className="text-warning">{unsavedFiles.size} unsaved</span>}
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">{network}</span>
        </div>
        <div className="flex items-stretch">
          <button
            onClick={() => setMobilePanel(mobilePanel === "explorer" ? "none" : "explorer")}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors border-t-2 ${mobilePanel === "explorer" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <FolderTree className="h-4 w-4" />
            Explorer
          </button>
          <button
            onClick={() => setMobilePanel(mobilePanel === "identities" ? "none" : "identities")}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors border-t-2 ${mobilePanel === "identities" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="h-4 w-4" />
            Users
          </button>
          <button
            onClick={() => setMobilePanel(mobilePanel === "deployments" ? "none" : "deployments")}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors border-t-2 ${mobilePanel === "deployments" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <History className="h-4 w-4" />
            Activity
          </button>
          <button
            onClick={() => setMobilePanel("none")}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors border-t-2 ${mobilePanel === "none" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <FileText className="h-4 w-4" />
            Editor
          </button>
          <button
            onClick={() => setMobilePanel(mobilePanel === "interact" ? "none" : "interact")}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors border-t-2 ${mobilePanel === "interact" ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Rocket className="h-4 w-4" />
            Interact
          </button>
          <button
            onClick={() => {
              setTerminalExpanded(!terminalExpanded);
              setMobilePanel("none");
            }}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors border-t-2 ${terminalExpanded ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"}`}
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
