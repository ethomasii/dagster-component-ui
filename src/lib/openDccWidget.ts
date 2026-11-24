/** Dispatched from anywhere (e.g. the homepage hero) so the DCC Agent floating widget can be
 *  opened programmatically, optionally with a prefilled intent that gets auto-submitted --
 *  same event-based cross-component pattern as `openSearchPalette.ts`. */
export const OPEN_DCC_WIDGET_EVENT = "dcr-open-dcc-widget" as const;

export type OpenDccWidgetDetail = { intent?: string };

export function requestOpenDccWidget(intent?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OpenDccWidgetDetail>(OPEN_DCC_WIDGET_EVENT, { detail: { intent } })
  );
}
