"use client";

import { CommandPalette } from "@/components/ide/CommandPalette";
import Index from "@/features/ide/Index";
import { MobileGatekeeper } from "@/components/ide/MobileGatekeeper";
import { QuickOpen } from "@/components/ide/QuickOpen";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import XdrInspector from "@/components/tools/XdrInspector";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    const handleGlobalShortcuts = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "f"
      ) {
        event.preventDefault();
        window.dispatchEvent(new Event("ide:open-search"));
      }

      if (event.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };

    const handleToggleCommandPalette = () => {
      setCommandPaletteOpen((prev) => !prev);
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    window.addEventListener(
      "ide:toggle-command-palette",
      handleToggleCommandPalette,
    );

    return () => {
      window.removeEventListener("keydown", handleGlobalShortcuts);
      window.removeEventListener(
        "ide:toggle-command-palette",
        handleToggleCommandPalette,
      );
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MobileGatekeeper />
        <XdrInspector />
        <Index />
        <QuickOpen />
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
