"use client";

import {
  FolderTree,
  Users,
  History,
  Search,
  Beaker,
  Bug,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ListTree,
  Library,
  FileSearch,
  Binary,
  BarChart2,
  GitMerge,
} from "lucide-react";
import { ReactNode } from "react";

export type ActivityTab =
  | "explorer"
  | "git"
  | "deployments"
  | "identities"
  | "multisig"
  | "search"
  | "security"
  | "tests"
  | "fuzzing"
  | "outline"
  | "references"
  | "binary-diff"
  | "oracle"
  | "benchmarks"
  | "inspector";

interface ActivityBarProps {
  activeTab: ActivityTab;
  onTabChange: (tab: ActivityTab) => void;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
}

interface ActivityBarTab {
  id: ActivityTab;
  icon: ReactNode;
  label: string;
  title: string;
}

const tabs: ActivityBarTab[] = [
  {
    id: "explorer",
    icon: <FolderTree className="h-5 w-5" />,
    label: "Explorer",
    title: "File Explorer",
  },
  {
    id: "git",
    icon: <History className="h-5 w-5 rotate-180" />, // Use History rotated as a placeholder for Git if GitBranch is not available or just to match look
    label: "Source Control",
    title: "Source Control (Git)",
  },
  {
    id: "deployments",
    icon: <History className="h-5 w-5" />,
    label: "History",
    title: "Recent Deployments",
  },
  {
    id: "identities",
    icon: <Users className="h-5 w-5" />,
    label: "Users",
    title: "Identities",
  },
  {
    id: "multisig",
    icon: <GitMerge className="h-5 w-5" />,
    label: "Multisig",
    title: "Multisig Transaction Builder",
  },
  {
    id: "search",
    icon: <Search className="h-5 w-5" />,
    label: "Search",
    title: "Search Files",
  },
  {
    id: "outline",
    icon: <ListTree className="h-5 w-5" />,
    label: "Outline",
    title: "Symbol Outline",
  },
  {
    id: "binary-diff",
    icon: <Binary className="h-5 w-5" />,
    label: "Binary Diff",
    title: "WASM Binary Diffing Tool",
  },
  {
    id: "security",
    icon: <ShieldAlert className="h-5 w-5" />,
    label: "Security",
    title: "Security & Clippy",
  },
  {
    id: "tests",
    icon: <Beaker className="h-5 w-5" />,
    label: "Tests",
    title: "Test Explorer",
  },
  {
    id: "fuzzing",
    icon: <Bug className="h-5 w-5" />,
    label: "Fuzzing",
    title: "cargo-fuzz Security Testing",
  },
  {
    id: "inspector",
    icon: <FileSearch className="h-5 w-5" />,
    label: "Inspector",
    title: "WASM Contract Inspector",
  },
  {
    id: "references",
    icon: <Library className="h-5 w-5" />,
    label: "References",
    title: "Find All References",
  },
  {
    id: "benchmarks",
    icon: <BarChart2 className="h-5 w-5" />,
    label: "Benchmarks",
    title: "Criterion Benchmark Dashboard",
  },
];

export function ActivityBar({
  activeTab,
  onTabChange,
  sidebarVisible,
  onToggleSidebar,
}: ActivityBarProps) {
  return (
    <div className="hidden md:flex flex-col bg-sidebar border-r border-border shrink-0 w-12 items-center py-4 gap-4">
      <div className="flex flex-col gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`p-2 rounded-md transition-all ${
              activeTab === tab.id
                ? "bg-primary/20 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={tab.title}
            aria-label={tab.label}
            aria-pressed={activeTab === tab.id}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      <div className="mt-auto border-t border-border w-full pt-4 flex flex-col items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          title={sidebarVisible ? "Collapse Sidebar" : "Expand Sidebar"}
          aria-label={sidebarVisible ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {sidebarVisible ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>

        <button
          className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
