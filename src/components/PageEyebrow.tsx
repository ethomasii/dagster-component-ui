import type { CSSProperties, ReactNode } from "react";

/** The small uppercase kicker label above a page's H1 ("Examples", "Agentic", "Skills", …).
 *  Was duplicated verbatim (and inconsistently colored -- gray on most pages, cyan on Home's
 *  hero) across 9 pages; now one component, bold purple everywhere. */
export function PageEyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p
      style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--accent-bright)",
        margin: "0 0 12px",
        ...style,
      }}
    >
      {children}
    </p>
  );
}
