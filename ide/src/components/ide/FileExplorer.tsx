import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";

import { FileNode } from "@/lib/sample-contracts";
import { useWorkspaceStore } from "@/store/workspaceStore";

interface FileExplorerProps {
  onFileSelect?: (path: string[], file: FileNode) => void;
}

const pathKey = (path: string[]) => path.join("/");

interface TreeRowProps {
  node: FileNode;
  depth: number;
  path: string[];
  activePath: string[];
  expanded: Set<string>;
  onToggleExpand: (key: string) => void;
  onSelect: (path: string[], file: FileNode) => void;
  onCreateFile: (parentPath: string[]) => void;
  onCreateFolder: (parentPath: string[]) => void;
  onRename: (path: string[]) => void;
  onDelete: (path: string[]) => void;
}

function TreeRow({
  node,
  depth,
  path,
  activePath,
  expanded,
  onToggleExpand,
  onSelect,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
}: TreeRowProps) {
  const currentPath = [...path, node.name];
  const key = pathKey(currentPath);
  const isFolder = node.type === "folder";
  const isOpen = expanded.has(key);
  const isActive = pathKey(activePath) === key;

  return (
    <div>
      <div
        className={`group flex items-center gap-1 py-1 pr-1 text-xs ${
          isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/40"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder ? (
          <button
            type="button"
            onClick={() => onToggleExpand(key)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            aria-label={isOpen ? "Collapse folder" : "Expand folder"}
          >
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <button
          type="button"
          onClick={() => onSelect(currentPath, node)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {isFolder ? (
            isOpen ? <FolderOpen className="h-3.5 w-3.5 text-primary" /> : <Folder className="h-3.5 w-3.5 text-primary" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-warning" />
          )}
          <span className="truncate font-mono">{node.name}</span>
        </button>

        <div className="hidden items-center gap-0.5 group-hover:flex">
          {isFolder && (
            <>
              <button
                type="button"
                onClick={() => onCreateFile(currentPath)}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="New file"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onCreateFolder(currentPath)}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="New folder"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => onRename(currentPath)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Rename"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(currentPath)}
            className="rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isFolder && isOpen
        ? node.children?.map((child) => (
            <TreeRow
              key={`${key}/${child.name}`}
              node={child}
              depth={depth + 1}
              path={currentPath}
              activePath={activePath}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))
        : null}
    </div>
  );
}

export function FileExplorer({ onFileSelect }: FileExplorerProps) {
  const {
    files,
    activeTabPath,
    addTab,
    createFile,
    createFolder,
    deleteNode,
    renameNode,
    setMobilePanel,
  } = useWorkspaceStore();

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const node of files) {
      if (node.type === "folder") {
        initial.add(node.name);
      }
    }
    return initial;
  });

  const rootKeys = useMemo(() => files.map((n) => n.name), [files]);

  const onToggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelect = (path: string[], file: FileNode) => {
    if (file.type !== "file") {
      onToggleExpand(pathKey(path));
      return;
    }

    if (onFileSelect) {
      onFileSelect(path, file);
    } else {
      addTab(path, file.name);
      setMobilePanel("none");
    }
  };

  const requestName = (label: string) => {
    const value = window.prompt(label);
    return value?.trim() || "";
  };

  const handleCreateFile = (parentPath: string[]) => {
    const name = requestName("New file name");
    if (!name) return;
    createFile(parentPath, name);
  };

  const handleCreateFolder = (parentPath: string[]) => {
    const name = requestName("New folder name");
    if (!name) return;
    createFolder(parentPath, name);
    const key = pathKey([...parentPath, name]);
    setExpanded((prev) => new Set(prev).add(key));
  };

  const handleRename = (path: string[]) => {
    const current = path[path.length - 1];
    const name = window.prompt("Rename item", current)?.trim();
    if (!name || name === current) return;
    renameNode(path, name);
  };

  const handleDelete = (path: string[]) => {
    const label = path[path.length - 1];
    if (!window.confirm(`Delete ${label}?`)) return;
    deleteNode(path);
  };

  return (
    <div id="tour-explorer" className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Explorer</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => handleCreateFile([])}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="New file"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleCreateFolder([])}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {files.map((node) => (
          <TreeRow
            key={node.name}
            node={node}
            depth={0}
            path={[]}
            activePath={activeTabPath}
            expanded={expanded}
            onToggleExpand={onToggleExpand}
            onSelect={handleSelect}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ))}

        {rootKeys.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground">No files in workspace.</p>
        ) : null}
      </div>
    </div>
  );
}
