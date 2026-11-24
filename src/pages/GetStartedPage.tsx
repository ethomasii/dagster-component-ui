import { Link } from "react-router-dom";
import { CopyButton } from "../components/CopyButton";
import { PageEyebrow } from "../components/PageEyebrow";
import { PageHeroBand } from "../components/PageHeroBand";
import {
  INSTALL_PYPI_NOTE,
  INSTALL_VERSION_NOTE,
  pipInstallDagsterCore,
  CLI_HOME_PLACEHOLDER_COMPONENT_ID,
  canonicalInstallSnippet,
  CLI_QUICK_REFERENCE_LINES,
  COMMUNITY_CLI_README_WEB,
  COMMUNITY_CLI_VALUE_PROP,
  UVX_ALTERNATIVE_PIP_CLI,
  UVX_REQUIRES_UV_EXPLAINER,
  UV_INSTALL_DOCS,
  UV_INSTALL_SHELL,
} from "../lib/registryRequirements";

export function GetStartedPage() {
  return (
    <>
      <PageHeroBand>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 36px" }}>
          <PageEyebrow light>Install &amp; CLI</PageEyebrow>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              margin: "0 0 16px",
              lineHeight: 1.15,
              color: "#fff",
            }}
          >
            Get started with the component CLI
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "0 0 12px", lineHeight: 1.65 }}>
            Install <span className="mono" style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}>dagster-community-components-cli</span> from PyPI (or run via{" "}
            <span className="mono" style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}>uvx</span> without pip-installing the CLI, but <strong style={{ color: "#fff" }}>uvx requires uv</strong>; see
            prerequisites below). From your Dagster code-location root, <span className="mono" style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}>dagster-component add</span>{" "}
            copies a template and installs its declared pip dependencies. You still need{" "}
            <span className="mono" style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}>dagster</span> in the environment for your project. On each template page in this registry,
            the copy button uses that template&apos;s id instead of{" "}
            <code className="mono" style={{ fontSize: 13, background: "rgba(255,255,255,0.14)", color: "#fff" }}>{CLI_HOME_PLACEHOLDER_COMPONENT_ID}</code>.
          </p>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "0 0 20px", lineHeight: 1.65 }}>
            {COMMUNITY_CLI_VALUE_PROP}{" "}
            <a href={COMMUNITY_CLI_README_WEB} target="_blank" rel="noreferrer" style={{ color: "#67e8f9" }}>
              Full command reference (CLI README on GitHub)
            </a>
            .
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.55 }}>
            Using <Link to="/ai-assistants" style={{ color: "#67e8f9" }}>Claude, Cursor, or Copilot</Link>? From your project
            root run{" "}
            <span className="mono" style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}>uvx --from dagster-community-components-cli dagster-component init</span> so assistants prefer
            real catalog commands over inventing YAML. See the{" "}
            <Link to="/ai-assistants" style={{ color: "#67e8f9" }}>
              AI assistants
            </Link>{" "}
            page for details.
          </p>
        </div>
      </PageHeroBand>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 64px" }}>
      <h2
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "var(--text-dim)",
          margin: "0 0 10px",
        }}
      >
        Prerequisites
      </h2>
      <div
        className="callout-help"
        style={{ marginBottom: 16, borderLeftColor: "var(--cyan)", fontSize: 14, lineHeight: 1.6, color: "var(--text-muted)" }}
      >
        <p style={{ margin: "0 0 10px" }}>
          <strong style={{ color: "var(--text)" }}>uv</strong> — {UVX_REQUIRES_UV_EXPLAINER} {UVX_ALTERNATIVE_PIP_CLI}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-dim)" }}>
          Quick install (macOS / Linux):{" "}
          <code className="mono" style={{ fontSize: 11 }}>{UV_INSTALL_SHELL}</code>
          {" · "}
          <a href={UV_INSTALL_DOCS} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
            uv installation (all platforms)
          </a>
        </p>
      </div>

      <h2
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "var(--text-dim)",
          margin: "0 0 8px",
        }}
      >
        Prerequisite — Dagster runtime
      </h2>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          width: "100%",
          marginBottom: 22,
        }}
      >
        <code className="mono" style={{ fontSize: 13, color: "var(--text-muted)", flex: "1 1 200px" }}>
          {pipInstallDagsterCore()}
        </code>
        <CopyButton text={pipInstallDagsterCore()} label="Copy" />
      </div>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 22px", lineHeight: 1.55 }}>
        {INSTALL_PYPI_NOTE} {INSTALL_VERSION_NOTE}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          width: "100%",
          marginBottom: 18,
        }}
      >
        <code
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            flex: "1 1 280px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {canonicalInstallSnippet(CLI_HOME_PLACEHOLDER_COMPONENT_ID)}
        </code>
        <CopyButton text={canonicalInstallSnippet(CLI_HOME_PLACEHOLDER_COMPONENT_ID)} label="Copy" />
      </div>

      <div
        style={{
          padding: "14px 16px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          marginBottom: 18,
        }}
      >
        <h2
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            margin: "0 0 12px",
          }}
        >
          Quick reference
        </h2>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
          {CLI_QUICK_REFERENCE_LINES.map((row) => (
            <li key={row.command}>
              <code
                className="mono"
                style={{
                  fontSize: 12,
                  display: "block",
                  color: "var(--cyan)",
                  marginBottom: 4,
                  wordBreak: "break-word",
                }}
              >
                {row.command}
              </code>
              <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>{row.note}</span>
            </li>
          ))}
        </ul>
      </div>
      </div>
    </>
  );
}
