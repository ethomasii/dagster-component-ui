import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BookOpen,
  ExternalLink,
  FileCode2,
  FileJson,
  FileText,
  FolderGit2,
  Braces,
  ThumbsUp,
} from "lucide-react";
import type { ComponentSchema, ManifestComponent, SchemaSpec } from "../types";
import { loadManifest, loadSchemaSpec } from "../data/loadManifest";
import { categoryLabel, formatDate, formatIsoDate } from "../lib/format";
import { githubTreeUrl } from "../lib/installSnippet";
import {
  ADD_SINGLE_COMPONENT_SUMMARY,
  buildInstallBundle,
  CLI_AI_INIT_CALLOUT,
  CLI_YAML_LSP_CALLOUT,
  cliExtraCommandsForComponent,
  cliOption1Uvx,
  COMMUNITY_CLI_README_WEB,
  COMMUNITY_CLI_REPO_WEB,
  COMMUNITY_CLI_VALUE_PROP,
  COMMUNITY_INSTALLER_CALLOUT,
  COMMUNITY_INSTALLER_TEMPLATE_TREE,
  INSTALL_PYPI_NOTE,
  INSTALL_VERSION_NOTE,
  REGISTRY_DAGSTER_SPEC,
  REGISTRY_PYTHON_SPEC,
  UV_INSTALL_DOCS,
  UV_INSTALL_SHELL,
} from "../lib/registryRequirements";
import {
  buildPythonAddCommand,
  buildTigedCommand,
  githubNewIssueUrl,
  parseGithubRepo,
} from "../lib/github";
import { communityHelpfulCount, resolveVerification } from "../lib/verification";
import { componentId } from "../lib/componentId";
import { ComponentIcon } from "../components/ComponentIcon";
import { CopyButton } from "../components/CopyButton";
import { DocViewerModal, type DocViewerKind } from "../components/DocViewerModal";
import { ComponentReadme } from "../components/ComponentReadme";
import { ComponentChangeHistory } from "../components/ComponentChangeHistory";
import { VerificationBadge } from "../components/VerificationBadge";
import { PageHeroBand } from "../components/PageHeroBand";
import { FieldIoIcon } from "../components/FieldIoIcon";
import { inferAttributeFieldRole } from "../lib/schemaFieldIo";
import { componentDisplayName } from "../lib/componentDisplay";
import { effectiveTemplateUrls } from "../lib/templateUrls";
import { getCliExamplesForComponent, type CliExampleRef } from "../lib/cliExamplesComponentIndex";
import { COMMUNITY_CLI_EXAMPLES_INDEX_README_URL } from "../data/examplesCatalog";

const DAGSTER_DOC = "https://docs.dagster.io/";

export function ComponentDetail() {
  const { id: routeParam } = useParams<{ id: string }>();
  const id = routeParam ? decodeURIComponent(routeParam) : "";
  const [manifest, setManifest] = useState<ManifestComponent | null>(null);
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [catalogUpdated, setCatalogUpdated] = useState<string | null>(null);
  const [schema, setSchema] = useState<ComponentSchema | null>(null);
  const [spec, setSpec] = useState<SchemaSpec | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [depsExpanded, setDepsExpanded] = useState(false);
  const [setupExpanded, setSetupExpanded] = useState(false);
  const [docViewer, setDocViewer] = useState<{
    title: string;
    url: string;
    kind: DocViewerKind;
  } | null>(null);
  const [cliDemos, setCliDemos] = useState<CliExampleRef[] | null>(null);
  const [cliDemosError, setCliDemosError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setSchema(null);
      setSchemaError(null);
      try {
        const [m, sp] = await Promise.all([loadManifest(), loadSchemaSpec()]);
        if (cancelled) return;
        setSpec(sp);
        setCatalogUpdated(m.last_updated);
        setRepoUrl(m.repository);
        const c = m.components.find((x) => componentId(x) === id);
        setManifest(c ?? null);

        const urls = effectiveTemplateUrls(c ?? null, m.repository);
        const schemaFetchUrl = urls.schema_url ?? c?.schema_url;
        if (!c || !schemaFetchUrl?.trim()) {
          if (!cancelled) setLoading(false);
          return;
        }
        const res = await fetch(schemaFetchUrl.trim());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ComponentSchema;
        if (!cancelled) setSchema(json);
      } catch (e) {
        if (!cancelled)
          setSchemaError(e instanceof Error ? e.message : "Could not load schema.json");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setCliDemos(null);
    setCliDemosError(null);
    if (!id.trim()) {
      setCliDemos([]);
      return;
    }
    getCliExamplesForComponent(id)
      .then((refs) => {
        if (!cancelled) setCliDemos(refs);
      })
      .catch((e) => {
        if (!cancelled) {
          setCliDemosError(e instanceof Error ? e.message : "Could not load examples index");
          setCliDemos([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const connector = manifest && spec?.connectors?.byCategory?.[manifest.category];
  const attrs = schema?.attributes ? Object.entries(schema.attributes) : [];
  const pipList = manifest?.dependencies?.pip ?? [];
  const templateUrls = useMemo(
    () => effectiveTemplateUrls(manifest, repoUrl),
    [manifest, repoUrl]
  );

  const displayTitle = useMemo(
    () => componentDisplayName(manifest, schema),
    [manifest, schema]
  );

  const installBundle = useMemo(
    () =>
      buildInstallBundle(pipList.length ? pipList : undefined, {
        componentPath: manifest?.path,
        hasRequirementsFile: Boolean(templateUrls.requirements_url ?? manifest?.requirements_url),
      }),
    [
      pipList.join("\n"),
      manifest?.path,
      manifest?.requirements_url,
      templateUrls.requirements_url,
    ]
  );

  const browseUrl =
    manifest && repoUrl ? githubTreeUrl(repoUrl, manifest.path) : "";

  const ghParsed = useMemo(() => parseGithubRepo(repoUrl), [repoUrl]);

  const cid = useMemo(() => (manifest ? componentId(manifest) : ""), [manifest]);

  const cliUvx = useMemo(() => cliOption1Uvx(cid), [cid]);
  const cliExtras = useMemo(() => (cid ? cliExtraCommandsForComponent(cid) : []), [cid]);

  const easyAdd = useMemo(() => {
    if (!manifest || !ghParsed) return null;
    const tiged = buildTigedCommand(
      ghParsed.owner,
      ghParsed.repo,
      manifest.path,
      cid
    );
    const py = buildPythonAddCommand(cid);
    const scriptUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${import.meta.env.BASE_URL}add_component.py`
        : "";
    const curlPy = scriptUrl
      ? `curl -fsSL ${scriptUrl} -o add_component.py\npython add_component.py ${cid}`
      : `${py}\n# Save add_component.py from this registry (tools/ or /add_component.py when hosted)`;
    const bundle = [
      "# Copy with Node (npx downloads only this folder from GitHub)",
      tiged,
      "",
      "# Copy with Python (download helper script, then run — no Node)",
      curlPy,
    ].join("\n");
    return { tiged, py, curlPy, bundle };
  }, [manifest, ghParsed, cid]);

  const trustDetail = useMemo(
    () => (manifest ? resolveVerification(manifest) : null),
    [manifest]
  );
  const helpfulCount = useMemo(
    () => (manifest ? communityHelpfulCount(manifest) : 0),
    [manifest]
  );
  const reportIssueUrl = useMemo(() => {
    if (!manifest || !repoUrl) return null;
    const basePath = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
    const registryPage =
      typeof window !== "undefined"
        ? `${window.location.origin}${basePath}c/${encodeURIComponent(cid)}`
        : "";
    return githubNewIssueUrl(repoUrl, {
      title: `[component] ${componentDisplayName(manifest, null)} (${cid})`,
      body: [
        `**Component:** \`${cid}\``,
        `**Path:** \`${manifest.path}\``,
        "",
        "What happened?",
        "",
        "",
        "---",
        `Registry: ${registryPage}`,
      ].join("\n"),
      labels: ["component-template"],
    });
  }, [manifest, repoUrl, cid]);

  const visiblePip = depsExpanded ? pipList : pipList.slice(0, 6);

  if (!id) {
    return <p style={{ padding: 48 }}>Missing id.</p>;
  }

  if (!loading && !manifest) {
    return (
      <div style={{ padding: "48px 24px", maxWidth: 560, margin: "0 auto" }}>
        <div className="callout-help" style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600, color: "var(--text)" }}>No matching template</p>
          <p style={{ margin: 0 }}>
            This URL does not match any component in the catalog. The list may have changed, or the link could be
            outdated.
          </p>
        </div>
        <Link to="/" style={{ fontWeight: 600 }}>
          ← Back to registry
        </Link>
      </div>
    );
  }

  return (
    <article style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 80px" }}>
      {loading && !manifest ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <>
          <PageHeroBand style={{ borderRadius: 20, padding: "24px 24px 28px", marginBottom: 28 }}>
          <nav
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.75)",
              marginBottom: 20,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
            }}
            aria-label="Breadcrumb"
          >
            <Link to="/" style={{ color: "rgba(255,255,255,0.75)" }}>
              Registry
            </Link>
            <span aria-hidden style={{ color: "rgba(255,255,255,0.4)" }}>
              /
            </span>
            {manifest && (
              <>
                <Link
                  to={`/?category=${encodeURIComponent(manifest.category)}`}
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  {categoryLabel(manifest.category)}
                </Link>
                <span aria-hidden style={{ color: "rgba(255,255,255,0.4)" }}>
                  /
                </span>
              </>
            )}
            <span style={{ color: "#fff", fontWeight: 500 }}>{displayTitle}</span>
          </nav>

          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.75)",
              marginBottom: 18,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "4px 10px",
            }}
            aria-label="Tips on this page"
          >
            <span
              style={{
                color: "rgba(255,255,255,0.55)",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Tips
            </span>
            <a href="#ecosystem-yaml" style={{ color: "#67e8f9", fontWeight: 500 }}>
              YAML + schema
            </a>
            <span style={{ color: "rgba(255,255,255,0.4)" }} aria-hidden>
              ·
            </span>
            <a href="#ecosystem-ai" style={{ color: "#67e8f9", fontWeight: 500 }}>
              AI assistants
            </a>
            <span style={{ color: "rgba(255,255,255,0.4)" }} aria-hidden>
              ·
            </span>
            <a href="#ecosystem-installer" style={{ color: "#67e8f9", fontWeight: 500 }}>
              Community installer
            </a>
          </div>

          <header style={{ marginBottom: 0 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <ComponentIcon icon={manifest?.icon} size={40} title={displayTitle} />
              </div>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span
                    title="Category"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "4px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.16)",
                      border: "1px solid rgba(255,255,255,0.28)",
                      fontSize: 12,
                      fontWeight: 650,
                      letterSpacing: "-0.02em",
                      color: "#fff",
                      flexShrink: 0,
                      maxWidth: "100%",
                    }}
                  >
                    {manifest && categoryLabel(manifest.category)}
                  </span>
                  {manifest?.version && (
                    <span
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.8)",
                      }}
                    >
                      v{manifest.version}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <h1
                    style={{
                      fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                      margin: 0,
                      letterSpacing: "-0.03em",
                      flex: "1 1 200px",
                      minWidth: 0,
                      color: "#fff",
                    }}
                  >
                    {displayTitle}
                  </h1>
                  {manifest ? <VerificationBadge c={manifest} size="md" /> : null}
                </div>
                <p className="mono" style={{ fontSize: 14, color: "#67e8f9", margin: "0 0 12px" }}>
                  {cid}
                </p>
                <p style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, margin: 0 }}>
                  {manifest?.description}
                </p>
              </div>
            </div>
          </header>
          </PageHeroBand>

          <div
            style={{
              display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 22,
              }}
            >
              <StatCard label="Options to configure" value={attrs.length ? String(attrs.length) : "—"} />
              <StatCard label="Extra Python packages" value={pipList.length ? String(pipList.length) : "0"} />
              <StatCard
                label="Last catalog refresh"
                value={catalogUpdated ? formatDate(catalogUpdated) : "—"}
              />
            </div>

            {templateUrls.readme_url && (
              <section style={{ marginBottom: 28 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <h2 style={{ ...sectionTitleFriendly, marginBottom: 0 }}>README — what this component does</h2>
                  <a
                    href={templateUrls.readme_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--cyan)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <ExternalLink size={14} strokeWidth={2} />
                    Raw README
                  </a>
                </div>
                <p
                  style={{
                    fontSize: 15,
                    color: "var(--text-muted)",
                    lineHeight: 1.6,
                    margin: "0 0 16px",
                  }}
                >
                  <strong style={{ color: "var(--text)" }}>Read the README below in full</strong> before you rely on
                  this template—it is the authoritative description of behavior, prerequisites, caveats, and
                  limitations. The YAML and attribute sections farther down help you wire configuration; they do not
                  replace README.
                </p>
                <div
                  style={{
                    padding: "18px 20px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                  }}
                >
                  <ComponentReadme url={templateUrls.readme_url} />
                </div>
              </section>
            )}

            <section style={{ marginBottom: 26 }}>
              <h2 style={sectionTitleFriendly}>How to add this component</h2>
              <p style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 0, lineHeight: 1.6 }}>
                {ADD_SINGLE_COMPONENT_SUMMARY}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 8px", lineHeight: 1.55 }}>
                Maintained in{" "}
                <a href={COMMUNITY_CLI_REPO_WEB} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
                  dagster-community-components-cli
                </a>
                {" "}(PyPI).{" "}
                <a href={COMMUNITY_CLI_README_WEB} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
                  Full CLI README
                </a>
                {" — don’t duplicate here."}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.55 }}>
                {COMMUNITY_CLI_VALUE_PROP}
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--text-dim)", flex: "0 0 auto" }}>
                  Prerequisite · Dagster
                </span>
                <code className="mono" style={{ fontSize: 12, flex: "1 1 200px", color: "var(--text-muted)" }}>
                  {installBundle.coreInstall}
                </code>
                <CopyButton text={installBundle.coreInstall} label="Copy" />
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-dim)", lineHeight: 1.55 }}>
                {INSTALL_PYPI_NOTE} {INSTALL_VERSION_NOTE}
              </p>

              <h3 style={{ ...installOptionHeadingStyle, marginTop: 14 }}>Add this template</h3>
              <InstallCodeBlock text={cliUvx} copyLabel="Copy" />
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "12px 0 0", lineHeight: 1.55 }}>
                Uses <span className="mono">uvx</span> and the PyPI package name (no separate CLI install). Need{" "}
                <span className="mono">uv</span>?{" "}
                <code className="mono" style={{ fontSize: 12 }}>{UV_INSTALL_SHELL}</code> (macOS / Linux) or{" "}
                <a href={UV_INSTALL_DOCS} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
                  uv installation
                </a>
                .
              </p>

              <h3 style={{ ...installOptionHeadingStyle, marginTop: 22 }}>Built-in commands (same dagster-component)</h3>
              <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 12px", lineHeight: 1.55 }}>
                From PyPI <span className="mono">dagster-community-components-cli</span> or <span className="mono">uvx</span>—one binary.
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {cliExtras.map((row) => (
                  <li key={row.command}>
                    <code
                      className="mono"
                      style={{ fontSize: 13, display: "block", color: "var(--cyan)", marginBottom: 4, wordBreak: "break-word" }}
                    >
                      {row.command}
                    </code>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>{row.detail}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => setSetupExpanded((e) => !e)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--cyan)",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "8px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  marginTop: 22,
                  marginBottom: setupExpanded ? 14 : 0,
                }}
              >
                {setupExpanded ? "▲ Hide advanced (manual copy)" : "▼ Advanced: manual folder copy & manifest deps"}
              </button>
              {setupExpanded && (
                <div
                  style={{
                    paddingTop: 12,
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                  }}
                >
                  <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
                    If you are not using the CLI, copy the template folder into your project (e.g.{" "}
                    <code className="mono" style={{ fontSize: 12 }}>defs/components/</code>
                    ), then install Dagster and any packages below yourself. With the CLI, dependency installs are automatic.
                  </p>
                  {easyAdd && (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", margin: 0 }}>
                        Fetch only this folder (tiged or hosted helper script)
                      </p>
                      <InstallCodeBlock text={easyAdd.tiged} copyLabel="Copy" />
                      <InstallCodeBlock text={easyAdd.curlPy} copyLabel="Copy" />
                    </>
                  )}
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", margin: 0 }}>
                    Template Python packages (manifest)
                  </p>
                  {installBundle.templateInstall ? (
                    <InstallCodeBlock text={installBundle.templateInstall} copyLabel="Copy" />
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>None listed for this template.</p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <CopyButton text={installBundle.copyAll} label="Copy pip lines" />
                    <CopyButton text={installBundle.fullGuide} label="Copy manual guide" />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 10px" }}>
                      Versions (defaults for this registry)
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                        gap: 10,
                      }}
                    >
                      <RequirementCard
                        title="Dagster"
                        value={
                          <>
                            <code>dagster{REGISTRY_DAGSTER_SPEC}</code>
                          </>
                        }
                      />
                      <RequirementCard title="Python" value={<code>{REGISTRY_PYTHON_SPEC}</code>} />
                      <RequirementCard
                        title="Template version"
                        value={manifest?.version ? <code>v{manifest.version}</code> : <span>—</span>}
                      />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
                        All pip packages ({pipList.length})
                      </span>
                      {pipList.length > 6 && (
                        <button
                          type="button"
                          onClick={() => setDepsExpanded((e) => !e)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--cyan)",
                            fontSize: 13,
                            fontWeight: 600,
                            padding: 0,
                            cursor: "pointer",
                          }}
                        >
                          {depsExpanded ? "Show fewer" : "Show all"}
                        </button>
                      )}
                    </div>
                    {pipList.length === 0 ? (
                      <p style={{ color: "var(--text-dim)", fontSize: 13, margin: 0 }}>None listed.</p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {visiblePip.map((p) => (
                          <code
                            key={p}
                            className="mono"
                            style={{
                              fontSize: 12,
                              padding: "6px 10px",
                              borderRadius: 8,
                              background: "var(--code-bg)",
                              border: "1px solid var(--border)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {p}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section id="ecosystem-tips" style={{ marginBottom: 26 }}>
              <h2 style={sectionTitleFriendly}>Tips & ecosystem tools</h2>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-muted)",
                  marginTop: 0,
                  marginBottom: 14,
                  lineHeight: 1.55,
                }}
              >
                Optional editor and workflow extras—same no matter how you installed this template. Use the{" "}
                <span style={{ color: "var(--text-dim)", fontWeight: 600 }}>Tips</span> links above the title to jump here.
              </p>
              <div id="ecosystem-yaml" style={{ ...installCalloutStyle, scrollMarginTop: 24 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 650, color: "var(--text)" }}>
                  YAML + schema in your editor
                </h3>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {CLI_YAML_LSP_CALLOUT}
                </p>
              </div>
              <div id="ecosystem-ai" style={{ ...installCalloutStyle, marginTop: 12, scrollMarginTop: 24 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 650, color: "var(--text)" }}>
                  AI coding assistants
                </h3>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {CLI_AI_INIT_CALLOUT}
                </p>
              </div>
              <div id="ecosystem-installer" style={{ ...installCalloutStyle, marginTop: 12, scrollMarginTop: 24 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 650, color: "var(--text)" }}>
                  Community component installer (YAML-driven)
                </h3>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {COMMUNITY_INSTALLER_CALLOUT}{" "}
                  <a
                    href={COMMUNITY_INSTALLER_TEMPLATE_TREE}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--cyan)" }}
                  >
                    community_component_installer on GitHub
                  </a>
                  .
                </p>
              </div>
            </section>

            <section style={{ marginBottom: 26 }}>
              <h2 style={sectionTitleFriendly}>How to use it</h2>
              <p style={{ fontSize: 15, color: "var(--text-muted)", marginTop: 0, lineHeight: 1.65 }}>
                After <strong>dagster-component add</strong> (or a manual copy), start from{" "}
                <strong>example.yaml</strong> (or your own YAML) and wire any resources or secrets this integration
                needs. Register the component with your Dagster code location the same way you do for other Dagster
                Components—see the docs if you’re new to the pattern.
              </p>
              <ul
                style={{
                  margin: "0 0 16px",
                  paddingLeft: 20,
                  fontSize: 15,
                  color: "var(--text-muted)",
                  lineHeight: 1.65,
                }}
              >
                <li style={{ marginBottom: 8 }}>
                  {templateUrls.readme_url ? (
                    <>
                      The fullscreen <strong>README</strong> button uses the same file as below—pick whichever view suits
                      you while you work.
                    </>
                  ) : (
                    <>
                      After copying the template, open <strong>README.md</strong> inside that folder—we could not fetch a
                      README URL for this manifest.
                    </>
                  )}
                </li>
                <li style={{ marginBottom: 8 }}>
                  Use the <strong>example YAML</strong> as a starting point, then adjust fields to match your environment.
                </li>
                <li>
                  Browse <strong>component.py</strong> only if you need to see how the template is implemented.
                </li>
              </ul>
              <a href={DAGSTER_DOC} target="_blank" rel="noreferrer" style={{ ...actionBtn, marginRight: 10 }}>
                <BookOpen size={16} /> Dagster documentation
              </a>
            </section>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 26,
              }}
            >
              {templateUrls.readme_url && (
                <button
                  type="button"
                  onClick={() =>
                    setDocViewer({
                      title: "README",
                      url: templateUrls.readme_url!,
                      kind: "markdown",
                    })
                  }
                  style={actionBtnPrimary}
                >
                  <FileCode2 size={16} /> README
                </button>
              )}
              {templateUrls.example_url && (
                <button
                  type="button"
                  onClick={() =>
                    setDocViewer({
                      title: "example.yaml",
                      url: templateUrls.example_url!,
                      kind: "text",
                    })
                  }
                  style={actionBtnPrimary}
                >
                  <ExternalLink size={16} /> Example YAML
                </button>
              )}
              {templateUrls.requirements_url && (
                <button
                  type="button"
                  onClick={() =>
                    setDocViewer({
                      title: "requirements.txt",
                      url: templateUrls.requirements_url!,
                      kind: "text",
                    })
                  }
                  style={actionBtnBtn}
                >
                  <FileText size={16} /> requirements.txt
                </button>
              )}
              {templateUrls.component_url && (
                <button
                  type="button"
                  onClick={() =>
                    setDocViewer({
                      title: "component.py",
                      url: templateUrls.component_url!,
                      kind: "text",
                    })
                  }
                  style={actionBtnBtn}
                >
                  <Braces size={16} /> component.py
                </button>
              )}
              {templateUrls.schema_url && (
                <button
                  type="button"
                  onClick={() =>
                    setDocViewer({
                      title: "schema.json",
                      url: templateUrls.schema_url!,
                      kind: "json",
                    })
                  }
                  style={actionBtnBtn}
                >
                  <FileJson size={16} /> schema.json
                </button>
              )}
              {browseUrl && (
                <a href={browseUrl} target="_blank" rel="noreferrer" style={actionBtnBtn}>
                  <FolderGit2 size={16} /> View folder on GitHub
                </a>
              )}
            </div>

            {ghParsed && repoUrl && manifest?.path && (
              <ComponentChangeHistory repoUrl={repoUrl} folderPath={manifest.path} />
            )}

            {manifest && trustDetail && (
              <section id="trust-and-feedback" style={{ marginBottom: 24 }}>
                <h2 style={sectionTitleFriendly}>Trust & feedback</h2>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <VerificationBadge c={manifest} size="md" />
                    {helpfulCount > 0 && (
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--text-muted)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <ThumbsUp size={15} strokeWidth={2} aria-hidden />
                        <span>
                          {helpfulCount} community “helpful”
                          {helpfulCount === 1 ? "" : "s"}
                        </span>
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--text-muted)",
                      margin: "0 0 10px",
                      lineHeight: 1.55,
                    }}
                  >
                    {trustDetail.label}
                  </p>
                  {trustDetail.checkedAt && (
                    <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 8px" }}>
                      {trustDetail.checkedAtKind === "validation" ? "Last validated" : "Last checked"}:{" "}
                      {formatIsoDate(trustDetail.checkedAt)}
                    </p>
                  )}
                  {trustDetail.notes && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-muted)",
                        margin: "0 0 12px",
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "var(--bg-elevated)",
                        borderLeft: "3px solid var(--accent-bright)",
                        lineHeight: 1.5,
                      }}
                    >
                      {trustDetail.notes}
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 12px", lineHeight: 1.5 }}>
                    This site doesn’t run your code. Ratings and reviews aren’t stored here yet; extra trust signals
                    can appear when the catalog publishes them.
                  </p>
                  {reportIssueUrl && (
                    <a href={reportIssueUrl} target="_blank" rel="noreferrer" style={actionBtn}>
                      <ExternalLink size={16} /> Report issue on GitHub
                    </a>
                  )}
                </div>
              </section>
            )}

          {connector && (
            <section style={{ marginBottom: 28 }}>
              <h2 style={sectionTitleFriendly}>Inputs &amp; outputs (step to step)</h2>
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0, lineHeight: 1.6 }}>
                When you <strong>chain templates</strong> in a pipeline (one step feeds the next), it helps to know
                whether this one can <strong>take data from an upstream step</strong> and{" "}
                <strong>pass results to a downstream step</strong>. The flags below come from this template’s{" "}
                <em>category</em> in the catalog—they matter most if your tooling draws connections between steps.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 18,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                }}
              >
                <FieldIoIcon
                  role={
                    connector.left && connector.right
                      ? "both"
                      : connector.left
                        ? "in"
                        : connector.right
                          ? "out"
                          : "config"
                  }
                  size={22}
                  labeled
                />
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {connector.left && connector.right && (
                    <>
                      <strong style={{ color: "var(--text)" }}>Passthrough / transform:</strong> this category is
                      modeled to accept upstream data and emit something the next step can consume.
                    </>
                  )}
                  {connector.left && !connector.right && (
                    <>
                      <strong style={{ color: "var(--text)" }}>Downstream consumer:</strong> modeled to take upstream
                      data; not flagged as passing tabular output to the next step.
                    </>
                  )}
                  {!connector.left && connector.right && (
                    <>
                      <strong style={{ color: "var(--text)" }}>Upstream source:</strong> modeled to feed downstream
                      steps without requiring an upstream step connection.
                    </>
                  )}
                  {!connector.left && !connector.right && (
                    <>
                      <strong style={{ color: "var(--text)" }}>No step I/O flags:</strong> this category isn’t modeled
                      with upstream/downstream ports in the catalog spec (still configure inputs in YAML).
                    </>
                  )}
                </p>
              </div>
              <dl style={dlStyleIo}>
                <dt style={ioDtStyle}>
                  <FieldIoIcon role="in" size={18} />
                  <span>Takes input from another step?</span>
                </dt>
                <dd>{connector.left ? "Yes" : "No"}</dd>
                <dt style={ioDtStyle}>
                  <FieldIoIcon role="out" size={18} />
                  <span>Passes output to another step?</span>
                </dt>
                <dd>{connector.right ? "Yes" : "No"}</dd>
                {connector.note && (
                  <>
                    <dt style={ioDtStyle}>
                      <FieldIoIcon role="config" size={18} />
                      <span>More detail</span>
                    </dt>
                    <dd style={{ fontSize: 14, color: "var(--text-muted)" }}>{connector.note}</dd>
                  </>
                )}
              </dl>
            </section>
          )}

          {schemaError && (
            <p style={{ color: "var(--error)", fontSize: 14 }}>
              Could not load template metadata (schema.json): {schemaError}
            </p>
          )}

          {schema && (
            <>
              {schema["x-dagster-io"] && (
                <section style={{ marginBottom: 28 }}>
                  <h2 style={sectionTitleFriendly}>Structured inputs &amp; outputs</h2>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0, lineHeight: 1.55 }}>
                    What kind of data this template declares it accepts and produces (from its metadata). Use this
                    together with <strong>Inputs &amp; outputs (step to step)</strong> above when wiring pipelines.
                  </p>
                  <dl style={dlStyleIo}>
                    {schema["x-dagster-io"].inputs && (
                      <>
                        <dt style={ioDtStyle}>
                          <FieldIoIcon role="in" size={18} />
                          <span>Inputs (data in)</span>
                        </dt>
                        <dd>
                          <pre style={preStyle}>{JSON.stringify(schema["x-dagster-io"].inputs, null, 2)}</pre>
                        </dd>
                      </>
                    )}
                    {schema["x-dagster-io"].outputs && (
                      <>
                        <dt style={ioDtStyle}>
                          <FieldIoIcon role="out" size={18} />
                          <span>Outputs (data out)</span>
                        </dt>
                        <dd>
                          <pre style={preStyle}>{JSON.stringify(schema["x-dagster-io"].outputs, null, 2)}</pre>
                        </dd>
                      </>
                    )}
                  </dl>
                </section>
              )}

              {attrs.length > 0 && (
                <section style={{ marginBottom: 28 }}>
                  <h2 style={sectionTitleFriendly}>What you can configure</h2>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0, lineHeight: 1.55 }}>
                    Fields you set in YAML (or in a form, if your tool provides one). Expand a row for help and
                    allowed values. Icons are a best guess from field names:{" "}
                    <FieldIoIcon role="in" size={14} /> input-side · <FieldIoIcon role="out" size={14} /> output-side ·{" "}
                    <FieldIoIcon role="both" size={14} /> both · <FieldIoIcon role="config" size={14} /> settings.
                  </p>
                  <div
                    style={{
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                    }}
                  >
                    {attrs.map(([key, field], i) => (
                      <details
                        key={key}
                        style={{
                          borderTop: i === 0 ? "none" : "1px solid var(--border)",
                          background: "var(--bg-card)",
                        }}
                      >
                        <summary
                          style={{
                            padding: "12px 14px",
                            cursor: "pointer",
                            fontSize: 14,
                            listStyle: "none",
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          <FieldIoIcon role={inferAttributeFieldRole(key)} size={16} />
                          <span className="mono" style={{ color: "var(--cyan)", fontWeight: 600 }}>
                            {key}
                          </span>
                          <span style={{ color: "var(--text-dim)", marginLeft: 8 }}>{field.type}</span>
                          {field.label && (
                            <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>— {field.label}</span>
                          )}
                          {field.required && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                color: "var(--accent-bright)",
                              }}
                            >
                              required
                            </span>
                          )}
                        </summary>
                        <div
                          style={{
                            padding: "0 14px 14px 14px",
                            fontSize: 13,
                            color: "var(--text-muted)",
                            lineHeight: 1.55,
                            borderTop: "1px solid var(--border)",
                            background: "var(--bg-elevated)",
                          }}
                        >
                          {field.description && <p style={{ margin: "12px 0 8px" }}>{field.description}</p>}
                          {field["ui:widget"] && (
                            <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-dim)" }}>
                              Editor hint: <code className="mono">{field["ui:widget"]}</code>
                            </p>
                          )}
                          {field.enum && field.enum.length > 0 && (
                            <p style={{ margin: 0, fontSize: 12, color: "var(--text-dim)" }}>
                              <strong>Allowed values:</strong> {field.enum.join(", ")}
                            </p>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              {attrs.length === 0 && (
                <p style={{ fontSize: 14, color: "var(--text-dim)", margin: "0 0 20px" }}>
                  No per-field options are listed in this template’s schema.
                </p>
              )}

              <details
                style={{
                  marginBottom: 28,
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--text)",
                    listStyle: "none",
                  }}
                >
                  Advanced: raw catalog &amp; schema files
                </summary>
                <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 16px", lineHeight: 1.5 }}>
                  Paths, class names, and JSON below are for tooling and debugging—most people only need the sections
                  above.
                </p>
                <div style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                  {manifest && (
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={sectionTitleSmall}>Catalog entry</h3>
                      <dl style={dlStyle}>
                        <dt>Path in repo</dt>
                        <dd>
                          <span className="mono" style={{ fontSize: 13 }}>
                            {manifest.path}
                          </span>
                        </dd>
                        <dt>Author</dt>
                        <dd>{manifest.author}</dd>
                        <dt>Tags</dt>
                        <dd>
                          {(manifest.tags ?? []).map((t) => (
                            <span key={t} style={tagPill}>
                              {t}
                            </span>
                          ))}
                        </dd>
                      </dl>
                    </div>
                  )}
                  <h3 style={sectionTitleSmall}>Template class &amp; resources (schema.json)</h3>
                  <dl style={dlStyle}>
                    <dt>Python class</dt>
                    <dd className="mono" style={{ fontSize: 13, wordBreak: "break-all" }}>
                      {schema.component_type}
                    </dd>
                    {schema["x-dagster-provides"] && schema["x-dagster-provides"].length > 0 && (
                      <>
                        <dt>Resource keys this template can register</dt>
                        <dd>
                          {schema["x-dagster-provides"].map((r) => (
                            <span key={r} style={tagPill}>
                              {r}
                            </span>
                          ))}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              </details>
            </>
          )}

          {!schema && !schemaError && !loading && templateUrls.schema_url && (
            <p style={{ color: "var(--text-muted)" }}>Loading template metadata…</p>
          )}
        </>
      )}

      <section
        style={{
          marginTop: 40,
          paddingTop: 28,
          borderTop: "1px solid var(--border)",
        }}
      >
        <h2 style={{ ...sectionTitleSmall, fontSize: 16, marginBottom: 10 }}>CLI demos using this template</h2>
        <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 14px", lineHeight: 1.5 }}>
          From the community CLI{" "}
          <a href={COMMUNITY_CLI_EXAMPLES_INDEX_README_URL} rel="noreferrer" target="_blank">
            examples index
          </a>
          . Only demos that list this id in the Components column are shown; some rows only describe counts without
          template ids.
        </p>
        {cliDemosError && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{cliDemosError}</p>
        )}
        {cliDemos === null && !cliDemosError && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Loading related demos…</p>
        )}
        {cliDemos && cliDemos.length > 0 && (
          <>
            <ul
              style={{
                margin: "0 0 12px",
                paddingLeft: 20,
                maxHeight: Math.min(
                  360,
                  typeof window !== "undefined" ? Math.round(window.innerHeight * 0.35) : 360
                ),
                overflowY: "auto",
                fontSize: 14,
                lineHeight: 1.55,
              }}
            >
              {cliDemos.map((d) => (
                <li key={d.slug} style={{ marginBottom: 4 }}>
                  <Link to={`/examples/${encodeURIComponent(d.slug)}`}>{d.title}</Link>
                  <span className="mono" style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                    {d.slug}
                  </span>
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
              <Link to={`/examples?q=${encodeURIComponent(id)}`}>Open examples page filtered for this id</Link>
            </p>
          </>
        )}
        {cliDemos && cliDemos.length === 0 && !cliDemosError && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
            No indexed demos list this template by id. Try{" "}
            <Link to={`/examples?q=${encodeURIComponent(id)}`}>searching the examples index</Link>.
          </p>
        )}
      </section>

      {catalogUpdated && (
        <footer
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: "1px solid var(--border)",
            fontSize: 13,
            color: "var(--text-dim)",
          }}
        >
          Catalog manifest last updated {formatDate(catalogUpdated)}.
        </footer>
      )}

      {docViewer && (
        <DocViewerModal
          open
          onClose={() => setDocViewer(null)}
          title={docViewer.title}
          url={docViewer.url}
          kind={docViewer.kind}
        />
      )}
    </article>
  );
}

function InstallCodeBlock({ text, copyLabel }: { text: string; copyLabel: string }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--code-bg)",
        padding: "12px 14px",
        paddingRight: 108,
        fontSize: 13,
      }}
    >
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        <code className="mono">{text}</code>
      </pre>
      <div style={{ position: "absolute", top: 8, right: 8 }}>
        <CopyButton text={text} label={copyLabel} />
      </div>
    </div>
  );
}

function RequirementCard({ title, value }: { title: string; value: ReactNode }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-dim)",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{label}</div>
    </div>
  );
}

const actionBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg-card)",
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 500,
  textDecoration: "none",
};

const actionBtnBtn: CSSProperties = {
  ...actionBtn,
  cursor: "pointer",
  fontFamily: "inherit",
};

const sectionTitleFriendly: CSSProperties = {
  fontSize: 18,
  fontWeight: 650,
  letterSpacing: "-0.02em",
  color: "var(--text)",
  margin: "0 0 10px",
};

const installOptionHeadingStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 650,
  letterSpacing: "-0.02em",
  color: "var(--text)",
  margin: "22px 0 10px",
};

const installCalloutStyle: CSSProperties = {
  padding: "14px 16px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--bg-elevated)",
};

const sectionTitleSmall: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-dim)",
  margin: "0 0 10px",
};

const actionBtnPrimary: CSSProperties = {
  ...actionBtn,
  cursor: "pointer",
  fontFamily: "inherit",
  background: "linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(34, 211, 238, 0.08) 100%)",
  borderColor: "var(--border-strong)",
};

const dlStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: "10px 20px",
  fontSize: 14,
  margin: 0,
};

/** Wider label column when rows include I/O icons + longer labels. */
const dlStyleIo: CSSProperties = {
  ...dlStyle,
  gridTemplateColumns: "minmax(240px, 320px) 1fr",
};

const ioDtStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  margin: 0,
};

const tagPill: CSSProperties = {
  display: "inline-block",
  marginRight: 6,
  marginBottom: 4,
  padding: "2px 8px",
  borderRadius: 6,
  background: "var(--pill-bg)",
  border: "1px solid var(--pill-border)",
  fontSize: 12,
  color: "var(--text-muted)",
};

const preStyle: CSSProperties = {
  margin: 0,
  padding: 12,
  borderRadius: 8,
  background: "var(--code-bg)",
  fontSize: 12,
  overflow: "auto",
  maxWidth: "100%",
};

