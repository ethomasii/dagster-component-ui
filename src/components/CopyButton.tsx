import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      window.setTimeout(() => setOk(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        color: "var(--text-muted)",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {ok ? <Check size={14} /> : <Copy size={14} />}
      {ok ? "Copied" : label}
    </button>
  );
}
