import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
import { CopyButton } from "../components/CopyButton";
import { exampleSetupScriptCurl } from "../data/examplesCatalog";
import {
  UVX_ALTERNATIVE_PIP_CLI,
  UV_INSTALL_DOCS,
} from "../lib/registryRequirements";
import { useCatalog } from "../context/CatalogContext";
import {
  extractLinkedExampleSlugs,
  fetchExampleMarkdown,
  fetchExampleTitle,
  markdownFirstH1,
  rewriteExamplesIndexLinks,
  stripMarkdownFirstH1,
} from "../lib/loadCommunityExamples";
import {
  linkifyCatalogMarkdown,
  rewriteExampleLinkTextsFromTitles,
  rewriteGitHubComponentUrls,
} from "../lib/linkifyCatalogMarkdown";

export function ExampleDetail() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const slug = rawSlug ? decodeURIComponent(rawSlug) : "";
  const { components } = useCatalog();

  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [md, setMd] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runCmd = useMemo(() => (slug ? exampleSetupScriptCurl(slug) : ""), [slug]);

  const titleFromDoc = md ? markdownFirstH1(md) : null;
  const displayTitle = titleFromDoc ?? slug;
  const bodyMd = md
    ? titleFromDoc
      ? stripMarkdownFirstH1(md)
      : md
    : "";

  const [exampleTitles, setExampleTitles] = useState<Record<string, string | null>>({});

  // Prefetch H1 titles for any walkthroughs linked from this page. The
  // rewriter uses them to replace filename-y display text
  // (`[foo.md](foo.md)`) with the target's real H1. Missing titles just
  // leave the link alone; next render fills in as fetches resolve.
  useEffect(() => {
    if (!bodyMd) return;
    const slugs = extractLinkedExampleSlugs(bodyMd);
    const missing = slugs.filter((s) => !(s in exampleTitles));
    if (!missing.length) return;
    let cancelled = false;
    Promise.all(missing.map(async (s) => [s, await fetchExampleTitle(s)] as const)).then(
      (pairs) => {
        if (cancelled) return;
        setExampleTitles((prev) => {
          const next = { ...prev };
          for (const [s, t] of pairs) next[s] = t;
          return next;
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [bodyMd, exampleTitles]);

  const linkedMd = useMemo(() => {
    if (!bodyMd) return bodyMd;
    // 1. Replace filename-y display text on `[foo.md](foo.md)` links with
    //    the target walkthrough's real H1. Runs BEFORE URL rewriting so the
    //    matcher can still see the `.md` links.
    let s = rewriteExampleLinkTextsFromTitles(bodyMd, exampleTitles);
    // 2. Rewrite `./name.md` cross-walkthrough URLs to `/examples/name`.
    s = rewriteExamplesIndexLinks(s);
    // 3. Rewrite `github.com/.../dagster-component-templates/tree/main/<category>/<id>`
    //    links to internal `/c/<id>` pages so palette tables keep readers
    //    inside the registry UI.
    s = rewriteGitHubComponentUrls(s);
    return components.length ? linkifyCatalogMarkdown(s, components) : s;
  }, [bodyMd, components, exampleTitles]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setMd(null);
    setResolvedUrl("");
    (async () => {
      try {
        const { sourceUrl, text } = await fetchExampleMarkdown(slug);
        if (!cancelled) {
          setResolvedUrl(sourceUrl);
          setMd(text);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load example";
        if (!cancelled) setErr(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!slug) {
    return <p style={{ padding: 48 }}>Missing example slug.</p>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" }}>
      <p style={{ margin: "0 0 8px" }}>
        <Link to="/examples" style={{ fontSize: 14, color: "var(--cyan)", textDecoration: "none" }}>
          ← Examples index (folder README)
        </Link>
      </p>

      <h1
        style={{
          fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          margin: "12px 0 8px",
          lineHeight: 1.2,
        }}
      >
        {loading ? slug : displayTitle}
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 20px", lineHeight: 1.45 }}>
        Resolves&nbsp;
        <code className="mono" style={{ fontSize: 12 }}>examples/{slug}/README.md</code>
        &nbsp;first, then&nbsp;
        <code className="mono" style={{ fontSize: 12 }}>examples/{slug}.md</code>
        &nbsp;— whatever exists in the repo for this slug.
      </p>

      <div
        style={{
          marginBottom: 28,
          padding: "16px 18px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)", margin: "0 0 8px" }}>Run it</p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <code
            className="mono"
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              flex: "1 1 240px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {runCmd}
          </code>
          <CopyButton text={runCmd} label="Copy" />
        </div>
        <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "12px 0 0", lineHeight: 1.45 }}>
          Runs <span className="mono">setup_{slug}_demo.sh</span> from the CLI repo when present—review before piping to
          bash like any setup script. Scripts usually call <span className="mono">uvx</span>;{" "}
          <a href={UV_INSTALL_DOCS} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
            install uv
          </a>{" "}
          first (uvx is not installed by pip or Dagster alone). {UVX_ALTERNATIVE_PIP_CLI}{" "}
          <Link to="/get-started" style={{ color: "var(--cyan)" }}>
            Get started
          </Link>
          .
        </p>
      </div>

      {resolvedUrl ? (
        <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 16px" }}>
          <a href={resolvedUrl} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
            Open loaded file (raw GitHub URL)
          </a>
        </p>
      ) : null}

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading demo README…</p>}
      {err && !loading && (
        <div className="callout-help" style={{ borderLeftColor: "var(--error)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Could not load this demo</p>
          <p style={{ margin: "10px 0 0", color: "var(--text-muted)" }}>{err}</p>
          <p style={{ margin: "14px 0 0", fontSize: 14 }}>
            <Link to="/examples" style={{ color: "var(--cyan)" }}>
              Back to examples
            </Link>
          </p>
        </div>
      )}
      {linkedMd.length > 0 && !err && <ExamplesMarkdown>{linkedMd}</ExamplesMarkdown>}
    </div>
  );
}
