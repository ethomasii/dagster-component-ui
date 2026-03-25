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
import { categoryModuleBadge } from "../lib/categoryBadge";
import { githubTreeUrl } from "../lib/installSnippet";
import { buildInstallBundle, REGISTRY_DAGSTER_SPEC, REGISTRY_PYTHON_SPEC } from "../lib/registryRequirements";
import {
  buildPythonAddCommand,
  buildTigedCommand,
  githubNewIssueUrl,
  parseGithubRepo,
} from "../lib/github";
import { communityHelpfulCount, resolveVerification } from "../lib/verification";
import { ComponentIcon } from "../components/ComponentIcon";
import { CopyButton } from "../components/CopyButton";
import { DocViewerModal, type DocViewerKind } from "../components/DocViewerModal";
import { VerificationBadge } from "../components/VerificationBadge";

const DAGSTER_DOC = "https://docs.dagster.io/";

export function ComponentDetail() {
  const { id } = useParams<{ id: string }>();
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
        const c = m.components.find((x) => x.id === id);
        setManifest(c ?? null);
        if (!c?.schema_url) {
          setLoading(false);
          return;
        }
        const res = await fetch(c.schema_url);
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

  const connector = manifest && spec?.connectors?.byCategory?.[manifest.category];
  const attrs = schema?.attributes ? Object.entries(schema.attributes) : [];
  const pipList = manifest?.dependencies?.pip ?? [];
  const installBundle = useMemo(
    () =>
      buildInstallBundle(pipList.length ? pipList : undefined, {
        componentPath: manifest?.path,
        hasRequirementsFile: Boolean(manifest?.requirements_url),
      }),
    [pipList.join("\n"), manifest?.path, manifest?.requirements_url]
  );

  const browseUrl =
    manifest && repoUrl ? githubTreeUrl(repoUrl, manifest.path) : "";

  const ghParsed = useMemo(() => parseGithubRepo(repoUrl), [repoUrl]);

  const easyAdd = useMemo(() => {
    if (!manifest || !ghParsed) return null;
    const tiged = buildTigedCommand(
      ghParsed.owner,
      ghParsed.repo,
      manifest.path,
      manifest.id
    );
    const py = buildPythonAddCommand(manifest.id);
    const scriptUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${import.meta.env.BASE_URL}add_component.py`
        : "";
    const curlPy = scriptUrl
      ? `curl -fsSL ${scriptUrl} -o add_component.py\npython add_component.py ${manifest.id}`
      : `${py}\n# Save add_component.py from this registry (tools/ or /add_component.py when hosted)`;
    const bundle = [
      "# Copy with Node (npx downloads only this folder from GitHub)",
      tiged,
      "",
      "# Copy with Python (download helper script, then run — no Node)",
      curlPy,
    ].join("\n");
    return { tiged, py, curlPy, bundle };
  }, [manifest, ghParsed]);

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
        ? `${window.location.origin}${basePath}c/${manifest.id}`
        : "";
    return githubNewIssueUrl(repoUrl, {
      title: `[component] ${manifest.name} (${manifest.id})`,
      body: [
        `**Component:** \`${manifest.id}\``,
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
  }, [manifest, repoUrl]);

  const visiblePip = depsExpanded ? pipList : pipList.slice(0, 6);

  if (!id) {
    return <p style={{ padding: 48 }}>Missing id.</p>;
  }

  if (!loading && !manifest) {
    return (
      <div style={{ padding: 48, maxWidth: 720, margin: "0 auto" }}>
        <p>Component not found.</p>
        <Link to="/">← Back to registry</Link>
      </div>
    );
  }

  return (
    <article style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 80px" }}>
      {loading && !manifest ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : (
        <>
          <nav
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 20,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
            }}
            aria-label="Breadcrumb"
          >
            <Link to="/" style={{ color: "var(--text-muted)" }}>
              Registry
            </Link>
            <span aria-hidden style={{ color: "var(--text-dim)" }}>
              /
            </span>
            {manifest && (
              <>
                <Link
                  to={`/?category=${encodeURIComponent(manifest.category)}`}
                  style={{ color: "var(--text-muted)" }}
                >
                  {categoryLabel(manifest.category)}
                </Link>
                <span aria-hidden style={{ color: "var(--text-dim)" }}>
                  /
                </span>
              </>
            )}
            <span style={{ color: "var(--text)", fontWeight: 500 }}>{manifest?.name}</span>
          </nav>

          <header style={{ marginBottom: 28 }}>
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
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <ComponentIcon icon={manifest?.icon} size={40} title={manifest?.name} />
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
                    title="Module kind"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "var(--pill-bg)",
                      border: "1px solid var(--pill-border)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--accent-bright)",
                    }}
                  >
                    {manifest && categoryModuleBadge(manifest.category)}
                  </span>
                  {manifest?.version && (
                    <span
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "var(--code-bg)",
                        color: "var(--text-muted)",
                      }}
                    >
                      v{manifest.version}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
                    Dagster {REGISTRY_DAGSTER_SPEC} · Python {REGISTRY_PYTHON_SPEC}
                  </span>
                </div>
                <h1
                  style={{
                    fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                    margin: "0 0 8px",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {manifest?.name}
                </h1>
                <p className="mono" style={{ fontSize: 14, color: "var(--cyan)", margin: "0 0 12px" }}>
                  {manifest?.id}
                </p>
                <p style={{ fontSize: 17, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
                  {manifest?.description}
                </p>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <StatCard label="Configurable fields" value={attrs.length ? String(attrs.length) : "—"} />
              <StatCard label="Pip dependencies" value={pipList.length ? String(pipList.length) : "0"} />
              <StatCard
                label="Catalog updated"
                value={catalogUpdated ? formatDate(catalogUpdated) : "—"}
              />
            </div>

            {manifest && trustDetail && (
              <section style={{ marginBottom: 24 }}>
                <h2 style={sectionTitle}>Trust & feedback</h2>
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
                      Last checked: {formatIsoDate(trustDetail.checkedAt)}
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
                    This registry does not run your code. Star ratings and threaded reviews are not stored here
                    yet—if the manifest gains <span className="mono">verification</span> or{" "}
                    <span className="mono">community_signals</span> fields, they will show automatically.
                  </p>
                  {reportIssueUrl && (
                    <a href={reportIssueUrl} target="_blank" rel="noreferrer" style={actionBtn}>
                      <ExternalLink size={16} /> Report issue on GitHub
                    </a>
                  )}
                </div>
              </section>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 28,
              }}
            >
              <a
                href={DAGSTER_DOC}
                target="_blank"
                rel="noreferrer"
                style={actionBtn}
              >
                <BookOpen size={16} /> Dagster docs
              </a>
              {manifest?.readme_url && (
                <button
                  type="button"
                  onClick={() =>
                    setDocViewer({
                      title: "README",
                      url: manifest.readme_url!,
                      kind: "markdown",
                    })
                  }
                  style={actionBtnBtn}
                >
                  <FileCode2 size={16} /> View README
                </button>
              )}
              {manifest?.component_url && (
                <button
                  type="button"
                  onClick={() =>
                    setDocViewer({
                      title: "component.py",
                      url: manifest.component_url!,
                      kind: "text",
                    })
                  }
                  style={actionBtnBtn}
                >
                  <Braces size={16} /> Source (component.py)
                </button>
              )}
              {browseUrl && (
                <a href={browseUrl} target="_blank" rel="noreferrer" style={actionBtn}>
                  <FolderGit2 size={16} /> Browse folder
                </a>
              )}
              {manifest?.schema_url && (
                <button
                  type="button"
                  onClick={() =>
                    setDocViewer({
                      title: "schema.json",
                      url: manifest.schema_url!,
                      kind: "json",
                    })
                  }
                  style={actionBtnBtn}
                >
                  <FileJson size={16} /> schema.json
                </button>
              )}
              {manifest?.example_url && (
                <button
                  type="button"
                  onClick={() =>
                    setDocViewer({
                      title: "example.yaml",
                      url: manifest.example_url!,
                      kind: "text",
                    })
                  }
                  style={actionBtnBtn}
                >
                  <ExternalLink size={16} /> example.yaml
                </button>
              )}
              {manifest?.requirements_url && (
                <button
                  type="button"
                  onClick={() =>
                    setDocViewer({
                      title: "requirements.txt",
                      url: manifest.requirements_url!,
                      kind: "text",
                    })
                  }
                  style={actionBtnBtn}
                >
                  <FileText size={16} /> requirements.txt
                </button>
              )}
            </div>

            <section style={{ marginBottom: 28 }}>
              <h2 style={sectionTitle}>Setup in your project</h2>
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0, lineHeight: 1.5 }}>
                <strong>Dagster</strong> from PyPI, then <strong>copy this template folder</strong> into
                your repo, then install any extra libraries the template needs.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--text-dim)", flex: "0 0 auto" }}>Framework</span>
                <code className="mono" style={{ fontSize: 12, flex: "1 1 200px", color: "var(--text-muted)" }}>
                  {installBundle.coreInstall}
                </code>
                <CopyButton text={installBundle.coreInstall} label="Copy" />
              </div>

              {easyAdd && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-dim)" }}>Copy folder</span>
                  <CopyButton text={easyAdd.tiged} label="Node (npx)" />
                  <CopyButton text={easyAdd.curlPy} label="Python script" />
                  <CopyButton text={easyAdd.bundle} label="Both" />
                </div>
              )}

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
                  marginBottom: setupExpanded ? 16 : 0,
                }}
              >
                {setupExpanded ? "▲ Hide setup details" : "▼ More: template pip, versions, full commands"}
              </button>

              {setupExpanded && (
                <div
                  style={{
                    paddingTop: 8,
                    borderTop: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                  }}
                >
                  {easyAdd && (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", margin: 0 }}>
                        Full copy commands
                      </p>
                      <InstallCodeBlock text={easyAdd.tiged} copyLabel="Copy" />
                      <InstallCodeBlock text={easyAdd.curlPy} copyLabel="Copy" />
                    </>
                  )}

                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", margin: 0 }}>
                    Template Python packages (if any)
                  </p>
                  {installBundle.templateInstall ? (
                    <InstallCodeBlock text={installBundle.templateInstall} copyLabel="Copy" />
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
                      None listed in the manifest for this template.
                    </p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <CopyButton text={installBundle.copyAll} label="Copy pip lines" />
                    <CopyButton text={installBundle.fullGuide} label="Copy pip + folder copy script" />
                  </div>

                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 10px" }}>
                      Versions (registry defaults)
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
                            <code>{REGISTRY_DAGSTER_SPEC}</code> + <code>dagster-components</code>
                          </>
                        }
                      />
                      <RequirementCard title="Python" value={<code>{REGISTRY_PYTHON_SPEC}</code>} />
                      <RequirementCard
                        title="Template"
                        value={manifest?.version ? <code>v{manifest.version}</code> : <span>—</span>}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>
                        Pip packages ({pipList.length})
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
                      <p style={{ color: "var(--text-dim)", fontSize: 13, margin: 0 }}>None in manifest.</p>
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
          </header>

          <section style={{ marginBottom: 28 }}>
            <h2 style={sectionTitle}>Manifest</h2>
            <dl style={dlStyle}>
              <dt>Repository path</dt>
              <dd>
                <span className="mono" style={{ fontSize: 13 }}>
                  {manifest?.path}
                </span>
              </dd>
              <dt>Author</dt>
              <dd>{manifest?.author}</dd>
              <dt>Tags</dt>
              <dd>
                {(manifest?.tags ?? []).map((t) => (
                  <span key={t} style={tagPill}>
                    {t}
                  </span>
                ))}
              </dd>
            </dl>
          </section>

          {connector && (
            <section style={{ marginBottom: 28 }}>
              <h2 style={sectionTitle}>Canvas connectors (schema-spec)</h2>
              <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0 }}>
                From <span className="mono">schema-spec.json</span>: how pipeline designers expose upstream
                (left) and downstream (right) connectors for this category.
              </p>
              <dl style={dlStyle}>
                <dt>Upstream (left port)</dt>
                <dd>{connector.left ? "Yes" : "No"}</dd>
                <dt>Downstream (right port)</dt>
                <dd>{connector.right ? "Yes" : "No"}</dd>
                {connector.note && (
                  <>
                    <dt>Note</dt>
                    <dd>{connector.note}</dd>
                  </>
                )}
              </dl>
            </section>
          )}

          {schemaError && (
            <p style={{ color: "var(--error)", fontSize: 14 }}>
              Could not load component schema: {schemaError}
            </p>
          )}

          {schema && (
            <>
              <section style={{ marginBottom: 28 }}>
                <h2 style={sectionTitle}>Component schema (schema.json)</h2>
                <dl style={dlStyle}>
                  <dt>component_type</dt>
                  <dd className="mono" style={{ fontSize: 13, wordBreak: "break-all" }}>
                    {schema.component_type}
                  </dd>
                  {schema["x-dagster-provides"] && schema["x-dagster-provides"].length > 0 && (
                    <>
                      <dt>x-dagster-provides</dt>
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
              </section>

              {schema["x-dagster-io"] && (
                <section style={{ marginBottom: 28 }}>
                  <h2 style={sectionTitle}>I/O contract (x-dagster-io)</h2>
                  <dl style={dlStyle}>
                    {schema["x-dagster-io"].inputs && (
                      <>
                        <dt>Inputs</dt>
                        <dd>
                          <pre style={preStyle}>{JSON.stringify(schema["x-dagster-io"].inputs, null, 2)}</pre>
                        </dd>
                      </>
                    )}
                    {schema["x-dagster-io"].outputs && (
                      <>
                        <dt>Outputs</dt>
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
                  <h2 style={sectionTitle}>Configurable attributes ({attrs.length})</h2>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0 }}>
                    Open a field for the full description. <strong>Form control</strong> is how a
                    visual editor renders the field (text box, dropdown, code editor, etc.); it comes
                    from the schema’s <span className="mono">ui:widget</span> when set.
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
                          }}
                        >
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
                            <p style={{ margin: "0 0 8px" }}>
                              <strong style={{ color: "var(--text)" }}>Form control:</strong>{" "}
                              <code className="mono">{field["ui:widget"]}</code>
                              <span style={{ color: "var(--text-dim)" }}>
                                {" "}
                                — editor widget (e.g. <span className="mono">select</span> = dropdown,{" "}
                                <span className="mono">code</span> = code-style input).
                              </span>
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
            </>
          )}

          {!schema && !schemaError && !loading && manifest?.schema_url && (
            <p style={{ color: "var(--text-muted)" }}>Loading schema…</p>
          )}
        </>
      )}

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

const sectionTitle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--text-dim)",
  margin: "0 0 12px",
};

const dlStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px 1fr",
  gap: "10px 20px",
  fontSize: 14,
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
};

