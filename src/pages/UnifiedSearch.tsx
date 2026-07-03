/**
 * Unified /search page — one URL, three panels (Components + Vendors + Examples).
 *
 * Great for compound queries via the OR-search comma syntax:
 *   /search?q=temporal,vercel
 * shows every Temporal + Vercel hit in one page.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { matchesQuery, sortByRelevance } from "../lib/search";
import { componentId } from "../lib/componentId";
import { componentDisplayName } from "../lib/componentDisplay";
import { fetchExamplesIndexReadmeCached } from "../lib/loadCommunityExamples";
import { fetchVendorsIndexReadmeCached } from "../lib/loadVendors";
import { findExampleLinkHits, queryAlternatives } from "../lib/examplesSearch";
import { findVendorLinkHits } from "../lib/vendorsSearch";

const PANEL_LIMIT = 24;

export function UnifiedSearch() {
  const { components } = useCatalog();
  const [params, setParams] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const [examplesReadme, setExamplesReadme] = useState<string | null>(null);
  const [vendorsReadme, setVendorsReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const [ex, ve] = await Promise.all([
          fetchExamplesIndexReadmeCached(),
          fetchVendorsIndexReadmeCached(),
        ]);
        if (!cancelled) {
          setExamplesReadme(ex);
          setVendorsReadme(ve);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load index READMEs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasQuery = queryAlternatives(qParam).length > 0;

  const componentHits = useMemo(() => {
    if (!hasQuery) return [];
    return sortByRelevance(components.filter((c) => matchesQuery(c, qParam)), qParam);
  }, [components, qParam, hasQuery]);

  const vendorHits = useMemo(() => {
    if (!hasQuery || !vendorsReadme) return [];
    return findVendorLinkHits(vendorsReadme, qParam);
  }, [vendorsReadme, qParam, hasQuery]);

  const exampleHits = useMemo(() => {
    if (!hasQuery || !examplesReadme) return [];
    return findExampleLinkHits(examplesReadme, qParam);
  }, [examplesReadme, qParam, hasQuery]);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 64px" }}>
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
        Search
      </p>

      <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 700 }}>
        Unified search
      </h1>

      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 20px", lineHeight: 1.5 }}>
        One page across components, vendor landing pages, and CLI examples. Comma
        separates alternatives: <span className="mono">temporal,vercel</span> returns
        everything matching either.
      </p>

      <form
        onSubmit={(e) => e.preventDefault()}
        style={{ marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 320px",
            minWidth: 240,
          }}
        >
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-dim)",
              pointerEvents: "none",
            }}
          />
          <input
            autoFocus
            type="text"
            value={qParam}
            onChange={(e) => setQParam(e.target.value)}
            placeholder="Search components, vendors, examples (comma = OR)…"
            style={{
              width: "100%",
              padding: "9px 12px 9px 30px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>
        {qParam && (
          <button
            type="button"
            onClick={() => setQParam("")}
            style={{
              padding: "9px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-dim)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </form>

      {loading && (
        <p style={{ color: "var(--text-dim)", fontSize: 13 }}>Loading indexes…</p>
      )}
      {error && (
        <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>
      )}

      {!loading && !error && !hasQuery && (
        <div
          style={{
            padding: 20,
            border: "1px dashed var(--border)",
            borderRadius: 10,
            color: "var(--text-dim)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: "0 0 8px" }}>Try one of these compound searches:</p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              <Link to="/search?q=temporal,vercel" style={{ color: "var(--cyan)" }}>temporal,vercel</Link>
              {" "}— Dagster orchestrating durable workflows + edge deploys / AI Gateway
            </li>
            <li>
              <Link to="/search?q=snowflake,databricks" style={{ color: "var(--cyan)" }}>snowflake,databricks</Link>
              {" "}— warehouse + lakehouse in one view
            </li>
            <li>
              <Link to="/search?q=argo,temporal" style={{ color: "var(--cyan)" }}>argo,temporal</Link>
              {" "}— every workflow-engine integration
            </li>
          </ul>
        </div>
      )}

      {!loading && !error && hasQuery && (
        <>
          <SearchPanel
            title="Components"
            count={componentHits.length}
            emptyLabel="No components match."
            allHref={`/?q=${encodeURIComponent(qParam)}`}
            allLabel="Open in the full catalog"
          >
            {componentHits.slice(0, PANEL_LIMIT).map((c) => {
              const id = componentId(c);
              return (
                <li key={id} style={{ padding: "6px 0" }}>
                  <Link
                    to={`/c/${encodeURIComponent(id)}`}
                    style={{ color: "var(--cyan)", fontWeight: 600 }}
                  >
                    {componentDisplayName(c, null)}
                  </Link>
                  {c.vendor && (
                    <span style={{ color: "var(--text-dim)", marginLeft: 8, fontSize: 12 }}>
                      {c.vendor}
                    </span>
                  )}
                  {c.description && (
                    <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 2 }}>
                      {c.description}
                    </div>
                  )}
                </li>
              );
            })}
          </SearchPanel>

          <SearchPanel
            title="Vendors"
            count={vendorHits.length}
            emptyLabel="No vendor landing pages match."
            allHref={`/vendors?q=${encodeURIComponent(qParam)}`}
            allLabel="Open in vendors index"
          >
            {vendorHits.slice(0, PANEL_LIMIT).map((v) => (
              <li key={v.slug} style={{ padding: "6px 0" }}>
                <Link
                  to={`/vendors/${encodeURIComponent(v.slug)}`}
                  style={{ color: "var(--cyan)", fontWeight: 600 }}
                >
                  {v.title}
                </Link>
              </li>
            ))}
          </SearchPanel>

          <SearchPanel
            title="Examples"
            count={exampleHits.length}
            emptyLabel="No walkthroughs match."
            allHref={`/examples?q=${encodeURIComponent(qParam)}`}
            allLabel="Open in examples index"
          >
            {exampleHits.slice(0, PANEL_LIMIT).map((ex) => (
              <li key={ex.slug} style={{ padding: "6px 0" }}>
                <Link
                  to={`/examples/${encodeURIComponent(ex.slug)}`}
                  style={{ color: "var(--cyan)", fontWeight: 600 }}
                >
                  {ex.title}
                </Link>
              </li>
            ))}
          </SearchPanel>
        </>
      )}
    </div>
  );
}

function SearchPanel({
  title,
  count,
  emptyLabel,
  allHref,
  allLabel,
  children,
}: {
  title: string;
  count: number;
  emptyLabel: string;
  allHref: string;
  allLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        marginBottom: 28,
        padding: 16,
        border: "1px solid var(--border)",
        borderRadius: 10,
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
          {title}
          <span
            style={{
              marginLeft: 10,
              padding: "1px 8px",
              borderRadius: 999,
              background: "var(--surface-2, rgba(255,255,255,0.06))",
              color: "var(--text-dim)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {count}
          </span>
        </h2>
        {count > 0 && (
          <Link
            to={allHref}
            style={{ color: "var(--cyan)", fontSize: 12, textDecoration: "none" }}
          >
            {allLabel} →
          </Link>
        )}
      </div>
      {count === 0 ? (
        <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 13 }}>{emptyLabel}</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>{children}</ul>
      )}
    </section>
  );
}
