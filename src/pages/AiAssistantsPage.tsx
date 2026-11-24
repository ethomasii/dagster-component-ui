import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyButton } from "../components/CopyButton";
import { COMMUNITY_CLI_README_WEB, CLI_QUICK_COMMANDS_UVX_PREAMBLE } from "../lib/registryRequirements";
import { useCatalog } from "../context/CatalogContext";
import { PageEyebrow } from "../components/PageEyebrow";
import { PageHeroBand } from "../components/PageHeroBand";

const DEFAULT_PUBLIC_ORIGIN = "https://dagster-component-ui.vercel.app";

/** Single line shown once in the hero — no leading `$`. */
const INIT_UVX_LINE =
  "uvx --from dagster-community-components-cli dagster-component init";

const sectionH2: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: "var(--text)",
  margin: "36px 0 14px",
  letterSpacing: "-0.02em",
};

const toolH3: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text)",
  margin: "20px 0 8px",
};

const mutedP: React.CSSProperties = {
  fontSize: 15,
  color: "var(--text-muted)",
  lineHeight: 1.65,
  margin: "0 0 12px",
};

const listStyle: React.CSSProperties = {
  margin: "0 0 12px",
  paddingLeft: 20,
  color: "var(--text-muted)",
  lineHeight: 1.65,
  fontSize: 15,
};

const promptBox: React.CSSProperties = {
  marginTop: 10,
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg-elevated)",
  fontSize: 13,
  color: "var(--text-muted)",
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
};

function ExamplePrompt({ text, label }: { text: string; label: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dim)" }}>{label}</span>
        <CopyButton text={text.trim()} label="Copy prompt" />
      </div>
      <div style={promptBox}>{text.trim()}</div>
    </div>
  );
}

export function AiAssistantsPage() {
  const { catalogTotal } = useCatalog();
  const [origin, setOrigin] = useState(DEFAULT_PUBLIC_ORIGIN);
  const [promptsOpen, setPromptsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const registryRoot = origin.replace(/\/$/, "");
  const countPhrase =
    catalogTotal > 0
      ? `about ${catalogTotal.toLocaleString()} components`
      : "about 470 components";

  const discoveryPrompt = `
You are helping in a Dagster repo that uses the community component catalog at ${registryRoot}.

Rules:
- Do not invent component folder names or ids. Use only ids from that registry or from \`dagster-component search\` / \`info\` (via \`uvx --from dagster-community-components-cli dagster-component …\`, or plain \`dagster-component\` if installed globally).
- To add a template, the user runs \`dagster-component add <id>\` the same way from the project root (see Get Started on the site).

Task: They want to ingest from a REST API. Search conceptually (I'll run commands—or you suggest the exact search term), then output:
1) The best-matching catalog id
2) The exact add command line (uvx or global, matching their setup)
3) A short plan to run \`dagster-component schema <id>\` before writing YAML
`.trim();

  const yamlPrompt = `
Here is the output of \`dagster-component schema rest_api_fetcher\` (via uvx or a global CLI install — I will paste it in the next message).

Generate a minimal \`example.yaml\` for dev only. Use only attribute keys from the schema. If something is required and unknown, use a placeholder and list it explicitly.
`.trim();

  return (
    <>
      <PageHeroBand>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 32px" }}>
          <PageEyebrow light>AI assistants</PageEyebrow>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 4.2vw, 2.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              margin: "0 0 12px",
              lineHeight: 1.2,
              color: "#fff",
            }}
          >
            Use with Claude, Cursor, or Copilot
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: 0, lineHeight: 1.65 }}>
            Point your coding assistant at this registry and the <span className="mono" style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}>dagster-component</span> CLI so it uses
            real template ids and workflows instead of inventing YAML. The one-step setup is below.
          </p>
        </div>
      </PageHeroBand>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 64px" }}>

      {/* Section 1 — TL;DR hero */}
      <section
        style={{
          padding: "28px 26px 32px",
          borderRadius: 14,
          border: "1px solid var(--border)",
          borderLeft: "4px solid var(--cyan)",
          background: "var(--bg-card)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)",
        }}
      >
        <p style={{ ...mutedP, fontSize: 16, marginBottom: 14 }}>
          One command. From your Dagster project root:
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 12,
            padding: "16px 18px",
            borderRadius: 10,
            background: "var(--code-bg)",
            border: "1px solid var(--border)",
            marginBottom: 20,
          }}
        >
          <code
            className="mono"
            style={{
              fontSize: 14,
              color: "var(--text)",
              flex: "1 1 240px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {INIT_UVX_LINE}
          </code>
          <CopyButton text={INIT_UVX_LINE} label="Copy" />
        </div>
        <p style={{ ...mutedP, fontSize: 15, marginBottom: 16 }}>
          Prefer a global install? After{" "}
          <Link to="/get-started" style={{ color: "var(--cyan)" }}>
            Get started
          </Link>
          , run <span className="mono">dagster-component init</span> the same way.
        </p>
        <p style={{ ...mutedP, fontSize: 16, marginBottom: 16 }}>
          Writes <span className="mono">CLAUDE.md</span>, <span className="mono">.cursorrules</span>, and{" "}
          <span className="mono">.github/copilot-instructions.md</span> into your repo. <strong style={{ color: "var(--text)" }}>Commit them.</strong> Your AI assistants read them automatically — no
          plugin, MCP server, or settings to configure.
        </p>
        <p style={{ ...mutedP, fontSize: 16, margin: 0 }}>
          <strong style={{ color: "var(--text)" }}>What it teaches them:</strong> {countPhrase}, the{" "}
          <span className="mono">search</span> / <span className="mono">info</span> / <span className="mono">schema</span> /{" "}
          <span className="mono">add</span> workflow, when to suggest a community component versus writing custom code, and how to
          generate YAML using the schema-aware autocomplete the CLI sets up.
        </p>
        <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "18px 0 0", lineHeight: 1.5 }}>
          Exact filenames can change with the CLI—see the{" "}
          <a href={COMMUNITY_CLI_README_WEB} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
            CLI README
          </a>
          .
        </p>
      </section>

      {/* Section 2 — How each tool picks it up */}
      <h2 style={sectionH2}>How each tool picks it up</h2>

      <h3 style={toolH3}>Anthropic Claude (Claude Code &amp; claude.ai)</h3>
      <p style={mutedP}>
        Claude Code reads <span className="mono">CLAUDE.md</span> at the repo root automatically — <span className="mono">init</span> already
        wrote it. No further setup.
      </p>
      <p style={mutedP}>
        For claude.ai chat / Projects, the repo files are not auto-loaded: paste the contents of{" "}
        <span className="mono">CLAUDE.md</span> into a Project instruction.
      </p>

      <h3 style={toolH3}>Cursor</h3>
      <p style={mutedP}>
        Reads <span className="mono">.cursorrules</span> automatically in Chat and Composer.
      </p>

      <h3 style={toolH3}>GitHub Copilot</h3>
      <p style={mutedP}>
        Reads <span className="mono">.github/copilot-instructions.md</span> when the file is on your default branch. Commit
        and push so Copilot sees it.
      </p>

      <p style={{ ...mutedP, marginBottom: 0 }}>
        <strong style={{ color: "var(--text)" }}>Other assistants (same pattern):</strong> Windsurf, JetBrains AI,
        Continue, Aider — paste the contents of <span className="mono">CLAUDE.md</span> (or any of the three files — they&apos;re
        equivalent) into a project instruction or system prompt. Same content, same effect.
      </p>

      {/* Section 3 — Reference prompts (disclosure) */}
      <h2 style={sectionH2}>Reference prompts</h2>
      <button
        type="button"
        onClick={() => setPromptsOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          color: "var(--cyan)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {promptsOpen ? "▼ Hide prompts" : "▶ Show prompts"}
      </button>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "10px 0 0", lineHeight: 1.5 }}>
        Optional copy-paste starters; adapt the wording for your assistant. Registry URL uses{" "}
        <span className="mono">{registryRoot}</span> from this tab.
      </p>
      {promptsOpen && (
        <div style={{ marginTop: 20 }}>
          <ExamplePrompt label="Discovery + add" text={discoveryPrompt} />
          <ExamplePrompt label="YAML from schema" text={yamlPrompt} />
        </div>
      )}

      {/* Section 4 — Quick commands */}
      <h2 style={{ ...sectionH2, marginTop: promptsOpen ? 28 : 32 }}>Quick commands recap</h2>
      <p style={{ ...mutedP, marginBottom: 12 }}>{CLI_QUICK_COMMANDS_UVX_PREAMBLE}</p>
      <ul style={{ ...listStyle, marginBottom: 24 }}>
        <li>
          <span className="mono">dagster-component search &lt;query&gt;</span> — find ids by keyword
        </li>
        <li>
          <span className="mono">dagster-component info &lt;id&gt;</span> — URLs and metadata
        </li>
        <li>
          <span className="mono">dagster-component schema &lt;id&gt;</span> — YAML keys for prompts
        </li>
        <li>
          <span className="mono">dagster-component add &lt;id&gt;</span> — install template into the project
        </li>
      </ul>

      <p style={{ fontSize: 14, color: "var(--text-dim)", margin: 0, lineHeight: 1.55 }}>
        <Link to="/get-started" style={{ color: "var(--cyan)" }}>
          CLI install &amp; quick reference
        </Link>
        {" · "}
        <Link to="/examples" style={{ color: "var(--cyan)" }}>
          Examples
        </Link>
      </p>
      </div>
    </>
  );
}
