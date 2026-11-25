import { Sparkles } from "lucide-react";
import { DccAgentChatPanel, useDccAgentChat } from "../components/DccAgentWidget";

/**
 * Full-page home for the DCC Agent chat — what the floating widget's
 * "pop out" button (ExternalLink icon in its header) opens in a new
 * window. Shares its chat engine with the widget (useDccAgentChat) and
 * hydrates from whatever the widget last saved to localStorage, so the
 * conversation carries over across that window boundary; from here on
 * the two run independently. Hidden from the floating widget itself
 * (see Layout.tsx) so there's never a duplicate chat UI on this route.
 */
export function DccAgentStandalonePage() {
  const chat = useDccAgentChat();

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "28px 16px 32px",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        minHeight: 480,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Sparkles size={20} color="var(--cyan)" aria-hidden />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>DCC Agent</h1>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            Popped out into its own window — recommends components, generates defs.yaml, and
            can scaffold a whole project.
          </p>
        </div>
        {chat.thread.length > 0 && (
          <button type="button" onClick={chat.reset} style={newChatButtonStyle}>
            New chat
          </button>
        )}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
          background: "var(--bg-card)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.03) inset",
          overflow: "hidden",
        }}
      >
        <DccAgentChatPanel chat={chat} />
      </div>
    </div>
  );
}

const newChatButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
};
