/** Claude Agent Skills (SKILL.md files, Anthropic's Agent Skills convention) published
 *  across two registry repos. Consumed by both /skills (index) and /skills/:id (detail).
 *
 *  Two source repos, three groups:
 *    1. "component" skills live alongside a specific component in dagster-component-templates
 *       — e.g. `assets/ai/agentic_pipeline_authoring_tools/SKILL.md`.
 *    2. "migration" skills (migrating-airflow-to-dagster, migrating-adf-to-dagster,
 *       migrating-runmyjobs-to-dagster) live under `skills/` in
 *       dagster-community-components-cli — the CLI repo, not the templates repo. Each one
 *       guides migrating an external scheduler/ETL tool's constructs to Dagster components.
 *    3. "registry" is the single catalog-wide skill (`dagster-community-components`,
 *       also under `skills/` in the CLI repo) — not paired with one component and not a
 *       migration guide, but a reference for the whole registry: categories, validation
 *       tiers, the real manifest schema, the CLI, and how to write correct YAML from it.
 *
 *  Separately, `resources/skill_resource` (`SkillResourceComponent`) is a Dagster component
 *  that lets a PROJECT register its OWN skills (by git_url/git_path) for its MCP-aware agent
 *  components to reference by `skill_keys` — a registry mechanism, not a skill itself, linked
 *  from the /skills page but not listed as an entry here.
 *
 *  Kept as a hardcoded const (same pattern as `clis.ts`) because new entries are added
 *  deliberately, not often; adding one = append one entry here.
 */

export type SkillEntry = {
  id: string;
  /** From the SKILL.md YAML frontmatter `name` field. */
  name: string;
  /** From the SKILL.md YAML frontmatter `description` field. */
  description: string;
  group: "component" | "migration" | "registry";
  /** The component this skill was published alongside, if any (group: "component" only). */
  componentId?: string;
  /** Path to the SKILL.md within its source repo. */
  path: string;
  rawUrl: string;
  githubUrl: string;
};

const TEMPLATES_REPO = "https://github.com/eric-thomas-dagster/dagster-component-templates";
const TEMPLATES_RAW = "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-component-templates/main";

const CLI_REPO = "https://github.com/eric-thomas-dagster/dagster-community-components-cli";
const CLI_RAW = "https://raw.githubusercontent.com/eric-thomas-dagster/dagster-community-components-cli/main";

export const SKILL_RESOURCE_COMPONENT_ID = "skill_resource";

export const SKILLS: SkillEntry[] = [
  {
    id: "dagster-community-components",
    name: "dagster-community-components",
    description:
      "Discover, evaluate, and use the Dagster Community Components (DCC) catalog itself — " +
      "real categories and validation tiers, the full `dagster-component` CLI, the real " +
      "(and inconsistent) manifest schema, how to tell a stale README table from the " +
      "auto-generated one, and a repeatable recipe for building an end-to-end demo from " +
      "the catalog. Load `dagster-expert` alongside it for core Dagster APIs.",
    group: "registry",
    path: "skills/dagster-community-components/SKILL.md",
    rawUrl: `${CLI_RAW}/skills/dagster-community-components/SKILL.md`,
    githubUrl: `${CLI_REPO}/blob/main/skills/dagster-community-components/SKILL.md`,
  },
  {
    id: "agentic-pipeline-authoring",
    name: "agentic-pipeline-authoring",
    description:
      "Author, check, and preview an AgenticPipelineComponent YAML — picking an op, wiring " +
      "step dependencies, setting partitioning, or diagnosing a load-time error.",
    group: "component",
    componentId: "agentic_pipeline_authoring_tools",
    path: "assets/ai/agentic_pipeline_authoring_tools/SKILL.md",
    rawUrl: `${TEMPLATES_RAW}/assets/ai/agentic_pipeline_authoring_tools/SKILL.md`,
    githubUrl: `${TEMPLATES_REPO}/blob/main/assets/ai/agentic_pipeline_authoring_tools/SKILL.md`,
  },
  {
    id: "migrating-airflow-to-dagster",
    name: "migrating-airflow-to-dagster",
    description:
      "Migrate Apache Airflow DAGs to Dagster — DAGs, schedules, TaskFlow tasks, operators, " +
      "sensors, datasets/assets, pools, XCom, Variables/Connections, dynamic task mapping, " +
      "dag-factory and Cosmos. Covers MWAA, Cloud Composer, and Astronomer too.",
    group: "migration",
    path: "skills/migrating-airflow-to-dagster/SKILL.md",
    rawUrl: `${CLI_RAW}/skills/migrating-airflow-to-dagster/SKILL.md`,
    githubUrl: `${CLI_REPO}/blob/main/skills/migrating-airflow-to-dagster/SKILL.md`,
  },
  {
    id: "migrating-adf-to-dagster",
    name: "migrating-adf-to-dagster",
    description:
      "Migrate Azure Data Factory pipelines to Dagster — Copy, ForEach, Lookup, tumbling " +
      "window triggers, data flows, SSIS packages, linked services and datasets. Covers " +
      "Synapse pipelines and Fabric Data Factory too.",
    group: "migration",
    path: "skills/migrating-adf-to-dagster/SKILL.md",
    rawUrl: `${CLI_RAW}/skills/migrating-adf-to-dagster/SKILL.md`,
    githubUrl: `${CLI_REPO}/blob/main/skills/migrating-adf-to-dagster/SKILL.md`,
  },
  {
    id: "migrating-runmyjobs-to-dagster",
    name: "migrating-runmyjobs-to-dagster",
    description:
      "Migrate Redwood RunMyJobs (formerly SAP CPS / Redwood Server) process definitions, " +
      "chains, schedules and queues to Dagster.",
    group: "migration",
    path: "skills/migrating-runmyjobs-to-dagster/SKILL.md",
    rawUrl: `${CLI_RAW}/skills/migrating-runmyjobs-to-dagster/SKILL.md`,
    githubUrl: `${CLI_REPO}/blob/main/skills/migrating-runmyjobs-to-dagster/SKILL.md`,
  },
];

export function findSkill(id: string): SkillEntry | undefined {
  return SKILLS.find((s) => s.id === id);
}

export const SKILLS_REPO = TEMPLATES_REPO;
export const SKILLS_CLI_REPO = CLI_REPO;
