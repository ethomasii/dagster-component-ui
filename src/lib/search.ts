import type { ManifestComponent } from "../types";

export function matchesQuery(c: ManifestComponent, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [
    c.id,
    c.name,
    c.description,
    c.category,
    ...(c.tags ?? []),
    c.author,
  ]
    .join(" ")
    .toLowerCase();
  return s.split(/\s+/).every((word) => hay.includes(word));
}

export function sortByRelevance(
  list: ManifestComponent[],
  q: string
): ManifestComponent[] {
  const s = q.trim().toLowerCase();
  if (!s) return list;
  return [...list].sort((a, b) => score(b, s) - score(a, s));
}

function score(c: ManifestComponent, q: string): number {
  let n = 0;
  const id = (c.id ?? "").toLowerCase();
  const name = (c.name ?? "").toLowerCase();
  if (id === q) n += 100;
  if (id.startsWith(q)) n += 40;
  if (name.includes(q)) n += 20;
  if (id.includes(q)) n += 15;
  for (const t of c.tags ?? []) {
    if (t.toLowerCase() === q) n += 25;
    else if (t.toLowerCase().includes(q)) n += 8;
  }
  if ((c.description ?? "").toLowerCase().includes(q)) n += 5;
  return n;
}
