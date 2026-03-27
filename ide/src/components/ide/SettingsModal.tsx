"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useUserSettingsStore } from "@/store/useUserSettingsStore";
import { Sun, Moon, Monitor, Type, Save, Globe } from "lucide-react";
import { useTheme } from "next-themes";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);

  const { fontSize, formatOnSave, setFontSize, setFormatOnSave } =
    useUserSettingsStore();
  const { theme, setTheme } = useTheme();

  if (!isMounted) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Customize your IDE experience. Changes are persisted automatically.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
            <TabsTrigger value="general" className="data-[state=active]:bg-background">General</TabsTrigger>
            <TabsTrigger value="editor" className="data-[state=active]:bg-background">Editor</TabsTrigger>
            <TabsTrigger value="network" className="data-[state=active]:bg-background">Network</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 py-6 animate-in fade-in-50 duration-300">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Appearance</Label>
              <div className="grid grid-cols-3 gap-4">
                {(["light", "dark", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      theme === t
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${theme === t ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {t === "light" && <Sun className="h-6 w-6" />}
                      {t === "dark" && <Moon className="h-6 w-6" />}
                      {t === "system" && <Monitor className="h-6 w-6" />}
                    </div>
                    <span className="text-sm font-medium capitalize">{t}</span>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="editor" className="space-y-8 py-6 animate-in fade-in-50 duration-300">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Type className="h-4 w-4 text-primary" /> Editor Font Size
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Adjust the text size in the code editor.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                    {fontSize}px
                  </span>
                </div>
              </div>
              <div className="px-2">
                <Slider
                  value={[fontSize]}
                  min={10}
                  max={24}
                  step={1}
                  onValueChange={([val]) => setFontSize(val)}
                  className="py-4"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                  <span>10px</span>
                  <span>14px (Default)</span>
                  <span>24px</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="space-y-1">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Save className="h-4 w-4 text-primary" /> Format on Save
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically format code when you save a file.
                </p>
              </div>
              <Switch
                checked={formatOnSave}
                onCheckedChange={setFormatOnSave}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </TabsContent>

          <TabsContent value="network" className="space-y-4 py-6 animate-in fade-in-50 duration-300">
            <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-muted/20">
              <div className="inline-flex p-3 rounded-full bg-muted mb-4">
                <Globe className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Advanced Network Config</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Custom RPC endpoints and specialized network headers will be configurable here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
