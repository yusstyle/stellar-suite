"use client";

import { useState } from "react";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ActivityHeatmap } from "@/components/charts/ActivityHeatmap";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogStore } from "@/store/useAuditLogStore";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { logs } = useAuditLogStore();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const buildCount = logs.filter((entry) => entry.category === "build").length;
  const deployCount = logs.filter((entry) => entry.category === "deploy").length;
  const commitCount = logs.filter((entry) =>
    entry.action.toLowerCase().includes("commit"),
  ).length;
  const totalCount = buildCount + deployCount + commitCount;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1.5 rounded border border-border bg-secondary px-2 py-1 text-xs transition-colors hover:bg-muted focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="User menu"
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="max-w-[80px] truncate font-mono text-foreground">
              {user.name ?? user.email}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="pb-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            {user.email ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setProfileOpen(true);
            }}
            className="gap-2 text-xs"
          >
            <User className="h-3.5 w-3.5" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => signOut()}
            className="gap-2 text-xs text-destructive focus:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden border-border bg-background p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span>{user.name ?? "Developer Profile"}</span>
            </DialogTitle>
            <DialogDescription>
              {user.email ? `${user.email} - ` : ""}
              {totalCount} tracked build/deploy/commit events
            </DialogDescription>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-muted-foreground">
                Builds: {buildCount}
              </span>
              <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-muted-foreground">
                Deploys: {deployCount}
              </span>
              <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-muted-foreground">
                Commits: {commitCount}
              </span>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto p-6">
            <ActivityHeatmap events={logs} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
