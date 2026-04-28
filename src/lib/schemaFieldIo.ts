/**
 * Best-effort role for a schema attribute key: whether it mainly configures
 * upstream/input, downstream/output, both, or general settings (not I/O).
 */
export type FieldIoRole = "in" | "out" | "both" | "config";

export function inferAttributeFieldRole(key: string): FieldIoRole {
  const k = key.toLowerCase();
  if (k.includes("input") && k.includes("output")) return "both";

  const inMatch =
    /^in(_|$)/.test(k) ||
    /^input/.test(k) ||
    /(^|_)in_/.test(k) ||
    /_in$/.test(k) ||
    k.includes("upstream") ||
    k.includes("source_table") ||
    k.includes("read_path") ||
    (k.includes("from_") && !k.includes("output")) ||
    (k.includes("read") && (k.includes("path") || k.includes("from")));

  const outMatch =
    /^out(_|$)/.test(k) ||
    /^output/.test(k) ||
    /(^|_)out_/.test(k) ||
    /_out$/.test(k) ||
    k.includes("downstream") ||
    k.includes("dest") ||
    k.includes("sink") ||
    k.includes("write_path") ||
    k.includes("target_table") ||
    (k.includes("write") && k.includes("path"));

  if (inMatch && outMatch) return "both";
  if (inMatch) return "in";
  if (outMatch) return "out";
  return "config";
}
