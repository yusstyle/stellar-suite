import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Hammer, Rocket, Settings, TestTube } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ideCommands = [
  {
    id: "build-contract",
    label: "Build Contract",
    shortcut: "Cmd/Ctrl+B",
    icon: Hammer,
    action: () => window.dispatchEvent(new Event("ide:build-contract")),
  },
  {
    id: "deploy-contract",
    label: "Deploy Contract",
    shortcut: "D",
    icon: Rocket,
    action: () => window.dispatchEvent(new Event("ide:deploy-contract")),
  },
  {
    id: "run-tests",
    label: "Run Tests",
    shortcut: "T",
    icon: TestTube,
    action: () => window.dispatchEvent(new Event("ide:run-tests")),
  },
  {
    id: "open-settings",
    label: "Settings",
    shortcut: "Cmd/Ctrl+Shift+,",
    icon: Settings,
    action: () => window.dispatchEvent(new Event("ide:open-settings")),
  },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No matching commands.</CommandEmpty>
        <CommandGroup heading="IDE Commands">
          {ideCommands.map((command) => {
            const Icon = command.icon;
            return (
              <CommandItem
                key={command.id}
                value={command.label}
                onSelect={() => {
                  command.action();
                  onOpenChange(false);
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{command.label}</span>
                <CommandShortcut>{command.shortcut}</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
