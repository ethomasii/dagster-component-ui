import type { ManifestComponent } from "../types";
import { componentDisplayName } from "./componentDisplay";
import { componentId } from "./componentId";
import { queryAlternatives } from "./examplesSearch";

export function matchesQuery(c: ManifestComponent, q: string): boolean {
  const alts = queryAlternatives(q);
  if (!alts.length) return true;
  const hay = [
    componentId(c),
    componentDisplayName(c, null),
    c.name,
    c.description,
    c.category,
    ...(c.tags ?? []),
    c.author,
    c.vendor,
    ...(c.vendors ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return alts.some((words) => words.every((word) => hay.includes(word)));
}

export function sortByRelevance(
  list: ManifestComponent[],
  q: string
): ManifestComponent[] {
  const alts = queryAlternatives(q);
  if (!alts.length) return list;
  return [...list].sort((a, b) => componentRelevanceScore(b, q) - componentRelevanceScore(a, q));
}

export function componentRelevanceScore(c: ManifestComponent, q: string): number {
  const alts = queryAlternatives(q);
  if (!alts.length) return 0;
  // Score against the BEST-matching alternative so OR queries rank each
  // vendor's own components highly under their own alt.
  return Math.max(...alts.map((words) => scoreAgainstWords(c, words)));
}

function scoreAgainstWords(c: ManifestComponent, words: string[]): number {
  if (!words.length) return 0;
  const joined = words.join(" ");
  let n = 0;
  const id = componentId(c).toLowerCase();
  const name = componentDisplayName(c, null).toLowerCase();
  if (id === joined) n += 100;
  if (id.startsWith(joined)) n += 40;
  if (name.includes(joined)) n += 20;
  if (id.includes(joined)) n += 15;
  for (const t of c.tags ?? []) {
    if (t.toLowerCase() === joined) n += 25;
    else if (t.toLowerCase().includes(joined)) n += 8;
  }
  if ((c.vendor ?? "").toLowerCase() === joined) n += 30;
  if ((c.vendors ?? []).some((v) => v.toLowerCase() === joined)) n += 30;
  if ((c.description ?? "").toLowerCase().includes(joined)) n += 5;
  return n;
}
