import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Building2, Search } from "lucide-react";
import { componentDisplayName } from "../lib/componentDisplay";
import type { ManifestComponent } from "../types";
import { componentId } from "../lib/componentId";
import { matchesQuery, sortByRelevance } from "../lib/search";
import { categoryLabel } from "../lib/format";
import { ComponentIcon } from "./ComponentIcon";
import { fetchExamplesIndexReadmeCached } from "../lib/loadCommunityExamples";
import { fetchVendorsIndexReadmeCached } from "../lib/loadVendors";
import { TRUST_FILTER_CHIPS, componentMatchesTrustUrlFilter, trustFilterHeading, type TrustUrlFilter } from "../lib/verification";
import {
  examplesReadmeBodyMatches,
  findExampleLinkHits,
} from "../lib/examplesSearch";
import {
  findVendorLinkHits,
  vendorsReadmeBodyMatches,
} from "../lib/vendorsSearch";
import { sortPaletteRows, type PaletteSearchRow } from "../lib/paletteSearchRanking";
import { PageHeroBand } from "./PageHeroBand";

const MAX_COMPONENT_RESULTS = 50;
const MAX_EXAMPLE_LINK_RESULTS = 24;
const MAX_VENDOR_LINK_RESULTS = 16;

type PaletteRow = PaletteSearchRow;

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
  const [trustFilter, setTrustFilter] = useState<TrustUrlFilter>("");
  const [examplesReadme, setExamplesReadme] = useState<string | null>(null);
  const [examplesLoadState, setExamplesLoadState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [vendorsReadme, setVendorsReadme] = useState<string | null>(null);
  const [vendorsLoadState, setVendorsLoadState] = useState<"idle" | "loading" | "ok" | "err">("idle");

  useEffect(() => {
    if (!open) {
      setExamplesLoadState((s) => (s === "loading" ? "idle" : s));
      setVendorsLoadState((s) => (s === "loading" ? "idle" : s));
      return;
    }
    if (examplesReadme !== null) {
      setExamplesLoadState("ok");
    } else {
      let cancelled = false;
      setExamplesLoadState("loading");
      void fetchExamplesIndexReadmeCached()
        .then((text) => {
          if (cancelled) return;
          setExamplesReadme(text);
          setExamplesLoadState("ok");
        })
        .catch(() => {
          if (cancelled) return;
          setExamplesLoadState("err");
        });
      return () => {
        cancelled = true;
      };
    }
  }, [open, examplesReadme]);

  useEffect(() => {
    if (!open) return;
    if (vendorsReadme !== null) {
      setVendorsLoadState("ok");
      return;
    }
    let cancelled = false;
    setVendorsLoadState("loading");
    void fetchVendorsIndexReadmeCached()
      .then((text) => {
        if (cancelled) return;
        setVendorsReadme(text);
        setVendorsLoadState("ok");
      })
      .catch(() => {
        if (cancelled) return;
        setVendorsLoadState("err");
      });
    return () => {
      cancelled = true;
    };
  }, [open, vendorsReadme]);

  useEffect(() => {
    if (open) {
      setQ("");
      setTrustFilter("");
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const filteredComponents = useMemo(() => {
    let list = components.filter((c) => matchesQuery(c, q));
    list = list.filter((c) => componentMatchesTrustUrlFilter(c, trustFilter));
    return sortByRelevance(list, q).slice(0, MAX_COMPONENT_RESULTS);
  }, [components, q, trustFilter]);

  const exampleLinkHits = useMemo(() => {
    if (!examplesReadme || !q.trim()) return [];
    return findExampleLinkHits(examplesReadme, q).slice(0, MAX_EXAMPLE_LINK_RESULTS);
  }, [examplesReadme, q]);

  const showExamplesIndexHit = useMemo(() => {
    if (!examplesReadme || !q.trim()) return false;
    return examplesReadmeBodyMatches(examplesReadme, q);
  }, [examplesReadme, q]);

  const vendorLinkHits = useMemo(() => {
    if (!vendorsReadme || !q.trim()) return [];
    return findVendorLinkHits(vendorsReadme, q).slice(0, MAX_VENDOR_LINK_RESULTS);
  }, [vendorsReadme, q]);

  const showVendorsIndexHit = useMemo(() => {
    if (!vendorsReadme || !q.trim()) return false;
    return vendorsReadmeBodyMatches(vendorsReadme, q);
  }, [vendorsReadme, q]);

  const rows: PaletteRow[] = useMemo(() => {
    const out: PaletteRow[] = filteredComponents.map((c) => ({ kind: "component", c }));
    for (const hit of vendorLinkHits) {
      out.push({ kind: "vendor", hit });
    }
    if (showVendorsIndexHit) {
      out.push({ kind: "vendors_index" });
    }
    for (const hit of exampleLinkHits) {
      out.push({ kind: "example", hit });
    }
    if (showExamplesIndexHit) {
      out.push({ kind: "examples_index" });
    }
    return sortPaletteRows(out, q);
  }, [
    filteredComponents,
    vendorLinkHits,
    showVendorsIndexHit,
    exampleLinkHits,
    showExamplesIndexHit,
  ]);

  useEffect(() => {
    setHighlight(0);
  }, [q, trustFilter]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (rows.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, rows.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      }
      if (e.key === "Enter") {
        const row = rows[highlight];
        if (!row) return;
        e.preventDefault();
        if (row.kind === "component") {
          nav(`/c/${encodeURIComponent(componentId(row.c))}`);
        } else if (row.kind === "vendor") {
          nav(`/vendors/${encodeURIComponent(row.hit.slug)}`);
        } else if (row.kind === "vendors_index") {
          const qq = q.trim();
          nav(qq ? `/vendors?q=${encodeURIComponent(qq)}` : "/vendors");
        } else if (row.kind === "example") {
          nav(`/examples/${encodeURIComponent(row.hit.slug)}`);
        } else {
          const qq = q.trim();
          nav(qq ? `/examples?q=${encodeURIComponent(qq)}` : "/examples");
        }
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, rows, highlight, nav, onClose, q]);

  if (!open) return null;

  const qTrim = q.trim();
  const hasActiveFilter = Boolean(qTrim) || Boolean(trustFilter);
  const indexStillLoading =
    Boolean(qTrim) &&
    (examplesLoadState === "loading" || vendorsLoadState === "loading");
  const empty = rows.length === 0 && components.length > 0 && hasActiveFilter && !indexStillLoading;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Search catalog, vendors, and examples"
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
          boxShadow: "0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(139, 92, 246, 0.25)",
          overflow: "hidden",
        }}
      >
        <PageHeroBand>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
              <Search
                size={22}
                strokeWidth={2}
                style={{ color: "rgba(255,255,255,0.75)", flexShrink: 0, marginTop: 2 }}
                aria-hidden
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search templates, vendors (Snowflake, Db2, …), examples…"
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: "#fff",
                    fontSize: 16,
                    outline: "none",
                    padding: "2px 0 4px",
                  }}
                />
                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
                  Catalog components, vendor landing pages, and the CLI examples index.
                </p>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", display: "flex", flexWrap: "wrap", gap: 8 }}>
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
        </PageHeroBand>
        <div
          style={{
            padding: "10px 16px 12px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              width: "100%",
              marginBottom: 2,
            }}
          >
            Filter catalog in this dialog (click again to clear).
          </span>
          {TRUST_FILTER_CHIPS.map(({ trust, label, hint }) => {
            const active = trustFilter === trust;
            return (
              <button
                key={trust}
                type="button"
                title={hint}
                aria-pressed={active}
                onClick={() => setTrustFilter(active ? "" : trust)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "var(--accent-bright)" : "var(--border)"}`,
                  background: active ? "rgba(124, 58, 237, 0.22)" : "var(--bg-card)",
                  color: active ? "var(--text)" : "var(--text-muted)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
          {trustFilter ? (
            <div style={{ flexBasis: "100%", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  nav(`/?trust=${encodeURIComponent(trustFilter)}`);
                  onClose();
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--cyan)",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Open on home
              </button>
            </div>
          ) : null}
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
          {components.length === 0 && !hasActiveFilter ? (
            <li style={{ padding: "20px 14px", color: "var(--text-muted)", fontSize: 14 }}>Loading catalog…</li>
          ) : indexStillLoading && rows.length === 0 ? (
            <li style={{ padding: "20px 14px", color: "var(--text-muted)", fontSize: 14 }}>
              Loading vendor and examples indexes for search…
            </li>
          ) : empty ? (
            <li style={{ padding: "20px 14px", color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5 }}>
              {qTrim ? (
                <>
                  No templates, vendors, or examples match <span className="mono">{qTrim}</span>
                  {trustFilter ? (
                    <>
                      {" "}
                      with trust filter <strong style={{ color: "var(--text)" }}>{trustFilterHeading(trustFilter)}</strong>
                    </>
                  ) : null}
                  .
                </>
              ) : trustFilter ? (
                <>
                  No templates match trust filter{" "}
                  <strong style={{ color: "var(--text)" }}>{trustFilterHeading(trustFilter)}</strong>.
                </>
              ) : (
                <>No results.</>
              )}{" "}
              Try different keywords or trust chips.
              {qTrim ? (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => {
                      nav(`/vendors?q=${encodeURIComponent(qTrim)}`);
                      onClose();
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--cyan)",
                      fontWeight: 600,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Browse vendors
                  </button>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => {
                      nav(`/examples?q=${encodeURIComponent(qTrim)}`);
                      onClose();
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--cyan)",
                      fontWeight: 600,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Search examples
                  </button>
                </>
              ) : null}
            </li>
          ) : !hasActiveFilter ? (
            <li style={{ padding: "20px 14px", color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5 }}>
              Start typing to search templates, vendor pages (e.g. Precisely, Snowflake), and CLI examples—or pick a
              trust chip to narrow templates here.
            </li>
          ) : (
            rows.map((row, i) => {
              if (row.kind === "component") {
                const c = row.c;
                return (
                  <li key={`c-${componentId(c)}`}>
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
                          {" · "}
                          <span style={{ color: "var(--text-dim)" }}>Template</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }
              if (row.kind === "vendor") {
                const { hit } = row;
                return (
                  <li key={`ven-${hit.slug}`}>
                    <button
                      type="button"
                      onClick={() => {
                        nav(`/vendors/${encodeURIComponent(hit.slug)}`);
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
                      <span style={{ flexShrink: 0, marginTop: 2, color: "var(--accent-bright)" }}>
                        <Building2 size={22} strokeWidth={2} aria-hidden />
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{hit.title}</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          <span style={{ color: "var(--text-dim)" }}>Vendor landing page</span>
                          {" · "}
                          components, validation, walkthroughs
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }
              if (row.kind === "vendors_index") {
                return (
                  <li key="vendors-readme">
                    <button
                      type="button"
                      onClick={() => {
                        const qq = q.trim();
                        nav(qq ? `/vendors?q=${encodeURIComponent(qq)}` : "/vendors");
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
                      <span style={{ flexShrink: 0, marginTop: 2, color: "var(--accent-bright)" }}>
                        <Building2 size={22} strokeWidth={2} aria-hidden />
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Vendors index (filtered)</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          Open the vendors page with this search · matching sections only
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }
              if (row.kind === "example") {
                const { hit } = row;
                return (
                  <li key={`ex-${hit.slug}`}>
                    <button
                      type="button"
                      onClick={() => {
                        nav(`/examples/${encodeURIComponent(hit.slug)}`);
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
                      <span style={{ flexShrink: 0, marginTop: 2, color: "var(--accent-bright)" }}>
                        <BookOpen size={22} strokeWidth={2} aria-hidden />
                      </span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{hit.title}</span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          <span className="mono">/examples/{hit.slug}</span>
                          {" · "}
                          <span style={{ color: "var(--text-dim)" }}>Example</span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              }
              return (
                <li key="examples-readme">
                  <button
                    type="button"
                    onClick={() => {
                      const qq = q.trim();
                      nav(qq ? `/examples?q=${encodeURIComponent(qq)}` : "/examples");
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
                    <span style={{ flexShrink: 0, marginTop: 2, color: "var(--accent-bright)" }}>
                      <BookOpen size={22} strokeWidth={2} aria-hidden />
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Examples README (filtered)</span>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Open the examples page with this search · matching sections only
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
