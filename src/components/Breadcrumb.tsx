import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type BreadcrumbCrumb = {
  label: ReactNode;
  to?: string;
};

/**
 * Light-on-purple breadcrumb trail for use inside a `PageHeroBand`. Earlier
 * crumbs are translucent-white links separated by a dim "/"; the last crumb
 * renders as plain, full-white text (the current page, not a link).
 */
export function Breadcrumb({ crumbs }: { crumbs: BreadcrumbCrumb[] }) {
  return (
    <nav
      style={{
        fontSize: 13,
        color: "rgba(255,255,255,0.75)",
        marginBottom: 20,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
      aria-label="Breadcrumb"
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} style={{ display: "contents" }}>
            {c.to && !isLast ? (
              <Link to={c.to} style={{ color: "rgba(255,255,255,0.75)" }}>
                {c.label}
              </Link>
            ) : (
              <span style={isLast ? { color: "#fff", fontWeight: 500 } : { color: "rgba(255,255,255,0.75)" }}>
                {c.label}
              </span>
            )}
            {!isLast && (
              <span aria-hidden style={{ color: "rgba(255,255,255,0.4)" }}>
                /
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
