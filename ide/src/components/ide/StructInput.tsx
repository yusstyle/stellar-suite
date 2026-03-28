import { useState } from "react";
import { AlertCircle } from "lucide-react";

interface StructInputProps {
  label: string;
  typeName: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}

export function StructInput({ label, typeName, value, onChange, optional }: StructInputProps) {
  const [jsonError, setJsonError] = useState("");

  const validate = (raw: string) => {
    if (!raw.trim()) {
      setJsonError("");
      return;
    }
    try {
      JSON.parse(raw);
      setJsonError("");
    } catch {
      setJsonError("Invalid JSON");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    validate(e.target.value);
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-[10px] font-mono text-muted-foreground">{label}</label>
        )}
        <span className="text-[9px] text-muted-foreground/60 font-mono bg-muted px-1 rounded ml-auto">
          {typeName}
          {optional ? "?" : ""}
        </span>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        rows={3}
        className={`w-full bg-muted border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none ${
          jsonError ? "border-destructive" : "border-border"
        }`}
        placeholder={`{"field": "value"}`}
      />
      {jsonError ? (
        <div className="flex items-center gap-1 text-[9px] text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {jsonError}
        </div>
      ) : (
        <p className="text-[9px] text-muted-foreground/60">
          JSON object for struct <code className="font-mono">{typeName}</code>
        </p>
      )}
    </div>
  );
}
