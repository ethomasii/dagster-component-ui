import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, X } from "lucide-react";

export type DocViewerKind = "markdown" | "json" | "text";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  url: string;
  kind: DocViewerKind;
};

export function DocViewerModal({ open, onClose, title, url, kind }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (cancelled) return;
        if (kind === "json") {
          try {
            setContent(JSON.stringify(JSON.parse(text), null, 2));
          } catch {
            setContent(text);
          }
        } else {
          setContent(text);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load document");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, url, kind]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-viewer-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        padding: "24px 16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(100%, 960px)",
          maxHeight: "min(92vh, 900px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border-strong)",
          background: "var(--bg-elevated)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <h2
            id="doc-viewer-title"
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              flex: "1 1 auto",
              minWidth: 0,
            }}
          >
            {title}
          </h2>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--cyan)",
              whiteSpace: "nowrap",
            }}
          >
            <ExternalLink size={15} strokeWidth={2} />
            Raw
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-deep)",
              color: "var(--text-muted)",
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: "20px 22px 28px",
            fontSize: 15,
            color: "var(--text)",
          }}
        >
          {loading && (
            <p style={{ margin: 0, color: "var(--text-muted)" }}>Loading…</p>
          )}
          {error && (
            <p style={{ margin: 0, color: "var(--error)" }}>
              {error}{" "}
              <a href={url} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
                Try opening the raw URL
              </a>
              .
            </p>
          )}
          {content != null && !loading && !error && kind === "markdown" && (
            <div className="doc-viewer-markdown">
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
          )}
          {content != null && !loading && !error && kind !== "markdown" && (
            <pre
              style={{
                margin: 0,
                padding: 16,
                borderRadius: 10,
                background: "var(--code-bg)",
                border: "1px solid var(--border)",
                fontSize: 13,
                lineHeight: 1.5,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <code className="mono">{content}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
