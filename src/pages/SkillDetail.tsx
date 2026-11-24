import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
import { PageHeroBand } from "../components/PageHeroBand";
import { Breadcrumb } from "../components/Breadcrumb";
import { stripFrontmatter } from "../lib/loadBlogPosts";
import { SKILLS, findSkill } from "../data/skills";

/**
 * `/skills/:id` — fetches the raw SKILL.md from the templates repo, strips
 * its YAML frontmatter (name/description are already shown via the data
 * file; the frontmatter itself isn't meant to render as body content), and
 * renders the instructions body as markdown.
 */
export function SkillDetail() {
  const { id: rawId } = useParams<{ id: string }>();
  const id = rawId ? decodeURIComponent(rawId) : "";
  const skill = findSkill(id);

  const [md, setMd] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!skill) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMd(null);
    (async () => {
      try {
        const r = await fetch(skill.rawUrl);
        if (!r.ok) throw new Error(`HTTP ${r.status} fetching SKILL.md`);
        const text = await r.text();
        if (!cancelled) setMd(stripFrontmatter(text));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "fetch failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [skill]);

  if (!skill) {
    return (
      <>
        <PageHeroBand>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px 32px" }}>
            <Breadcrumb
              crumbs={[
                { label: "Registry", to: "/" },
                { label: "Skills", to: "/skills" },
                { label: `Not found: ${id}` },
              ]}
            />
            <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, margin: 0, color: "#fff" }}>
              Not found: {id}
            </h1>
          </div>
        </PageHeroBand>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 64px" }}>
          <p style={{ color: "var(--text-muted)" }}>
            Available: {SKILLS.map((s) => s.id).join(", ")}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeroBand>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px 32px" }}>
          <Breadcrumb
            crumbs={[
              { label: "Registry", to: "/" },
              { label: "Skills", to: "/skills" },
              { label: skill.name },
            ]}
          />
          <h1 style={{
            fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em",
            margin: "0 0 8px", lineHeight: 1.2, fontFamily: "var(--font-mono, monospace)", color: "#fff",
          }}>
            {skill.name}
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", margin: "0 0 12px", lineHeight: 1.55 }}>
            {skill.description}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, margin: 0, fontSize: 13 }}>
            <a href={skill.githubUrl} target="_blank" rel="noreferrer" style={linkStyleLight}>
              Source on GitHub <ExternalLink size={12} />
            </a>
            <a href={skill.rawUrl} target="_blank" rel="noreferrer" style={linkStyleLight}>
              Raw SKILL.md <ExternalLink size={12} />
            </a>
            {skill.componentId ? (
              <Link to={`/c/${encodeURIComponent(skill.componentId)}`} style={linkStyleLight}>
                Companion component: {skill.componentId}
              </Link>
            ) : null}
          </div>
        </div>
      </PageHeroBand>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px 64px" }}>
      <div className="callout-help" style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Install this skill</p>
        <pre style={{
          margin: "8px 0 0", padding: 12, borderRadius: 8,
          background: "var(--bg-elevated)", border: "1px solid var(--border)",
          fontSize: 12.5, fontFamily: "var(--font-mono, monospace)", overflowX: "auto",
        }}>{`mkdir -p .claude/skills/${skill.id}
curl -fsSL ${skill.rawUrl} -o .claude/skills/${skill.id}/SKILL.md`}</pre>
      </div>

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading SKILL.md …</p>}
      {error && (
        <div className="callout-help" style={{ borderLeftColor: "var(--error)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Could not fetch {skill.name}</p>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-muted)" }}>{error}</p>
          <p style={{ margin: "12px 0 0", fontSize: 13 }}>
            Try opening directly on GitHub:{" "}
            <a href={skill.githubUrl} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
              {skill.name} →
            </a>
          </p>
        </div>
      )}
      {md != null && md !== "" && <ExamplesMarkdown>{md}</ExamplesMarkdown>}
      </div>
    </>
  );
}

const linkStyleLight: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: "#67e8f9",
  textDecoration: "none",
};
