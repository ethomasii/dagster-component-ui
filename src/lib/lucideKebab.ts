/** Convert Lucide React component name (e.g. BarChart2) to static icon file stem (bar-chart-2). */
export function lucideNameToKebab(icon: string): string {
  const parts = icon.match(/[A-Z][a-z]*|[0-9]+/g);
  if (!parts?.length) return icon.toLowerCase();
  return parts.map((p) => p.toLowerCase()).join("-");
}
