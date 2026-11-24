import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
import { PageEyebrow } from "../components/PageEyebrow";
import { PageHeroBand } from "../components/PageHeroBand";
import {
  COMMUNITY_CLI_EXAMPLES_INDEX_README_URL,
  COMMUNITY_CLI_EXAMPLES_TREE_WEB,
} from "../data/examplesCatalog";
import { UVX_REQUIRES_UV_EXPLAINER } from "../lib/registryRequirements";
import { useCatalog } from "../context/CatalogContext";
import { filterExamplesReadmeByQuery } from "../lib/examplesSearch";
import { linkifyCatalogMarkdown } from "../lib/linkifyCatalogMarkdown";
import { splitIntoH2Sections, type MarkdownSection } from "../lib/markdownSections";
import {
  fetchExamplesIndexReadmeCached,
  rewriteExamplesIndexLinks,
} from "../lib/loadCommunityExamples";

/** The README's own prose literally says "The full depth catalog by what-it-needs-to-run
 *  follows." right before its manual Table of contents -- that's the real dividing line in
 *  the source between "pick one of these first" (tours / best-of / agentic patterns) and
 *  "the long tail, browse by what it needs" (no-auth / Azure / GCP / Snowflake / Dagster+ /
 *  cross-vendor / reference docs). We honor that same split instead of flattening everything
 *  into one undifferentiated list of 15 equally-weighted sections. The TOC section itself is
 *  dropped from rendering entirely -- it's a list of anchor links whose whole job is now done
 *  by this page's own collapsible outline. */
const TOC_HEADING = "table of contents";

function AccordionRow({
  id,
  heading,
  rowCount,
  open,
  forcedOpen,
  level,
  onToggle,
  children,
}: {
  id: string;
  heading: string;
  rowCount: number;
  open: boolean;
  forcedOpen: boolean;
  level: 1 | 2;
  onToggle: (isOpen: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <details
      id={id}
      className="examples-accordion-item"
      open={open}
      onToggle={(e) => {
        if (!forcedOpen) onToggle(e.currentTarget.open);
      }}
      style={level === 1 ? undefined : { background: "var(--bg-elevated)" }}
    >
      <summary
        style={{
          display: "flex",
          alignItems: "center",
          gap: level === 1 ? 14 : 10,
          padding: level === 1 ? "20px 26px" : "14px 20px 14px 26px",
          cursor: forcedOpen ? "default" : "pointer",
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
            width: level === 1 ? 28 : 22,
            height: level === 1 ? 28 : 22,
            borderRadius: 999,
            background: open ? "var(--accent-glow)" : "transparent",
            flexShrink: 0,
            transition: "background 160ms ease",
          }}
        >
          <ChevronRight
            size={level === 1 ? 15 : 13}
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
            fontSize: level === 1 ? 17 : 14.5,
            fontWeight: level === 1 ? 700 : 600,
            letterSpacing: "-0.015em",
            color: open ? "var(--accent-bright)" : "var(--text)",
            transition: "color 160ms ease",
          }}
        >
          {heading}
        </span>
        {rowCount > 0 ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-dim)",
              fontVariantNumeric: "tabular-nums",
              padding: "3px 10px",
              borderRadius: 999,
              background: level === 1 ? "var(--bg-elevated)" : "var(--bg-card)",
            }}
          >
            {rowCount}
          </span>
        ) : null}
      </summary>
      <div
        className="examples-accordion-body"
        style={{ padding: level === 1 ? "0 26px 28px 68px" : "0 20px 18px 58px" }}
      >
        {children}
      </div>
    </details>
  );
}

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

  const { preamble, quickStart, depthCatalog } = useMemo(() => {
    if (!displayReadme) {
      return { preamble: null as string | null, quickStart: [] as MarkdownSection[], depthCatalog: [] as MarkdownSection[] };
    }
    const { preamble, sections } = splitIntoH2Sections(displayReadme);
    const tocIndex = sections.findIndex((s) => s.heading.trim().toLowerCase() === TOC_HEADING);
    const quickStart = tocIndex === -1 ? [] : sections.slice(0, tocIndex);
    const depthCatalog = tocIndex === -1 ? sections : sections.slice(tocIndex + 1);
    return { preamble, quickStart, depthCatalog };
  }, [displayReadme]);

  const searching = qParam.trim().length > 0;

  // Default: everything in the depth catalog collapsed (quick-start already gives a visible
  // on-ramp without opening anything) -- except whichever section/subsection the URL hash
  // points at. Search mode ignores this entirely (every result it returns already matched).
  useEffect(() => {
    if (initializedOpen || searching || !depthCatalog.length) return;
    const hashSlug = (() => {
      try {
        return decodeURIComponent(window.location.hash.replace(/^#/, ""));
      } catch {
        return window.location.hash.replace(/^#/, "");
      }
    })();
    if (hashSlug) {
      const toOpen = new Set<string>();
      const topMatch = depthCatalog.find((s) => s.slug === hashSlug);
      if (topMatch) {
        toOpen.add(topMatch.slug);
      } else {
        for (const s of depthCatalog) {
          const sub = s.subsections.find((x) => x.slug === hashSlug);
          if (sub) {
            toOpen.add(s.slug);
            toOpen.add(sub.slug);
            break;
          }
        }
      }
      setOpenSlugs(toOpen);
    }
    setInitializedOpen(true);
  }, [depthCatalog, initializedOpen, searching]);

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

  const allSlugs = useMemo(
    () => depthCatalog.flatMap((s) => [s.slug, ...s.subsections.map((sub) => sub.slug)]),
    [depthCatalog]
  );
  const allOpen = allSlugs.length > 0 && allSlugs.every((slug) => openSlugs.has(slug));

  return (
    <>
      <PageHeroBand>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 24px 36px" }}>
          <PageEyebrow light>Examples</PageEyebrow>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
              lineHeight: 1.2,
              color: "#fff",
            }}
          >
            End-to-end demos
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "0 0 20px", lineHeight: 1.55 }}>
            This page mirrors the demos folder README from the CLI repo—it updates whenever that file changes (no duplicated
            list in this codebase). Browse the folder on GitHub:{" "}
            <a href={COMMUNITY_CLI_EXAMPLES_TREE_WEB} target="_blank" rel="noreferrer" style={{ color: "#67e8f9" }}>
              examples/
            </a>
            . Demo setup scripts often use <span className="mono" style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}>uvx</span>; {UVX_REQUIRES_UV_EXPLAINER}{" "}
            <Link to="/get-started" style={{ color: "#67e8f9" }}>
              Get started
            </Link>{" "}
            has install steps and a pip-only path.
          </p>

          {!loading && !error && linkedReadme != null && (
            <form
              onSubmit={(e) => e.preventDefault()}
              style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}
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
                    border: "1px solid rgba(255,255,255,0.3)",
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              ) : null}
              {!searching && allSlugs.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setOpenSlugs(allOpen ? new Set() : new Set(allSlugs))}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.3)",
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
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
        </div>
      </PageHeroBand>

      <div className="examples-markdown-page" style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 64px" }}>
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

      {quickStart.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent-bright)",
              margin: "0 0 4px",
            }}
          >
            Quick start
          </p>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 18px" }}>
            Pick one of these before diving into the full catalog below.
          </p>
          {quickStart.map((s) => (
            <div key={s.slug} id={s.slug} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.015em", margin: "0 0 2px" }}>
                {/* The source heading is "Curated tours (start here)" -- redundant once it's
                    sitting right above a section literally titled "Start here", and now
                    additionally grouped under this page's own "Quick start" label. Dropping
                    just the parenthetical here is display-only (doesn't touch the anchor
                    slug or the source content). */}
                {s.heading === "Curated tours (start here)" ? "Curated tours" : s.heading}
              </h2>
              <ExamplesMarkdown className="doc-viewer-markdown examples-markdown">{s.body}</ExamplesMarkdown>
            </div>
          ))}
        </section>
      )}

      {depthCatalog.length > 0 && (
        <>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
              margin: "0 0 12px",
            }}
          >
            Full depth catalog — browse by what a demo needs to run
          </p>
          <div
            style={{
              borderRadius: 20,
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              overflow: "hidden",
            }}
          >
            {depthCatalog.map((s, i) => {
              const open = searching || openSlugs.has(s.slug);
              return (
                <div key={s.slug} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <AccordionRow
                    id={s.slug}
                    heading={s.heading}
                    rowCount={s.rowCount}
                    open={open}
                    forcedOpen={searching}
                    level={1}
                    onToggle={(isOpen) => syncSection(s.slug, isOpen)}
                  >
                    {s.intro ? (
                      <ExamplesMarkdown className="doc-viewer-markdown examples-markdown">{s.intro}</ExamplesMarkdown>
                    ) : null}
                    {s.subsections.length > 0 ? (
                      <div
                        style={{
                          marginTop: s.intro ? 12 : 0,
                          borderRadius: 14,
                          border: "1px solid var(--border)",
                          overflow: "hidden",
                        }}
                      >
                        {s.subsections.map((sub, j) => {
                          const subOpen = searching || openSlugs.has(sub.slug);
                          return (
                            <div key={sub.slug} style={{ borderTop: j === 0 ? "none" : "1px solid var(--border)" }}>
                              <AccordionRow
                                id={sub.slug}
                                heading={sub.heading}
                                rowCount={sub.rowCount}
                                open={subOpen}
                                forcedOpen={searching}
                                level={2}
                                onToggle={(isOpen) => syncSection(sub.slug, isOpen)}
                              >
                                <ExamplesMarkdown className="doc-viewer-markdown examples-markdown">{sub.body}</ExamplesMarkdown>
                              </AccordionRow>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <ExamplesMarkdown className="doc-viewer-markdown examples-markdown">{s.body}</ExamplesMarkdown>
                    )}
                  </AccordionRow>
                </div>
              );
            })}
          </div>
        </>
      )}

      {readme != null &&
      linkedReadme != null &&
      searching &&
      quickStart.length === 0 &&
      depthCatalog.length === 0 ? (
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
    </>
  );
}
