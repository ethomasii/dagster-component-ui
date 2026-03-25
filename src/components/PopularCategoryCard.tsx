import type { ManifestComponent } from "../types";
import { categoryLabel } from "../lib/format";
import { ComponentIcon } from "./ComponentIcon";

export function PopularCategoryCard({
  category,
  count,
  sample,
  active,
  onSelect,
}: {
  category: string;
  count: number;
  sample: ManifestComponent | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        textAlign: "left",
        padding: 18,
        borderRadius: "var(--radius)",
        border: active ? "1px solid var(--accent-bright)" : "1px solid var(--border)",
        background: active ? "rgba(124, 58, 237, 0.12)" : "var(--bg-card)",
        color: "var(--text)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 132,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {categoryLabel(category)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }} className="mono">
            category · {category}
          </div>
        </div>
        {sample && (
          <span style={{ flexShrink: 0 }}>
            <ComponentIcon icon={sample.icon} size={28} title="" />
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
        <strong style={{ color: "var(--cyan)" }}>{count}</strong> templates
        {sample?.tags?.[0] && (
          <span>
            {" "}
            · popular tag <span className="mono">{sample.tags[0]}</span>
          </span>
        )}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-bright)", marginTop: "auto" }}>
        Explore →
      </span>
    </button>
  );
}
