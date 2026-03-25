import { Link } from "react-router-dom";
import type { ManifestComponent } from "../types";
import { categoryLabel } from "../lib/format";
import { ComponentIcon } from "./ComponentIcon";
import { VerificationBadge } from "./VerificationBadge";

export function ComponentCard({ c }: { c: ManifestComponent }) {
  const pipCount = c.dependencies?.pip?.length ?? 0;

  return (
    <Link
      to={`/c/${c.id}`}
      style={{
        display: "block",
        padding: 18,
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s, background 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.background = "var(--bg-card-hover)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.transform = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
          <span style={{ flexShrink: 0, marginTop: 2 }}>
            <ComponentIcon icon={c.icon} size={28} title={c.name} />
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.3,
            }}
          >
            {c.name}
          </h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "var(--accent-bright)",
              whiteSpace: "nowrap",
            }}
          >
            {categoryLabel(c.category)}
          </span>
          <VerificationBadge c={c} size="sm" />
        </div>
      </div>
      <p
        style={{
          margin: "0 0 12px",
          fontSize: 13,
          color: "var(--text-muted)",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {c.description}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
          {c.id}
        </span>
        {c.version && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 6,
              background: "var(--code-bg)",
              color: "var(--text-muted)",
            }}
          >
            v{c.version}
          </span>
        )}
        {pipCount > 0 && (
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 6,
              background: "rgba(34, 211, 238, 0.12)",
              color: "var(--cyan)",
            }}
          >
            {pipCount} pip {pipCount === 1 ? "dep" : "deps"}
          </span>
        )}
        {(c.tags ?? []).slice(0, 3).map((t) => (
          <span
            key={t}
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 6,
              background: "rgba(124, 58, 237, 0.12)",
              color: "var(--text-muted)",
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
