import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
import { VENDORS_INDEX_README_URL, VENDORS_TREE_WEB } from "../data/vendorsCatalog";
import { useCatalog } from "../context/CatalogContext";
import { filterVendorsReadmeByQuery } from "../lib/vendorsSearch";
import {
  linkifyCatalogMarkdown,
  rewriteGitHubComponentUrls,
  rewritePublishedRegistryComponentUrls,
} from "../lib/linkifyCatalogMarkdown";
import {
  fetchVendorsIndexReadmeCached,
  rewriteVendorsIndexLinks,
} from "../lib/loadVendors";
import { PageEyebrow } from "../components/PageEyebrow";
import { PageHeroBand } from "../components/PageHeroBand";

export function VendorsIndex() {
  const { components } = useCatalog();
  const [params, setParams] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const [readme, setReadme] = useState<string | null>(null);
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
        const raw = await fetchVendorsIndexReadmeCached();
        const linked = rewriteVendorsIndexLinks(raw);
        if (!cancelled) setReadme(linked);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load vendors");
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
    const s = rewriteGitHubComponentUrls(readme);
    return rewritePublishedRegistryComponentUrls(linkifyCatalogMarkdown(s, components));
  }, [readme, components]);

  const displayReadme = useMemo(() => {
    if (!linkedReadme) return null;
    const t = qParam.trim();
    if (!t) return linkedReadme;
    return filterVendorsReadmeByQuery(linkedReadme, t);
  }, [linkedReadme, qParam]);

  return (
    <>
      <PageHeroBand>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 24px 36px" }}>
          <PageEyebrow light>Vendors</PageEyebrow>
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
            Browse by vendor
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "0 0 20px", lineHeight: 1.55, maxWidth: 760 }}>
            One-stop pages for each vendor or vendor family—components, validation, walkthroughs, and connection notes.
            This index mirrors{" "}
            <a href={VENDORS_TREE_WEB} target="_blank" rel="noreferrer" style={{ color: "#67e8f9" }}>
              vendors/
            </a>{" "}
            in the templates repo (updates when that folder changes).
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
                  placeholder="Filter by vendor name, Db2, Snowflake, …"
                  aria-label="Filter vendors README"
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
            </form>
          )}
        </div>
      </PageHeroBand>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 64px" }}>
      {loading && <p style={{ color: "var(--text-muted)" }}>Loading vendors index…</p>}
      {error && (
        <div className="callout-help" style={{ marginBottom: 24, borderLeftColor: "var(--error)" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "var(--text)" }}>Could not load README</p>
          <p style={{ margin: "8px 0 0", fontSize: 14 }}>{error}</p>
          <p style={{ margin: "12px 0 0", fontSize: 13 }}>
            <a href={VENDORS_INDEX_README_URL} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
              Open README.md (raw)
            </a>
          </p>
        </div>
      )}
      {readme != null && displayReadme != null && displayReadme !== "" && (
        <ExamplesMarkdown>{displayReadme}</ExamplesMarkdown>
      )}
      {readme != null && linkedReadme != null && qParam.trim() && displayReadme === "" ? (
        <div className="callout-help" style={{ marginTop: 8 }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
            No sections contain all of those words. Try fewer keywords or{" "}
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
