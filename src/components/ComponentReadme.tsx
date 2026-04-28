import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { url: string };

/**
 * Fetches raw README.md and renders it with the same Markdown styles as {@link DocViewerModal}.
 */
export function ComponentReadme({ url }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!cancelled) setContent(text);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Could not load README");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>Loading README…</p>
    );
  }
  if (error) {
    return (
      <p style={{ margin: 0, fontSize: 14, color: "var(--error)" }}>
        {error}{" "}
        <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
          Open README URL
        </a>
      </p>
    );
  }
  if (content == null) return null;

  return (
    <div className="doc-viewer-markdown" style={{ fontSize: 15 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...rest }) => (
            <a href={href} target="_blank" rel="noreferrer" {...rest}>
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
