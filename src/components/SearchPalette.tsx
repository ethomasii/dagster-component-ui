import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { componentDisplayName } from "../lib/componentDisplay";
import type { ManifestComponent } from "../types";
import { componentId } from "../lib/componentId";
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
        nav(`/c/${encodeURIComponent(componentId(filtered[highlight]))}`);
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
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
            <Search
              size={22}
              strokeWidth={2}
              style={{ color: "var(--text-dim)", flexShrink: 0, marginTop: 2 }}
              aria-hidden
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name, tag, category, or description…"
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  color: "var(--text)",
                  fontSize: 16,
                  outline: "none",
                  padding: "2px 0 4px",
                }}
              />
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)", lineHeight: 1.4 }}>
                Jump to a template—same catalog as the home page.
              </p>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-dim)", display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span>
              <span className="kbd">↑</span> <span className="kbd">↓</span> navigate
            </span>
            <span>
              <span className="kbd">↵</span> open
            </span>
            <span>
              <span className="kbd">esc</span> close
            </span>
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
            <li style={{ padding: "20px 14px", color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5 }}>
              {components.length === 0 ? (
                "Loading catalog…"
              ) : q.trim() ? (
                <>
                  No templates match <span className="mono">{q.trim()}</span>. Try a shorter keyword, a vendor name,
                  or browse categories from the home page.
                </>
              ) : (
                "Start typing to filter the catalog."
              )}
            </li>
          ) : (
            filtered.map((c, i) => (
              <li key={componentId(c)}>
                <button
                  type="button"
                  onClick={() => {
                    nav(`/c/${encodeURIComponent(componentId(c))}`);
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
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{componentDisplayName(c, null)}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      <span className="mono">{componentId(c)}</span>
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
