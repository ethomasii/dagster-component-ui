import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
import {
  COMMUNITY_CLI_EXAMPLES_INDEX_README_URL,
  COMMUNITY_CLI_EXAMPLES_TREE_WEB,
} from "../data/examplesCatalog";
import { UVX_REQUIRES_UV_EXPLAINER } from "../lib/registryRequirements";
import { useCatalog } from "../context/CatalogContext";
import { filterExamplesReadmeByQuery } from "../lib/examplesSearch";
import { linkifyCatalogMarkdown } from "../lib/linkifyCatalogMarkdown";
import { splitIntoH2Sections } from "../lib/markdownSections";
import {
  fetchExamplesIndexReadmeCached,
  rewriteExamplesIndexLinks,
} from "../lib/loadCommunityExamples";

export function ExamplesIndex() {
  const { components } = useCatalog();
  const [params, setParams] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(new Set());
  const [initializedOpen, setInitializedOpen] = useState(false);

  const setQParam = (next: string) => {
    const p = new URLSearchParams(params);
    const t = next.trim();
    if (t) p.set("q", t);
    else p.delete("q");
    setParams(p, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const raw = await fetchExamplesIndexReadmeCached();
        const linked = rewriteExamplesIndexLinks(raw);
        if (!cancelled) setReadme(linked);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load examples");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const linkedReadme = useMemo(() => {
    if (!readme || !components.length) return readme;
    return linkifyCatalogMarkdown(readme, components);
  }, [readme, components]);

  const displayReadme = useMemo(() => {
    if (!linkedReadme) return null;
    const t = qParam.trim();
    if (!t) return linkedReadme;
    return filterExamplesReadmeByQuery(linkedReadme, t);
  }, [linkedReadme, qParam]);

  const { preamble, sections } = useMemo(() => {
    if (!displayReadme) return { preamble: null as string | null, sections: [] };
    return splitIntoH2Sections(displayReadme);
  }, [displayReadme]);

  const searching = qParam.trim().length > 0;

  // Default: only the first section open (the README's own "start here" framing), or
  // whichever section the URL hash points at -- not "painfully long" by default, everything
  // else is one click away. Runs once sections first become available; search mode ignores
  // this entirely (every section it returns already matched the query).
  useEffect(() => {
    if (initializedOpen || searching || !sections.length) return;
    const hashSlug = (() => {
      try {
        return decodeURIComponent(window.location.hash.replace(/^#/, ""));
      } catch {
        return window.location.hash.replace(/^#/, "");
      }
    })();
    const match = sections.find((s) => s.slug === hashSlug);
    setOpenSlugs(new Set([(match ?? sections[0]).slug]));
    setInitializedOpen(true);
  }, [sections, initializedOpen, searching]);

  // Sync state TO the native element's resulting `open` state, never flip based on what we
  // think it was. `<details open={...}>` is controlled by React (via `openSlugs`), so every
  // re-render that changes `open` sets the DOM property itself -- which, same as a real
  // click, fires a native `toggle` event. Reading `e.currentTarget.open` and writing that
  // exact value back is idempotent for a React-driven change (no-op) and correct for a real
  // click; toggling blindly here instead double-flips a React-driven change into an infinite
  // open/close loop on mount (confirmed: the initially-open section rapidly flickered).
  const syncSection = (slug: string, isOpen: boolean) => {
    setOpenSlugs((prev) => {
      if (isOpen === prev.has(slug)) return prev;
      const next = new Set(prev);
      if (isOpen) next.add(slug);
      else next.delete(slug);
      return next;
    });
  };

  const allOpen = sections.length > 0 && sections.every((s) => openSlugs.has(s.slug));

  return (
    <div className="examples-markdown-page" style={{ maxWidth: 920, margin: "0 auto", padding: "32px 24px 64px" }}>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          margin: "0 0 12px",
        }}
      >
        Examples
      </p>

      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 16px", lineHeight: 1.5 }}>
        This page mirrors the demos folder README from the CLI repo—it updates whenever that file changes (no duplicated
        list in this codebase). Browse the folder on GitHub:{" "}
        <a href={COMMUNITY_CLI_EXAMPLES_TREE_WEB} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
          examples/
        </a>
        . Demo setup scripts often use <span className="mono">uvx</span>; {UVX_REQUIRES_UV_EXPLAINER}{" "}
        <Link to="/get-started" style={{ color: "var(--cyan)" }}>
          Get started
        </Link>{" "}
        has install steps and a pip-only path.
      </p>

      {!loading && !error && linkedReadme != null && (
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flex: "1 1 220px",
              minWidth: 0,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
            }}
          >
            <Search size={18} strokeWidth={2} style={{ color: "var(--text-dim)", flexShrink: 0 }} aria-hidden />
            <input
              type="search"
              value={qParam}
              onChange={(e) => setQParam(e.target.value)}
              placeholder="Filter sections (matches all words)…"
              aria-label="Filter examples README"
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                background: "transparent",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>
          {qParam.trim() ? (
            <button
              type="button"
              onClick={() => setQParam("")}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          ) : null}
          {!searching && sections.length > 0 ? (
            <button
              type="button"
              onClick={() => setOpenSlugs(allOpen ? new Set() : new Set(sections.map((s) => s.slug)))}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          ) : null}
        </form>
      )}

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading examples index…</p>}
      {error && (
        <div className="callout-help" style={{ marginBottom: 24, borderLeftColor: "var(--error)" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "var(--text)" }}>Could not load README</p>
          <p style={{ margin: "8px 0 0", fontSize: 14 }}>{error}</p>
          <p style={{ margin: "12px 0 0", fontSize: 13 }}>
            <a href={COMMUNITY_CLI_EXAMPLES_INDEX_README_URL} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
              Open README.md (raw)
            </a>
          </p>
        </div>
      )}

      {preamble ? <ExamplesMarkdown className="doc-viewer-markdown examples-markdown">{preamble}</ExamplesMarkdown> : null}

      <div
        style={{
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          overflow: "hidden",
        }}
      >
        {sections.map((s, i) => {
          const open = searching || openSlugs.has(s.slug);
          return (
            <details
              key={s.slug}
              id={s.slug}
              className="examples-accordion-item"
              open={open}
              onToggle={(e) => {
                // `searching` forces every section open regardless of click state, so ignore
                // native toggle events while it's active (a click would otherwise be synced to
                // closed for a moment before `open`'s `searching ||` forces it back open).
                if (!searching) syncSection(s.slug, e.currentTarget.open);
              }}
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <summary
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "20px 26px",
                  cursor: searching ? "default" : "pointer",
                  listStyle: "none",
                  userSelect: "none",
                }}
              >
                <span
                  className="examples-accordion-chevron"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: open ? "var(--accent-glow)" : "transparent",
                    flexShrink: 0,
                    transition: "background 160ms ease",
                  }}
                >
                  <ChevronRight
                    size={15}
                    style={{
                      color: open ? "var(--accent-bright)" : "var(--text-dim)",
                      transition: "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), color 160ms ease",
                      transform: open ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                    aria-hidden
                  />
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: "-0.015em",
                    color: open ? "var(--accent-bright)" : "var(--text)",
                    transition: "color 160ms ease",
                  }}
                >
                  {s.heading}
                </span>
                {s.rowCount > 0 ? (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-dim)",
                      fontVariantNumeric: "tabular-nums",
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: "var(--bg-elevated)",
                    }}
                  >
                    {s.rowCount}
                  </span>
                ) : null}
              </summary>
              <div className="examples-accordion-body" style={{ padding: "0 26px 28px 68px" }}>
                <ExamplesMarkdown className="doc-viewer-markdown examples-markdown">{s.body}</ExamplesMarkdown>
              </div>
            </details>
          );
        })}
      </div>

      {readme != null && linkedReadme != null && searching && sections.length === 0 ? (
        <div className="callout-help" style={{ marginTop: 8 }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
            No README sections contain all of those words. Try fewer keywords or{" "}
            <button
              type="button"
              onClick={() => setQParam("")}
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
              clear the filter
            </button>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}
