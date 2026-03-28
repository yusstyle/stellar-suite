import { Plus, Trash2 } from "lucide-react";
import { ComplexArgInput } from "./ComplexArgInput";

interface VecInputProps {
  label: string;
  elementType: string;
  value: string; // JSON-serialized array string
  onChange: (value: string) => void;
  optional?: boolean;
}

function parseItems(value: string): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) =>
      typeof v === "string" ? v : JSON.stringify(v)
    );
  } catch {
    return [];
  }
}

function serializeItems(items: string[]): string {
  const jsValues = items.map((item) => {
    if (item === "") return item;
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  });
  return JSON.stringify(jsValues);
}

export function VecInput({ label, elementType, value, onChange, optional }: VecInputProps) {
  const items = parseItems(value);

  const update = (newItems: string[]) => {
    onChange(serializeItems(newItems));
  };

  const addItem = () => update([...items, ""]);

  const removeItem = (index: number) =>
    update(items.filter((_, i) => i !== index));

  const updateItem = (index: number, val: string) => {
    const next = [...items];
    next[index] = val;
    update(next);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-[10px] font-mono text-muted-foreground">{label}</label>
        )}
        <span className="text-[9px] text-muted-foreground/60 font-mono bg-muted px-1 rounded ml-auto">
          {elementType}[]{optional ? "?" : ""}
        </span>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-background/30">
        {items.length === 0 && (
          <p className="text-[9px] text-muted-foreground text-center py-2 italic">
            Empty — click + to add items
          </p>
        )}
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-1 px-1.5 py-1.5 border-b border-border/40 last:border-b-0"
          >
            <span className="text-[9px] text-muted-foreground/40 font-mono mt-2 shrink-0 w-5 text-right select-none">
              {index}
            </span>
            <div className="flex-1 min-w-0">
              <ComplexArgInput
                label=""
                type={elementType}
                value={item}
                onChange={(val) => updateItem(index, val)}
              />
            </div>
            <button
              onClick={() => removeItem(index)}
              className="mt-1 p-0.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
              title="Remove item"
              type="button"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        type="button"
        className="flex items-center gap-1 text-[9px] text-primary hover:text-primary/80 transition-colors"
      >
        <Plus className="h-3 w-3" />
        Add item
      </button>
    </div>
  );
}
