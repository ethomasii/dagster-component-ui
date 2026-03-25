import type { Manifest, SchemaSpec } from "../types";

export async function loadManifest(): Promise<Manifest> {
  const res = await fetch("/manifest.json");
  if (!res.ok) throw new Error("Failed to load manifest");
  return res.json() as Promise<Manifest>;
}

export async function loadSchemaSpec(): Promise<SchemaSpec> {
  const res = await fetch("/schema-spec.json");
  if (!res.ok) throw new Error("Failed to load schema specification");
  return res.json() as Promise<SchemaSpec>;
}
