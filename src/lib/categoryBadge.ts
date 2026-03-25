/** Short badge letter(s) for the component header module row. */
export function categoryModuleBadge(category: string): string {
  const m: Record<string, string> = {
    analytics: "A",
    ai: "AI",
    ingestion: "N",
    transformation: "T",
    source: "U",
    sink: "W",
    sensor: "S",
    external: "E",
    observation: "O",
    check: "K",
    integration: "I",
    infrastructure: "F",
    dbt: "D",
  };
  return m[category] ?? category.slice(0, 2).toUpperCase();
}
