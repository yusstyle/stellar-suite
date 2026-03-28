import { I128Input } from "./I128Input";
import { StructInput } from "./StructInput";

// Forward-declared to break circular dependency with VecInput
import { VecInput } from "./VecInput";

const LARGE_INT_TYPES = ["i128", "u128", "i256", "u256"] as const;
type LargeIntType = (typeof LARGE_INT_TYPES)[number];

const SIMPLE_TYPES = new Set([
  "u32", "i32", "u64", "i64",
  "bytes", "string", "symbol",
  "Address", "MuxedAddress",
  "ScVal", "Error", "Timepoint", "Duration", "void",
  "bool",
]);

function isLargeIntType(type: string): type is LargeIntType {
  return (LARGE_INT_TYPES as readonly string[]).includes(type);
}

function parseVecElementType(type: string): string | null {
  if (type.endsWith("[]")) return type.slice(0, -2);
  return null;
}

function parseOptionInnerType(type: string): string | null {
  const suffix = " | undefined";
  if (type.endsWith(suffix)) return type.slice(0, -suffix.length);
  return null;
}

function isMapType(type: string): boolean {
  return type.startsWith("Map<");
}

function isUdtType(type: string): boolean {
  // UDTs start with uppercase and are not known simple types
  return (
    type.length > 0 &&
    type[0] === type[0].toUpperCase() &&
    !SIMPLE_TYPES.has(type) &&
    !isMapType(type) &&
    !type.startsWith("[")
  );
}

export interface ComplexArgInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}

export function ComplexArgInput({ label, type, value, onChange }: ComplexArgInputProps) {
  const optionalInner = parseOptionInnerType(type);
  const isOptional = optionalInner !== null;
  const coreType = optionalInner ?? type;

  const vecElementType = parseVecElementType(coreType);
  if (vecElementType) {
    return (
      <VecInput
        label={label}
        elementType={vecElementType}
        value={value || "[]"}
        onChange={onChange}
        optional={isOptional}
      />
    );
  }

  if (isLargeIntType(coreType)) {
    return (
      <I128Input label={label} type={coreType} value={value} onChange={onChange} />
    );
  }

  if (coreType === "bool") {
    return (
      <div className="space-y-0.5">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-muted-foreground">{label}</label>
            <span className="text-[9px] text-muted-foreground/60 font-mono bg-muted px-1 rounded">
              bool{isOptional ? "?" : ""}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`chk-${label}`}
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="h-3 w-3 rounded"
          />
          <label htmlFor={`chk-${label}`} className="text-xs text-foreground font-mono">
            {value === "true" ? "true" : "false"}
          </label>
        </div>
      </div>
    );
  }

  // Map types or Tuples → JSON textarea
  if (isMapType(coreType) || coreType.startsWith("[")) {
    return (
      <StructInput
        label={label}
        typeName={coreType}
        value={value}
        onChange={onChange}
        optional={isOptional}
      />
    );
  }

  // User-defined types (structs/enums) → StructInput with JSON textarea
  if (isUdtType(coreType)) {
    return (
      <StructInput
        label={label}
        typeName={coreType}
        value={value}
        onChange={onChange}
        optional={isOptional}
      />
    );
  }

  // Simple types: string, Address, u32, i32, u64, i64, bytes, symbol, etc.
  const placeholder =
    coreType === "Address" || coreType === "MuxedAddress"
      ? "G... (Stellar public key)"
      : ["u32", "i32", "u64", "i64"].includes(coreType)
      ? "0"
      : coreType === "bytes"
      ? "hex or base64 encoded"
      : `Enter ${coreType} value`;

  return (
    <div className="space-y-0.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono text-muted-foreground">{label}</label>
          <span className="text-[9px] text-muted-foreground/60 font-mono bg-muted px-1 rounded">
            {coreType}
            {isOptional ? "?" : ""}
          </span>
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-muted border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder={placeholder}
      />
    </div>
  );
}
