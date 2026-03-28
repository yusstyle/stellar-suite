import { useState } from "react";
import { AlertCircle } from "lucide-react";

type LargeIntType = "i128" | "u128" | "i256" | "u256";

interface I128InputProps {
  label: string;
  type: LargeIntType;
  value: string;
  onChange: (value: string) => void;
}

export function I128Input({ label, type, value, onChange }: I128InputProps) {
  const [error, setError] = useState("");
  const isSigned = type.startsWith("i");

  const validate = (val: string) => {
    if (!val) {
      setError("");
      return;
    }
    try {
      const n = BigInt(val);
      if (!isSigned && n < 0n) {
        setError(`${type} must be non-negative`);
      } else {
        setError("");
      }
    } catch {
      setError("Must be a whole integer (e.g. 1234567890123456789)");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    validate(val);
  };

  const exceedsSafeInt =
    !error && value !== "" && (() => {
      try {
        return BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER) ||
          BigInt(value) < BigInt(-Number.MAX_SAFE_INTEGER);
      } catch {
        return false;
      }
    })();

  return (
    <div className="space-y-0.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono text-muted-foreground">{label}</label>
          <span className="text-[9px] text-muted-foreground/60 font-mono bg-muted px-1 rounded">
            {type}
          </span>
        </div>
      )}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        className={`w-full bg-muted border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
          error ? "border-destructive" : "border-border"
        }`}
        placeholder={
          isSigned
            ? "e.g. -9007199254740993 or 9007199254740993"
            : "e.g. 9007199254740993"
        }
      />
      {error && (
        <div className="flex items-center gap-1 text-[9px] text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}
      {exceedsSafeInt && (
        <p className="text-[9px] text-yellow-500">
          Exceeds JS MAX_SAFE_INTEGER — stored safely as string
        </p>
      )}
    </div>
  );
}
