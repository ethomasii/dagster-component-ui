/** Claude Agent Skills (SKILL.md files, Anthropic's Agent Skills convention) published
 *  inside dagster-component-templates. Consumed by both /skills (index) and
 *  /skills/:id (detail).
 *
 *  Two different things live under the "skills" umbrella in that repo, and this page
 *  covers only the first:
 *    1. Real, published SKILL.md files living alongside a specific component — e.g.
 *       `assets/ai/agentic_pipeline_authoring_tools/SKILL.md`. These are copy/symlink-able
 *       straight into `.claude/skills/<name>/SKILL.md` for Claude Code (or any Agent-Skills-
 *       aware client) to pick up.
 *    2. `resources/skill_resource` (`SkillResourceComponent`) — a Dagster component that lets
 *       a PROJECT register its OWN skills (by git_url/git_path) for its MCP-aware agent
 *       components (`litellm_agent`, `openai_agent`, …) to reference by `skill_keys`. That's
 *       a registry mechanism, not a skill itself — linked from the /skills page, not listed
 *       as an entry here.
 *
 *  Kept as a hardcoded const (same pattern as `clis.ts`) because there's one of these today
 *  and they'll be added deliberately, not often; adding one = append one entry here.
 */

export type SkillEntry = {
  id: string;
  /** From the SKILL.md YAML frontmatter `name` field. */
  name: string;
  /** From the SKILL.md YAML frontmatter `description` field. */
  description: string;
  /** The component this skill was published alongside, if any. */
  componentId?: string;
  /** Path to the SKILL.md within the templates repo. */
  path: string;
  rawUrl: string;
  githubUrl: string;
};

const REPO = "https://github.com/eric-thomas-dagster/dagster-component-templates";
const RAW = "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-component-templates/main";

export const SKILL_RESOURCE_COMPONENT_ID = "skill_resource";

export const SKILLS: SkillEntry[] = [
  {
    id: "agentic-pipeline-authoring",
    name: "agentic-pipeline-authoring",
    description:
      "Author, check, and preview an AgenticPipelineComponent YAML — picking an op, wiring " +
      "step dependencies, setting partitioning, or diagnosing a load-time error.",
    componentId: "agentic_pipeline_authoring_tools",
    path: "assets/ai/agentic_pipeline_authoring_tools/SKILL.md",
    rawUrl: `${RAW}/assets/ai/agentic_pipeline_authoring_tools/SKILL.md`,
    githubUrl: `${REPO}/blob/main/assets/ai/agentic_pipeline_authoring_tools/SKILL.md`,
  },
];

export function findSkill(id: string): SkillEntry | undefined {
  return SKILLS.find((s) => s.id === id);
}

export const SKILLS_REPO = REPO;
