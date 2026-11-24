import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { SKILLS, SKILLS_REPO, SKILL_RESOURCE_COMPONENT_ID, type SkillEntry } from "../data/skills";

/**
 * `/skills` — Claude Agent Skills (SKILL.md files) published across this registry's repos,
 * grouped by what they're for: migration guides (one external scheduler/ETL tool -> Dagster
 * each) vs. component-authoring skills (paired with a specific component).
 *
 * Distinct from `resources/skill_resource` (a component that lets a PROJECT register its own
 * skills for its agent components to reference by `skill_keys`) — that's a registry
 * mechanism, linked below, not a skill itself.
 */

const GROUP_LABELS: Record<SkillEntry["group"], string> = {
  migration: "Migration guides",
  component: "Component authoring",
};

const GROUP_BLURBS: Record<SkillEntry["group"], string> = {
  migration: "Map an external scheduler or ETL tool's constructs onto the right Dagster components.",
  component: "Paired with one specific component — author, validate, or debug its YAML.",
};

function SkillCard({ skill }: { skill: SkillEntry }) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <Link
          to={`/skills/${encodeURIComponent(skill.id)}`}
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-mono, monospace)",
            color: "var(--text)",
            textDecoration: "none",
          }}
        >
          {skill.name}
        </Link>
        <a
          href={skill.githubUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 12, color: "var(--text-dim)", textDecoration: "none",
            marginLeft: "auto",
          }}
        >
          Source on GitHub <ExternalLink size={12} />
        </a>
      </div>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55 }}>
        {skill.description}
      </p>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 12,
        alignItems: "center", justifyContent: "space-between",
      }}>
        {skill.componentId ? (
          <span style={{ fontSize: 13, color: "var(--text-dim)" }}>
            Pairs with{" "}
            <Link to={`/c/${encodeURIComponent(skill.componentId)}`} style={{ color: "var(--cyan)" }}>
              {skill.componentId}
            </Link>
          </span>
        ) : <span />}
        <Link
          to={`/skills/${encodeURIComponent(skill.id)}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 13, fontWeight: 600, color: "var(--cyan)",
            textDecoration: "none",
          }}
        >
          Full skill <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export function SkillsIndex() {
  const groups: SkillEntry["group"][] = ["migration", "component"];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          margin: "0 0 12px",
        }}
      >
        Skills
      </p>
      <h1
        style={{
          fontSize: "clamp(1.5rem, 3.5vw, 2rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          margin: "0 0 12px",
          lineHeight: 1.2,
        }}
      >
        Agent Skills
      </h1>
      <p style={{ fontSize: 15, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
        <code className="mono" style={{ fontSize: 13 }}>SKILL.md</code> files published across this
        registry's repos — Anthropic's Agent Skills convention (YAML frontmatter + a markdown body
        of instructions). Copy or symlink one into{" "}
        <code className="mono" style={{ fontSize: 13 }}>.claude/skills/&lt;name&gt;/SKILL.md</code>{" "}
        so Claude Code (or any Agent-Skills-aware client) picks it up automatically.
      </p>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 32px", lineHeight: 1.5 }}>
        Looking to register your OWN skill for your project's agents to use at runtime (via{" "}
        <code className="mono" style={{ fontSize: 12 }}>skill_keys</code>), rather than a skill
        for your coding assistant? See{" "}
        <Link to={`/c/${SKILL_RESOURCE_COMPONENT_ID}`} style={{ color: "var(--cyan)" }}>
          SkillResourceComponent
        </Link>{" "}
        — a different mechanism, not listed here.
      </p>

      {groups.map((group) => {
        const items = SKILLS.filter((s) => s.group === group);
        if (!items.length) return null;
        return (
          <section key={group} style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", margin: 0 }}>
                {GROUP_LABELS[group]}
              </h2>
              <span style={{ fontSize: 13, color: "var(--text-dim)", fontVariantNumeric: "tabular-nums" }}>
                {items.length}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", maxWidth: 760 }}>
              {GROUP_BLURBS[group]}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {items.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          </section>
        );
      })}

      <p style={{ marginTop: 8, fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
        Published a new skill? Open a PR adding it to{" "}
        <code className="mono" style={{ fontSize: 12 }}>src/data/skills.ts</code> in this site's
        repo, or an issue at{" "}
        <a href={`${SKILLS_REPO}/issues`} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>
          {SKILLS_REPO.replace("https://github.com/", "")}/issues
        </a>.
      </p>
    </div>
  );
}
