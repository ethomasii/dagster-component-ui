import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { ExamplesMarkdown } from "../components/ExamplesMarkdown";
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
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 64px" }}>
        <p style={{ margin: "0 0 8px" }}>
          <Link to="/skills" style={{ fontSize: 14, color: "var(--cyan)", textDecoration: "none" }}>
            ← Skills
          </Link>
        </p>
        <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, margin: "12px 0 8px" }}>
          Not found: {id}
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Available: {SKILLS.map((s) => s.id).join(", ")}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 64px" }}>
      <p style={{ margin: "0 0 8px" }}>
        <Link to="/skills" style={{ fontSize: 14, color: "var(--cyan)", textDecoration: "none" }}>
          ← Skills
        </Link>
      </p>
      <h1 style={{
        fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em",
        margin: "12px 0 8px", lineHeight: 1.2, fontFamily: "var(--font-mono, monospace)",
      }}>
        {skill.name}
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
        {skill.description}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24, fontSize: 13 }}>
        <a href={skill.githubUrl} target="_blank" rel="noreferrer" style={linkStyle}>
          Source on GitHub <ExternalLink size={12} />
        </a>
        <a href={skill.rawUrl} target="_blank" rel="noreferrer" style={linkStyle}>
          Raw SKILL.md <ExternalLink size={12} />
        </a>
        {skill.componentId ? (
          <Link to={`/c/${encodeURIComponent(skill.componentId)}`} style={linkStyle}>
            Companion component: {skill.componentId}
          </Link>
        ) : null}
      </div>

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
  );
}

const linkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: "var(--cyan)",
  textDecoration: "none",
};
