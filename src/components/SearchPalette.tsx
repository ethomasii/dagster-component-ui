import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ManifestComponent } from "../types";
import { matchesQuery, sortByRelevance } from "../lib/search";
import { categoryLabel } from "../lib/format";
import { ComponentIcon } from "./ComponentIcon";

const MAX_RESULTS = 50;

export function SearchPalette({
  open,
  onClose,
  components,
}: {
  open: boolean;
  onClose: () => void;
  components: ManifestComponent[];
}) {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    const list = components.filter((c) => matchesQuery(c, q));
    return sortByRelevance(list, q).slice(0, MAX_RESULTS);
  }, [components, q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      }
      if (e.key === "Enter" && filtered[highlight]) {
        e.preventDefault();
        nav(`/c/${filtered[highlight].id}`);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, highlight, nav, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Search components"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "12vh 16px",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          borderRadius: 14,
          border: "1px solid var(--border-strong)",
          background: "var(--bg-elevated)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search operators, assets, sensors…"
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              color: "var(--text)",
              fontSize: 16,
              outline: "none",
              padding: "4px 0",
            }}
          />
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
            ↑ ↓ navigate · ↵ open · esc close
          </div>
        </div>
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 8,
            maxHeight: "min(50vh, 400px)",
            overflowY: "auto",
          }}
        >
          {filtered.length === 0 ? (
            <li style={{ padding: "16px 12px", color: "var(--text-muted)", fontSize: 14 }}>
              No components match your search.
            </li>
          ) : (
            filtered.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    nav(`/c/${c.id}`);
                    onClose();
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 12px",
                    background: i === highlight ? "rgba(124, 58, 237, 0.2)" : "transparent",
                    color: "var(--text)",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                  onMouseEnter={() => setHighlight(i)}
                >
                  <span style={{ flexShrink: 0, marginTop: 2 }}>
                    <ComponentIcon icon={c.icon} size={22} title="" />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      <span className="mono">{c.id}</span>
                      {" · "}
                      {categoryLabel(c.category)}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
