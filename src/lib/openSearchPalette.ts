/** Dispatched from the site header so any page can open the catalog search palette. */
export const OPEN_SEARCH_PALETTE_EVENT = "dcr-open-search-palette" as const;

export function requestOpenSearchPalette(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SEARCH_PALETTE_EVENT));
}
