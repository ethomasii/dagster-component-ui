import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { ManifestComponent } from "../types";
import { useCatalog } from "../context/CatalogContext";
import { ComponentCard } from "../components/ComponentCard";
import { componentId } from "../lib/componentId";
import { matchesQuery, sortByRelevance } from "../lib/search";
import { categoryLabel, formatDate } from "../lib/format";
import { countDistinctBrandIntegrations, newestComponents } from "../lib/catalogStats";
import {
  countTrustSignalHistogram,
  countVerificationBreakdown,
  componentMatchesTrustUrlFilter,
  normalizeTrustFilterParam,
  trustFilterHeading,
  type TrustSignalHistogram,
  type TrustUrlFilter,
} from "../lib/verification";
import { CategoryBrowseDropdown } from "../components/CategoryBrowseDropdown";
import { countExampleIndexEntries } from "../lib/examplesSearch";
import { requestOpenDccWidget } from "../lib/openDccWidget";
import { Sparkles } from "lucide-react";
import { fetchExamplesIndexReadmeCached } from "../lib/loadCommunityExamples";

const PAGE_SIZE = 48;
/** "Featured" shows the top N of the manifest's `featured: true` flagship components (~25
 *  today), not all of them — real maintainer curation, in place of the previous one-random-
 *  component-per-category grid (23+ cards, which read as arbitrary filler to browse). */
const SPOTLIGHT_COUNT = 8;

/** Link to browse manifest.json on GitHub (same repo URI as manifest `repository`). */
function manifestGithubBlobUrl(repository: string): string {
  const r = repository.replace(/\.git$/i, "").replace(/\/$/, "");
  return `${r}/blob/main/manifest.json`;
}

const QUICK_SEARCHES: { label: string; q: string }[] = [
  { label: "Databricks", q: "databricks" },
  { label: "Snowflake", q: "snowflake" },
  { label: "Postgres", q: "postgres" },
  { label: "BigQuery", q: "bigquery" },
  { label: "Kafka", q: "kafka" },
];

const USE_CASES: { slug: string; title: string; blurb: string }[] = [
  {
    slug: "ingestion",
    title: "Data ingestion",
    blurb: "Cloud storage, messaging, APIs, and databases into your warehouse.",
  },
  {
    slug: "analytics",
    title: "Analytics & BI",
    blurb: "Segmentation, attribution, experimentation, and warehouse-native analytics.",
  },
  {
    slug: "ai",
    title: "AI & ML",
    blurb: "LLMs, embeddings, LangChain, and model-adjacent enrichment assets.",
  },
  {
    slug: "sensor",
    title: "Sensors & alerts",
    blurb: "Event-driven runs, monitors, and notifications.",
  },
  {
    slug: "check",
    title: "Asset checks",
    blurb: "Validation and freshness checks wired as Dagster Components.",
  },
  {
    slug: "integration",
    title: "Platform integrations",
    blurb: "Databricks, Glue, BigQuery, ADF, and other orchestrated platforms.",
  },
  {
    slug: "infrastructure",
    title: "Infrastructure",
    blurb: "Terraform, CloudFormation, Helm, and deployment automation.",
  },
];

export function Home() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const qParam = params.get("q") ?? "";
  const catParam = params.get("category") ?? "";
  const browseAll = params.get("browse") === "all";
  const trustParam = normalizeTrustFilterParam(params.get("trust"));

  /** Discovery-first home: full catalog only after search / filter / browse-all / trust filter. */
  const explorationActive = Boolean(qParam || catParam || browseAll || trustParam);

  const {
    components,
    catalogTotal,
    manifestMeta,
    manifestFetchedAt,
    loadError,
    openSearchPalette,
    reloadCatalog,
  } = useCatalog();
  const [catalogRefreshBusy, setCatalogRefreshBusy] = useState(false);
  const [localQ, setLocalQ] = useState(qParam);
  const [dccIntent, setDccIntent] = useState("");
  const catalogResultsRef = useRef<HTMLElement | null>(null);
  const [examplesIndexCount, setExamplesIndexCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const readme = await fetchExamplesIndexReadmeCached();
        if (!cancelled) setExamplesIndexCount(countExampleIndexEntries(readme));
      } catch {
        if (!cancelled) setExamplesIndexCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCatalogNow = useCallback(async () => {
    setCatalogRefreshBusy(true);
    try {
      await reloadCatalog();
    } finally {
      setCatalogRefreshBusy(false);
    }
  }, [reloadCatalog]);

  useEffect(() => {
    setLocalQ(qParam);
  }, [qParam]);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of components) {
      const cat = c.category ?? "uncategorized";
      m.set(cat, (m.get(cat) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [components]);

  const integrationBrands = useMemo(
    () => countDistinctBrandIntegrations(components),
    [components]
  );

  const newestInCatalog = useMemo(() => newestComponents(components, 6), [components]);

  const trustBreakdown = useMemo(() => countVerificationBreakdown(components), [components]);
  const trustHistogram = useMemo(() => countTrustSignalHistogram(components), [components]);

  const popularCategorySamples = useMemo(() => {
    const byCat = new Map<string, ManifestComponent>();
    for (const c of components) {
      const cat = c.category ?? "uncategorized";
      if (!byCat.has(cat)) byCat.set(cat, c);
    }
    return byCat;
  }, [components]);

  /**
   * Real maintainer curation (`featured: true`, ~20-30 flagship components across every
   * category), not a random per-category pick -- a one-sample-per-category grid read as
   * arbitrary filler to anyone browsing it (nobody's first instinct is to click a random
   * card), so this is deliberately "the ones we'd point a new user at" instead.
   * Tiebreak order among the featured set:
   *   1. Validation level (live > smoke > other > none).
   *   2. Walkthrough exists (validation.evidence points at a demo URL).
   *   3. Newer validation.last_validated wins ties.
   *   4. Deterministic id-hash — stable render order, uncorrelated with the alphabet.
   */
  const spotlight = useMemo(() => {
    const levelWeight = (lvl?: string) =>
      lvl === "live" ? 3 : lvl === "smoke" ? 2 : lvl ? 1 : 0;
    const validatedTs = (c: ManifestComponent) => {
      const raw = c.validation?.last_validated ?? "";
      const p = raw ? Date.parse(raw) : NaN;
      return Number.isFinite(p) ? p : 0;
    };
    const idHash = (c: ManifestComponent) => {
      const id = componentId(c);
      let h = 5381;
      for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) | 0;
      return h >>> 0;
    };
    const scoreOf = (c: ManifestComponent): number[] => [
      levelWeight(c.validation?.level),
      c.validation?.evidence ? 1 : 0,
      validatedTs(c),
    ];
    return components
      .filter((c) => c.featured)
      .sort((a, b) => {
        const sa = scoreOf(a);
        const sb = scoreOf(b);
        for (let i = 0; i < sa.length; i++) {
          if (sb[i] !== sa[i]) return sb[i] - sa[i];
        }
        return idHash(a) - idHash(b);
      });
  }, [components]);

  const filtered = useMemo(() => {
    let list = components;
    if (catParam) list = list.filter((c) => c.category === catParam);
    list = list.filter((c) => componentMatchesTrustUrlFilter(c, trustParam));
    list = list.filter((c) => matchesQuery(c, qParam));
    return sortByRelevance(list, qParam);
  }, [components, catParam, qParam, trustParam]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [qParam, catParam, browseAll, trustParam]);

  useEffect(() => {
    if (!explorationActive) return;
    const id = requestAnimationFrame(() => {
      catalogResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [explorationActive, qParam, catParam, browseAll, trustParam]);

  const visiblePage = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );
  const hasMore = visibleCount < filtered.length;

  const onSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const next = new URLSearchParams(params);
      if (localQ) next.set("q", localQ);
      else next.delete("q");
      next.delete("browse");
      setParams(next);
    },
    [localQ, params, setParams]
  );

  const setCategory = useCallback(
    (cat: string) => {
      const next = new URLSearchParams(params);
      if (cat) next.set("category", cat);
      else next.delete("category");
      next.delete("browse");
      setParams(next);
    },
    [params, setParams]
  );

  const setBrowseAll = useCallback(() => {
    const next = new URLSearchParams(params);
    next.set("browse", "all");
    next.delete("category");
    next.delete("q");
    next.delete("trust");
    setLocalQ("");
    setParams(next);
  }, [params, setParams]);

  const runQuickSearch = useCallback(
    (term: string) => {
      const next = new URLSearchParams(params);
      next.set("q", term);
      next.delete("browse");
      next.delete("trust");
      setLocalQ(term);
      setParams(next);
    },
    [params, setParams]
  );

  const setTrustFilter = useCallback(
    (nextTrust: TrustUrlFilter) => {
      const next = new URLSearchParams(params);
      if (!nextTrust) next.delete("trust");
      else next.set("trust", nextTrust);
      setParams(next);
    },
    [params, setParams]
  );

  if (loadError) {
    return (
      <div style={{ maxWidth: 480, margin: "64px auto", padding: "0 24px", textAlign: "center" }}>
        <div className="callout-help" style={{ borderLeftColor: "var(--error)", textAlign: "left" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600, color: "var(--text)" }}>Could not load catalog</p>
          <p style={{ margin: 0 }}>{loadError}</p>
          <p style={{ margin: "12px 0 0", fontSize: 13 }}>
            Ensure <span className="mono">manifest.json</span> is in <span className="mono">public/</span> and the dev
            server is running.
          </p>
        </div>
      </div>
    );
  }

  const total = components.length;
  const catCount = categoryCounts.length;

  const catalogExploration = explorationActive ? (
    <section
      ref={catalogResultsRef}
      id="catalog-results"
      style={{ maxWidth: 1200, margin: "0 auto", padding: "4px 24px 32px" }}
      aria-label="Filtered component templates"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--cyan)",
              display: "block",
              marginBottom: 2,
            }}
          >
            Results
          </span>
          {explorationSectionTitle(browseAll, catParam, qParam, trustParam)}
          <span style={{ fontWeight: 500, color: "var(--text-muted)", fontSize: 14 }}>
            {" "}
            ({filtered.length}
            {filtered.length !== total ? ` of ${total}` : ""})
          </span>
        </h2>
        <button
          type="button"
          onClick={() => {
            setLocalQ("");
            setParams(new URLSearchParams());
          }}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Back to discovery
        </button>
      </div>
      {(qParam || trustParam) && (
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 12,
            marginTop: -4,
            marginBottom: 10,
            lineHeight: 1.45,
          }}
        >
          {qParam ? (
            <>
              Matching <span className="mono">{qParam}</span>
            </>
          ) : null}
          {qParam && trustParam ? " · " : null}
          {trustParam ? (
            <>
              Trust: <strong style={{ color: "var(--text)" }}>{trustFilterHeading(trustParam)}</strong>
              {" — "}
              <button
                type="button"
                onClick={() => setTrustFilter("")}
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
                Clear trust filter
              </button>
            </>
          ) : null}
        </p>
      )}
      {!total ? (
        <p style={{ color: "var(--text-muted)" }}>Loading catalog…</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {visiblePage.map((c) => (
              <ComponentCard key={componentId(c)} c={c} />
            ))}
          </div>
          {hasMore && (
            <div style={{ marginTop: 28, textAlign: "center" }}>
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                style={{
                  padding: "12px 28px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  color: "var(--text)",
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                Load more ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  ) : null;

  return (
    <>
      <div
        style={
          explorationActive
            ? undefined
            : {
                background:
                  "radial-gradient(ellipse 1100px 480px at 50% -15%, var(--accent-glow), transparent 70%), " +
                  "linear-gradient(180deg, var(--accent-wash, rgba(124, 58, 237, 0.05)) 0%, transparent 65%)",
              }
        }
      >
      <section
        style={{
          padding: explorationActive ? "12px 24px 8px" : "48px 24px 32px",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {explorationActive ? (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: "8px 16px",
                marginBottom: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--cyan)",
                  }}
                >
                  Template catalog
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 650, color: "var(--text)", lineHeight: 1.3 }}>
                  <strong>{catalogTotal || "—"}</strong> templates
                  <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>
                    {" "}
                    · {catCount} categories · {integrationBrands ?? "—"} brands
                  </span>
                </p>
              </div>
              <Link
                to="/get-started"
                style={{ color: "var(--cyan)", fontWeight: 600, fontSize: 12, textDecoration: "none", flexShrink: 0 }}
              >
                Get started →
              </Link>
            </div>
            <TrustSignalsStrip
              compact
              histogram={trustHistogram}
              trustParam={trustParam}
              onPickTrust={(next) => setTrustFilter(trustParam === next ? "" : next)}
            />
            <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div className="hero-search-field hero-search-field--compact" style={{ flex: "1 1 260px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: 16 }} aria-hidden>
                  ⌕
                </span>
                <input
                  value={localQ}
                  onChange={(e) => setLocalQ(e.target.value)}
                  placeholder="Search templates…"
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    color: "var(--text)",
                  }}
                  aria-label="Search components"
                />
                <button
                  type="button"
                  onClick={() => openSearchPalette()}
                  className="kbd"
                  title="Open quick search"
                >
                  ⌘K
                </button>
              </div>
              <button
                type="submit"
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, var(--accent) 0%, #5b21b6 100%)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Search
              </button>
            </form>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--cyan)",
                margin: "0 0 10px",
              }}
            >
              Template catalog
            </p>
            <h1
              style={{
                fontSize: "clamp(2.1rem, 5.2vw, 3.25rem)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                margin: "0 0 14px",
                lineHeight: 1.12,
                maxWidth: 920,
              }}
            >
              Find the right{" "}
              <span style={{ color: "var(--accent-bright)" }}>component templates</span> for your pipelines
            </h1>
            <p style={{ fontSize: 17, color: "var(--text-muted)", maxWidth: 680, margin: "0 0 24px" }}>
              Browse community-maintained component templates — each folder includes YAML and a{" "}
              <span className="mono">schema.json</span> you copy straight into your Dagster project.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
                maxWidth: 720,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-dim)", marginRight: 4 }}>
                Try:
              </span>
              {QUICK_SEARCHES.map(({ label, q }) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => runQuickSearch(q)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-muted)",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={onSearchSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div className="hero-search-field">
                <span style={{ color: "var(--text-dim)", fontSize: 18 }} aria-hidden>
                  ⌕
                </span>
                <input
                  value={localQ}
                  onChange={(e) => setLocalQ(e.target.value)}
                  placeholder="Search by name, tag, or integration…"
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    color: "var(--text)",
                    fontSize: 15,
                  }}
                  aria-label="Search components"
                />
                <button
                  type="button"
                  onClick={() => openSearchPalette()}
                  className="kbd"
                  title="Open quick search"
                >
                  ⌘K
                </button>
              </div>
              <button
                type="submit"
                style={{
                  padding: "12px 22px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, var(--accent) 0%, #5b21b6 100%)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                Search
              </button>
            </form>

            <div
              style={{
                marginTop: 28,
                maxWidth: 780,
                padding: "22px 24px",
                borderRadius: 16,
                border: "1px solid var(--accent-glow)",
                background:
                  "linear-gradient(135deg, rgba(124, 58, 237, 0.10) 0%, rgba(34, 211, 238, 0.05) 100%)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Sparkles size={18} style={{ color: "var(--accent-bright)" }} aria-hidden />
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
                  Not sure where to start?
                </span>
              </div>
              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
                Tell the DCC Agent what you want to build — it'll recommend real components, generate
                install commands and a <span className="mono">defs.yaml</span>, even scaffold the project.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!dccIntent.trim()) return;
                  requestOpenDccWidget(dccIntent.trim());
                }}
                style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
              >
                <input
                  value={dccIntent}
                  onChange={(e) => setDccIntent(e.target.value)}
                  placeholder="e.g. Sync Salesforce contacts into BigQuery every 6 hours…"
                  aria-label="Describe what you want to build"
                  style={{
                    flex: "1 1 320px",
                    minWidth: 0,
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text)",
                    fontSize: 15,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 20px",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg, var(--accent) 0%, #5b21b6 100%)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 15,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Sparkles size={16} aria-hidden />
                  Ask DCC
                </button>
              </form>
            </div>
          </>
        )}
      </section>
      </div>

      {explorationActive ? (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 4px" }}>
          <h2
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-dim)",
              margin: "0 0 6px",
            }}
          >
            Category
          </h2>
          <CategoryBrowseDropdown
            categoryCounts={categoryCounts}
            samplesByCategory={popularCategorySamples}
            selectedCategory={catParam}
            onSelectCategory={(slug) => setCategory(slug)}
          />
        </section>
      ) : null}

      {catalogExploration}

      {!explorationActive ? (
        <>
      {/* "At a glance" + Trust signals as one visually distinct shelf -- full-bleed band so
          the page reads as sections, not one undifferentiated scroll. */}
      <div style={{ background: "var(--bg-elevated)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            margin: "0 0 16px",
          }}
        >
          At a glance
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 14,
          }}
        >
        <StatBox value={catalogTotal ? String(catalogTotal) : "—"} label="Templates" hint="Total components" />
        <StatBox value={catCount ? String(catCount) : "—"} label="Categories" hint="Functional groups" />
        <StatBox
          value={integrationBrands ? String(integrationBrands) : "—"}
          label="Tech integrations"
          hint="Distinct branded tools (si: icons)"
        />
        <StatBox
          value={
            trustBreakdown.total
              ? `${trustBreakdown.withPositiveSignal}/${trustBreakdown.total}`
              : "—"
          }
          label="Trust signals"
          hint="Templates with a recorded positive signal — see the breakdown below"
        />
        <StatBox
          value={examplesIndexCount === null ? "—" : String(examplesIndexCount)}
          label="CLI examples"
          hint="Demos linked from the community CLI examples README (opens the examples index)"
          onClick={() => navigate("/examples")}
        />
        <StatBox
          value={manifestMeta ? formatDate(manifestMeta.last_updated) : "—"}
          label="Catalog updated"
          hint="maintainer-run manifest.json on GitHub (last_updated)"
        />
        </div>

        <div style={{ marginTop: 24 }}>
          <TrustSignalsStrip
            histogram={trustHistogram}
            trustParam={trustParam}
            onPickTrust={(next) => setTrustFilter(trustParam === next ? "" : next)}
          />
        </div>

        {manifestMeta && (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>
            Community templates, not independently tested — trust signals above show what's verified. Data from{" "}
            <a href={manifestGithubBlobUrl(manifestMeta.repo)} target="_blank" rel="noreferrer">
              manifest.json
            </a>
            {manifestFetchedAt ? (
              <>, loaded {new Date(manifestFetchedAt).toLocaleString()}</>
            ) : null}
            .{" "}
            <button
              type="button"
              disabled={catalogRefreshBusy}
              onClick={() => void refreshCatalogNow()}
              style={{
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-dim)",
                cursor: catalogRefreshBusy ? "wait" : "pointer",
              }}
            >
              {catalogRefreshBusy ? "Refreshing…" : "Reload"}
            </button>{" "}
            · Report issue on a template page to reach maintainers.
          </p>
        )}
      </section>
      </div>

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: 0 }}>
            Categories
          </h2>
          <span style={{ fontSize: 13, color: "var(--text-dim)", maxWidth: 480, textAlign: "right", lineHeight: 1.45 }}>
            Pick a manifest category (sorted by count). Opens a filterable list with icons and template totals.
          </span>
        </div>
        <CategoryBrowseDropdown
          categoryCounts={categoryCounts}
          samplesByCategory={popularCategorySamples}
          selectedCategory={catParam}
          onSelectCategory={(slug) => setCategory(slug)}
        />
      </section>

      {newestInCatalog.length > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: 0 }}>
              New in the catalog
            </h2>
            <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
              Latest entries in the manifest (often appended last)
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {newestInCatalog.map((c, i) => (
              <ComponentCard key={componentId(c) || `new-${i}`} c={c} />
            ))}
          </div>
        </section>
      )}

      {/* "Browse by use case" + "Featured" as a second distinct band, with a soft purple
          wash echoing the hero -- the featured picks are the page's other real highlight,
          so they get a bit of the same visual treatment instead of sitting flat. */}
      <div style={{ background: "linear-gradient(180deg, rgba(124, 58, 237, 0.04) 0%, rgba(124, 58, 237, 0.07) 100%)", borderTop: "1px solid var(--border)" }}>
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 0" }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 8px" }}>
          Browse by use case
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 12px", maxWidth: 720 }}>
          Curated workload shortcuts (not exhaustive); anything not listed is still under{" "}
          <strong style={{ color: "var(--text)" }}>Categories</strong> above.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {USE_CASES.map((u) => (
            <button
              key={u.slug}
              type="button"
              title={u.blurb}
              onClick={() => setCategory(u.slug)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: `1px solid ${catParam === u.slug ? "var(--accent-bright)" : "var(--border)"}`,
                background: catParam === u.slug ? "rgba(124, 58, 237, 0.18)" : "var(--bg-card)",
                color: catParam === u.slug ? "var(--text)" : "var(--text-muted)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {u.title}
            </button>
          ))}
        </div>
      </section>

      {total > 0 && (
        <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 48px" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 8px" }}>
            Featured
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 20px", maxWidth: 640 }}>
            Maintainer picks — the components we'd point a new user at first, out of {catalogTotal} total.
            Browse Categories above for everything else, or search / Browse all below.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 20,
            }}
          >
            {spotlight.slice(0, SPOTLIGHT_COUNT).map((c) => (
              <ComponentCard key={componentId(c)} c={c} />
            ))}
          </div>
          <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              onClick={setBrowseAll}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "1px solid var(--border-strong)",
                background: "var(--bg-card)",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Browse all {catalogTotal} components
            </button>
            <button
              type="button"
              onClick={() => openSearchPalette()}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, var(--accent) 0%, #5b21b6 100%)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              Quick search (⌘K)
            </button>
          </div>
        </section>
      )}
      <div style={{ height: 48 }} />
      </div>
    </>
  ) : null}
    </>
  );
}

function trustShareLabel(n: number, total: number): string {
  if (!total) return "—";
  if (!n) return "0%";
  return `${Math.round((100 * n) / total)}%`;
}

function TrustSignalsStrip({
  compact = false,
  histogram: h,
  trustParam,
  onPickTrust,
}: {
  compact?: boolean;
  histogram: TrustSignalHistogram;
  trustParam: TrustUrlFilter;
  onPickTrust: (filter: Exclude<TrustUrlFilter, "">) => void;
}) {
  const total = h.total;

  const pill = (
    filter: Exclude<TrustUrlFilter, "">,
    label: string,
    n: number,
    hint: string,
    extra?: { caution?: boolean }
  ) => {
    if (n === 0) return null;
    const active = trustParam === filter;
    const caution = extra?.caution === true;
    const fs = compact ? 11 : 13;
    const pad = compact ? "3px 8px" : "5px 11px";
    const pctFs = compact ? 9 : 11;
    return (
      <button
        key={filter}
        type="button"
        title={hint}
        onClick={() => onPickTrust(filter)}
        style={{
          padding: pad,
          borderRadius: 999,
          border: `1px solid ${
            active ? "var(--accent-bright)" : caution ? "rgba(248, 113, 113, 0.45)" : "var(--border)"
          }`,
          background: active
            ? "rgba(124, 58, 237, 0.2)"
            : caution
              ? "rgba(248, 113, 113, 0.08)"
              : "var(--bg-card)",
          color: "var(--text)",
          fontSize: fs,
          fontWeight: 500,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {label}{" "}
        <strong style={{ color: "var(--cyan)", fontWeight: 700 }}>{total ? n : "—"}</strong>
        <span style={{ color: "var(--text-dim)", fontWeight: 400, fontSize: pctFs }}> {trustShareLabel(n, total)}</span>
      </button>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        margin: compact ? "0 0 6px" : "4px 0 22px",
        paddingTop: compact ? 4 : 16,
        borderTop: compact ? "none" : "1px solid var(--border)",
      }}
    >
      {!compact ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            rowGap: 8,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--cyan)",
            }}
          >
            Trust signals
          </span>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>Manifest only · click to filter</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
            <span className="mono" style={{ color: "var(--text)" }}>
              {formatTrustHistogramSummary(total, h)}
            </span>
          </span>
        </div>
      ) : (
        <p style={{ margin: "0 0 6px", fontSize: 10, color: "var(--text-dim)", lineHeight: 1.35 }} className="mono">
          Trust (manifest): {formatTrustHistogramSummary(total, h)}
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: compact ? 5 : 8, alignItems: "center", rowGap: compact ? 5 : 8 }}>
        {pill("code", "Code OK", h.validatedCode, "validation.level code")}
        {pill("infra", "Infra OK", h.validatedInfra, "validation.level infra")}
        {pill("live", "Live OK", h.validatedLive, "validation.level live")}
        {pill("ci", "CI", h.ciSmoke, "verification.status ci_smoke")}
        {pill("manual", "Manual", h.manualSpotCheck, "verification.status manual_spot_check")}
        {pill("community", "Community", h.communityOk, "verification.status community_reported_working")}
        {pill("issue", "Known issue", h.knownIssue, "verification.status known_issue", { caution: true })}
        {pill("unverified", "Unverified", h.unverified, "No positive signal recorded")}
      </div>
    </div>
  );
}

function formatTrustHistogramSummary(total: number, h: TrustSignalHistogram): string {
  if (!total) return "Loading…";
  const validated = h.validatedCode + h.validatedInfra + h.validatedLive;
  const recorded = h.ciSmoke + h.manualSpotCheck + h.communityOk;
  return `${validated} validated · ${recorded} checked · ${h.unverified} unverified`;
}

function explorationSectionTitle(
  browseAll: boolean,
  catParam: string,
  qParam: string,
  trustParam: TrustUrlFilter
): string {
  if (catParam) {
    const base = categoryLabel(catParam);
    return trustParam ? `${base} · ${trustFilterHeading(trustParam)}` : base;
  }
  if (qParam) {
    return trustParam ? `Search results · ${trustFilterHeading(trustParam)}` : "Search results";
  }
  if (browseAll) {
    return trustParam ? `All components · ${trustFilterHeading(trustParam)}` : "All components";
  }
  if (trustParam) {
    return `${trustFilterHeading(trustParam)} templates`;
  }
  return "Components";
}

function StatBox({
  value,
  label,
  hint,
  onClick,
  pressed,
}: {
  value: string;
  label: string;
  hint: string;
  onClick?: () => void;
  pressed?: boolean;
}) {
  const boxStyle: CSSProperties = {
    padding: "18px 18px",
    borderRadius: "var(--radius)",
    border: `1px solid ${pressed ? "var(--accent-bright)" : "var(--border)"}`,
    background: pressed
      ? "linear-gradient(160deg, rgba(124, 58, 237, 0.18) 0%, rgba(34, 211, 238, 0.06) 100%)"
      : "linear-gradient(160deg, var(--bg-card) 0%, rgba(124, 58, 237, 0.06) 100%)",
    cursor: onClick ? "pointer" : undefined,
    textAlign: "left" as const,
  };

  // Full explanation lives in `title` (native tooltip on hover) rather than always-on body
  // text — Airflow's equivalent stat strip is just number + one word; the inline 1-3 line
  // explanations here were the single densest part of the old "At a glance" section.
  const inner = (
    <>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: "var(--text-muted)" }}>{label}</div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        title={hint}
        style={{ ...boxStyle, color: "var(--text)", font: "inherit" }}
      >
        {inner}
      </button>
    );
  }

  return (
    <div style={boxStyle} title={hint}>
      {inner}
    </div>
  );
}
