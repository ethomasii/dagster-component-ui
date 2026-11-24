import type { CSSProperties, ReactNode } from "react";

/** The small uppercase kicker label above a page's H1 ("Examples", "Agentic", "Skills", …).
 *  Was duplicated verbatim (and inconsistently colored -- gray on most pages, cyan on Home's
 *  hero) across 9 pages; now one component, bold purple everywhere. Pass `light` when this
 *  sits inside a `<PageHeroBand>` (purple-on-purple wouldn't read) -- same bright cyan Home's
 *  own hero eyebrow uses. */
export function PageEyebrow({
  children,
  light,
  style,
}: {
  children: ReactNode;
  light?: boolean;
  style?: CSSProperties;
}) {
  return (
    <p
      style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: light ? "#67e8f9" : "var(--accent-bright)",
        margin: "0 0 12px",
        ...style,
      }}
    >
      {children}
    </p>
  );
}
