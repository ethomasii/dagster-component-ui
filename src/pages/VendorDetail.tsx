import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
import { useCatalog } from "../context/CatalogContext";
import {
  fetchVendorMarkdown,
  markdownFirstH1,
  stripMarkdownFirstH1,
} from "../lib/loadVendors";
import {
  linkifyCatalogMarkdown,
  rewriteGitHubComponentUrls,
  rewritePublishedRegistryComponentUrls,
} from "../lib/linkifyCatalogMarkdown";

export function VendorDetail() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const slug = rawSlug ? decodeURIComponent(rawSlug) : "";
  const { components } = useCatalog();

  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [md, setMd] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const titleFromDoc = md ? markdownFirstH1(md) : null;
  const displayTitle = titleFromDoc ?? slug;
  const bodyMd = md ? (titleFromDoc ? stripMarkdownFirstH1(md) : md) : "";

  const linkedMd = useMemo(() => {
    if (!bodyMd || !components.length) return bodyMd;
    const s = rewriteGitHubComponentUrls(bodyMd);
    return rewritePublishedRegistryComponentUrls(linkifyCatalogMarkdown(s, components));
  }, [bodyMd, components]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setMd(null);
    setResolvedUrl("");
    (async () => {
      try {
        const { sourceUrl, text } = await fetchVendorMarkdown(slug);
        if (!cancelled) {
          setResolvedUrl(sourceUrl);
          setMd(text);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not load vendor page";
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
    return <p style={{ padding: 48 }}>Missing vendor slug.</p>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" }}>
      <p style={{ margin: "0 0 8px" }}>
        <Link to="/vendors" style={{ fontSize: 14, color: "var(--cyan)", textDecoration: "none" }}>
          ← Vendors index
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
        Loads&nbsp;
        <code className="mono" style={{ fontSize: 12 }}>
          vendors/{slug}.md
        </code>
        &nbsp;first, then&nbsp;
        <code className="mono" style={{ fontSize: 12 }}>
          vendors/{slug}/README.md
        </code>
        &nbsp;from the templates repo.
      </p>

      {resolvedUrl ? (
        <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 16px" }}>
          <a href={resolvedUrl} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
            Open loaded file (raw GitHub URL)
          </a>
        </p>
      ) : null}

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading vendor page…</p>}
      {err && !loading && (
        <div className="callout-help" style={{ borderLeftColor: "var(--error)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Could not load this vendor page</p>
          <p style={{ margin: "10px 0 0", color: "var(--text-muted)" }}>{err}</p>
          <p style={{ margin: "14px 0 0", fontSize: 14 }}>
            <Link to="/vendors" style={{ color: "var(--cyan)" }}>
              Back to vendors
            </Link>
          </p>
        </div>
      )}
      {linkedMd && linkedMd.length > 0 && !err && <ExamplesMarkdown>{linkedMd}</ExamplesMarkdown>}
    </div>
  );
}
